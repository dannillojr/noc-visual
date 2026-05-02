/**
 * monitoring.js
 * Desenha o gráfico de latência no canvas e gerencia
 * o toggle do botão de monitoramento.
 */

// ── Desenha o gráfico de latência ─────────────────
function drawLatency() {
  const cv  = document.getElementById('latChart');
  const ctx = cv.getContext('2d');
  const W   = cv.offsetWidth  || 260;
  const H   = cv.offsetHeight || 55;
  cv.width  = W;
  cv.height = H;

  // Fundo
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, W, H);

  const data = state.latencyHistory.filter(v => v !== null);
  if (data.length < 2) {
    ctx.fillStyle = '#484f58';
    ctx.font      = '10px Segoe UI';
    ctx.fillText('Selecione um elemento para ver a latência', 8, H / 2 + 4);
    return;
  }

  const maxVal = Math.max(...data, 30);
  const step   = W / state.latencyHistory.length;

  // Linha de threshold warn (100ms)
  const warnY = H - (100 / maxVal) * (H - 6) - 3;
  if (warnY > 0 && warnY < H) {
    ctx.beginPath();
    ctx.strokeStyle = '#d2992250';
    ctx.lineWidth   = 1;
    ctx.setLineDash([4, 4]);
    ctx.moveTo(0, warnY);
    ctx.lineTo(W, warnY);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Linha de latência
  ctx.beginPath();
  ctx.strokeStyle = '#58a6ff';
  ctx.lineWidth   = 1.5;
  let first = true;
  state.latencyHistory.forEach((v, i) => {
    if (v === null) { first = true; return; }
    const x = i * step;
    const y = H - (v / maxVal) * (H - 6) - 3;
    first ? (ctx.moveTo(x, y), first = false) : ctx.lineTo(x, y);
  });
  ctx.stroke();

  // Valor atual
  const last = data[data.length - 1];
  const col  = last > 300 ? '#f85149' : last > 100 ? '#d29922' : '#3fb950';
  ctx.fillStyle = col;
  ctx.font      = 'bold 10px Segoe UI';
  ctx.fillText(last.toFixed(1) + ' ms', 4, 12);
}

// ── Toggle do botão de monitoramento ─────────────
let monActive = true;
document.getElementById('btn-monitor').addEventListener('click', function () {
  monActive = !monActive;
  this.innerHTML = monActive
    ? '<i class="fa fa-satellite-dish"></i> Monitoramento'
    : '<i class="fa fa-satellite-dish"></i> Pausado';
  this.classList.toggle('active', monActive);

  if (monActive) {
    startPolling();
  } else {
    clearInterval(state._summaryInterval);
    clearInterval(state._alertsInterval);
  }
});

// Redesenha o canvas quando a janela muda de tamanho
window.addEventListener('resize', drawLatency);

// Desenha vazio na inicialização
drawLatency();
