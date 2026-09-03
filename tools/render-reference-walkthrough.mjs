// Offline media production only: never drives a browser or fabricates UI.
// Requires macOS say, ffmpeg/ffprobe, and sharp (supply its module path).
// Usage: node tools/render-reference-walkthrough.mjs CAPTURES OUTPUT SHARP_MODULE
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const [capturesArg, outputArg, sharpArg] = process.argv.slice(2);
if (!capturesArg || !outputArg || !sharpArg) {
  throw new Error("Usage: node tools/render-reference-walkthrough.mjs CAPTURES OUTPUT SHARP_MODULE");
}
const captures = path.resolve(capturesArg);
const output = path.resolve(outputArg);
// Never overwrite a previous recording package.
await fs.mkdir(output, { recursive: false });
const { default: sharp } = await import(pathToFileURL(path.resolve(sharpArg)).href);
const manifest = JSON.parse(await fs.readFile(new URL("../docs/demo/reference-walkthrough.json", import.meta.url), "utf8"));
const xml = (s) => String(s).replace(/[<>&"']/g, (c) => ({"<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;","'":"&apos;"}[c]));

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8", maxBuffer: 8 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error(`${command}: ${result.error?.message ?? result.stderr}`);
  return result.stdout;
}
function probe(file) {
  return JSON.parse(run("ffprobe", ["-v", "error", "-show_format", "-show_streams", "-of", "json", file]));
}
function timestamp(seconds) {
  const ms = Math.round(seconds * 1000);
  return `${String(Math.floor(ms / 3600000)).padStart(2,"0")}:${String(Math.floor(ms / 60000) % 60).padStart(2,"0")}:${String(Math.floor(ms / 1000) % 60).padStart(2,"0")},${String(ms % 1000).padStart(3,"0")}`;
}
const segments = [];
const subtitles = [];
let elapsed = 0;
let cue = 1;

for (const [index, shot] of manifest.shots.entries()) {
  const id = String(index + 1).padStart(2, "0");
  const source = path.join(captures, shot.image);
  const metadata = await sharp(source).metadata();
  if (metadata.width !== 1920 || metadata.height !== 1080) throw new Error(`Unexpected capture geometry: ${shot.image}`);
  const crop = shot.focus === "notebook"
    ? { left: 1236, top: 220, width: 432, height: 718 }
    : { left: 254, top: 218, width: 1414, height: 812 };
  const picture = await sharp(source).extract(crop).resize({ width: 1640, height: 790, fit: "inside" }).png().toBuffer();
  const dimensions = await sharp(picture).metadata();
  const cues = shot.cues ? `<text x="130" y="330" font-family="Arial" font-size="24" fill="#89c6d0">RECORDING CUES</text>${shot.cues.map((line,i)=>`<text x="130" y="${420+i*96}" font-family="Arial" font-size="38" fill="#f5f2e9">${xml(line)}</text>`).join("")}` : "";
  const header = Buffer.from(`<svg width="1920" height="1080" xmlns="http://www.w3.org/2000/svg"><rect width="1920" height="1080" fill="#0b121b"/><text x="70" y="45" font-family="Arial" font-size="22" fill="#89c6d0">HUGINN / RECORDING REHEARSAL</text><text x="1850" y="45" text-anchor="end" font-family="Arial" font-size="20" fill="#aab4c2">GENUINE PAGE STILLS · SYNTHETIC VOICE</text><text x="70" y="106" font-family="Arial" font-size="42" font-weight="bold" fill="#f5f2e9">${xml(shot.title)}</text>${cues}<text x="960" y="992" text-anchor="middle" font-family="Arial" font-size="30" fill="#f5f2e9">${xml(shot.caption)}</text><text x="960" y="1045" text-anchor="middle" font-family="Arial" font-size="21" fill="#97a8b9">Reference aid, not the final submission film · Live captures from halmir-ai.github.io/huginn</text></svg>`);
  const frame = path.join(output, `${id}-frame.png`);
  await sharp(header).composite([{ input: picture, left: shot.cues ? 1180 : Math.round((1920-dimensions.width)/2), top: 142 }]).png().toFile(frame);
  const narration = path.join(output, `${id}-narration.txt`);
  await fs.writeFile(narration, shot.narration + "\n");
  const audio = path.join(output, `${id}-voice.aiff`);
  run("say", ["-v", "Samantha", "-r", "150", "-f", narration, "-o", audio]);
  const duration = Math.ceil((Number(probe(audio).format.duration) + 1.0) * 30) / 30;
  const video = path.join(output, `${id}-clip.mp4`);
  run("ffmpeg", ["-hide_banner","-loglevel","error","-n","-loop","1","-framerate","30","-i",frame,"-i",audio,"-t",String(duration),"-c:v","libx264","-tune","stillimage","-preset","fast","-crf","20","-pix_fmt","yuv420p","-af","apad,loudnorm=I=-16:TP=-1.5:LRA=7","-ar","48000","-ac","2","-c:a","aac","-b:a","128k","-movflags","+faststart",video]);
  const phrases = shot.narration.match(/[^.!?]+[.!?]+|[^.!?]+$/g).map((s)=>s.trim());
  const wordCount = shot.narration.split(/\s+/).length;
  let phraseStart = elapsed;
  for (const phrase of phrases) {
    const phraseDuration = (duration - 1.0) * phrase.split(/\s+/).length / wordCount;
    subtitles.push(`${cue++}\n${timestamp(phraseStart)} --> ${timestamp(phraseStart+phraseDuration)}\n${phrase}\n`);
    phraseStart += phraseDuration;
  }
  segments.push({ id, title: shot.title, source: shot.image, duration, start: elapsed, video });
  elapsed += duration;
  console.log(`${id}: ${shot.title} (${duration.toFixed(1)}s)`);
}
const concat = path.join(output,"concat.txt");
await fs.writeFile(concat, segments.map((s)=>`file '${s.id}-clip.mp4'`).join("\n")+"\n");
const final = path.join(output,"huginn-reference-walkthrough.mp4");
run("ffmpeg",["-hide_banner","-loglevel","error","-n","-f","concat","-safe","1","-i",concat,"-c","copy","-movflags","+faststart",final]);
await fs.writeFile(path.join(output,"huginn-reference-walkthrough.srt"),subtitles.join("\n"));
await fs.writeFile(path.join(output,"receipt.json"),JSON.stringify({ label:manifest.label, sourceCommit:manifest.captureCommit, url:manifest.captureUrl, geometry:manifest.captureViewport, segments, probe:probe(final), captions:"Sentence timings are approximate; review before use. This is a rehearsal aid, not final film captions." },null,2)+"\n");
console.log(`Created ${final}; total ${Number(probe(final).format.duration).toFixed(2)}s`);
