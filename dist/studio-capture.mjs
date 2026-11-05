const launch = document.querySelector('#mir-start-capture');
launch?.addEventListener('click', async () => {
  launch.disabled = true;
  const status = document.querySelector('#mir-capture-status');
  status.textContent = 'Ouverture du Studio Capture…';
  try {
    const {mountPreviewCapture} = await import('https://atelier.atelier-app-001.workers.dev/responsive/v1/entry.mjs');
    mountPreviewCapture(document.body, {
      title: 'MIR · Pliage sur mesure',
      filename: 'MIR-Pliage-PC',
      targets: () => ['#production-main']
    });
    status.textContent = '';
    launch.hidden = true;
    document.querySelector('#mir-capture-toolbar .capture-trigger').click();
  } catch {
    status.textContent = 'Impossible d’ouvrir le Studio Capture. Réessaie dans un instant.';
    launch.disabled = false;
  }
});
