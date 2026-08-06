// Task Manager — live performance charts + full system details
(function () {
  function create() {
    const win = WM.open({ appId: 'monitor', title: 'Task Manager', icon: I.monitor, w: 820, h: 580 });
    let timer = null, view = 'perf';
    const heapHist = [], MAXH = 90;

    win.onClose = () => { if (timer) clearInterval(timer); };

    win.body.innerHTML = `
      <div class="mon">
        <div class="mon-side">
          <div class="snav sel" data-v="perf">${I.monitor}<span>Performance</span></div>
          <div class="snav" data-v="proc">${I.cpu}<span>Processes</span></div>
          <div class="snav" data-v="svc">${I.appbox}<span>Services</span></div>
          <div class="snav" data-v="sys">${I.info}<span>System</span></div>
        </div>
        <div class="mon-body"></div>
      </div>`;
    const body = win.body.querySelector('.mon-body');

    win.body.querySelectorAll('.mon-side .snav').forEach(n => n.addEventListener('click', () => {
      win.body.querySelectorAll('.mon-side .snav').forEach(x => x.classList.remove('sel'));
      n.classList.add('sel');
      view = n.dataset.v;
      render(lastSys);
    }));

    let lastSys = Shell.sys;

    // Newest sample sits at the right edge and history scrolls left, so the
    // chart reads correctly from the first sample instead of hugging x=0.
    function drawChart(canvas, data, max) {
      const ctx = canvas.getContext('2d');
      const dpr = devicePixelRatio || 1;
      const W = canvas.width = canvas.clientWidth * dpr;
      const H = canvas.height = canvas.clientHeight * dpr;
      ctx.clearRect(0, 0, W, H);

      const css = getComputedStyle(document.documentElement);
      const accent = css.getPropertyValue('--accent').trim() || '#4cc2ff';
      const stroke = css.getPropertyValue('--stroke').trim() || 'rgba(255,255,255,.09)';

      ctx.strokeStyle = stroke;
      ctx.lineWidth = dpr;
      for (let i = 1; i < 4; i++) {
        const y = (H / 4) * i;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
      for (let i = 1; i < 6; i++) {
        const x = (W / 6) * i;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }

      if (data.length < 2) return;

      const pad = 3 * dpr;
      const step = W / (MAXH - 1);
      const xAt = i => W - (data.length - 1 - i) * step;
      const yAt = v => H - (v / max) * (H - pad * 2) - pad;

      ctx.beginPath();
      data.forEach((v, i) => (i ? ctx.lineTo(xAt(i), yAt(v)) : ctx.moveTo(xAt(i), yAt(v))));

      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, accent + '55');
      grad.addColorStop(1, accent + '00');
      const line = new Path2D();
      data.forEach((v, i) => (i ? line.lineTo(xAt(i), yAt(v)) : line.moveTo(xAt(i), yAt(v))));

      ctx.lineTo(xAt(data.length - 1), H);
      ctx.lineTo(xAt(0), H);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.strokeStyle = accent;
      ctx.lineWidth = 2 * dpr;
      ctx.lineJoin = 'round';
      ctx.stroke(line);
    }

    function render(s) {
      if (!s) { body.innerHTML = '<div class="empty-state">Loading…</div>'; return; }
      if (view === 'proc') { renderProcesses(); return; }
      if (view === 'svc') { renderServices(); return; }
      if (view === 'perf') {
        const info = Shell.fsInfo || {};
        const heapPct = Math.round((1 - s.heapFree / s.heapTotal) * 100);
        body.innerHTML = `
          <div class="mon-cards">
            <div class="mon-card"><h4>CPU</h4><div class="big">${s.cpuMhz} MHz</div><small>${escapeHtml(s.chip)} · ${s.cores} core${s.cores > 1 ? 's' : ''}</small></div>
            <div class="mon-card"><h4>Memory in use</h4><div class="big">${heapPct}%</div><small>${fmtBytes(s.heapFree)} free of ${fmtBytes(s.heapTotal)}</small></div>
            ${s.psramTotal ? `<div class="mon-card"><h4>PSRAM</h4><div class="big">${fmtBytes(s.psramFree)}</div><small>free of ${fmtBytes(s.psramTotal)}</small></div>` : ''}
            ${s.tempC != null ? `<div class="mon-card"><h4>Temperature</h4><div class="big">${s.tempC}°C</div><small>internal sensor</small></div>` : ''}
            <div class="mon-card"><h4>Uptime</h4><div class="big">${fmtUptime(s.uptimeMs)}</div><small>${s.stations} client${s.stations === 1 ? '' : 's'} connected</small></div>
          </div>
          <div class="mon-chart"><h4 style="font-size:12px;color:var(--text-2);margin-bottom:8px">Heap usage · 3 min</h4><canvas></canvas></div>
          <div class="mon-cards">
            ${storCard('Flash storage', info.flash)}
            ${storCard('SD card', info.sd)}
          </div>`;
        const cv = body.querySelector('canvas');
        if (cv && heapHist.length > 1) drawChart(cv, heapHist, s.heapTotal);
      } else {
        body.innerHTML = `<table>
          ${row('Device', s.name + ' v' + s.version)}
          ${row('Chip', s.chip + ' rev ' + s.revision)}
          ${row('Cores', s.cores)}
          ${row('CPU frequency', s.cpuMhz + ' MHz')}
          ${row('Flash size', fmtBytes(s.flashSize))}
          ${row('Firmware partition', fmtBytes(s.sketchSize))}
          ${row('Heap (free / min / total)', `${fmtBytes(s.heapFree)} / ${fmtBytes(s.heapMin)} / ${fmtBytes(s.heapTotal)}`)}
          ${row('PSRAM', s.psramTotal ? `${fmtBytes(s.psramFree)} free of ${fmtBytes(s.psramTotal)}` : 'not present')}
          ${row('MAC address', s.mac)}
          ${row('SDK', s.sdk)}
          ${row('Camera', s.camera ? 'detected' : 'not present')}
          ${row('SD card', s.sd ? 'mounted' : 'not present')}
          ${row('Uptime', fmtUptime(s.uptimeMs))}
        </table>`;
      }
    }
    // ---- background services ----
    // Work an app deployed and then walked away from: a Diba Manager flow, a
    // poller, anything registered with Services. Shown here because a window
    // is not a process, and something that keeps running should be visible
    // and killable from one place.
    function renderServices() {
      const svc = Services.list();
      if (!svc.length) {
        body.innerHTML = `<div class="empty-state">${I.appbox}
          <div><b>Nothing running in the background</b><br>
          <small style="color:var(--text-3)">Apps that deploy work — a Diba
          Manager flow, for instance — show up here and keep running after
          their window is closed.</small></div></div>`;
        return;
      }

      const uptime = (r) => fmtUptime(Date.now() - r.startedAt);
      body.innerHTML = `
        <div class="mon-cards" style="margin-bottom:14px">
          <div class="mon-card"><h4>Services</h4><div class="big">${svc.length}</div>
            <small>${Services.running()} running</small></div>
          <div class="mon-card"><h4>Combined rate</h4>
            <div class="big">${svc.reduce((s, r) => s + (r.state === 'running' ? 1000 / r.interval : 0), 0).toFixed(1)}/s</div>
            <small>ticks across all services</small></div>
        </div>
        <table class="proc-table">
          <thead><tr><th>Name</th><th>Owner</th><th>State</th><th>Every</th>
            <th>Ticks</th><th>Uptime</th><th></th></tr></thead>
          <tbody>${svc.map(r => `
            <tr data-id="${escapeHtml(r.id)}">
              <td><b>${escapeHtml(r.name)}</b>${r.lastError
                ? `<div style="color:#ff7a70;font-size:11px">${escapeHtml(r.lastError)}</div>` : ''}</td>
              <td>${escapeHtml(r.appId || '—')}</td>
              <td><span class="proc-state ${r.state === 'running' ? 'running' : r.state === 'paused' ? 'suspended' : ''}">${r.state}</span></td>
              <td>${r.interval >= 1000 ? (r.interval / 1000) + 's' : r.interval + 'ms'}</td>
              <td>${r.ticks.toLocaleString()}</td>
              <td>${uptime(r)}</td>
              <td style="text-align:right;white-space:nowrap">
                <button class="btn sm" data-a="toggle">${r.state === 'running' ? 'Pause' : 'Resume'}</button>
                <button class="btn sm danger" data-a="stop">Stop</button>
              </td>
            </tr>`).join('')}</tbody>
        </table>`;

      body.querySelectorAll('.proc-table tbody tr').forEach(tr => {
        const id = tr.dataset.id;
        tr.querySelector('[data-a=toggle]').onclick = () => {
          const r = Services.get(id);
          if (r) r.state === 'running' ? Services.pause(id) : Services.resume(id);
          renderServices();
        };
        tr.querySelector('[data-a=stop]').onclick = () => {
          Services.forget(id);
          Services.stop(id);
          renderServices();
        };
      });
    }

    // ---- processes ----
    // Real FreeRTOS tasks. Sorted by CPU share so the busy ones stay at the
    // top; re-sorting every tick would make rows jump, so the order is only
    // recomputed when the tab is (re)opened or the sort column changes.
    let procs = null, procSort = 'cpuPct', procOrder = null;

    async function loadProcs() {
      try { procs = await API.tasks(); }
      catch (e) { procs = { supported: false, tasks: [], reason: 'No process API on this firmware' }; }
    }

    function renderProcesses() {
      if (!procs) {
        body.innerHTML = '<div class="empty-state">Reading process table…</div>';
        loadProcs().then(() => { procOrder = null; renderProcesses(); });
        return;
      }
      if (!procs.supported) {
        body.innerHTML = `<div class="empty-state">${I.cpu}
          <div><b>Process list unavailable</b><br>
          <small style="color:var(--text-3)">${escapeHtml(procs.reason || '')}</small></div></div>`;
        return;
      }

      const tasks = procs.tasks;
      if (!procOrder) {
        procOrder = [...tasks].sort((a, b) =>
          (b[procSort] || 0) - (a[procSort] || 0) ||
          String(a.name).localeCompare(b.name)).map(t => t.id);
      }
      const byId = Object.fromEntries(tasks.map(t => [t.id, t]));
      const ordered = procOrder.map(id => byId[id]).filter(Boolean);
      tasks.forEach(t => { if (!procOrder.includes(t.id)) ordered.push(t); });

      const totalCpu = tasks.reduce((s, t) => s + (t.cpuPct || 0), 0);
      const idle = tasks.filter(t => /^IDLE/.test(t.name))
                        .reduce((s, t) => s + (t.cpuPct || 0), 0);

      body.innerHTML = `
        <div class="mon-cards" style="margin-bottom:14px">
          <div class="mon-card"><h4>Threads</h4><div class="big">${tasks.length}</div>
            <small>running on the device</small></div>
          <div class="mon-card"><h4>CPU busy</h4>
            <div class="big">${Math.max(0, Math.round(totalCpu - idle))}%</div>
            <small>${Math.round(idle)}% idle</small></div>
          <div class="mon-card"><h4>Lowest stack</h4>
            <div class="big">${fmtBytes(Math.min(...tasks.map(t => t.stackFree || 0)))}</div>
            <small>free in the tightest thread</small></div>
        </div>
        <table class="proc-table">
          <thead><tr>
            <th data-s="name">Name</th>
            <th data-s="state">State</th>
            <th data-s="priority">Priority</th>
            <th data-s="core">Core</th>
            <th data-s="stackFree">Stack free</th>
            ${procs.runtimeStats ? '<th data-s="cpuPct">CPU</th>' : ''}
          </tr></thead>
          <tbody>${ordered.map(t => `
            <tr>
              <td><b>${escapeHtml(t.name)}</b></td>
              <td><span class="proc-state ${t.state}">${t.state}</span></td>
              <td>${t.priority}</td>
              <td>${t.core === undefined ? '—' : t.core}</td>
              <td>${fmtBytes(t.stackFree)}</td>
              ${procs.runtimeStats ? `<td>
                <div class="proc-cpu"><i style="width:${Math.min(100, t.cpuPct)}%"></i></div>
                <span>${(t.cpuPct || 0).toFixed(1)}%</span></td>` : ''}
            </tr>`).join('')}</tbody>
        </table>`;

      body.querySelectorAll('.proc-table th').forEach(th => {
        th.onclick = () => { procSort = th.dataset.s; procOrder = null; renderProcesses(); };
      });
    }

    const row = (k, v) => `<tr><td>${k}</td><td>${escapeHtml(String(v))}</td></tr>`;
    const storCard = (name, m) => {
      if (!m || !m.ok) return `<div class="mon-card"><h4>${name}</h4><div class="big" style="color:var(--text-3)">—</div><small>not mounted</small></div>`;
      const pct = m.total ? Math.round(m.used / m.total * 100) : 0;
      return `<div class="mon-card"><h4>${name}</h4><div class="big">${pct}%</div>
        <div class="meter${pct > 90 ? ' crit' : pct > 75 ? ' warn' : ''}" style="margin:8px 0 6px"><i style="width:${pct}%"></i></div>
        <small>${fmtBytes(m.used)} of ${fmtBytes(m.total)}</small></div>`;
    };

    async function tick() {
      try {
        const s = await API.system();
        lastSys = s;
        Shell.setSystem(s);
        heapHist.push(s.heapTotal - s.heapFree);
        if (heapHist.length > MAXH) heapHist.shift();
        if (view === 'proc') await loadProcs();
        render(s);
      } catch (e) {}
    }
    Shell.refreshFsInfo().then(() => tick());
    timer = setInterval(tick, 1000);
    render(lastSys);
    return win;
  }

  Shell.registerApp({
    id: 'monitor', name: 'Task Manager', icon: I.monitor, order: 6, pin: true,
    launch: () => create(),
  });
})();
