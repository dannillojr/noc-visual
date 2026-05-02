/**
 * links.js
 * Gerencia os enlaces (polylines) entre elementos no mapa.
 * Enlaces são persistidos no banco via API.
 */

// ── Cores por status ──────────────────────────────
function linkColor(status) {
  return { online: '#3fb950', offline: '#f85149', warn: '#d29922' }[status] || '#484f58';
}

// ── Distância entre dois pontos (km) ─────────────
function calcDist(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDist(km) {
  return km < 1 ? `${(km * 1000).toFixed(0)} m` : `${km.toFixed(2)} km`;
}

// ── Adicionar enlace (salva no banco) ─────────────
async function addLink(srcId, dstId, cfg = {}) {
  const src = state.nodes[srcId];
  const dst = state.nodes[dstId];
  if (!src || !dst) return;

  // Salva no banco primeiro
  let backendId = null;
  try {
    const saved = await api.links.create({
      src_id: src.backendId,
      dst_id: dst.backendId,
      name: `${src.name} → ${dst.name}`,
      cap: cfg.cap || null,
      vlan: cfg.vlan || null,
      notes: cfg.notes || null,
      dist_km: parseFloat(calcDist(src.lat, src.lng, dst.lat, dst.lng).toFixed(3)),
    });
    backendId = saved.id;
  } catch (e) {
    addAlert('❌ Erro ao salvar enlace', e.message, 'crit');
    return;
  }

  const id = 'l' + (++state.linkCounter);
  const dist = calcDist(src.lat, src.lng, dst.lat, dst.lng);
  const status = (src.status === 'online' && dst.status === 'online') ? 'online'
    : (src.status === 'offline' || dst.status === 'offline') ? 'offline'
      : 'warn';

  const poly = L.polyline(
    [[src.lat, src.lng], [dst.lat, dst.lng]],
    { color: linkColor(status), weight: 3, opacity: .9 }
  ).addTo(map);

  const link = {
    id, backendId, srcId, dstId,
    name: `${src.name} → ${dst.name}`,
    dist, status, polyline: poly, breakMarker: null, ...cfg
  };
  state.links[id] = link;

  poly.bindPopup(() => buildLinkPopup(id));
  poly.on('click', e => L.DomEvent.stopPropagation(e));

  renderElemList();
  updateStats();
  addAlert(`🔗 Enlace criado`, link.name, 'ok');
  return id;
}

// ── Popup de enlace ───────────────────────────────
function buildLinkPopup(id) {
  const l = state.links[id];
  if (!l) return '';
  return `
    <div>
      <div class="link-popup-title"><i class="fa fa-project-diagram"></i> ${l.name}</div>
      <div class="popup-row"><span class="pk">Distância:</span><span class="pv">${formatDist(l.dist)}</span></div>
      ${l.cap ? `<div class="popup-row"><span class="pk">Capacidade:</span><span class="pv">${l.cap}</span></div>` : ''}
      ${l.vlan ? `<div class="popup-row"><span class="pk">VLAN:</span><span class="pv">${l.vlan}</span></div>` : ''}
      <div class="popup-actions">
        <div class="pa-btn red" onclick="simulateBreakLink('${id}')"><i class="fa fa-bolt"></i> Romper</div>
        <div class="pa-btn red" onclick="deleteLink('${id}')"><i class="fa fa-trash"></i> Remover</div>
      </div>
    </div>`;
}

// ── Atualiza estilo do enlace ─────────────────────
function setLinkStatus(id, status) {
  const l = state.links[id];
  if (!l) return;
  l.status = status;
  l.polyline.setStyle({ color: linkColor(status), dashArray: status === 'offline' ? '8,6' : null });
  updateStats();
}

// ── Remover enlace (apaga do banco) ──────────────
async function deleteLink(id) {
  const l = state.links[id];
  if (!l) return;

  if (l.backendId) {
    try {
      await api.links.delete(l.backendId);
    } catch (e) {
      // Se não encontrou no banco (404), remove só do mapa sem travar
      if (!e.message.includes('404') && !e.message.includes('Not Found')) {
        addAlert('❌ Erro ao remover enlace', e.message, 'crit');
        return;
      }
    }
  }

  map.removeLayer(l.polyline);
  if (l.breakMarker) map.removeLayer(l.breakMarker);
  delete state.links[id];
  renderElemList();
  updateStats();
  map.closePopup();
}
// ── Simular rompimento ────────────────────────────
function simulateBreakLink(id) {
  const l = state.links[id];
  if (!l) return;

  setLinkStatus(id, 'offline');

  const src = state.nodes[l.srcId];
  const dst = state.nodes[l.dstId];
  const ratio = 0.3 + Math.random() * 0.4;
  const blat = src.lat + (dst.lat - src.lat) * ratio;
  const blng = src.lng + (dst.lng - src.lng) * ratio;
  const distSrc = l.dist * ratio;
  const optLoss = -(18 + Math.random() * 10).toFixed(1);

  if (l.breakMarker) map.removeLayer(l.breakMarker);
  l.breakMarker = L.marker([blat, blng], { icon: makeBreakIcon(), zIndexOffset: 1000 }).addTo(map);

  document.getElementById('bp-link').textContent = l.name;
  document.getElementById('bp-dist').textContent = formatDist(distSrc);
  document.getElementById('bp-opt').textContent = optLoss + ' dBm';
  document.getElementById('bp-time').textContent = new Date().toLocaleTimeString('pt-BR');
  document.getElementById('breakpanel').style.display = 'block';

  state.breakSimActive = true;
  document.getElementById('btn-restore').style.display = '';
  addAlert(`🔴 ROMPIMENTO: ${l.name}`, `Dist.: ${formatDist(distSrc)}`, 'crit');
  map.closePopup();
}

// ── Restaurar tudo ────────────────────────────────
document.getElementById('btn-restore').onclick = () => {
  Object.values(state.nodes).forEach(n => {
    n.status = 'online';
    n.marker.setIcon(makeIcon(n.type, 'online', n.name));
  });
  Object.values(state.links).forEach(l => {
    setLinkStatus(l.id, 'online');
    if (l.breakMarker) { map.removeLayer(l.breakMarker); l.breakMarker = null; }
  });
  document.getElementById('breakpanel').style.display = 'none';
  document.getElementById('btn-restore').style.display = 'none';
  state.breakSimActive = false;
  addAlert('✅ Rede restaurada', 'Simulação encerrada', 'ok');
  renderElemList();
  updateStats();
};

document.getElementById('bp-close').onclick = () => {
  document.getElementById('breakpanel').style.display = 'none';
};

// ── Botão simular falha aleatória ─────────────────
document.getElementById('btn-sim').onclick = () => {
  const links = Object.values(state.links);
  if (links.length > 0) {
    simulateBreakLink(links[Math.floor(Math.random() * links.length)].id);
    return;
  }
  const nodes = Object.values(state.nodes);
  if (nodes.length > 0) {
    simulateBreakNode(nodes[Math.floor(Math.random() * nodes.length)].id);
    return;
  }
  addAlert('Nenhum elemento no mapa.', '', 'warn');
};