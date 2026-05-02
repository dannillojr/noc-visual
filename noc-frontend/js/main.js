/**
 * main.js — Inicializa a aplicação e mantém sincronismo com o backend.
 */

document.addEventListener('DOMContentLoaded', async () => {
  startClock();
  await loadDevicesFromAPI();
  startPolling();
});

// ── Clock ─────────────────────────────────────────
function startClock() {
  const el = document.getElementById('clock');
  const tick = () => el.textContent = new Date().toLocaleTimeString('pt-BR');
  tick();
  setInterval(tick, 1000);
}

// ── Carga inicial ─────────────────────────────────
async function loadDevicesFromAPI() {
  try {
    // 1. Carrega devices
    const devices = await api.devices.list();
    Object.values(state.nodes).forEach(n => { if (n.marker) map.removeLayer(n.marker); });
    Object.values(state.links).forEach(l => { if (l.polyline) map.removeLayer(l.polyline); });
    state.nodes = {};
    state.links = {};

    devices.forEach(addNodeFromAPI);

    const coords = devices.filter(d => d.latitude && d.longitude).map(d => [d.latitude, d.longitude]);
    if (coords.length > 0) map.fitBounds(coords, { padding: [40, 40] });

    // 2. Carrega enlaces do banco
    await loadLinksFromAPI();

    renderElemList();
    updateStats();

  } catch (e) {
    addAlert('❌ Erro ao conectar ao backend', e.message, 'crit');
    console.error('loadDevicesFromAPI:', e);
  }
}

async function loadLinksFromAPI() {
  try {
    const links = await api.links.list();
    links.forEach(l => {
      // Encontra os nodes correspondentes pelos backendId
      const srcNode = Object.values(state.nodes).find(n => n.backendId === l.src_id);
      const dstNode = Object.values(state.nodes).find(n => n.backendId === l.dst_id);
      if (!srcNode || !dstNode) return;

      const id   = 'l' + (++state.linkCounter);
      const dist = calcDist(srcNode.lat, srcNode.lng, dstNode.lat, dstNode.lng);
      const status = (srcNode.status === 'online' && dstNode.status === 'online') ? 'online'
                   : (srcNode.status === 'offline' || dstNode.status === 'offline') ? 'offline'
                   : 'warn';

      const poly = L.polyline(
        [[srcNode.lat, srcNode.lng], [dstNode.lat, dstNode.lng]],
        { color: linkColor(status), weight: 3, opacity: .9 }
      ).addTo(map);

      const link = {
        id,
        backendId:  l.id,
        srcId:      srcNode.id,
        dstId:      dstNode.id,
        name:       l.name || `${srcNode.name} → ${dstNode.name}`,
        dist,
        status,
        cap:        l.cap,
        vlan:       l.vlan,
        notes:      l.notes,
        polyline:   poly,
        breakMarker: null,
      };

      state.links[id] = link;
      poly.bindPopup(() => buildLinkPopup(id));
      poly.on('click', e => L.DomEvent.stopPropagation(e));
    });
  } catch(e) {
    console.warn('loadLinksFromAPI:', e);
  }
}
// ── Adiciona device da API no mapa ────────────────
function addNodeFromAPI(device) {
  if (!device.latitude || !device.longitude) return;

  const id = `n${device.id}`;
  if (state.nodes[id]?.marker) map.removeLayer(state.nodes[id].marker);

  const marker = L.marker([device.latitude, device.longitude], {
    icon: makeIcon(device.type, device.status, device.name),
  }).addTo(map);

  state.nodes[id] = {
    id,
    backendId:      device.id,
    type:           device.type,
    lat:            device.latitude,
    lng:            device.longitude,
    name:           device.name,
    ip:             device.ip_address,
    status:         device.status,
    location:       device.location_name,
    notes:          device.notes,
    priority:       device.priority,
    lastLatency:    device.last_latency,
    lastPacketLoss: device.last_packet_loss,
    lastChecked:    device.last_checked,
    marker,
  };

  marker.on('click', () => onNodeClick(id));
  marker.bindPopup(() => buildNodePopup(id), { maxWidth: 300 });
}

// ── Polling ───────────────────────────────────────
function startPolling() {
  state._summaryInterval = setInterval(refreshSummary,  10_000);
  state._devicesInterval = setInterval(refreshDevices,  15_000);
  state._alertsInterval  = setInterval(refreshAlerts,   10_000);
  refreshSummary();
  refreshAlerts();
}

async function refreshSummary() {
  try {
    const s = await api.status.summary();
    ['t-on','s-up'].forEach(id   => document.getElementById(id).textContent = s.online);
    ['t-off','s-down'].forEach(id => document.getElementById(id).textContent = s.offline);
    ['t-warn','s-warn'].forEach(id => document.getElementById(id).textContent = s.warn);
    const linkCount = Object.keys(state.links).length;
    ['t-links','s-links'].forEach(id => document.getElementById(id).textContent = linkCount);
  } catch(e) { /* silencioso */ }
}

