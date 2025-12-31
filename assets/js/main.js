// Mobile nav
(function () {
  const btn = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector("[data-nav]");
  if (!btn || !nav) return;

  btn.addEventListener("click", () => nav.classList.toggle("open"));
  nav.querySelectorAll("a").forEach(a => {
    a.addEventListener("click", () => nav.classList.remove("open"));
  });
})();

// YouTube latest videos (no API key): usa RSS + proxy r.jina.ai (CORS-friendly)
async function loadLatestYouTubeVideos({
  handle,
  containerId,
  maxVideos = 6
}) {
  const grid = document.getElementById(containerId);
  if (!grid) return;

  const status = (msg) => {
    grid.innerHTML = `<div class="card"><p style="margin:0;color:var(--muted)">${msg}</p></div>`;
  };

  try {
    status("Carregando vídeos mais recentes…");

    // 1) Descobrir channelId a partir do @handle
    const channelPage = await fetch(`https://r.jina.ai/https://www.youtube.com/@${handle}`);
    const html = await channelPage.text();

    const m = html.match(/"channelId":"(UC[a-zA-Z0-9_-]{22})"/);
    if (!m) throw new Error("Não consegui identificar o channelId do YouTube.");
    const channelId = m[1];

    // 2) Ler RSS de uploads do canal
    const feedResp = await fetch(`https://r.jina.ai/https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
    const xmlText = await feedResp.text();

    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, "text/xml");
    const entries = Array.from(xml.getElementsByTagName("entry")).slice(0, maxVideos);

    if (!entries.length) throw new Error("Nenhum vídeo encontrado no feed.");

    grid.innerHTML = "";

    entries.forEach((entry) => {
      const title = entry.getElementsByTagName("title")[0]?.textContent?.trim() || "Vídeo";
      const link = entry.getElementsByTagName("link")[0]?.getAttribute("href") || `https://www.youtube.com/@${handle}/videos`;
      const videoId = entry.getElementsByTagNameNS("*", "videoId")[0]?.textContent?.trim();
      const published = entry.getElementsByTagName("published")[0]?.textContent?.slice(0,10);

      const thumb = videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : "";

      const a = document.createElement("a");
      a.className = "yt-card";
      a.href = link;
      a.target = "_blank";
      a.rel = "noopener";

      a.innerHTML = `
        <span class="yt-thumb">${thumb ? `<img src="${thumb}" alt="">` : ""}</span>
        <div class="yt-meta">
          <strong>${escapeHtml(title)}</strong>
          <span>${published ? `Publicado em ${published.split("-").reverse().join("/")}` : "Abrir no YouTube"}</span>
        </div>
      `;

      grid.appendChild(a);
    });

  } catch (e) {
    console.error(e);
    grid.innerHTML = `
      <div class="card">
        <h3 style="margin:0 0 6px">Últimos vídeos</h3>
        <p style="margin:0;color:var(--muted)">
          Não foi possível carregar automaticamente agora. Você ainda pode acessar o canal por aqui:
          <a href="https://www.youtube.com/@${handle}" target="_blank" rel="noopener">youtube.com/@${handle}</a>
        </p>
      </div>
    `;
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
  }[c]));
}

// Auto-init (somente se existir a seção)
document.addEventListener("DOMContentLoaded", () => {
  loadLatestYouTubeVideos({
    handle: "instituto_ananeri",
    containerId: "ytGrid",
    maxVideos: 6
  });
});
