/**
 * nodes.js
 * Gerencia a criação, atualização e remoção de markers no mapa Leaflet.
 */

// ── Mapeamento de tipo → label curto ──────────────
const TYPE_LABELS = {
  pop:       'POP',
  server:    'SRV',
  radio:     'RDO',
  corporate: 'CLI',
  rb:        'RB',
  cto:       'CTO',
  ceo:       'CEO',
  poste:     'P',
};

const TYPE_NAMES = {
  pop:       'POP',
  server:    'Servidor',
  radio:     'Rádio',
  corporate: 'Cliente Corp.',
  rb:        'RB / OLT',
  cto:       'CTO',
  ceo:       'CEO (Emenda)',
  poste:     'Poste',
};

// ── Fábrica de ícone Leaflet ──────────────────────
function makeIcon(type, status, label) {
  const sizes = {
    pop: [38, 38], server: [36, 36], radio: [34, 34],
    corporate: [32, 32], rb: [34, 34],
    cto: [28, 28], ceo: [24, 24], poste: [16, 16],
  };
  const [w, h] = sizes[type] || [28, 28];
  const short = (label || '').substring(0, 4) || TYPE_LABELS[type] || '?';
  const borderRadius = type === 'rb' ? '6px' : '50%';

  return L.divIcon({
    className: '',
    iconSize:     [w, h],
    iconAnchor:   [w / 2, h / 2],
    popupAnchor:  [0, -(h / 2 + 4)],
    html: `<div class="ni ni-${type} s-${status || 'none'}" style="border-radius:${borderRadius}">${short}</div>`,
  });
}

function makeBreakIcon() {
  return L.divIcon({
    className: '',
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    html: `<div class="break-pulse"></div>`,
  });
}

// ── Popup de nó ───────────────────────────────────
function buildNodePopup(id) {
  const n = state.nodes[id];
  if (!n) return '';

  const stMap = {
    online:  '<span class="pv on">● Online</span>',
    offline: '<span class="pv off">● Offline</span>',
    warn:    '<span class="pv warn">● Instável</span>',
    unknown: '<span style="color:#484f58">— Desconhecido</span>',
    none:    '<span style="color:#484f58">— Sem mon.</span>',
  };

  const latInfo = n.lastLatency
    ? `<div class="popup-row"><span class="pk">Latência:</span><span class="pv">${n.lastLatency.toFixed(1)} ms</span></div>`
    : '';
  const lossInfo = n.lastPacketLoss != null
    ? `<div class="popup-row"><span class="pk">Perda:</span><span class="pv">${n.lastPacketLoss.toFixed(1)}%</span></div>`
    : '';
  const checkedInfo = n.lastChecked
    ? `<div class="popup-row"><span class="pk">Último check:</span><span class="pv" style="font-size:10px">${new Date(n.lastChecked).toLocaleTimeString('pt-BR')}</span></div>`
    : '';

  return `
    <div>
      <div class="popup-title">
        ${n.name}
        <span style="font-size:10px;font-weight:400;color:#8b949e">${TYPE_NAMES[n.type] || n.type}</span>
      </div>
      <div class="popup-row"><span class="pk">IP:</span><span class="pv">${n.ip || '—'}</span></div>
      ${n.location ? `<div class="popup-row"><span class="pk">Local:</span><span class="pv">${n.location}</span></div>` : ''}
      <div class="popup-row"><span class="pk">Status:</span>${stMap[n.status] || stMap.none}</div>
      ${latInfo}${lossInfo}${checkedInfo}
      <div class="popup-row"><span class="pk">Coord:</span><span class="pv" style="font-size:9px">${n.lat.toFixed(5)}, ${n.lng.toFixed(5)}</span></div>
      ${n.notes ? `<div style="font-size:10px;color:#8b949e;margin-top:6px;font-style:italic">${n.notes}</div>` : ''}
      <div class="popup-actions">
        <div class="pa-btn blue"  onclick="openEditModalById('${id}')"><i class="fa fa-edit"></i> Editar</div>
        <div class="pa-btn"       onclick="showLatencyPopup('${id}')"><i class="fa fa-chart-line"></i> Latência</div>
        <div class="pa-btn red"   onclick="deleteDeviceFromBackend('${id}')"><i class="fa fa-trash"></i> Remover</div>
      </div>
    </div>`;
}

