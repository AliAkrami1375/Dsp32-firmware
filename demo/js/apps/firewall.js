// Firewall — who is on the hotspot, and who is allowed to be.
//
// The device keeps a small history per MAC, so this shows more than a list of
// addresses: the DHCP lease, when a device first appeared and last left, and
// how many times it has joined. Two policies are available — block individual
// devices, or flip to allowlist mode where only approved MACs may stay.
(function () {
  const REFRESH_MS = 4000;

  function create() {
    const win = WM.open({ appId: 'firewall', title: 'Firewall', icon: I.shield, w: 720, h: 600 });
    let timer = null, data = null;
    win.onClose = () => clearInterval(timer);

    win.body.innerHTML = `<div class="fw">
      <div class="fw-head">
        ${I.shield}
        <div class="grow">
          <b>Hotspot firewall</b>
          <small id="fw-sub">Loading…</small>
        </div>
        <button class="btn sm" id="fw-refresh">${I.refresh}<span>Refresh</span></button>
      </div>
      <div class="fw-policy">
        <div class="grow">
          <b>Allowlist mode</b>
          <small>When on, only approved devices may stay connected. Everything
            else is disconnected the moment it joins — including devices that
            are connected right now.</small>
        </div>
        <label class="switch"><input type="checkbox" id="fw-allowmode"><i></i></label>
      </div>
      <div class="fw-body" id="fw-body"></div>
    </div>`;

    const $ = s => win.body.querySelector(s);
    const body = $('#fw-body');

    $('#fw-refresh').onclick = () => refresh();
    $('#fw-allowmode').onchange = async (e) => {
      const on = e.target.checked;
      if (on) {
        const approved = (data && data.allowed.length) || 0;
        const ok = await Shell.confirm('Turn on allowlist mode',
          approved
            ? `Only the ${approved} approved device(s) will be able to stay. Everything else is disconnected now.`
            : 'No devices are approved yet, so every client — including this one — will be disconnected. Approve a device first.',
          'Turn on');
        if (!ok) { e.target.checked = false; return; }
      }
      try { await post(`/api/fw/allowlist?on=${on ? 1 : 0}`); refresh(); }
      catch (err) { Shell.toast('Firewall', 'Failed: ' + err.message); e.target.checked = !on; }
    };

    async function post(url) {
      const r = await fetch(url, { method: 'POST' });
      if (!r.ok) {
        let msg = 'HTTP ' + r.status;
        try { msg = (await r.json()).error || msg; } catch (e) {}
        throw new Error(msg);
      }
      return r.json().catch(() => ({}));
    }

    const ago = (ms) => {
      if (!ms) return 'just now';
      const d = Math.max(0, (data.uptimeMs || 0) - ms);
      if (d < 60000) return Math.round(d / 1000) + 's ago';
      if (d < 3600000) return Math.round(d / 60000) + 'm ago';
      return Math.round(d / 3600000) + 'h ago';
    };

    function row(c) {
      const el = document.createElement('div');
      el.className = 'fw-client' + (c.blocked ? ' blocked' : '') +
                     (c.online ? '' : ' offline');

      const tags = [];
      if (c.blocked) tags.push('<i class="bad">blocked</i>');
      if (data.allowlistMode) {
        tags.push(c.allowed ? '<i class="good">allowed</i>' : '<i class="warn">not approved</i>');
      }
      if (!c.online) tags.push('<i>offline</i>');

      el.innerHTML = `
        <span class="fw-ico">${c.blocked ? I.wifiOff : I.wifi}</span>
        <div class="grow">
          <b>${escapeHtml(c.mac)} ${tags.join(' ')}</b>
          <small>
            ${c.ip ? escapeHtml(c.ip) + ' · ' : ''}
            ${c.online ? `${c.rssi} dBm` : `last seen ${ago(c.lastSeenMs)}`}
            ${c.joins > 1 ? ` · joined ${c.joins}×` : ''}
          </small>
        </div>`;

      const actions = document.createElement('div');
      actions.className = 'fw-actions';

      if (data.allowlistMode) {
        const allow = document.createElement('button');
        allow.className = 'btn sm' + (c.allowed ? '' : ' primary');
        allow.textContent = c.allowed ? 'Revoke' : 'Approve';
        allow.onclick = () => act(`/api/fw/allow?mac=${encodeURIComponent(c.mac)}&allow=${c.allowed ? 0 : 1}`,
          c.allowed ? `${c.mac} revoked` : `${c.mac} approved`);
        actions.appendChild(allow);
      }

      const blk = document.createElement('button');
      blk.className = 'btn sm' + (c.blocked ? '' : ' danger');
      blk.textContent = c.blocked ? 'Unblock' : 'Block';
      blk.onclick = async () => {
        if (!c.blocked && !await Shell.confirm('Block device',
          `Block ${c.mac}? It is disconnected immediately and cannot rejoin.`, 'Block')) return;
        act(`/api/fw/${c.blocked ? 'unblock' : 'block'}?mac=${encodeURIComponent(c.mac)}`,
            `${c.mac} ${c.blocked ? 'unblocked' : 'blocked'}`);
      };
      actions.appendChild(blk);

      if (!c.online) {
        const forget = document.createElement('button');
        forget.className = 'btn sm';
        forget.textContent = 'Forget';
        forget.onclick = () => act(`/api/fw/forget?mac=${encodeURIComponent(c.mac)}`,
                                   `${c.mac} removed from history`);
        actions.appendChild(forget);
      }

      el.appendChild(actions);
      return el;
    }

    async function act(url, message) {
      try { await post(url); Shell.toast('Firewall', message, I.shield); refresh(); }
      catch (e) { Shell.toast('Firewall', 'Failed: ' + e.message); }
    }

    function section(title, items, empty) {
      const wrap = document.createElement('div');
      wrap.className = 'fw-section';
      wrap.innerHTML = `<h3>${title} <span>${items.length}</span></h3>`;
      if (!items.length) {
        wrap.innerHTML += `<div class="fw-empty">${empty}</div>`;
      } else {
        items.forEach(c => wrap.appendChild(row(c)));
      }
      return wrap;
    }

    async function refresh() {
      try { data = await API.fwList(); }
      catch (e) {
        body.innerHTML = '<div class="fw-empty">This firmware has no firewall API.</div>';
        clearInterval(timer);
        return;
      }

      $('#fw-sub').textContent =
        `${data.online} of ${data.maxClients} slots in use · ` +
        `${data.blocked.length} blocked` +
        (data.allowlistMode ? ` · ${data.allowed.length} approved` : '');
      $('#fw-allowmode').checked = data.allowlistMode;

      body.innerHTML = '';
      body.appendChild(section('Connected', data.clients,
        'Nothing is connected to the hotspot.'));
      body.appendChild(section('Seen before', data.known,
        'No other device has connected yet.'));

      // Blocked MACs that have never been seen still need a way back.
      const orphans = data.blocked.filter(mac =>
        ![...data.clients, ...data.known].some(c => c.mac === mac))
        .map(mac => ({ mac, blocked: true, online: false, allowed: false, rssi: 0, joins: 0 }));
      if (orphans.length) {
        body.appendChild(section('Blocked', orphans, ''));
      }
    }

    refresh();
    timer = setInterval(refresh, REFRESH_MS);
    return win;
  }

  Shell.registerApp({
    id: 'firewall', name: 'Firewall', icon: I.shield, order: 9,
    launch: () => create(),
  });
})();
