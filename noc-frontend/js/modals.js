/**
 * modals.js — Cadastro e edição de dispositivos e enlaces.
 * Alinhado com os tipos aceitos pelo banco: pop | radio | server | corporate
 */

const DEVICE_TYPES = {
  pop:       'POP',
  radio:     'RB / OLT / Rádio',
  server:    'Servidor',
  corporate: 'Cliente Corporativo',
};

let _editingNodeId = null;

// ── Abrir modal para NOVO elemento ───────────────
function openAddModal(type) {
  _editingNodeId = null;

  // Normaliza tipos legados para os tipos do banco
  const dbType = _normalizeType(type);

  document.getElementById('modal-add-title').innerHTML =
    `<i class="fa fa-plus-circle"></i> Adicionar ${DEVICE_TYPES[dbType] || dbType}`;

  ['f-name','f-ip','f-location','f-desc'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('f-type').value     = dbType;
  document.getElementById('f-priority').value = '5';

  // Mostra coordenadas pendentes
  const coord = state.pendingCoord;
  document.getElementById('coord-display').textContent = coord
    ? `${coord.lat.toFixed(5)}, ${coord.lng.toFixed(5)}`
    : 'Posição não definida — cancele e clique no mapa primeiro';

  document.getElementById('modal-add').classList.add('open');
  setTimeout(() => document.getElementById('f-name').focus(), 100);
}

// ── Abrir modal para EDITAR ───────────────────────
function openEditModalById(nodeId) {
  const n = state.nodes[nodeId];
  if (!n) return;
  _editingNodeId = nodeId;

  document.getElementById('modal-add-title').innerHTML =
    `<i class="fa fa-edit"></i> Editar — ${n.name}`;

  document.getElementById('f-name').value     = n.name     || '';
  document.getElementById('f-ip').value       = n.ip       || '';
  document.getElementById('f-type').value     = _normalizeType(n.type);
  document.getElementById('f-priority').value = n.priority ? String(n.priority) : '5';
  document.getElementById('f-location').value = n.location || '';
  document.getElementById('f-desc').value     = n.notes    || '';
  document.getElementById('coord-display').textContent =
    n.lat && n.lng ? n.lat.toFixed(5) + ', ' + n.lng.toFixed(5) : '—';
  document.getElementById('coord-display').textContent =
    `${n.lat.toFixed(5)}, ${n.lng.toFixed(5)}`;

  document.getElementById('modal-add').classList.add('open');
  map.closePopup();
}

// ── Salvar ────────────────────────────────────────
document.getElementById('modal-save').onclick = async () => {
  const name = document.getElementById('f-name').value.trim();
  const ip   = document.getElementById('f-ip').value.trim();

  if (!name) { _showFieldError('f-name', 'Nome é obrigatório'); return; }
  if (!ip)   { _showFieldError('f-ip',   'IP é obrigatório');   return; }
  if (!_validIP(ip)) { _showFieldError('f-ip', 'IP inválido (ex: 192.168.0.1)'); return; }

  const lat = state.pendingCoord?.lat ?? (_editingNodeId ? state.nodes[_editingNodeId]?.lat : null);
  const lng = state.pendingCoord?.lng ?? (_editingNodeId ? state.nodes[_editingNodeId]?.lng : null);

  if (!lat || !lng) {
    alert('Posição no mapa não definida.\nCancele, clique no mapa onde deseja posicionar e tente novamente.');
    return;
  }

  const payload = {
    name,
    ip_address:    ip,
    type:          document.getElementById('f-type').value,
    priority:      parseInt(document.getElementById('f-priority').value) || 5,
    location_name: document.getElementById('f-location').value.trim() || null,
    notes:         document.getElementById('f-desc').value.trim()     || null,
    latitude:      lat,
    longitude:     lng,
    enabled:       true,
  };

  const btn = document.getElementById('modal-save');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Salvando...';

  try {
    if (_editingNodeId) {
      const node    = state.nodes[_editingNodeId];
      const updated = await api.devices.update(node.backendId, payload);
      Object.assign(node, {
        name:     updated.name,
        ip:       updated.ip_address,
        type:     updated.type,
        location: updated.location_name,
        notes:    updated.notes,
        priority: updated.priority,
      });
      node.marker.setIcon(makeIcon(node.type, node.status, node.name));
      addAlert(`✏️ ${node.name} atualizado`, `${DEVICE_TYPES[node.type]} | ${node.ip}`, 'info');
    } else {
      await saveDeviceToBackend(payload);
    }
    _closeAddModal();
  } catch (e) {
    console.error('Erro ao salvar:', e);
    // erro já exibido pelo saveDeviceToBackend
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="fa fa-check"></i> Salvar';
  }
};

function _closeAddModal() {
  document.getElementById('modal-add').classList.remove('open');
  state.pendingCoord = null;
  state.pendingType  = null;
  _editingNodeId     = null;
  renderElemList();
  updateStats();
}

document.getElementById('modal-cancel').onclick = _closeAddModal;

document.getElementById('modal-add').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-add')) _closeAddModal();
});

document.getElementById('f-name').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('modal-save').click();
});

// ── MODAL: ENLACE ────────────────────────────────
let _pendingLinkSrc = null;
let _pendingLinkDst = null;

function openLinkModal(srcId, dstId) {
  const src = state.nodes[srcId];
  const dst = state.nodes[dstId];
  if (!src || !dst) return;

  _pendingLinkSrc = srcId;
  _pendingLinkDst = dstId;

  document.getElementById('fl-orig').value  = src.name;
  document.getElementById('fl-dest').value  = dst.name;
  document.getElementById('fl-dist').value  = formatDist(calcDist(src.lat, src.lng, dst.lat, dst.lng));
  document.getElementById('fl-vlan').value  = '';
  document.getElementById('fl-notes').value = '';

  document.getElementById('modal-link').classList.add('open');
}

document.getElementById('fl-save').onclick = () => {
  if (!_pendingLinkSrc || !_pendingLinkDst) return;
  addLink(_pendingLinkSrc, _pendingLinkDst, {
    vlan:  document.getElementById('fl-vlan').value,
    cap:   document.getElementById('fl-cap').value,
    notes: document.getElementById('fl-notes').value,
  });
  _closeLinkModal();
};

document.getElementById('fl-cancel').onclick = _closeLinkModal;

document.getElementById('modal-link').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-link')) _closeLinkModal();
});

function _closeLinkModal() {
  document.getElementById('modal-link').classList.remove('open');
  _pendingLinkSrc = null;
  _pendingLinkDst = null;
  setTool('select');
}

// ── Helpers ──────────────────────────────────────
function _normalizeType(type) {
  // Converte tipos antigos/do HTML original para os 4 tipos do banco
  const map = {
    pop:       'pop',
    radio:     'radio',
    rb:        'radio',   // rb → radio
    olt:       'radio',
    server:    'server',
    corporate: 'corporate',
    cto:       'corporate', // cto/ceo não existem no banco MVP
    ceo:       'corporate',
    poste:     'corporate',
  };
  return map[type] || 'server';
}

function _validIP(ip) {
  return /^(\d{1,3}\.){3}\d{1,3}$/.test(ip) &&
    ip.split('.').every(n => parseInt(n) <= 255);
}

function _showFieldError(fieldId, msg) {
  const el = document.getElementById(fieldId);
  el.style.borderColor = '#f85149';
  el.focus();
  el.title = msg;
  setTimeout(() => { el.style.borderColor = ''; el.title = ''; }, 3000);
  addAlert('⚠️ ' + msg, '', 'warn');
}
