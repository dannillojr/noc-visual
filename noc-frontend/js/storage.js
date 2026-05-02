/**
 * storage.js
 * Exporta e importa a configuração dos dispositivos em JSON.
 * O export baixa diretamente do backend (dados reais).
 * O import envia cada dispositivo para o backend via POST.
 */

// ── Export ────────────────────────────────────────
// (implementado em main.js — btn-export)

// ── Import ────────────────────────────────────────
document.getElementById('btn-import').onclick = () => {
  document.getElementById('file-import').click();
};

document.getElementById('file-import').addEventListener('change', async function () {
  const file = this.files[0];
  if (!file) return;

  try {
    const text    = await file.text();
    const devices = JSON.parse(text);

    if (!Array.isArray(devices)) {
      alert('Arquivo inválido. Deve ser um array JSON de dispositivos.');
      return;
    }

    if (!confirm(`Importar ${devices.length} dispositivos para o banco?`)) return;

    let ok = 0, fail = 0;
    for (const d of devices) {
      try {
        await api.devices.create({
          name:          d.name          || d.nome || 'Sem nome',
          ip_address:    d.ip_address    || d.ip   || '0.0.0.0',
          type:          d.type          || 'server',
          location_name: d.location_name || d.location || null,
          latitude:      d.latitude      || d.lat  || null,
          longitude:     d.longitude     || d.lng  || null,
          priority:      d.priority      || 5,
          notes:         d.notes         || null,
          enabled:       true,
        });
        ok++;
      } catch (e) {
        console.warn('Falha ao importar:', d.name, e.message);
        fail++;
      }
    }

    addAlert(
      `📥 Importação concluída`,
      `${ok} importados · ${fail} com erro`,
      fail ? 'warn' : 'ok'
    );

    // Recarrega o mapa
    await loadDevicesFromAPI();

  } catch (e) {
    alert('Erro ao ler arquivo: ' + e.message);
  } finally {
    this.value = '';  // limpa input para permitir reimport
  }
});
