// Calculator — Windows 11 style
(function () {
  function create() {
    const win = WM.open({ appId: 'calc', title: 'Calculator', icon: I.calc, w: 340, h: 500 });
    let expr = '', cur = '0', reset = false;

    win.body.innerHTML = `
      <div class="calc">
        <div class="calc-display">
          <div class="calc-expr"></div>
          <div class="calc-out">0</div>
        </div>
        <div class="calc-keys">
          ${[
            ['%', 'op'], ['CE', 'op'], ['C', 'op'], ['⌫', 'op'],
            ['1/x', 'op'], ['x²', 'op'], ['√x', 'op'], ['÷', 'op'],
            ['7', ''], ['8', ''], ['9', ''], ['×', 'op'],
            ['4', ''], ['5', ''], ['6', ''], ['−', 'op'],
            ['1', ''], ['2', ''], ['3', ''], ['+', 'op'],
            ['±', ''], ['0', ''], ['.', ''], ['=', 'eq'],
          ].map(k => `<button class="${k[1]}" data-k="${k[0]}">${k[0]}</button>`).join('')}
        </div>
      </div>`;

    const exprEl = win.body.querySelector('.calc-expr');
    const outEl = win.body.querySelector('.calc-out');

    const fmt = n => {
      if (!isFinite(n)) return 'Cannot divide by zero';
      const s = String(Math.round(n * 1e10) / 1e10);
      return s.length > 16 ? n.toExponential(8) : s;
    };
    const show = () => { exprEl.textContent = expr; outEl.textContent = cur; };

    function evalExpr(e) {
      const safe = e.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
      if (!/^[\d+\-*/. ()]+$/.test(safe)) return NaN;
      try { return Function('"use strict";return (' + safe + ')')(); } catch (x) { return NaN; }
    }

    function key(k) {
      if (/\d/.test(k)) {
        cur = (reset || cur === '0') ? k : cur + k;
        reset = false;
      } else if (k === '.') {
        if (reset) { cur = '0.'; reset = false; }
        else if (!cur.includes('.')) cur += '.';
      } else if (k === 'C') { expr = ''; cur = '0'; }
      else if (k === 'CE') cur = '0';
      else if (k === '⌫') cur = cur.length > 1 ? cur.slice(0, -1) : '0';
      else if (k === '±') cur = cur.startsWith('-') ? cur.slice(1) : (cur !== '0' ? '-' + cur : cur);
      else if (k === '%') cur = fmt(parseFloat(cur) / 100);
      else if (k === '1/x') cur = fmt(1 / parseFloat(cur));
      else if (k === 'x²') cur = fmt(Math.pow(parseFloat(cur), 2));
      else if (k === '√x') cur = fmt(Math.sqrt(parseFloat(cur)));
      else if (['+', '−', '×', '÷'].includes(k)) {
        expr = expr + cur + ' ' + k + ' ';
        cur = '0'; reset = true;
        const partial = evalExpr(expr.slice(0, -3));
        if (!isNaN(partial)) cur = fmt(partial), reset = true;
      } else if (k === '=') {
        const full = expr + cur;
        const v = evalExpr(full);
        if (!isNaN(v)) { exprEl.textContent = full + ' ='; cur = fmt(v); expr = ''; reset = true; outEl.textContent = cur; return; }
      }
      show();
    }

    win.body.querySelectorAll('.calc-keys button').forEach(b =>
      b.addEventListener('click', () => key(b.dataset.k)));

    document.addEventListener('keydown', function kb(e) {
      if (!document.body.contains(win.el)) { document.removeEventListener('keydown', kb); return; }
      if (WM.activeWin() !== win) return;
      const map = { '*': '×', '/': '÷', '-': '−', 'Enter': '=', '=': '=', '+': '+', 'Backspace': '⌫', 'Escape': 'C', '.': '.' };
      if (/\d/.test(e.key)) key(e.key);
      else if (map[e.key]) { e.preventDefault(); key(map[e.key]); }
    });

    show();
    return win;
  }

  Shell.registerApp({
    id: 'calc', name: 'Calculator', icon: I.calc, order: 7,
    launch: () => create(),
  });
})();
