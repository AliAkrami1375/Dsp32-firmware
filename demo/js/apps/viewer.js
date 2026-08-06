// Photos — image viewer with zoom
(function () {
  function create(path) {
    const name = path ? path.split('/').pop() : 'Photos';
    const win = WM.open({ appId: 'viewer', title: name + ' — Photos', icon: I.photos, w: 760, h: 560 });
    let zoom = 1;
    win.session = () => ({ path });

    win.body.innerHTML = `
      <div class="pv">
        <div class="pv-view">${path ? `<img id="pv-img" alt="">`
          : `<div class="empty-state">${I.photos}<div>Open an image from File Explorer</div></div>`}</div>
        <div class="pv-bar">
          <button class="btn sm" data-a="out">${I.zoomOut}</button>
          <button class="btn sm" data-a="fit">${I.fit}<span>Fit</span></button>
          <button class="btn sm" data-a="in">${I.zoomIn}</button>
          <span style="width:10px"></span>
          <button class="btn sm" data-a="open">${I.openFile}<span>Open…</span></button>
          ${path ? `<button class="btn sm" data-a="dl">${I.download}<span>Download</span></button>` : ''}
        </div>
      </div>`;

    const img = () => win.body.querySelector('.pv-view img');
    const apply = () => { const im = img(); if (im) im.style.transform = `scale(${zoom})`; };

    win.body.querySelectorAll('.pv-bar .btn').forEach(b => b.addEventListener('click', async () => {
      const a = b.dataset.a;
      if (a === 'in') { zoom = Math.min(8, zoom * 1.25); apply(); }
      else if (a === 'out') { zoom = Math.max(0.1, zoom / 1.25); apply(); }
      else if (a === 'fit') { zoom = 1; apply(); }
      else if (a === 'dl') Shell.downloadPath(path);
      else if (a === 'open') {
        const p = await Shell.pickPath({ mode: 'open', title: 'Open image' });
        if (p) { win.close(); Shell.launch('viewer', p); }
      }
    }));
    win.body.querySelector('.pv-view').addEventListener('wheel', e => {
      e.preventDefault();
      zoom = Math.min(8, Math.max(0.1, zoom * (e.deltaY < 0 ? 1.12 : 0.9)));
      apply();
    }, { passive: false });

    // Loaded through the API rather than by the browser, so it works
    // wherever the desktop is served from.
    if (path) {
      API.fsObjectUrl(path)
        .then(u => { const i = win.body.querySelector('#pv-img'); if (i) i.src = u; })
        .catch(() => {});
    }

    return win;
  }

  Shell.registerApp({
    id: 'viewer', name: 'Photos', icon: I.photos, order: 8, multi: true, desktop: false,
    opens: ['image'],
    launch: (arg) => create(typeof arg === 'string' ? arg : (arg && arg.path) || undefined),
  });
})();
