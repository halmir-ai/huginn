import "./dock.css";

export function gamePage(gameId: "coil" | "starfall", plain = false) {
  const app = document.querySelector<HTMLElement>("#app")!;
  const siteRoot = new URL(app.dataset.siteRoot || "../../", location.href);
  const href = (path: string) => new URL(path, siteRoot).href;
  const nav = document.createElement("nav");
  nav.className = "game-navigation";
  nav.setAttribute("aria-label", "Game navigation");
  nav.innerHTML = `<a class="brand" href="${href("")}">HUGINN / ARCADE</a><div class="nav-links"><a href="${href("games/coil/")}">COIL · Snake</a><a href="${href("games/starfall/")}">STARFALL · Pinball</a><a href="${href(`games/${gameId}/${plain ? "" : "plain/"}`)}">${plain ? "With Huginn" : "Standalone game"}</a><a href="${href("trials/")}">Evidence</a><a href="https://github.com/halmir-ai/huginn">Source ↗</a></div>`;
  app.before(nav);
  const dock = document.createElement("aside");
  app.after(dock);
  return {
    app,
    dock,
    assets: app.dataset.assets || `../../assets/${gameId}`,
    dispose: () => { nav.remove(); dock.remove(); },
  };
}
