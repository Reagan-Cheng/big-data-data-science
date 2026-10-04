(() => {
  'use strict';
  const publicBase = 'https://reagan-cheng.github.io/big-data-data-science/';
  const cell = 16;
  const quietZone = 4;

  document.querySelectorAll('[data-qr-path]').forEach(panel => {
    const url = new URL(panel.dataset.qrPath.replace(/^\//, ''), publicBase).href;
    const image = panel.querySelector('img');
    const download = panel.querySelector('.qr-download');
    const link = panel.querySelector('.qr-link');
    if (link) {
      link.href = url;
      link.textContent = url;
    }
    try {
      const code = qrcode(0, 'M');
      code.addData(url, 'Byte');
      code.make();
      const modules = code.getModuleCount();
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = (modules + quietZone * 2) * cell;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas unavailable');
      context.fillStyle = '#ffffff';
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = '#000000';
      for (let row = 0; row < modules; row++) {
        for (let col = 0; col < modules; col++) {
          if (code.isDark(row, col)) {
            context.fillRect((col + quietZone) * cell, (row + quietZone) * cell, cell, cell);
          }
        }
      }
      const png = canvas.toDataURL('image/png');
      image.src = png;
      download.href = png;
    } catch (error) {
      // The hosted PNG remains available when canvas or JavaScript is restricted.
      console.warn('Using the saved QR Code image.', error);
    }
  });

  function translate() {
    const english = document.documentElement.lang === 'en';
    document.querySelectorAll('[data-qr-zh][data-qr-en]').forEach(element => {
      const value = english ? element.dataset.qrEn : element.dataset.qrZh;
      if (element.tagName === 'IMG') element.alt = value;
      else element.textContent = value;
    });
  }
  translate();
  new MutationObserver(translate).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['lang']
  });
})();
