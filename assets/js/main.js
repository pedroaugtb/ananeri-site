// ========= CONFIG =========
const YOUTUBE_CHANNEL_ID = "UC_gdRoq0kpIlG5nCYI0ohiw";
const YT_STREAMS_PAGE = "https://www.youtube.com/@instituto_ananeri/streams";

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

// ========= HELPERS =========
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"
  }[c]));
}

function formatBR(yyyyMmDd) {
  if (!yyyyMmDd || !yyyyMmDd.includes("-")) return "";
  const [y,m,d] = yyyyMmDd.split("-");
  return `${d}/${m}/${y}`;
}

async function fetchTextViaProxy(url) {
  // Proxy CORS (retorna raw)
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  const r = await fetch(proxyUrl, { cache: "no-store" });
  if (!r.ok) throw new Error(`Proxy fetch failed: ${r.status}`);
  return await r.text();
}

async function fetchJsonViaProxy(url) {
  const txt = await fetchTextViaProxy(url);
  return JSON.parse(txt);
}

// ========= RENDER =========
function renderCards(container, items) {
  container.innerHTML = "";
  items.forEach(it => {
    const a = document.createElement("a");
    a.className = "yt-card";
    a.href = it.url;
    a.target = "_blank";
    a.rel = "noopener";

    a.innerHTML = `
      <span class="yt-thumb">${it.thumb ? `<img src="${it.thumb}" alt="">` : ""}</span>
      <div class="yt-meta">
        <strong>${escapeHtml(it.title || "Transmissão")}</strong>
        <span>${it.date ? `Publicado em ${escapeHtml(it.date)}` : "Abrir no YouTube"}</span>
      </div>
    `;

    container.appendChild(a);
  });
}

function renderFallback(container, msg) {
  container.innerHTML = `
    <div class="card">
      <h3 style="margin:0 0 6px">Últimas transmissões</h3>
      <p style="margin:0;color:var(--muted)">
        ${msg}
      </p>
      <div style="margin-top:12px">
        <a class="btn" href="${YT_STREAMS_PAGE}" target="_blank" rel="noopener">Ver no YouTube</a>
      </div>
    </div>
  `;
}

// ========= MÉTODO 1: RSS de Livestreams (playlist automática UULV...) =========
async function tryLoadStreamsFromRss(maxItems) {
  // Playlist automática de livestreams: UULV + (channelId sem "UC")
  const playlistId = "UULV" + YOUTUBE_CHANNEL_ID.slice(2);
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${playlistId}`;

  const xmlText = await fetchTextViaProxy(feedUrl);
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, "text/xml");

  const entries = Array.from(xml.getElementsByTagName("entry")).slice(0, maxItems);
  if (!entries.length) throw new Error("RSS de livestreams vazio.");

  const items = entries.map(entry => {
    const title = entry.getElementsByTagName("title")[0]?.textContent?.trim() || "Transmissão";
    const link = entry.getElementsByTagName("link")[0]?.getAttribute("href") || YT_STREAMS_PAGE;
    const videoId = entry.getElementsByTagNameNS("*", "videoId")[0]?.textContent?.trim();
    const published = entry.getElementsByTagName("published")[0]?.textContent?.slice(0,10);
    const thumb = videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : "";

    return {
      title,
      url: link,
      thumb,
      date: published ? formatBR(published) : ""
    };
  });

  return items;
}

// ========= MÉTODO 2 (fallback): parse da página /streams + oEmbed =========
async function tryLoadStreamsFromPage(maxItems) {
  const html = await fetchTextViaProxy(YT_STREAMS_PAGE);

  // Pega videoIds (11 chars) na ordem que aparecem na página
  const re = /"videoId":"([a-zA-Z0-9_-]{11})"/g;
  const seen = new Set();
  const ids = [];
  let m;

  while ((m = re.exec(html)) !== null) {
    const id = m[1];
    if (!seen.has(id)) {
      seen.add(id);
      ids.push(id);
      if (ids.length >= 12) break; // pega alguns para aumentar chance de pegar streams mesmo
    }
  }

  if (!ids.length) throw new Error("Não consegui extrair videoIds de /streams.");

  // Para os primeiros maxItems, pega metadados via oEmbed (título + thumb)
  const picked = ids.slice(0, maxItems);
  const items = [];

  for (const id of picked) {
    const watchUrl = `https://www.youtube.com/watch?v=${id}`;
    try {
      const oembed = await fetchJsonViaProxy(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`
      );
      items.push({
        title: oembed.title || "Transmissão",
        url: watchUrl,
        thumb: oembed.thumbnail_url || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        date: "" // oEmbed não dá data
      });
    } catch {
      items.push({
        title: "Transmissão",
        url: watchUrl,
        thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
        date: ""
      });
    }
  }

  return items;
}

// ========= CACHE (pra não depender do proxy toda hora) =========
const CACHE_KEY = "inan_streams_cache_v1";
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 min

function loadCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (!obj.ts || !obj.items) return null;
    if (Date.now() - obj.ts > CACHE_TTL_MS) return null;
    return obj.items;
  } catch {
    return null;
  }
}

function saveCache(items) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), items }));
  } catch {}
}

// ========= INIT =========
async function loadLatestStreams({ containerId, maxItems = 3 }) {
  const grid = document.getElementById(containerId);
  if (!grid) return;

  // cache primeiro
  const cached = loadCache();
  if (cached && Array.isArray(cached) && cached.length) {
    renderCards(grid, cached.slice(0, maxItems));
    return;
  }

  grid.innerHTML = `<div class="card"><p style="margin:0;color:var(--muted)">Carregando transmissões…</p></div>`;

  try {
    // 1) tenta RSS de livestreams
    const items = await tryLoadStreamsFromRss(maxItems);
    saveCache(items);
    renderCards(grid, items);
    return;
  } catch (e1) {
    console.warn("RSS livestreams falhou, tentando /streams page:", e1);
  }

  try {
    // 2) fallback: parse /streams + oEmbed
    const items = await tryLoadStreamsFromPage(maxItems);
    saveCache(items);
    renderCards(grid, items);
    return;
  } catch (e2) {
    console.error("Falhou também via /streams:", e2);
  }

  renderFallback(
    grid,
    `Não foi possível carregar automaticamente agora. Você ainda pode acessar por aqui:
     <a href="${YT_STREAMS_PAGE}" target="_blank" rel="noopener">youtube.com/@instituto_ananeri/streams</a>`
  );
}

document.addEventListener("DOMContentLoaded", () => {
  loadLatestStreams({ containerId: "streamsGrid", maxItems: 3 });
});
