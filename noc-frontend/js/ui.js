/**
 * ui.js — Renderiza painéis laterais, alertas, stats e toolbox.
 */

// ── Renderizar lista de elementos ─────────────────
function renderElemList() {
  const el    = document.getElementById('elemlist');
  const nodes = Object.values(state.nodes);
  const links = Object.values(state.links);
  const count = nodes.length + links.length;

  document.getElementById('elem-count').textContent = count ? `(${count})` : '';

  if (!count) {
    el.innerHTML = `
      <div style="text-align:center;color:#484f58;padding:24px 10px;font-size:11px;">
        <i class="fa fa-network-wired" style="font-size:24px;display:block;margin-bottom:8px;color:#30363d"></i>
        Nenhum elemento cadastrado.<br>Selecione um tipo e clique no mapa.
      </div>`;
    return;
  }

  // Ordena: offline primeiro, warn, online, unknown
  const ORDER = { offline: 0, warn: 1, online: 2, unknown: 3 };
  const sorted = [...nodes].sort((a, b) =>
    (ORDER[a.status] ?? 3) - (ORDER[b.status] ?? 3)
  );

  const nodesHtml = sorted.map(n => `
    <div class="eitem ${state.selectedNodeId === n.id ? 'sel' : ''}" data-id="${n.id}"
         onclick="showDetail('${n.id}');map.panTo([${n.lat},${n.lng}])">
      <div class="edot ${n.status || 'unknown'}"></div>
      <div style="flex:1;min-width:0">
        <div class="ename">${n.name}</div>
        <div class="etype">${TYPE_NAMES[n.type] || n.type}${n.ip ? ' · ' + n.ip : ''}</div>
        ${n.lastLatency != null
          ? `<div style="font-size:9px;color:#58a6ff">${n.lastLatency.toFixed(1)} ms</div>`
          : ''}
      </div>
      <i class="fa fa-times edel" title="Remover"
         onclick="event.stopPropagation();_confirmDelete('${n.id}')"></i>
    </div>`).join('');

  const linksHtml = links.length ? `
    <div style="font-size:10px;font-weight:700;color:#8b949e;padding:6px 4px 3px;text-transform:uppercase;letter-spacing:.8px;">
      <i class="fa fa-project-diagram" style="color:#58a6ff;margin-right:4px"></i> Enlaces (${links.length})
    </div>` + links.map(l => {
      const s = state.nodes[l.srcId];
      const d = state.nodes[l.dstId];
      if (!s || !d) return '';
      return `
        <div class="eitem" onclick="map.fitBounds([[${s.lat},${s.lng}],[${d.lat},${d.lng}]],{padding:[60,60]})">
          <div class="edot ${l.status || 'unknown'}"></div>
          <div style="flex:1;min-width:0">
            <div class="ename" style="font-size:10px">${l.name}</div>
            <div class="etype">${formatDist(l.dist)}${l.cap ? ' · ' + l.cap : ''}</div>
          </div>
          <i class="fa fa-times edel" onclick="event.stopPropagation();deleteLink('${l.id}')"></i>
        </div>`;
    }).join('') : '';

  el.innerHTML = nodesHtml + linksHtml;
}

function _confirmDelete(nodeId) {
  const n = state.nodes[nodeId];
  if (!n) return;
  if (confirm(`Remover "${n.name}" do monitoramento?\nEsta ação não pode ser desfeita.`))
    deleteDeviceFromBackend(nodeId);
}

// ── Atualizar contadores ──────────────────────────
function updateStats() {
  const nodes   = Object.values(state.nodes);
  const online  = nodes.filter(n => n.status === 'online').length;
  const offline = nodes.filter(n => n.status === 'offline').length;
  const warn    = nodes.filter(n => n.status === 'warn').length;
  const links   = Object.keys(state.links).length;

  document.getElementById('t-on').textContent    = online;
  document.getElementById('t-off').textContent   = offline;
  document.getElementById('t-warn').textContent  = warn;
  document.getElementById('t-links').textContent = links;
  document.getElementById('s-up').textContent    = online;
  document.getElementById('s-down').textContent  = offline;
  document.getElementById('s-warn').textContent  = warn;
  document.getElementById('s-links').textContent = links;
}

// ── Renderizar alertas ────────────────────────────
function renderAlerts() {
  const el    = document.getElementById('alertlist');
  const badge = document.getElementById('alert-count');

  if (!state.alerts.length) {
    el.innerHTML = `
      <div style="text-align:center;color:#484f58;padding:18px 10px;font-size:11px;">
        <i class="fa fa-check-circle" style="font-size:22px;display:block;margin-bottom:6px;color:#3fb950"></i>
        Rede estável
      </div>`;
    badge.textContent = '0';
    return;
  }

  badge.textContent = state.alerts.length;
  el.innerHTML = state.alerts.map(a => `
    <div class="aitem ${a.type}">
      <div class="atitle">${a.title}</div>
      ${a.body ? `<div style="color:#8b949e;font-size:10px">${a.body}</div>` : ''}
      <div class="atime"><i class="fa fa-clock"></i> ${a.time}</div>
    </div>`).join('');
}

// ── Adicionar alerta local ────────────────────────
function addAlert(title, body = '', type = 'info') {
  state.alerts.unshift({ id: Date.now(), title, body, type, time: new Date().toLocaleTimeString('pt-BR') });
  if (state.alerts.length > 50) state.alerts.pop();
  renderAlerts();
}

// ── Toolbox ───────────────────────────────────────
document.querySelectorAll('.tbtn').forEach(btn => {
  btn.addEventListener('click', () => {
    const tool = btn.dataset.tool;
    if (tool === 'link' && Object.keys(state.nodes).length < 2) {
      addAlert('São necessários ao menos 2 elementos para criar um enlace.', '', 'warn');
      return;
    }
    setTool(tool);
  });
});

function setTool(tool) {
  state.tool      = tool;
  state.linkSrcId = null;

  document.querySelectorAll('.tbtn').forEach(b => b.classList.remove('active'));
  const el = document.querySelector(`.tbtn[data-tool="${tool}"]`);
  if (el) el.classList.add('active');

  const msgs = {
    select:    'Clique num elemento para selecionar',
    pop:       'Clique no mapa para posicionar o POP',
    radio:     'Clique no mapa para posicionar o RB/OLT',
    server:    'Clique no mapa para posicionar o Servidor',
    corporate: 'Clique no mapa para posicionar o Cliente Corporativo',
    link:      'Clique no elemento ORIGEM do enlace',
  };

  document.getElementById('statusbar').textContent = '🖱️ ' + (msgs[tool] || '');
  document.getElementById('linking-info').style.display = 'none';
  map.getContainer().style.cursor = tool === 'select' ? '' : 'crosshair';
}
