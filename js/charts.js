/* 依存なしの小さな SVG チャート */
(function () {
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /**
   * 棒（件数）＋折れ線（率）の複合チャート
   * data: [{label, bar, line}]  line は 0..1 または null
   */
  function combo(data, opt) {
    opt = opt || {};
    const W = 640, H = 220, L = 44, R = 52, T = 14, B = 30;
    const iw = W - L - R, ih = H - T - B;
    const rawMax = Math.max(1, ...data.map((d) => d.bar || 0));
    const maxBar = Math.ceil(rawMax / 4) * 4; // 目盛りが整数になるように
    const hasLine = data.some((d) => d.line != null) || opt.passLine != null;
    const n = data.length || 1;
    const bw = iw / n;
    let s = `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="${esc(opt.title || '')}">`;
    // grid
    for (let i = 0; i <= 4; i++) {
      const y = T + ih * (i / 4);
      s += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" class="grid"/>`;
      if (hasLine) s += `<text x="${W - R + 4}" y="${y + 4}" class="axis">${100 - i * 25}%</text>`;
      s += `<text x="${L - 4}" y="${y + 4}" class="axis" text-anchor="end">${Math.round(maxBar * (1 - i / 4))}</text>`;
    }
    if (opt.passLine != null) {
      const y = T + ih * (1 - opt.passLine);
      s += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" class="pass"/>`;
    }
    data.forEach((d, i) => {
      const h = ih * ((d.bar || 0) / maxBar);
      const x = L + i * bw + bw * 0.18;
      s += `<rect x="${x}" y="${T + ih - h}" width="${bw * 0.64}" height="${h}" class="bar" rx="2"><title>${esc(d.label)}: ${d.bar}問</title></rect>`;
      const every = Math.ceil(n / 8);
      if (i % every === 0 || (i === n - 1 && (n - 1) % every >= every / 2)) s += `<text x="${L + i * bw + bw / 2}" y="${H - 8}" class="axis" text-anchor="middle">${esc(d.label)}</text>`;
    });
    let path = '';
    data.forEach((d, i) => {
      if (d.line == null) return;
      const x = L + i * bw + bw / 2, y = T + ih * (1 - d.line);
      path += (path ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1);
    });
    if (path) s += `<path d="${path}" class="line"/>`;
    data.forEach((d, i) => {
      if (d.line == null) return;
      const x = L + i * bw + bw / 2, y = T + ih * (1 - d.line);
      s += `<circle cx="${x}" cy="${y}" r="3" class="dot"><title>${esc(d.label)}: ${Math.round(d.line * 100)}%</title></circle>`;
    });
    return s + '</svg>';
  }

  /** 複数系列の折れ線 series: [{name, cls, points:[{x(label), y}]}] y の最大値 yMax */
  function lines(labels, series, opt) {
    opt = opt || {};
    const W = 640, H = 220, L = 52, R = 16, T = 14, B = 30;
    const iw = W - L - R, ih = H - T - B;
    const yMax = opt.yMax || Math.max(1, ...series.flatMap((s) => s.values.filter((v) => v != null)));
    const n = Math.max(labels.length, 2);
    const xAt = (i) => L + iw * (i / (n - 1));
    const fmt = opt.percent ? (v) => Math.round(v * 100) + '%' : (v) => Math.round(v);
    let s = `<svg viewBox="0 0 ${W} ${H}" class="chart" role="img" aria-label="${esc(opt.title || '')}">`;
    for (let i = 0; i <= 4; i++) {
      const y = T + ih * (i / 4);
      s += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" class="grid"/>`;
      s += `<text x="${L - 4}" y="${y + 4}" class="axis" text-anchor="end">${fmt(yMax * (1 - i / 4))}</text>`;
    }
    const every = Math.ceil(labels.length / 8);
    labels.forEach((lb, i) => {
      if (i % every === 0 || (i === labels.length - 1 && i % every >= every / 2)) s += `<text x="${xAt(i)}" y="${H - 8}" class="axis" text-anchor="middle">${esc(lb)}</text>`;
    });
    if (opt.marker != null) {
      const x = xAt(opt.marker);
      s += `<line x1="${x}" x2="${x}" y1="${T}" y2="${T + ih}" class="pass"/>`;
      if (opt.markerLabel) s += `<text x="${x + 4}" y="${T + 10}" class="axis">${esc(opt.markerLabel)}</text>`;
    }
    series.forEach((se) => {
      let p = '';
      se.values.forEach((v, i) => {
        if (v == null) return;
        p += (p ? 'L' : 'M') + xAt(i).toFixed(1) + ' ' + (T + ih * (1 - v / yMax)).toFixed(1);
      });
      if (p) s += `<path d="${p}" class="line ${se.cls || ''}" ${se.dash ? 'stroke-dasharray="5 4"' : ''}/>`;
    });
    return s + '</svg>';
  }

  /** 学習カレンダー（直近 weeks 週）。counts: {dayKey: n} */
  function heatmap(counts, weeks, dayKeyFn) {
    weeks = weeks || 17;
    const cell = 13, gap = 3;
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const start = new Date(today);
    start.setDate(start.getDate() - start.getDay() - (weeks - 1) * 7); // 日曜始まり
    const W = weeks * (cell + gap) + 20, H = 7 * (cell + gap) + 4;
    let s = `<svg viewBox="0 0 ${W} ${H}" class="chart heat" role="img" aria-label="学習カレンダー">`;
    const max = Math.max(5, ...Object.values(counts));
    for (let w = 0; w < weeks; w++) {
      for (let d = 0; d < 7; d++) {
        const dt = new Date(start);
        dt.setDate(start.getDate() + w * 7 + d);
        if (dt > today) continue;
        const k = dayKeyFn(dt.getTime() + 4 * 3600000);
        const c = counts[k] || 0;
        const lv = c === 0 ? 0 : Math.min(4, Math.ceil((c / max) * 4));
        s += `<rect x="${20 + w * (cell + gap)}" y="${d * (cell + gap)}" width="${cell}" height="${cell}" rx="2" class="h${lv}"><title>${k}: ${c}問</title></rect>`;
      }
    }
    ['日', '', '火', '', '木', '', '土'].forEach((t, d) => {
      if (t) s += `<text x="0" y="${d * (cell + gap) + 10}" class="axis">${t}</text>`;
    });
    return s + '</svg>';
  }

  /** 横棒（分野別正答率など）rows: [{label, value(0..1|null), sub}] */
  function hbars(rows, opt) {
    opt = opt || {};
    let s = '<div class="hbars">';
    rows.forEach((r) => {
      const v = r.value == null ? null : Math.round(r.value * 100);
      const cls = v == null ? 'na' : v >= 80 ? 'good' : v >= 60 ? 'mid' : 'low';
      s += `<div class="hbar"><div class="hl">${esc(r.label)}</div><div class="ht"><div class="hf ${cls}" style="width:${v || 0}%"></div>${opt.passLine ? `<div class="hp" style="left:${opt.passLine * 100}%"></div>` : ''}</div><div class="hv">${v == null ? '—' : v + '%'}<small>${esc(r.sub || '')}</small></div></div>`;
    });
    return s + '</div>';
  }

  window.Charts = { combo, lines, heatmap, hbars, esc };
})();