// ── Clique em um nó ───────────────────────────────
function onNodeClick(id) {
  if (state.tool === 'link') {
    if (!state.linkSrcId) {
      state.linkSrcId = id;
      document.getElementById('linking-info').style.display = 'block';
      document.getElementById('statusbar').textContent =
        `🔗 Origem: ${state.nodes[id].name} — clique no destino`;
    } else {
      if (state.linkSrcId === id) {
        addAlert('Origem e destino não podem ser iguais.', '', 'warn');
        return;
      }
      openLinkModal(state.linkSrcId, id);
      state.linkSrcId = null;
      document.getElementById('linking-info').style.display = 'none';
    }
    return;
  }
  showDetail(id);
}

// ── Exibe painel de detalhe lateral ──────────────
function showDetail(id) {
  const n = state.nodes[id];
  if (!n) return;

  state.selectedNodeId = id;

  // Destaca na lista
  document.querySelectorAll('.eitem').forEach(el => el.classList.remove('sel'));
  const listEl = document.querySelector(`.eitem[data-id="${id}"]`);
  if (listEl) listEl.classList.add('sel');

  // Preenche painel direito
  const stLabels = {
    online: '<span class="dv on">Online</span>',
    offline: '<span class="dv off">Offline</span>',
    warn: '<span class="dv warn">Instável</span>',
    unknown: '<span class="dv" style="color:#484f58">—</span>',
  };

  document.getElementById('det-content').innerHTML = `
    <div class="drow"><span class="dk">Nome</span><span class="dv">${n.name}</span></div>
    <div class="drow"><span class="dk">Tipo</span><span class="dv">${TYPE_NAMES[n.type] || n.type}</span></div>
    <div class="drow"><span class="dk">IP</span><span class="dv">${n.ip || '—'}</span></div>
    <div class="drow"><span class="dk">Status</span>${stLabels[n.status] || stLabels.unknown}</div>
    ${n.lastLatency != null ? `<div class="drow"><span class="dk">Latência</span><span class="dv">${n.lastLatency.toFixed(1)} ms</span></div>` : ''}
    ${n.lastPacketLoss != null ? `<div class="drow"><span class="dk">Perda</span><span class="dv">${n.lastPacketLoss.toFixed(1)}%</span></div>` : ''}
    ${n.location ? `<div class="drow"><span class="dk">Local</span><span class="dv" style="font-size:10px">${n.location}</span></div>` : ''}
  `;

  document.getElementById('detpanel').style.display = 'block';

  // Botões de ação
  document.getElementById('det-edit').onclick   = () => openEditModalById(id);
  document.getElementById('det-delete').onclick = () => _confirmDelete(id);

  // Carrega histórico de latência do backend
  if (n.backendId) refreshLatencyHistory(n.backendId);
}

// ── Popup de latência rápida ──────────────────────
function showLatencyPopup(id) {
  const n = state.nodes[id];
  if (!n) return;
  showDetail(id);
  map.closePopup();
}

// ── Simular falha (apenas visual, sem alterar banco) ──
function simulateBreakNode(id) {
  const n = state.nodes[id];
  if (!n) return;
  const prev = n.status;
  n.status = 'offline';
  n.marker.setIcon(makeIcon(n.type, 'offline', n.name));
  addAlert(`🔌 ${n.name} OFFLINE (simulado)`, `IP: ${n.ip || '—'}`, 'crit');
  Object.values(state.links)
    .filter(l => l.srcId === id || l.dstId === id)
    .forEach(l => setLinkStatus(l.id, 'offline'));
  renderElemList();
  updateStats();
  map.closePopup();
}

function simulateRestore(id) {
  const n = state.nodes[id];
  if (!n) return;
  n.status = 'online';
  n.marker.setIcon(makeIcon(n.type, 'online', n.name));
  Object.values(state.links)
    .filter(l => l.srcId === id || l.dstId === id)
    .forEach(l => setLinkStatus(l.id, 'online'));
  addAlert(`✅ ${n.name} restaurado (simulado)`, '', 'ok');
  renderElemList();
  updateStats();
  map.closePopup();
}
