/**
 * map.js
 * Inicializa o mapa Leaflet e gerencia camadas de tile.
 * Centro padrão: Ceará/Nordeste — ajuste setView para sua cidade.
 */

const map = L.map('map', { zoomControl: true }).setView([-5.18, -38.57], 13);

const tileLayers = {
  rua: L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    { attribution: '© CartoDB | © OSM', maxZoom: 19, subdomains: 'abcd' }),
  sat: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    { attribution: '© Esri', maxZoom: 19 }),
  dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    { attribution: '© CartoDB', maxZoom: 19, subdomains: 'abcd' }),
};

// ── MODO OFFLINE: tiles locais ─────────────────────────────
// Se não houver internet no servidor, configure um tile server local
// (ex: TileServer-GL com mbtiles do OpenStreetMap) e troque a URL acima:
//
//   rua: L.tileLayer('http://192.168.1.50:8080/styles/basic/{z}/{x}/{y}.png', {...})
//
// Download de mbtiles do Brasil: https://download.geofabrik.de/south-america/brazil.html
// ──────────────────────────────────────────────────────────

tileLayers.dark.addTo(map);
let activeLayer = 'dark';

function setLayer(name) {
  map.removeLayer(tileLayers[activeLayer]);
  tileLayers[name].addTo(map);
  activeLayer = name;
  document.querySelectorAll('.mbt').forEach(b => b.classList.remove('active'));
  document.getElementById('tl-rua').classList.add('active');
}

document.getElementById('tl-rua').onclick = () => setLayer('rua');
document.getElementById('tl-sat').onclick = () => setLayer('sat');
document.getElementById('tl-dark').onclick = () => setLayer('dark');
document.getElementById('tl-fit').onclick = () => {
  const ns = Object.values(state.nodes).filter(n => n.lat && n.lng);
  if (!ns.length) { map.setView([-5.18, -38.57], 13); return; }
  map.fitBounds(ns.map(n => [n.lat, n.lng]), { padding: [40, 40] });
};

// ── Clique no mapa para posicionar novo elemento ──
map.on('click', e => {
  const t = state.tool;
  if (t === 'select') return;
  if (['pop', 'rb', 'cto', 'ceo', 'poste', 'server', 'radio', 'corporate'].includes(t)) {
    state.pendingCoord = { lat: e.latlng.lat, lng: e.latlng.lng };
    state.pendingType = t;
    openAddModal(t);
  }
});

// ESC cancela enlace
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && state.tool === 'link') {
    state.linkSrcId = null;
    document.getElementById('linking-info').style.display = 'none';
    setTool('select');
  }
});

// ── Search de endereço (Nominatim) ────────────────
// ATENÇÃO: Nominatim requer internet. Em rede offline, remova ou use Pelias local.
let _searchTimer = null;
document.getElementById('search-input').addEventListener('input', function () {
  clearTimeout(_searchTimer);
  const q = this.value.trim();
  const el = document.getElementById('search-results');
  if (q.length < 3) { el.style.display = 'none'; return; }
  _searchTimer = setTimeout(async () => {
    try {
      const r = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&accept-language=pt-BR`
      );
      const data = await r.json();
      if (!data.length) {
        el.innerHTML = '<div class="sr-item" style="color:#8b949e">Sem resultados</div>';
        el.style.display = 'block';
        return;
      }
      el.innerHTML = data.map(d =>
        `<div class="sr-item" onclick="goToPlace(${d.lat},${d.lon},'${d.display_name.replace(/'/g, "&#39;")}')">
          <i class="fa fa-map-marker-alt" style="color:#58a6ff;margin-right:5px"></i>${d.display_name}
        </div>`
      ).join('');
      el.style.display = 'block';
    } catch (e) {
      el.innerHTML = '<div class="sr-item" style="color:#8b949e">Erro na busca (sem internet?)</div>';
      el.style.display = 'block';
    }
  }, 400);
});

function goToPlace(lat, lng, name) {
  map.flyTo([lat, lng], 16, { duration: 1 });
  document.getElementById('search-input').value = name.split(',')[0];
  document.getElementById('search-results').style.display = 'none';
}

document.addEventListener('click', e => {
  if (!document.getElementById('searchbox').contains(e.target))
    document.getElementById('search-results').style.display = 'none';
});
