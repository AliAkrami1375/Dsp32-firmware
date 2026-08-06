// Notepad — plain text editor over the device filesystem
(function () {
  function create(path) {
    const win = WM.open({ appId: 'notepad', title: 'Untitled — Notepad', icon: I.notepad, w: 700, h: 500 });
    const restored = path && typeof path === 'object' ? path : null;
    const st = { path: null, dirty: false, wrap: true };
    // Unsaved work is the whole point of restoring an editor, so the buffer
    // travels with the session rather than just the filename.
    win.session = () => ({
      path: st.path, dirty: st.dirty,
      text: st.dirty ? ta.value : null,
      caret: ta.selectionStart,
    });

    win.body.innerHTML = `
      <div class="pad">
        <div class="pad-menu">
          <button data-a="new">New</button>
          <button data-a="open">Open…</button>
          <button data-a="save">Save</button>
          <button data-a="saveas">Save as…</button>
          <button data-a="wrap">Wrap: on</button>
        </div>
        <textarea spellcheck="false"></textarea>
        <div class="pad-status"><span class="ps-pos">Ln 1, Col 1</span><span class="ps-path"></span></div>
      </div>`;

    const ta = win.body.querySelector('textarea');
    const $ = s => win.body.querySelector(s);

    function refreshTitle() {
      const name = st.path ? st.path.split('/').pop() : 'Untitled';
      win.setTitle((st.dirty ? '● ' : '') + name + ' — Notepad');
      $('.ps-path').textContent = st.path || '';
    }
    function markDirty(d) { if (st.dirty !== d) { st.dirty = d; refreshTitle(); } }

    ta.addEventListener('input', () => markDirty(true));
    ta.addEventListener('keyup', updatePos);
    ta.addEventListener('click', updatePos);
    function updatePos() {
      const upto = ta.value.slice(0, ta.selectionStart).split('\n');
      $('.ps-pos').textContent = `Ln ${upto.length}, Col ${upto[upto.length - 1].length + 1}`;
    }

    async function doOpen(p) {
      try {
        const text = await API.fsReadText(p);
        st.path = p; ta.value = text; markDirty(false); refreshTitle();
      } catch (e) { Shell.toast('Notepad', 'Cannot open ' + p); }
    }
    async function doSave(as) {
      let p = st.path;
      if (as || !p) {
        p = await Shell.pickPath({ mode: 'save', title: 'Save as', defaultName: st.path ? st.path.split('/').pop() : 'untitled.txt' });
        if (!p) return;
      }
      try {
        await API.fsWrite(p, ta.value);
        st.path = p; markDirty(false); refreshTitle();
        Platform.emit('fs:changed', p.slice(0, p.lastIndexOf('/')));
        Shell.toast('Notepad', 'Saved ' + p, I.save);
      } catch (e) { Shell.toast('Notepad', 'Save failed: ' + e.message); }
    }

    win.body.querySelectorAll('.pad-menu button').forEach(b => b.addEventListener('click', async () => {
      const a = b.dataset.a;
      if (a === 'new') { st.path = null; ta.value = ''; markDirty(false); refreshTitle(); }
      else if (a === 'open') { const p = await Shell.pickPath({ mode: 'open', title: 'Open file' }); if (p) doOpen(p); }
      else if (a === 'save') doSave(false);
      else if (a === 'saveas') doSave(true);
      else if (a === 'wrap') { st.wrap = !st.wrap; ta.wrap = st.wrap ? 'soft' : 'off'; b.textContent = 'Wrap: ' + (st.wrap ? 'on' : 'off'); }
    }));

    ta.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); doSave(false); }
      if (e.key === 'Tab') {
        e.preventDefault();
        const s = ta.selectionStart;
        ta.setRangeText('  ', s, ta.selectionEnd, 'end');
        markDirty(true);
      }
    });

    if (restored) {
      (async () => {
        if (restored.path) await doOpen(restored.path);
        if (restored.dirty && restored.text != null) {
          ta.value = restored.text;
          markDirty(true);
        }
        if (restored.caret != null) ta.setSelectionRange(restored.caret, restored.caret);
      })();
    } else if (typeof path === 'string') {
      doOpen(path);
    }
    refreshTitle();
    setTimeout(() => ta.focus(), 80);
    return win;
  }

  Shell.registerApp({
    id: 'notepad', name: 'Notepad', icon: I.notepad, order: 4, pin: true, multi: true,
    opens: ['text', 'code'],
    launch: (arg) => create(arg),
  });
})();