async function refreshDevices() {
  try {
    const devices = await api.devices.list();
    let changed = false;

    devices.forEach(device => {
      const id   = `n${device.id}`;
      const node = state.nodes[id];
      if (!node) { addNodeFromAPI(device); changed = true; return; }

      if (node.status !== device.status) {
        node.status = device.status;
        node.marker.setIcon(makeIcon(node.type, device.status, node.name));
        changed = true;
      }
      node.lastLatency    = device.last_latency;
      node.lastPacketLoss = device.last_packet_loss;
      node.lastChecked    = device.last_checked;
    });

    // Atualiza cor dos enlaces
    Object.values(state.links).forEach(link => {
      const src = state.nodes[link.srcId];
      const dst = state.nodes[link.dstId];
      if (!src || !dst) return;
      const newStatus =
        (src.status === 'offline' || dst.status === 'offline') ? 'offline' :
        (src.status === 'warn'    || dst.status === 'warn')    ? 'warn'    : 'online';
      if (link.status !== newStatus) { setLinkStatus(link.id, newStatus); changed = true; }
    });

    if (changed) { renderElemList(); updateStats(); }
  } catch(e) { /* silencioso */ }
}

async function refreshAlerts() {
  try {
    const alerts = await api.alerts.list({ resolved: false, limit: 50 });
    state.alerts = alerts.map(a => ({
      id:    a.id,
      title: a.message,
      body:  `${a.severity.toUpperCase()} • ${new Date(a.created_at).toLocaleString('pt-BR')}`,
      type:  a.severity === 'critical' ? 'crit' : a.severity === 'warning' ? 'warn' : 'info',
      time:  new Date(a.created_at).toLocaleTimeString('pt-BR'),
    }));
    renderAlerts();
  } catch(e) { /* silencioso */ }
}

// ── Histórico de latência ─────────────────────────
async function refreshLatencyHistory(backendId) {
  try {
    const logs = await api.pingLogs.get(backendId, 40);
    state.latencyHistory = Array(40).fill(null);
    logs.forEach((log, i) => { state.latencyHistory[i] = log.latency_ms; });
    drawLatency();
  } catch(e) { /* silencioso */ }
}

// ── Salvar device novo no backend ─────────────────
async function saveDeviceToBackend(payload) {
  try {
    const device = await api.devices.create(payload);
    addNodeFromAPI(device);
    renderElemList();
    updateStats();
    addAlert(`✅ ${device.name} cadastrado`, `${TYPE_NAMES[device.type]} | ${device.ip_address}`, 'ok');
    return device;
  } catch(e) {
    addAlert('❌ Erro ao cadastrar dispositivo', e.message, 'crit');
    throw e;
  }
}

// ── Remover device do backend ─────────────────────
async function deleteDeviceFromBackend(nodeId) {
  const node = state.nodes[nodeId];
  if (!node) return;
  try {
    await api.devices.delete(node.backendId);
    if (node.marker) map.removeLayer(node.marker);

    // Remove enlaces conectados a esse nó
    Object.values(state.links)
      .filter(l => l.srcId === nodeId || l.dstId === nodeId)
      .forEach(l => deleteLink(l.id));

    delete state.nodes[nodeId];
    if (state.selectedNodeId === nodeId) {
      state.selectedNodeId = null;
      document.getElementById('detpanel').style.display = 'none';
    }
    renderElemList();
    updateStats();
    map.closePopup();
    addAlert(`🗑️ Dispositivo removido`, node.name, 'info');
  } catch(e) {
    addAlert('❌ Erro ao remover dispositivo', e.message, 'crit');
  }
}

// ── Exportar ──────────────────────────────────────
document.getElementById('btn-export').onclick = async () => {
  try {
    const devices = await api.devices.list();
    const blob    = new Blob([JSON.stringify(devices, null, 2)], { type: 'application/json' });
    const a       = Object.assign(document.createElement('a'), {
      href:     URL.createObjectURL(blob),
      download: `noc-devices-${new Date().toISOString().slice(0,10)}.json`,
    });
    a.click();
    addAlert('📥 Exportação concluída', `${devices.length} dispositivos`, 'info');
  } catch(e) { addAlert('❌ Erro ao exportar', e.message, 'crit'); }
};

// ── Toggle monitoramento ──────────────────────────
let _monActive = true;
document.getElementById('btn-monitor').addEventListener('click', function () {
  _monActive = !_monActive;
  if (_monActive) {
    startPolling();
    this.innerHTML = '<i class="fa fa-satellite-dish"></i> Monitoramento';
    this.classList.add('active');
  } else {
    clearInterval(state._summaryInterval);
    clearInterval(state._devicesInterval);
    clearInterval(state._alertsInterval);
    this.innerHTML = '<i class="fa fa-satellite-dish"></i> Pausado';
    this.classList.remove('active');
  }
});

// Botão de logout — limpa o token JWT e redireciona para o login
document.getElementById('btn-logout').addEventListener('click', () => {
  // Confirmação para evitar logout acidental
  if (confirm('Deseja realmente sair do sistema?')) {
    auth.fazerLogout(); // limpa localStorage e redireciona para login.html
  }
});
