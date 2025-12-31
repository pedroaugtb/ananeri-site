// ========= CONFIG =========
// Cole aqui o channelId (começa com "UC...")
// Exemplo: const YOUTUBE_CHANNEL_ID = "UCxxxxxxxxxxxxxxxxxxxxxx";
const YOUTUBE_CHANNEL_ID = "UC_gdRoq0kpIlG5nCYI0ohiw";

// Handle (para link de fallback)
const YT_HANDLE = "instituto_ananeri";

// ========= MENU MOBILE =========
(function () {
  const btn = document.querySelector("[data-nav-toggle]");
  const nav = document.querySelector("[data-nav]");
  if (!btn || !nav) return;

  btn.addEventListener("click", () => nav.classList.toggle("open"));
  nav.querySelectorAll("a").forEach(a => {
    a.addEventListener("click", () => nav.classList.remove("open"));
  });
})();

// ========= YOUTUBE: ÚLTIMAS 3 TRANSMISSÕES (STREAMS) =========
//
// Ideia: usar playlist "Livestreams" automática do YouTube.
// De acordo com a regra: playlist_id = "UULV" + (channelId sem o "UC") :contentReference[oaicite:1]{index=1}
//
// Depois lemos o RSS:
// https://www.youtube.com/feeds/videos.xml?playlist_id=...
//
// Para evitar CORS, buscamos via r.jina.ai
//
async function loadLatestStreams({ containerId, maxItems = 3 }) {
  const grid = document.getElementById(containerId);
  if (!grid) return;

  const renderMsg = (title, msg) => {
    grid.innerHTML = `
      <div class="card">
        <h3 style="margin:0 0 6px">${escapeHtml(title)}</h3>
        <p style="margin:0;color:var(--muted)">${msg}</p>
      </div>
    `;
  };

  try {
    if (!YOUTUBE_CHANNEL_ID.startsWith("UC") || YOUTUBE_CHANNEL_ID.length < 10) {
      renderMsg(
        "Últimas transmissões",
        `Para carregar automaticamente, cole o <strong>channelId</strong> no arquivo <code>assets/js/main.js</code>.
         Enquanto isso, acesse: <a href="https://www.youtube.com/@${YT_HANDLE}/streams" target="_blank" rel="noopener">youtube.com/@${YT_HANDLE}/streams</a>`
      );
      return;
    }

    grid.innerHTML = `<div class="card"><p style="margin:0;color:var(--muted)">Carregando transmissões…</p></div>`;

    const playlistId = "UULV" + YOUTUBE_CHANNEL_ID.slice(2);
    const feedUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistId}`;

    const resp = await fetch(`https://r.jina.ai/${feedUrl}`);
    const xmlText = await resp.text();

    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, "text/xml");

    const entries = Array.from(xml.getElementsByTagName("entry")).slice(0, maxItems);

    if (!entries.length) {
      renderMsg(
        "Últimas transmissões",
        `Não encontrei transmissões no feed agora. Veja diretamente em:
         <a href="https://www.youtube.com/@${YT_HANDLE}/streams" target="_blank" rel="noopener">youtube.com/@${YT_HANDLE}/streams</a>`
      );
      return;
    }

    grid.innerHTML = "";

    entries.forEach((entry) => {
      const title = entry.getElementsByTagName("title")[0]?.textContent?.trim() || "Transmissão";
      const link = entry.getElementsByTagName("link")[0]?.getAttribute("href") || `https://www.youtube.com/@${YT_HANDLE}/streams`;
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
          <span>${published ? `Publicado em ${formatBR(published)}` : "Abrir no YouTube"}</span>
        </div>
      `;

      grid.appendChild(a);
    });

  } catch (e) {
    console.error(e);
    renderMsg(
      "Últimas transmissões",
      `Não foi possível carregar automaticamente. Acesse o canal:
       <a href="https://www.youtube.com/@${YT_HANDLE}/streams" target="_blank" rel="noopener">youtube.com/@${YT_HANDLE}/streams</a>`
    );
  }
}

function formatBR(yyyyMmDd) {
  const [y,m,d] = yyyyMmDd.split("-");
  return `${d}/${m}/${y}`;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
  }[c]));
}

document.addEventListener("DOMContentLoaded", () => {
  loadLatestStreams({ containerId: "streamsGrid", maxItems: 3 });
});
