/* SA Study — システムアーキテクト試験 学習アプリ */
(function () {
  'use strict';

  // ---------------------------------------------------------------- 定数・データ
  const QB = window.QB || {};
  const A1 = (QB.a1 || []).map((q) => Object.assign({ exam: 'A1' }, q));
  const A2 = (QB.a2 || []).map((q) => Object.assign({ exam: 'A2' }, q));
  const B1 = QB.b1 || [];
  const B2 = QB.b2 || [];
  const ALLA = A1.concat(A2);
  // IPA 過去問：set（年度・時間区分）ごとの問題 ID（問番号順）
  const SETS = {};
  ALLA.concat(B1, B2).forEach((q) => { if (q.set) (SETS[q.set] = SETS[q.set] || []).push(q); });
  Object.values(SETS).forEach((a) => a.sort((x, y) => (x.no || 0) - (y.no || 0)));
  const SET_TYPE = { am1: 'A1', am2: 'A2', pm1: 'B1', pm2: 'B2' };
  const ERA = (y) => { const m = /^(\d{4})r(\d\d)([ha])/.exec(y); return m ? `令和${+m[2]}年度 ${m[3] === 'h' ? '春期' : '秋期'}` : y; };
  const TIME_LABEL = { am1: '午前Ⅰ', am2: '午前Ⅱ', pm1: '午後Ⅰ', pm2: '午後Ⅱ' };
  function setLabel(set) { const [y, t] = set.split('-'); return `${ERA(y)} ${TIME_LABEL[t] || t}`; }
  function setType(set) { return SET_TYPE[set.split('-')[1]]; }
  const isPast = (q) => !!(q && q.set);
  /** 通常出題に使える問題か（現行で通用しない過去問・重複・設定で除外したもの以外） */
  function usable(q) {
    if (!isPast(q)) return true;
    if (q.obsolete || q.dupOf) return false;
    return S.settings.includePast !== false;
  }
  function figHtml(src, alt) { return src ? `<figure class="qfig"><img src="${esc(src)}" alt="${esc(alt || '図')}" loading="lazy" data-zoom="1" tabindex="0" role="button" aria-label="図を拡大表示"><figcaption class="srcnote">タップで拡大</figcaption></figure>` : ''; }
  /** 図の拡大表示（横スクロール・ピンチで細部まで読める） */
  function openZoom(img) {
    const o = document.createElement('div');
    o.className = 'zoomer'; o.setAttribute('role', 'dialog'); o.setAttribute('aria-label', '図の拡大表示');
    o.innerHTML = `<button class="iconbtn zclose" aria-label="閉じる">${ICON.close}</button><div class="zbody"><img src="${img.getAttribute('src')}" alt="${esc(img.alt)}"></div><p class="zalt">${esc(img.alt)}</p>`;
    const close = () => { o.remove(); document.removeEventListener('keydown', onKey, true); img.focus({ preventScroll: true }); };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
    o.addEventListener('click', (e) => { if (e.target === o || e.target.closest('.zclose')) close(); });
    document.addEventListener('keydown', onKey, true);
    document.body.appendChild(o);
    o.querySelector('.zclose').focus();
  }
  document.addEventListener('click', (e) => { const im = e.target.closest('img[data-zoom]'); if (im) openZoom(im); });
  function srcTag(q) { return isPast(q) ? `<span class="tag past" title="${esc(q.src)}">過去問 ${esc(setLabel(q.set).replace('令和', 'R').replace('年度 ', '').replace('春期', '春').replace('秋期', '秋'))} 問${q.no}</span>` : ''; }
  function pastNote(q) {
    if (!isPast(q)) return '';
    return `<p class="srcnote">出典：${esc(q.src)}（IPA 公表問題）。解説は本アプリ独自のものです。</p>${q.obsolete ? `<div class="callout">現行の試験では注意：${esc(q.obsolete)}</div>` : ''}`;
  }
  /** 本文中の [[図1]] を画像に置き換えて表示 */
  function scenarioHtml(c) {
    return esc(c.scenario).replace(/\[\[([^\]]+)\]\]/g, (m, k) => (c.figs && c.figs[k] ? `</div>${figHtml(c.figs[k], k)}<div class="pre">` : m));
  }
  const QMAP = {};
  ALLA.forEach((q) => (QMAP[q.id] = q));
  const B1MAP = {}, B2MAP = {};
  B1.forEach((c) => (B1MAP[c.id] = c));
  B2.forEach((c) => (B2MAP[c.id] = c));

  const CATS = {
    A1: ['基礎理論', 'アルゴリズム・プログラミング', 'コンピュータシステム', 'データベース', 'ネットワーク', 'セキュリティ', '開発技術', 'マネジメント', 'ストラテジ'],
    A2: ['システム企画・要件定義', '設計・モデリング', 'アーキテクチャ・方式設計', '信頼性・性能', '開発技術・テスト', 'プロジェクト・見積り', 'セキュリティ', '組込み・IoT', '法務・標準', 'ストラテジ'],
  };
  const EXAM = {
    A1: { label: '科目A-1', sub: '高度共通・四肢択一', n: 30, min: 50 },
    A2: { label: '科目A-2', sub: 'SA専門・四肢択一', n: 25, min: 40 },
    B1: { label: '科目B-1', sub: '記述式・3問中2問', min: 90, of: 3, pick: 2 },
    B2: { label: '科目B-2', sub: '論述式・2問中1問', min: 120, of: 2, pick: 1 },
  };
  const LABELS = ['ア', 'イ', 'ウ', 'エ'];
  const svg = (d) => `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const ICON = {
    close: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
    left: svg('<path d="M15 5l-7 7 7 7"/>'),
    right: svg('<path d="M9 5l7 7-7 7"/>'),
    flag: svg('<path d="M5 21V4m0 0h11l-2 4 2 4H5"/>'),
    grid: svg('<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>'),
    pause: svg('<path d="M9 5v14M15 5v14"/>'),
    play: svg('<path d="M7 5l12 7-12 7z"/>'),
  };
  const CONF = [
    { k: 'sure', label: '自信あり', key: 'a' },
    { k: 'maybe', label: 'たぶん', key: 's' },
    { k: 'guess', label: '勘', key: 'd' },
  ];
  // IPA の論述式の評価観点（充足度・具体性・妥当性・一貫性・見識・洞察力/行動力・独創性/先見性・表現力）に対応
  const B2_RUBRIC = [
    '【充足度】設問ア・イ・ウで問われていることに、設問ごとに漏れなく正面から答えている',
    '【具体性】固有の状況・数値・制約を示し、自分が担当した事例として具体的に書いている',
    '【妥当性】設計や判断の内容が、示した状況・制約に照らして技術的に妥当である',
    '【一貫性】設問ア・イ・ウの内容が一貫しており、前後で矛盾がない',
    '【見識に基づく主張】判断の理由・根拠を、システムアーキテクトとしての見識に基づいて述べている',
    '【洞察力・行動力】複数案の比較やトレードオフの検討、関係者への働きかけなど、自ら考え行動した過程がある',
    '【独創性・先見性】ありきたりな対策にとどまらない工夫や、将来を見据えた考慮がある',
    '【表現力】章立て・段落が整理され、採点者が読みやすい文章になっている',
  ];

  const SRS = window.SRS, Charts = window.Charts;
  const DAY = SRS.DAY;
  const esc = Charts.esc;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const app = document.getElementById('app');

  // ---------------------------------------------------------------- 状態
  const KEY = 'sa-study-v1';
  function defaultState() {
    return {
      v: 1,
      settings: { dailyCount: 15, newRatio: 0.4, a1Exempt: false, examDate: '', examDateB: '', confidence: true, retry: true, includePast: true, theme: 'auto', fontScale: 1, haptics: true, effects: true },
      cards: {}, log: [], daily: null, exams: [], notes: {}, marks: {}, snapshots: {}, examUsed: {}, active: null,
    };
  }
  let S;
  const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);
  /** 読み込んだデータを検証・正規化する（壊れたバックアップや旧データで画面が壊れないように） */
  function normalize(d) {
    const def = defaultState();
    if (!isObj(d)) return def;
    const out = def;
    ['cards', 'notes', 'marks', 'snapshots', 'examUsed'].forEach((k) => { if (isObj(d[k])) out[k] = d[k]; });
    ['log', 'exams'].forEach((k) => { if (Array.isArray(d[k])) out[k] = d[k]; });
    const st = isObj(d.settings) ? d.settings : {};
    const s = out.settings;
    const num = (v, lo, hi, dflt) => { v = +v; return isFinite(v) ? Math.min(hi, Math.max(lo, v)) : dflt; };
    const date = (v) => (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '');
    s.dailyCount = Math.round(num(st.dailyCount, 3, 100, s.dailyCount));
    s.newRatio = num(st.newRatio, 0, 1, s.newRatio);
    s.examDate = date(st.examDate);
    s.examDateB = date(st.examDateB);
    ['a1Exempt', 'confidence', 'retry', 'haptics', 'effects', 'includePast'].forEach((k) => { if (typeof st[k] === 'boolean') s[k] = st[k]; });
    if (['auto', 'light', 'dark'].includes(st.theme)) s.theme = st.theme;
    s.fontScale = num(st.fontScale, 0.8, 1.4, 1);
    // カードの数値を正規化
    Object.keys(out.cards).forEach((id) => {
      const c = out.cards[id];
      if (!isObj(c)) { delete out.cards[id]; return; }
      const n = SRS.newCard();
      Object.keys(n).forEach((k) => { n[k] = isFinite(+c[k]) ? +c[k] : n[k]; });
      out.cards[id] = n;
    });
    out.log = out.log.filter((l) => isObj(l) && isFinite(+l.t)).map((l) => ({ t: +l.t, id: String(l.id), ok: !!l.ok, conf: typeof l.conf === 'string' ? l.conf : null, ms: +l.ms || 0, m: String(l.m || '') }));
    out.exams = out.exams.filter((r) => isObj(r) && Array.isArray(r.results) && isFinite(+r.t) && +r.t > 0).map((r) => {
      r.results = r.results.filter((x) => isObj(x) && EXAM[x.type]).map((x) => Object.assign(x, { score: +x.score || 0, rank: /^[ABCD]$/.test(x.rank) ? x.rank : x.type === 'B2' ? 'D' : undefined }));
      return r;
    });
    if (d.daily && isObj(d.daily) && Array.isArray(d.daily.ids) && isObj(d.daily.done)) out.daily = { date: String(d.daily.date), ids: d.daily.ids.filter((id) => QMAP[id]), done: d.daily.done };
    out.active = validActive(d.active) ? d.active : null;
    return out;
  }
  /** 受験中データの参照先（問題ID・事例ID）が現在の問題データに存在するか */
  function validActive(a) {
    if (!isObj(a) || !Array.isArray(a.stages) || !Array.isArray(a.results) || !a.stages.every((t) => EXAM[t])) return false;
    const st = a.stage;
    if (st == null) return true;
    if (!isObj(st) || !EXAM[st.type]) return false;
    if (st.ids) return Array.isArray(st.ids) && st.ids.every((id) => QMAP[id]) && isObj(st.ans) && isObj(st.orders);
    if (st.type === 'B1') return Array.isArray(st.options) && st.options.every((id) => B1MAP[id]) && Array.isArray(st.chosen);
    if (st.type === 'B2') return Array.isArray(st.options) && st.options.every((id) => B2MAP[id]);
    return false;
  }
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return normalize(JSON.parse(raw));
    } catch (e) { console.warn(e); }
    return defaultState();
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('保存に失敗しました（容量不足の可能性）'); }
  }
  let saveTimer = null;
  function saveSoon() { clearTimeout(saveTimer); saveTimer = setTimeout(save, 400); }
  S = load();
  // 別タブで更新されたら読み直す（古いタブが新しいデータを上書きしないように）
  window.addEventListener('storage', (e) => {
    if (e.key !== KEY || e.newValue == null) return;
    try { S = normalize(JSON.parse(e.newValue)); } catch (err) { return; }
    const el = document.activeElement;
    if (!(el && el.matches && el.matches('textarea, input'))) render();
  });

  // ---------------------------------------------------------------- ユーティリティ
  function shuffle(a) {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  const pct = (x) => (x == null || isNaN(x) ? '—' : Math.round(x * 100) + '%');
  const today = () => SRS.dayKey(Date.now());
  function fmtClock(ms) {
    ms = Math.max(0, ms);
    const s = Math.floor(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60;
    return (h ? h + ':' + String(m).padStart(2, '0') : m) + ':' + String(ss).padStart(2, '0');
  }
  function fmtDate(t) { const d = new Date(t); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }
  function charCount(s) { return Array.from((s || '').replace(/\r?\n/g, '')).length; }
  function toast(msg) {
    let t = $('#toast');
    if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
    t.textContent = msg; t.className = 'show';
    clearTimeout(t._h); t._h = setTimeout(() => (t.className = ''), 2600);
  }
  function card(id) { return S.cards[id] || (S.cards[id] = SRS.newCard()); }
  function eligibleA() { return (S.settings.a1Exempt ? A2 : ALLA).filter(usable); }
  /** which: 'A'（科目A群の受験日）/'B'（科目B群の受験日） */
  function examDateMs(which) {
    const v = which === 'B' ? S.settings.examDateB : S.settings.examDate;
    if (!v) return null;
    const t = new Date(v + 'T09:00:00').getTime();
    return isNaN(t) ? null : t;
  }
  function daysTo(t) { return t == null ? null : Math.round((SRS.startOfDay(t) - SRS.startOfDay(Date.now())) / DAY); }
  function daysToExam(which) { return daysTo(examDateMs(which || 'A')); }
  function catAcc(q) { const c = S.cards[q.id]; return c && c.seen ? c.correct / c.seen : null; }

  // ---------------------------------------------------------------- 学習データ集計
  function stats() {
    const now = Date.now();
    const pool = eligibleA();
    let seen = 0, mastered = 0, due = 0, rSum = 0, rN = 0;
    pool.forEach((q) => {
      const c = S.cards[q.id];
      if (!c || !c.last) return;
      seen++;
      if (SRS.isMastered(c)) mastered++;
      if (SRS.isDue(c, now)) due++;
      rSum += SRS.retrievability(c, now); rN++;
    });
    return { total: pool.length, seen, mastered, due, avgR: rN ? rSum / rN : null };
  }
  /**
   * 収録問題の想起率（期待正答率）: 思い出せる確率 r に、思い出せなくても四択で当たる 1/4 を加える。
   * 未学習は r=0。あくまで「この問題集」に対する指標で、本番の得点予測ではない。
   */
  function predictScore(exam, at) {
    const pool = (exam === 'A1' ? A1 : A2).filter(usable);
    if (!pool.length) return null;
    let s = 0;
    pool.forEach((q) => { const r = SRS.retrievability(S.cards[q.id], at) || 0; s += r + (1 - r) / 4; });
    return s / pool.length;
  }
  /** 初めて解いたときの正答率（問題を覚えていない状態での実力の目安） */
  function firstTryAcc(exam) {
    const first = {};
    S.log.forEach((l) => { if (!(l.id in first)) first[l.id] = l.ok; });
    const ids = Object.keys(first).filter((id) => QMAP[id] && QMAP[id].exam === exam);
    return ids.length >= 10 ? { acc: ids.filter((id) => first[id]).length / ids.length, n: ids.length } : null;
  }
  function streak() {
    const days = new Set(S.log.map((l) => SRS.dayKey(l.t)));
    let n = 0, t = Date.now();
    if (!days.has(SRS.dayKey(t))) t -= DAY;
    while (days.has(SRS.dayKey(t))) { n++; t -= DAY; }
    return n;
  }
  function snapshot() {
    const st = stats();
    S.snapshots[today()] = { seen: st.seen, mastered: st.mastered, avgR: st.avgR };
  }
  function catStats(exam) {
    return CATS[exam].map((cat) => {
      const qs = (exam === 'A1' ? A1 : A2).filter((q) => q.cat === cat);
      let seen = 0, ok = 0, learned = 0;
      qs.forEach((q) => { const c = S.cards[q.id]; if (c && c.seen) { seen += c.seen; ok += c.correct; learned++; } });
      return { cat, total: qs.length, learned, acc: seen ? ok / seen : null };
    });
  }

  // ---------------------------------------------------------------- 出題セット生成
  /** カテゴリが偏らないように交互に並べる（インターリーブ） */
  function interleave(qs) {
    const by = {};
    shuffle(qs).forEach((q) => (by[q.exam + q.cat] = by[q.exam + q.cat] || []).push(q));
    const groups = shuffle(Object.values(by));
    const out = [];
    while (groups.some((g) => g.length)) groups.forEach((g) => g.length && out.push(g.shift()));
    return out;
  }
  function buildDaily(append) {
    const n = S.settings.dailyCount;
    const now = Date.now();
    const keep = append && S.daily && S.daily.date === today() ? S.daily : null;
    const pool = eligibleA().filter((q) => !(keep && keep.ids.includes(q.id)) && !SRS.reviewedToday(S.cards[q.id], now));
    const due = pool.filter((q) => SRS.isDue(S.cards[q.id], now))
      .sort((a, b) => SRS.retrievability(S.cards[a.id], now) - SRS.retrievability(S.cards[b.id], now));
    const unseen = pool.filter((q) => !(S.cards[q.id] && S.cards[q.id].last));
    // 復習待ちが多いときは新規を減らす（復習の積み残しが雪だるま式に増えるのを防ぐ）
    const wantNew = due.length >= n ? 0 : Math.min(unseen.length, Math.round(n * S.settings.newRatio), n - due.length + Math.round(n * S.settings.newRatio * 0.5));
    const nDue = Math.min(due.length, n - wantNew);
    const picked = due.slice(0, nDue);
    const newQs = interleave(unseen).slice(0, n - picked.length);
    picked.push(...newQs);
    if (picked.length < n) {
      // 全問学習済み・復習なし → 保持率の低い順に補充
      const rest = pool.filter((q) => !picked.includes(q))
        .sort((a, b) => (SRS.retrievability(S.cards[a.id], now) || 0) - (SRS.retrievability(S.cards[b.id], now) || 0));
      picked.push(...rest.slice(0, n - picked.length));
    }
    const ids = interleave(picked).map((q) => q.id);
    S.daily = keep ? { date: keep.date, ids: keep.ids.concat(ids), done: keep.done, newPaused: due.length >= n } : { date: today(), ids, done: {}, newPaused: due.length >= n };
    save();
    return ids;
  }
  /** 今日の学習で、まだ解いていない問題（別モードで今日すでに復習した問題は除く） */
  function dailyRemaining() {
    const now = Date.now();
    return S.daily.ids.filter((id) => QMAP[id] && !S.daily.done[id] && !SRS.reviewedToday(S.cards[id], now));
  }
  function ensureDaily() { if (!S.daily || S.daily.date !== today()) buildDaily(); }

  function weakSet(n) {
    const now = Date.now();
    return eligibleA().filter((q) => S.cards[q.id] && S.cards[q.id].seen)
      .map((q) => { const c = S.cards[q.id]; return { q, score: (c.correct / c.seen) - c.lapses * 0.1 + (SRS.retrievability(c, now) || 0) * 0.3 }; })
      .filter((x) => x.score < 1.15)
      .sort((a, b) => a.score - b.score).slice(0, n).map((x) => x.q);
  }
  function cramSet(n) {
    const at = examDateMs() || Date.now() + 7 * DAY;
    return eligibleA().filter((q) => S.cards[q.id] && S.cards[q.id].last)
      .sort((a, b) => SRS.retrievability(S.cards[a.id], at) - SRS.retrievability(S.cards[b.id], at)).slice(0, n);
  }
  /** 本番形式：分野の構成比を保ってランダム抽出し、分野順に並べる */
  function examSet(exam, n) {
    const pool = (exam === 'A1' ? A1 : A2).filter(usable);
    const cats = CATS[exam];
    const by = cats.map((c) => shuffle(pool.filter((q) => q.cat === c))
      .sort((a, b) => (S.examUsed[a.id] || 0) - (S.examUsed[b.id] || 0)));
    // A-1 は過去の傾向（テクノロジ17・マネジメント5・ストラテジ8）に寄せる。A-2 は収録の構成比
    const target = exam === 'A1' ? { マネジメント: 5 / 30, ストラテジ: 8 / 30 } : {};
    const techTotal = pool.filter((q) => !target[q.cat]).length;
    const techShare = 1 - Object.values(target).reduce((a, b) => a + b, 0);
    const quota = by.map((g, i) => Math.min(g.length, target[cats[i]] != null ? target[cats[i]] * n : (g.length / (exam === 'A1' ? techTotal : pool.length)) * (exam === 'A1' ? techShare : 1) * n));
    const take = quota.map(Math.floor);
    let rem = n - take.reduce((a, b) => a + b, 0);
    quota.map((q, i) => [q - Math.floor(q), i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => { if (rem > 0 && take[i] < by[i].length) { take[i]++; rem--; } });
    const out = [];
    by.forEach((g, i) => out.push(...g.slice(0, take[i])));
    return out.slice(0, n).map((q) => q.id);
  }

  // ---------------------------------------------------------------- 演習セッション（即時フィードバック）
  let Q = null; // 現在の演習
  function startQuiz(ids, mode, title) {
    if (!ids.length) { toast('出題できる問題がありません'); return; }
    Q = { mode, title, ids: ids.slice(), pos: 0, results: [], retried: {}, phase: 'answer', sel: null, order: null, t0: 0 };
    prepQuestion();
    go('/quiz');
  }
  function prepQuestion() {
    const q = QMAP[Q.ids[Q.pos]];
    Q.order = q.noShuffle ? [0, 1, 2, 3] : shuffle([0, 1, 2, 3]);
    Q.sel = null; Q.phase = 'answer'; Q.t0 = Date.now();
  }
  function answerQuiz(conf) {
    if (Q.sel == null || Q.phase !== 'answer') return;
    const id = Q.ids[Q.pos], q = QMAP[id];
    const ok = Q.sel === q.answer;
    const ms = Date.now() - Q.t0;
    const isRetry = !!(Q.retried[id] && Q.retried[id] < Q.pos + 1 && Q.ids.indexOf(id) < Q.pos);
    const c = card(id);
    const before = { interval: c.interval };
    if (!isRetry) {
      SRS.review(c, SRS.gradeFrom(ok, conf || 'maybe'), Date.now());
      S.log.push({ t: Date.now(), id, ok, conf, ms, m: Q.mode });
      if (Q.mode === 'daily' && S.daily) S.daily.done[id] = ok ? 1 : -1;
    }
    Q.results.push({ id, ok, conf, ms, retry: isRetry });
    if (!ok && !isRetry && S.settings.retry && !Q.retried[id]) {
      // 間違えた問題は数問後にもう一度（短期の再想起）
      const at = Math.min(Q.ids.length, Q.pos + 4);
      Q.ids.splice(at, 0, id);
      Q.retried[id] = at;
    }
    Q.last = { ok, conf, ms, before, after: c.interval, isRetry };
    Q.phase = 'feedback';
    Q.fbAt = Date.now();
    haptic(ok ? 15 : [30, 60, 30]);
    snapshot();
    save();
    render();
    announce(ok ? '正解です' : '不正解です。正解は ' + q.choices[q.answer]);
    // 正誤と解説が画面外にならないよう、フィードバックまでスクロール
    const fbEl = $('.feedback');
    if (fbEl) {
      const top = fbEl.getBoundingClientRect().top + window.scrollY - 64;
      const ch = $('.choices'); const chTop = ch ? ch.getBoundingClientRect().top + window.scrollY - 64 : top;
      window.scrollTo({ top: Math.max(0, Math.min(top, Math.max(chTop, top - window.innerHeight * 0.45))), behavior: reducedMotion() ? 'auto' : 'smooth' });
    }
  }
  function nextQuiz() {
    // 自信度ボタンの二重タップで解説を読まずに進まないよう、直後の操作は無視
    if (!Q || Q.phase !== 'feedback' || Date.now() - (Q.fbAt || 0) < 500) return;
    Q.pos++;
    if (Q.pos >= Q.ids.length) { Q.phase = 'done'; render(); return; }
    prepQuestion();
    render();
    window.scrollTo(0, 0);
  }

  function viewQuiz() {
    if (!Q) return redirect('/');
    if (Q.phase === 'done') return viewQuizSummary();
    const id = Q.ids[Q.pos], q = QMAP[id];
    const c = S.cards[id];
    const fb = Q.phase === 'feedback';
    const isRetry = Q.retried[id] && Q.ids.indexOf(id) < Q.pos;
    let h = `<div class="focusbar">
        <button class="iconbtn" data-act="quitquiz" aria-label="演習を終了">${ICON.close}</button>
        <div class="progress grow" role="progressbar" aria-valuemin="0" aria-valuemax="${Q.ids.length}" aria-valuenow="${Q.pos}"><div style="width:${(Q.pos / Q.ids.length) * 100}%"></div></div>
        <span class="fcount">${Q.pos + 1}<small>/${Q.ids.length}</small></span>
      </div>
      <div class="quiz" data-swipe="quiz">
      <div class="qmeta">
        <span class="tag ${q.exam.toLowerCase()}">${EXAM[q.exam].label}</span>
        <span class="tag">${esc(q.cat)}</span>
        <span class="tag lv">${'★'.repeat(q.level || 2)}</span>
        ${srcTag(q)}
        ${!c || !c.last ? '<span class="tag new">NEW</span>' : ''}
        ${isRetry ? '<span class="tag retry">再挑戦</span>' : ''}
        <button class="mark ${S.marks[id] ? 'on' : ''}" data-act="mark" data-id="${id}" title="ブックマーク" aria-label="ブックマーク" aria-pressed="${!!S.marks[id]}">${S.marks[id] ? '★' : '☆'}</button>
        <span class="elapsed" id="elapsed"></span>
      </div>
      <div class="qtext">${esc(q.q)}${figHtml(q.fig, q.figAlt)}</div>
      <div class="choices">`;
    Q.order.forEach((ci, k) => {
      let cls = '';
      if (fb) { if (ci === q.answer) cls = 'correct'; else if (ci === Q.sel) cls = 'wrong'; }
      else if (ci === Q.sel) cls = 'sel';
      const sr = fb ? (ci === q.answer ? '（正解）' : ci === Q.sel ? '（あなたの解答・不正解）' : '') : '';
      h += `<button class="choice ${cls}" data-act="sel" data-ci="${ci}" ${fb ? 'disabled' : ''} aria-pressed="${ci === Q.sel}"><b>${LABELS[k]}</b><span>${q.choicesInFig ? `<span class="muted">図の${LABELS[k]}</span>` : esc(q.choices[ci])}${sr ? `<em class="vh">${sr}</em>` : ''}${fb && ci === q.answer ? '<i class="mk" aria-hidden="true">✓</i>' : fb && ci === Q.sel ? '<i class="mk" aria-hidden="true">✗</i>' : ''}</span></button>`;
    });
    h += '</div>';
    let bar = '';
    if (!fb) {
      if (S.settings.confidence) {
        bar = `<div class="barhint">${Q.sel == null ? '選択肢を選んでください' : 'どのくらい自信がありますか？'}</div><div class="confrow">`;
        CONF.forEach((cf) => (bar += `<button class="btn conf ${cf.k}" data-act="conf" data-conf="${cf.k}" ${Q.sel == null ? 'disabled' : ''}>${cf.label}<kbd>${cf.key.toUpperCase()}</kbd></button>`));
        bar += '</div>';
      } else {
        bar = `<div class="confrow"><button class="btn primary block" data-act="conf" data-conf="" ${Q.sel == null ? 'disabled' : ''}>解答する<kbd>⏎</kbd></button></div>`;
      }
    } else {
      const L = Q.last;
      const iv = Math.round(S.cards[id].interval);
      h += `<div class="feedback ${L.ok ? 'ok' : 'ng'}" tabindex="-1">
        <div class="fbhead">${L.ok ? '○ 正解' : '× 不正解'} <span class="muted small">${(L.ms / 1000).toFixed(0)}秒${q.exam === 'A1' ? '（目安100秒）' : '（目安96秒）'}</span>
        ${L.isRetry ? '' : `<span class="next">次の復習：${iv <= 1 ? '明日' : iv + '日後'}</span>`}</div>
        ${!L.ok && L.conf === 'sure' ? '<div class="callout">自信があったのに間違えた問題は、訂正すると記憶に残りやすい（過剰修正効果）。なぜ誤解していたかを一言メモしておこう。</div>' : ''}
        ${L.ok && L.conf === 'guess' ? '<div class="callout">勘で正解した問題は「理解済み」とせず、短い間隔で復習します。</div>' : ''}
        <div class="exp">${esc(q.exp)}</div>
        ${pastNote(q)}
        <label class="note">自分の言葉で要点メモ（次回の解説に表示）
          <textarea data-note="${id}" rows="2" placeholder="例：結合度は低いほど良い。データ結合が最良">${esc(S.notes[id] || '')}</textarea>
        </label>
      </div>`;
      bar = `<div class="barverdict ${L.ok ? 'ok' : 'ng'}" aria-hidden="true">${L.ok ? '○ 正解' : '× 不正解 — 正解は ' + LABELS[Q.order.indexOf(q.answer)]}</div><div class="confrow"><button class="btn primary block ${L.ok ? '' : 'ngbtn'}" data-act="next">${Q.pos + 1 >= Q.ids.length ? '結果を見る' : '次へ'}<kbd>⏎</kbd></button></div><div class="barhint swipehint">← スワイプでも次へ</div>`;
    }
    h += '</div>';
    h += `<div class="actionbar">${bar}</div>`;
    app.innerHTML = h;
    tickElapsed();
  }
  function tickElapsed() {
    const el = $('#elapsed');
    if (!el || !Q || Q.phase !== 'answer') return;
    el.textContent = fmtClock(Date.now() - Q.t0);
  }
  function viewQuizSummary() {
    const first = Q.results.filter((r) => !r.retry);
    const ok = first.filter((r) => r.ok).length;
    const byCat = {};
    first.forEach((r) => { const q = QMAP[r.id]; const k = q.cat; (byCat[k] = byCat[k] || { n: 0, ok: 0 }).n++; if (r.ok) byCat[k].ok++; });
    const hc = first.filter((r) => !r.ok && r.conf === 'sure');
    const avg = first.length ? first.reduce((a, r) => a + r.ms, 0) / first.length : 0;
    const st = stats();
    if (Q.mode === 'daily' && S.daily && !dailyRemaining().length && !Q.celebrated) { Q.celebrated = true; setTimeout(() => celebrate(), 150); }
    let h = `<section class="card center">
      ${ring(first.length ? ok / first.length : 0, `${ok}<small>/${first.length}</small>`, 'big')}
      <h2>おつかれさま！</h2>
      <div class="muted">正答率 ${pct(first.length ? ok / first.length : 0)} ・ 平均 ${(avg / 1000).toFixed(0)}秒/問 ・ 連続学習 ${streak()}日</div>
    </section>
    <section class="card"><h3>分野別</h3>${Charts.hbars(Object.entries(byCat).map(([k, v]) => ({ label: k, value: v.ok / v.n, sub: ` ${v.ok}/${v.n}` })))}</section>`;
    if (hc.length) h += `<section class="card"><h3>自信ありで間違えた問題</h3><p class="muted small">思い込みを修正するチャンス。もう一度解説を確認しましょう。</p><ul class="qlist">${hc.map((r) => `<li><a href="#" data-act="one" data-id="${r.id}">${esc(QMAP[r.id].q.slice(0, 60))}…</a></li>`).join('')}</ul></section>`;
    h += `<section class="card"><p>復習待ち <b>${st.due}</b> 問 ・ 定着 <b>${st.mastered}</b> / ${st.total} 問</p>
      <div class="row">
        <a class="btn primary" href="#/">ホームへ</a>
        ${st.due ? '<button class="btn" data-act="review">続けて復習</button>' : ''}
        <button class="btn" data-act="retrywrong">間違えた問題をもう一度</button>
      </div></section>`;
    app.innerHTML = h;
  }

  // ---------------------------------------------------------------- 模試（本番形式）
  function startExam(kind, opt) {
    opt = opt || {};
    let stages;
    if (kind === 'set') stages = [setType(opt.set)];
    else if (kind === 'dayA') stages = S.settings.a1Exempt ? ['A2'] : ['A1', 'A2'];
    else if (kind === 'dayB') stages = ['B1', 'B2'];
    else stages = [kind];
    S.active = { kind, stages, si: 0, stage: null, results: [], started: Date.now(), opt };
    beginStage();
  }
  function beginStage() {
    const A = S.active;
    const type = A.stages[A.si];
    const now = Date.now();
    const o = A.opt || {};
    let st;
    if (type === 'A1' || type === 'A2') {
      const n = o.n || EXAM[type].n;
      const ids = o.set ? SETS[o.set].map((q) => q.id) : examSet(type, n);
      const orders = {};
      ids.forEach((id) => (orders[id] = QMAP[id].noShuffle ? [0, 1, 2, 3] : shuffle([0, 1, 2, 3])));
      const min = o.min || EXAM[type].min;
      st = { type, ids, orders, ans: {}, flags: {}, idx: 0, spent: {}, enter: now, startedAt: now, endsAt: now + min * 60000, min };
    } else if (type === 'B1') {
      let options;
      if (o.caseId) options = [o.caseId];
      else if (o.set) options = SETS[o.set].map((c) => c.id);
      else {
        const pool = B1.filter(usable);
        const info = shuffle(pool.filter((c) => c.cat !== '組込み・IoT')), emb = shuffle(pool.filter((c) => c.cat === '組込み・IoT'));
        options = info.slice(0, emb.length ? 2 : 3).concat(emb.slice(0, 1)).map((c) => c.id).slice(0, 3);
      }
      const min = o.min || (o.caseId ? 45 : EXAM.B1.min);
      st = { type, options, chosen: o.caseId ? [o.caseId] : [], phase: o.caseId ? 'answer' : 'choose', ans: {}, grades: {}, tab: 0, startedAt: now, endsAt: now + min * 60000, min };
    } else {
      let options;
      if (o.caseId) options = [o.caseId];
      else if (o.set) options = SETS[o.set].map((c) => c.id);
      else {
        const pool = B2.filter(usable);
        const info = shuffle(pool.filter((c) => c.cat !== '組込み・IoT')), emb = shuffle(pool.filter((c) => c.cat === '組込み・IoT'));
        options = (emb.length && Math.random() < 0.5 ? [info[0], emb[0]] : info.slice(0, 2)).filter(Boolean).map((c) => c.id);
      }
      const min = o.min || EXAM.B2.min;
      st = { type, options, chosen: o.caseId || null, phase: o.caseId ? 'write' : 'choose', texts: {}, outline: '', checks: {}, startedAt: now, endsAt: now + min * 60000, min };
    }
    A.stage = st;
    save();
    go('/exam/run');
  }
  function remaining() {
    const st = S.active && S.active.stage;
    if (!st) return 0;
    if (st.pausedLeft != null) return st.pausedLeft;
    return st.endsAt - Date.now();
  }
  function togglePause() {
    const st = S.active.stage;
    if (st.pausedLeft != null) { st.endsAt = Date.now() + st.pausedLeft; st.pausedLeft = null; st.enter = Date.now(); st.pausedTotal = (st.pausedTotal || 0) + (Date.now() - (st.pausedAt || Date.now())); }
    else { trackSpent(); st.pausedLeft = st.endsAt - Date.now(); st.pausedAt = Date.now(); }
    save(); render();
  }
  /** 一時停止を除いた経過時間 */
  function usedTime(st) {
    const end = st.pausedLeft != null ? st.pausedAt || Date.now() : Date.now();
    return Math.max(0, Math.min(st.min * 60000, end - st.startedAt - (st.pausedTotal || 0)));
  }
  function trackSpent() {
    const st = S.active && S.active.stage;
    if (!st || !st.ids || st.pausedLeft != null) return;
    const id = st.ids[st.idx];
    st.spent[id] = (st.spent[id] || 0) + (Date.now() - (st.enter || Date.now()));
    st.enter = Date.now();
  }
  function finishAStage(auto) {
    const A = S.active, st = A.stage;
    trackSpent();
    const detail = st.ids.map((id) => {
      const q = QMAP[id];
      const chosen = st.ans[id];
      return { id, chosen: chosen == null ? null : chosen, ok: chosen === q.answer, ms: st.spent[id] || 0 };
    });
    const correct = detail.filter((d) => d.ok).length;
    // 模試の解答も想起練習として復習スケジュールに反映
    const now = Date.now();
    detail.forEach((d) => {
      S.examUsed[d.id] = now;
      if (d.chosen == null) return;
      // 模試では自信度を聞かないので、正解でも「勘」の可能性を考えて控えめに伸ばす
      SRS.review(card(d.id), d.ok ? SRS.GRADE.HARD : SRS.GRADE.AGAIN, now);
      S.log.push({ t: now, id: d.id, ok: d.ok, conf: 'exam', ms: d.ms, m: 'exam' });
    });
    snapshot();
    A.results.push({ type: st.type, score: Math.round((correct / st.ids.length) * 100), correct, total: st.ids.length, detail, used: auto ? st.min * 60000 : usedTime(st), auto: !!auto, min: st.min });
    nextStage();
  }
  function nextStage() {
    const A = S.active;
    A.stage = null;
    A.si++;
    A.breakAt = Date.now();
    if (A.si >= A.stages.length) {
      const passAll = A.results.every((r) => (r.pass != null ? r.pass : r.score >= 60));
      const rec = { t: Date.now(), kind: A.kind, results: A.results, pass: passAll, opt: A.opt };
      S.exams.push(rec);
      S.active = null;
      save();
      go('/exam/result/' + (S.exams.length - 1));
      return;
    }
    save();
    render();
  }
  function b1Questions(st) {
    const out = [];
    st.chosen.forEach((cid) => B1MAP[cid].questions.forEach((q, qi) => out.push({ cid, qi, q })));
    return out;
  }
  function finishB1Answer() { const st = S.active.stage; st.used = usedTime(st); st.phase = 'grade'; st.pausedLeft = null; save(); render(); window.scrollTo(0, 0); }
  function finishB1Grade() {
    const A = S.active, st = A.stage;
    const qs = b1Questions(st);
    const missing = qs.filter((x) => st.grades[x.cid + ':' + x.qi] == null).length;
    if (missing) { toast(`未採点の設問が ${missing} 個あります`); return; }
    // 各事例を同じ配点として 100 点満点に換算（本番形式で選択数が足りなければ未解答＝0点扱い）
    const need = st.options.length === 1 ? 1 : EXAM.B1.pick;
    let sc = 0;
    st.chosen.forEach((cid) => {
      const cq = qs.filter((x) => x.cid === cid);
      sc += cq.reduce((a, x) => a + st.grades[x.cid + ':' + x.qi], 0) / cq.length / need;
    });
    const score = Math.round(sc * 100);
    A.results.push({ type: 'B1', score, chosen: st.chosen, ans: st.ans, grades: st.grades, used: Math.min(st.min * 60000, st.used || 0), min: st.min });
    nextStage();
  }
  function b2Eval(st) {
    const c = B2MAP[st.chosen];
    const lenOk = c.parts.every((p) => { const n = charCount(st.texts[p.no]); return n >= (p.min || 1) && n <= p.max; });
    const items = B2_RUBRIC.length + c.points.length;
    const checked = Object.values(st.checks).filter(Boolean).length;
    const ratio = checked / items;
    let rank = ratio >= 0.8 ? 'A' : ratio >= 0.6 ? 'B' : ratio >= 0.4 ? 'C' : 'D';
    if (!lenOk && rank < 'C') rank = 'C';
    if (!lenOk && rank === 'C' && ratio < 0.6) rank = 'D';
    return { lenOk, ratio, rank };
  }
  function finishB2Write() { const st = S.active.stage; st.used = usedTime(st); st.phase = 'grade'; st.pausedLeft = null; save(); render(); window.scrollTo(0, 0); }
  function finishB2Grade() {
    const A = S.active, st = A.stage;
    const ev = b2Eval(st);
    A.results.push({ type: 'B2', score: Math.round(ev.ratio * 100), rank: ev.rank, pass: ev.rank === 'A', selfEval: true, lenOk: ev.lenOk, chosen: st.chosen, texts: st.texts, outline: st.outline, checks: st.checks, used: Math.min(st.min * 60000, st.used || 0), min: st.min });
    nextStage();
  }
  function quitExam() {
    if (!confirm('模試を中断して破棄しますか？（解答内容は保存されません）')) return;
    S.active = null; save(); go('/exam');
  }

  function timerHtml() {
    const st = S.active.stage;
    const paused = st.pausedLeft != null;
    return `<div class="timerbar"><span class="tlabel">${EXAM[st.type].label}</span><span id="timer" class="timer">${fmtClock(remaining())}</span>
      <button class="iconbtn" data-act="pause" aria-label="${paused ? '再開' : '一時停止'}">${paused ? ICON.play : ICON.pause}</button></div>`;
  }

  function viewExamRun() {
    const A = S.active;
    if (!A) return redirect('/exam');
    if (!A.stage) {
      // 科目の合間
      const next = A.stages[A.si];
      const E = EXAM[next];
      app.innerHTML = `<section class="card center">
        <p class="muted">${A.results.map((r) => EXAM[r.type].label).join('・')} 終了</p>
        <h2>次は ${E.label}（${E.sub}）</h2>
        <p>試験時間 ${E.min}分${E.n ? ` ・ ${E.n}問` : ''}</p>
        <p class="muted small">本番の科目間の休憩は最長10分です。<span id="breakt"></span></p>
        <div class="row center"><button class="btn primary" data-act="beginstage">開始する</button><button class="btn ghost" data-act="quitexam">中断</button></div>
      </section>`;
      return;
    }
    const st = A.stage;
    if (st.pausedLeft != null && !(st.type !== 'A1' && st.type !== 'A2' && st.phase === 'grade')) {
      app.innerHTML = timerHtml() + `<section class="card center"><h2>一時停止中</h2><p class="muted">問題は非表示になっています。</p><button class="btn primary" data-act="pause">再開</button> <button class="btn ghost" data-act="quitexam">中断して破棄</button></section>`;
      return;
    }
    if (st.type === 'A1' || st.type === 'A2') return viewExamA(st);
    if (st.type === 'B1') return viewExamB1(st);
    return viewExamB2(st);
  }

  function viewExamA(st) {
    const id = st.ids[st.idx], q = QMAP[id];
    const answered = Object.keys(st.ans).length;
    let h = timerHtml() + `<div class="quiz exam" data-swipe="exam">
      <div class="qhead"><span><b>問${st.idx + 1}</b> <span class="muted">/ ${st.ids.length}</span></span><span class="muted small">解答済 ${answered}/${st.ids.length}</span></div>
      <div class="qtext">${esc(q.q)}${figHtml(q.fig, q.figAlt)}</div><div class="choices">`;
    st.orders[id].forEach((ci, k) => (h += `<button class="choice ${st.ans[id] === ci ? 'sel' : ''}" data-act="xsel" data-ci="${ci}" aria-pressed="${st.ans[id] === ci}"><b>${LABELS[k]}</b><span>${q.choicesInFig ? `<span class="muted">図の${LABELS[k]}</span>` : esc(q.choices[ci])}</span></button>`));
    h += `</div>${st.ans[id] != null ? '<div class="row end"><button class="btn small ghost" data-act="xclear">解答を取り消す</button></div>' : ''}<p class="muted small hide-touch">キー操作：1〜4 選択 ／ ← → 移動 ／ F 見直しマーク。目安は1問あたり約${Math.round((st.min * 60) / st.ids.length)}秒。</p></div>
      <div class="actionbar"><div class="xbar">
        <button class="btn" data-act="xprev" ${st.idx === 0 ? 'disabled' : ''} aria-label="前の問題">${ICON.left}</button>
        <button class="btn ${st.flags[id] ? 'flagged' : ''}" data-act="xflag" aria-label="見直しマーク" aria-pressed="${!!st.flags[id]}">${ICON.flag}<span class="hide-xs">${st.flags[id] ? '見直し中' : '見直し'}</span></button>
        <button class="btn" data-act="sheet" data-sheet="nav">${ICON.grid}<span>${answered}/${st.ids.length}</span></button>
        <button class="btn primary" data-act="xnext" ${st.idx === st.ids.length - 1 ? 'disabled' : ''} aria-label="次の問題">${ICON.right}</button>
      </div></div>`;
    // 問題一覧（ボトムシート）
    let g = `<div class="sheethead"><b>問題一覧</b><span class="muted small">■ 解答済　● 見直し</span></div><div class="navgrid">`;
    st.ids.forEach((qid, i) => (g += `<button class="nv ${i === st.idx ? 'cur' : ''} ${st.ans[qid] != null ? 'done' : ''} ${st.flags[qid] ? 'flag' : ''}" data-act="xgo" data-i="${i}" aria-label="問${i + 1}${st.ans[qid] != null ? ' 解答済' : ' 未解答'}${st.flags[qid] ? ' 見直し' : ''}${i === st.idx ? ' 表示中' : ''}">${i + 1}</button>`));
    g += `</div><div class="row between"><button class="btn ghost" data-act="quitexam">中断して破棄</button><button class="btn primary" data-act="xfinish">解答を終了して提出</button></div>`;
    h += sheetHtml('nav', g);
    app.innerHTML = h;
  }

  function viewExamB1(st) {
    if (st.phase === 'choose') {
      let h = timerHtml() + `<section class="card"><h2>${EXAM.B1.label}：解答する問題を ${EXAM.B1.pick} 問選択</h2><p class="muted small">問題選択の時間も試験時間に含まれます。冒頭を読んで、得意な題材を素早く選ぶ練習をしましょう。</p>`;
      st.options.forEach((cid, i) => {
        const c = B1MAP[cid];
        const on = st.chosen.includes(cid);
        h += `<div class="pick ${on ? 'on' : ''}" data-act="b1pick" data-id="${cid}"><div class="row between"><b>問${i + 1}　${esc(c.title)}</b><span class="tag">${esc(c.cat)}</span></div><p class="small pre">${esc(c.scenario.slice(0, 220))}…</p></div>`;
      });
      h += `<div class="row end"><button class="btn ghost" data-act="quitexam">中断</button><button class="btn primary" data-act="b1start" ${st.chosen.length === EXAM.B1.pick ? '' : 'disabled'}>この${EXAM.B1.pick}問で解答開始</button></div></section>`;
      app.innerHTML = h;
      return;
    }
    if (st.phase === 'answer') {
      const cid = st.chosen[st.tab] || st.chosen[0];
      const c = B1MAP[cid];
      let h = timerHtml();
      if (st.chosen.length > 1) h += `<div class="tabs">${st.chosen.map((id, i) => `<button class="${i === st.tab ? 'on' : ''}" data-act="b1tab" data-i="${i}">${esc(B1MAP[id].title)}</button>`).join('')}</div>`;
      const pane = st.pane || 'scen';
      h += `<div class="seg only-mobile" role="tablist"><button role="tab" class="${pane === 'scen' ? 'on' : ''}" data-act="b1pane" data-p="scen">問題文</button><button role="tab" class="${pane === 'ans' ? 'on' : ''}" data-act="b1pane" data-p="ans">設問・解答欄</button></div>
        <div class="split pane-${pane}"><section class="card scen"><h3>${esc(c.title)}</h3>${c.src ? `<p class="srcnote">出典：${esc(c.src)}（IPA 公表問題）</p>` : ''}<div class="pre">${scenarioHtml(c)}</div></section><section class="card ans">`;
      c.questions.forEach((q, qi) => {
        const k = cid + ':' + qi;
        const v = (st.ans[k] || '');
        const n = charCount(v);
        h += `<div class="bq"><div class="bqno">${esc(q.no)}</div><div class="pre">${esc(q.q)}</div>
          <textarea data-b1="${k}" rows="${q.limit > 60 ? 4 : 2}" placeholder="${q.limit ? q.limit + '字以内' : ''}">${esc(v)}</textarea>
          <div class="cc ${q.limit && n > q.limit ? 'over' : ''}" data-cc="${k}">${n}${q.limit ? ' / ' + q.limit + '字' : '字'}</div></div>`;
      });
      h += `</section></div><div class="row end"><button class="btn ghost" data-act="quitexam">中断</button><button class="btn primary" data-act="b1submit">解答を終了して採点へ</button></div>`;
      app.innerHTML = h;
      return;
    }
    // 自己採点
    let h = `<section class="card"><h2>${EXAM.B1.label} 自己採点</h2><p class="muted small">模範解答と比べて、各設問を「○ 正解 / △ 部分点 / × 誤り」で採点してください。キーワードの一致は<span class="hit">ハイライト</span>表示されます（目安）。字数オーバーは×扱いが基本です。</p></section>`;
    st.chosen.forEach((cid) => {
      const c = B1MAP[cid];
      h += `<section class="card"><h3>${esc(c.title)}</h3><details><summary>問題文を表示</summary><div class="pre small">${scenarioHtml(c)}</div></details>${c.review ? `<details open><summary>IPA 採点講評</summary><div class="pre small">${esc(c.review)}</div><p class="srcnote">出典：${esc(c.src)} 採点講評（IPA）</p></details>` : ''}${c.src ? '<p class="srcnote">模範解答は IPA 公表の解答例、解説は本アプリ独自です。</p>' : ''}`;
      c.questions.forEach((q, qi) => {
        const k = cid + ':' + qi;
        const mine = st.ans[k] || '';
        const hits = (q.keywords || []).filter((kw) => mine.includes(kw));
        const g = st.grades[k];
        let mineHtml = esc(mine) || '<span class="muted">（未解答）</span>';
        (q.keywords || []).forEach((kw) => { if (mine.includes(kw)) mineHtml = mineHtml.split(esc(kw)).join(`<span class="hit">${esc(kw)}</span>`); });
        h += `<div class="bq grade"><div class="bqno">${esc(q.no)}</div><div class="pre small">${esc(q.q)}</div>
          <div class="cmp"><div><div class="lbl">あなたの解答 (${charCount(mine)}${q.limit ? '/' + q.limit : ''}字)</div><div class="pre">${mineHtml}</div></div>
          <div><div class="lbl">模範解答</div><div class="pre model">${esc(q.answer)}</div></div></div>
          <div class="small">キーワード：${(q.keywords || []).map((kw) => `<span class="kw ${hits.includes(kw) ? 'on' : ''}">${esc(kw)}</span>`).join(' ')}</div>
          <details><summary>解説</summary><div class="pre small">${esc(q.exp || '')}</div></details>
          <div class="row gbtns">${[[1, '○ 正解'], [0.5, '△ 部分点'], [0, '× 誤り']].map(([v, l]) => `<button class="btn small ${g === v ? 'on' : ''}" data-act="b1grade" data-k="${k}" data-v="${v}">${l}</button>`).join('')}</div></div>`;
      });
      h += '</section>';
    });
    h += `<div class="row end"><button class="btn primary" data-act="b1done">採点を確定</button></div>`;
    app.innerHTML = h;
  }

  function viewExamB2(st) {
    if (st.phase === 'choose') {
      let h = timerHtml() + `<section class="card"><h2>${EXAM.B2.label}：解答する問題を 1 問選択</h2>`;
      st.options.forEach((cid, i) => {
        const c = B2MAP[cid];
        h += `<div class="pick ${st.chosen === cid ? 'on' : ''}" data-act="b2pick" data-id="${cid}"><div class="row between"><b>問${i + 1}　${esc(c.title)}</b><span class="tag">${esc(c.cat)}</span></div>${c.src ? `<p class="srcnote">出典：${esc(c.src)}</p>` : ''}<p class="small pre">${esc(c.body)}</p>
          <ol class="small">${c.parts.map((p) => `<li>設問${p.no}：${esc(p.q)}</li>`).join('')}</ol></div>`;
      });
      h += `<div class="row end"><button class="btn ghost" data-act="quitexam">中断</button><button class="btn primary" data-act="b2start" ${st.chosen ? '' : 'disabled'}>この問題で論述開始</button></div></section>`;
      app.innerHTML = h;
      return;
    }
    const c = B2MAP[st.chosen];
    if (st.phase === 'write') {
      let h = timerHtml() + `<section class="card"><h3>${esc(c.title)}</h3><details><summary>問題文</summary><div class="pre small">${esc(c.body)}</div></details>
        <p class="muted small">時間配分の目安：問題選択・骨子作成 15〜20分 → 論述 90分 → 見直し 10分。まず骨子を作ると論旨がぶれにくくなります。</p>
        <label class="lbl">骨子メモ（字数に含まない）</label><textarea data-b2o="1" rows="5" placeholder="1. ア 対象システムの概要…">${esc(st.outline || '')}</textarea></section>`;
      c.parts.forEach((p) => {
        const v = st.texts[p.no] || '';
        h += `<section class="card"><div class="bqno">設問${p.no}</div><div class="pre small">${esc(p.q)}</div>
          <textarea class="essay" data-b2="${p.no}" rows="12">${esc(v)}</textarea>
          <div class="cc" data-cc2="${p.no}">${b2Counter(p, v)}</div></section>`;
      });
      const total = c.parts.reduce((a, p) => a + charCount(st.texts[p.no]), 0);
      h += `<div class="row end"><span class="muted" id="b2total">合計 ${total}字</span><button class="btn ghost" data-act="quitexam">中断</button><button class="btn primary" data-act="b2submit">論述を終了して評価へ</button></div>`;
      app.innerHTML = h;
      return;
    }
    // 自己評価
    const ev = b2Eval(st);
    let h = `<section class="card"><h2>${EXAM.B2.label} 自己評価</h2><p class="muted small">IPA の論述式は A〜D のランクで評価され、A が合格です。下の項目は IPA の評価観点に沿ったセルフチェックです。自己評価は甘くなりがちなので、迷ったらチェックしないでください。ランクはチェック率からの<b>参考値</b>です。設問の指示（字数など）に従わない場合は評価が下がることがあります。</p>
      <div class="lenchk">${c.parts.map((p) => { const n = charCount(st.texts[p.no]); const ok = n >= (p.min || 1) && n <= p.max; return `<span class="kw ${ok ? 'on' : 'bad'}">設問${p.no}：${n}字（${p.min ? p.min + '〜' : ''}${p.max}字）${ok ? '✓' : '✗'}</span>`; }).join(' ')}</div>
      ${ev.lenOk ? '' : '<p class="warn small">字数要件を満たしていない設問があります。本番では評価が下がる原因になります。</p>'}
      </section>
      <section class="card"><h3>あなたの論述</h3>${c.parts.map((p) => `<details><summary>設問${p.no}（${charCount(st.texts[p.no])}字）</summary><div class="pre small">${esc(st.texts[p.no] || '')}</div></details>`).join('')}
      <details><summary>骨子例（参考・本アプリ独自）</summary><div class="pre small">${esc(c.outline || '')}</div></details>
      ${c.intent ? `<details><summary>IPA 出題趣旨</summary><div class="pre small">${esc(c.intent)}</div></details>` : ''}
      ${c.review ? `<details><summary>IPA 採点講評</summary><div class="pre small">${esc(c.review)}</div></details>` : ''}
      ${c.src ? `<p class="srcnote">出典：${esc(c.src)}（IPA 公表の問題・出題趣旨・採点講評）</p>` : ''}</section>
      <section class="card"><h3>共通チェック</h3>${B2_RUBRIC.map((r, i) => `<label class="chk"><input type="checkbox" data-b2c="g${i}" ${st.checks['g' + i] ? 'checked' : ''}> ${esc(r)}</label>`).join('')}
      <h3>このテーマのポイント</h3>${c.points.map((r, i) => `<label class="chk"><input type="checkbox" data-b2c="p${i}" ${st.checks['p' + i] ? 'checked' : ''}> ${esc(r)}</label>`).join('')}
      <div class="row between"><span>自己評価ランク（参考） <b class="rank r${ev.rank}" id="b2rank">${ev.rank}</b></span><button class="btn primary" data-act="b2done">評価を確定</button></div></section>`;
    app.innerHTML = h;
  }
  function b2Counter(p, v) {
    const n = charCount(v);
    const cls = n > p.max ? 'over' : n >= (p.min || 1) ? 'ok' : '';
    return `<span class="${cls}">${n}字</span> ／ ${p.min ? p.min + '字以上' : ''}${p.max}字以内`;
  }

  function viewExamResult(idx) {
    const r = S.exams[idx];
    if (!r) return redirect('/exam');
    const isDay = r.kind === 'dayA' || r.kind === 'dayB' || r.kind === 'full';
    // 多段階選抜：前の科目が基準点未満なら、以降は採点対象外
    let failedAt = -1;
    r.results.forEach((x, i) => { if (failedAt < 0 && !(x.pass != null ? x.pass : x.score >= 60)) failedAt = i; });
    const hasB2 = r.results.some((x) => x.type === 'B2');
    let h = `<section class="card center"><h2>${r.kind === 'set' && r.opt && r.opt.set ? esc(setLabel(r.opt.set)) + '（IPA 過去問）' : isDay ? '本番形式模試' : r.opt && r.opt.caseId ? '演習' : '模試'} 結果</h2>
      ${isDay ? `<div class="big ${failedAt < 0 ? 'pass' : 'fail'}">${failedAt < 0 ? (hasB2 ? '基準到達（B-2は自己評価）' : '基準点クリア') : EXAM[r.results[failedAt].type].label + 'で基準点未満'}</div>` : ''}
      <div class="tiles">${r.results.map((x, i) => `<div class="tile ${isDay && failedAt >= 0 && i > failedAt ? 'dim' : ''}"><div class="muted small">${EXAM[x.type].label}${x.type === 'B2' ? '（自己評価・参考）' : ''}</div><div class="tv ${(x.pass != null ? x.pass : x.score >= 60) ? 'pass' : 'fail'}">${x.type === 'B2' ? 'ランク ' + esc(x.rank) : esc(x.score) + '点'}</div><div class="muted small">${isDay && failedAt >= 0 && i > failedAt ? '本番では採点対象外 ・ ' : ''}${x.correct != null ? esc(x.correct) + '/' + esc(x.total) + '問 ・ ' : ''}${fmtClock(+x.used || 0)}/${esc(x.min)}分</div></div>`).join('')}</div>
      <p class="muted small">合格基準：各科目 60点以上（科目B-2 はランク A）。B-1・B-2 は自己採点なので甘くなりがちです。</p></section>`;
    r.results.forEach((x) => {
      if (x.detail) {
        const byCat = {};
        x.detail.forEach((d) => { const q = QMAP[d.id]; if (!q) return; (byCat[q.cat] = byCat[q.cat] || { n: 0, ok: 0 }).n++; if (d.ok) byCat[q.cat].ok++; });
        const slow = x.detail.slice().sort((a, b) => b.ms - a.ms).slice(0, 3);
        h += `<section class="card"><h3>${EXAM[x.type].label} 分野別</h3>${Charts.hbars(Object.entries(byCat).map(([k, v]) => ({ label: k, value: v.ok / v.n, sub: ` ${v.ok}/${v.n}` })), { passLine: 0.6 })}
          <p class="muted small">時間がかかった問題：${slow.map((d) => `問${x.detail.indexOf(d) + 1}（${Math.round(d.ms / 1000)}秒）`).join('、')}</p>
          <details><summary>全問の正誤と解説</summary><ol class="review">${x.detail.map((d) => {
            const q = QMAP[d.id]; if (!q) return '';
            return `<li class="${d.ok ? 'ok' : 'ng'}"><div class="pre">${esc(q.q)}</div><div class="small">あなた：${d.chosen == null ? '未解答' : esc(q.choices[d.chosen])}<br>正解：<b>${esc(q.choices[q.answer])}</b></div><details><summary>解説</summary><div class="pre small">${esc(q.exp)}</div></details></li>`;
          }).join('')}</ol></details>
          <div class="row"><button class="btn" data-act="examwrong" data-r="${idx}" data-t="${x.type}">間違えた問題を演習</button></div></section>`;
      } else if (x.type === 'B1') {
        h += `<section class="card"><h3>${EXAM.B1.label} 解答の振り返り</h3>${x.chosen.map((cid) => {
          const c = B1MAP[cid]; if (!c) return '';
          return `<h4>${esc(c.title)}</h4>` + c.questions.map((q, qi) => {
            const k = cid + ':' + qi, g = x.grades[k];
            return `<div class="bq"><div class="bqno">${esc(q.no)} <span class="${g === 1 ? 'pass' : g === 0 ? 'fail' : 'warn'}">${g === 1 ? '○' : g === 0 ? '×' : '△'}</span></div><div class="pre small">${esc(q.q)}</div>
              <div class="cmp"><div><div class="lbl">あなたの解答</div><div class="pre">${esc(x.ans[k] || '（未解答）')}</div></div><div><div class="lbl">模範解答</div><div class="pre model">${esc(q.answer)}</div></div></div></div>`;
          }).join('');
        }).join('')}</section>`;
      } else if (x.type === 'B2') {
        const c = B2MAP[x.chosen];
        if (c) h += `<section class="card"><h3>${EXAM.B2.label}「${esc(c.title)}」</h3>
          ${x.outline ? `<details><summary>骨子メモ</summary><div class="pre small">${esc(x.outline)}</div></details>` : ''}
          ${c.parts.map((p) => `<details ${c.parts[0] === p ? 'open' : ''}><summary>設問${p.no}（${charCount(x.texts[p.no])}字）</summary><div class="pre small">${esc(x.texts[p.no] || '')}</div></details>`).join('')}
          <h4>チェックできなかった項目（次回の改善点）</h4><ul class="small">${B2_RUBRIC.map((r, i) => (x.checks['g' + i] ? '' : `<li>${esc(r)}</li>`)).join('')}${c.points.map((r, i) => (x.checks['p' + i] ? '' : `<li>${esc(r)}</li>`)).join('')}</ul>
          <details><summary>骨子例（参考）</summary><div class="pre small">${esc(c.outline || '')}</div></details></section>`;
      }
    });
    h += `<div class="row center"><a class="btn primary" href="#/exam">模試メニューへ</a><a class="btn" href="#/">ホームへ</a></div>`;
    app.innerHTML = h;
  }

  // ---------------------------------------------------------------- 画面
  function viewHome() {
    ensureDaily();
    const st = stats();
    const d = S.daily;
    const remainIds = dailyRemaining();
    const doneN = d.ids.length - remainIds.length;
    const dA = daysToExam('A'), dB = daysToExam('B');
    // 次に来る試験日（科目A群→科目B群）を基準にする
    const dleft = dA != null && dA >= 0 ? dA : dB != null && dB >= 0 ? dB : dA;
    const sk = streak();
    const atA = dA != null && dA > 0 ? examDateMs('A') : undefined;
    const pA2 = predictScore('A2', atA), pA1 = predictScore('A1', atA);
    const ft2 = firstTryAcc('A2');
    const unseen = st.total - st.seen;
    const pace = dleft && dleft > 0 ? Math.ceil(unseen / dleft) : null;
    const weakCats = catStats('A2').concat(S.settings.a1Exempt ? [] : catStats('A1')).filter((c) => c.acc != null).sort((a, b) => a.acc - b.acc).slice(0, 3);
    let h = '';
    if (S.active) h += `<a class="banner" href="#/exam/run">受験中の模試があります（${S.active.stages.map((s) => EXAM[s].label).join('→')}）。タップして再開 →</a>`;
    h += `<section class="hero">
      <div class="countdown">${dA == null && dB == null ? '<a href="#/settings">試験日を設定</a>' : [['A', dA, '科目A'], ['B', dB, '科目B']].filter((x) => x[1] != null).map(([, n, l]) => (n > 0 ? `${l}まで <b>${n}</b> 日` : n === 0 ? `<b>${l} 試験当日！</b>` : `<span class="muted small">${l} 終了</span>`)).join('　')}</div>
      <div class="streak">🔥 ${sk}日連続</div>
    </section>
    <section class="card daily">
      <div class="dailytop">${ring(doneN / Math.max(1, d.ids.length), `${doneN}<small>/${d.ids.length}</small>`)}
        <div><h2>今日の学習</h2><p class="muted small">復習期限の問題と新しい問題を、分野が偏らないように混ぜた ${d.ids.length} 問。毎日少しずつが最も効率的です。</p></div></div>
      ${d.newPaused ? '<p class="small warn">復習待ちが多いため、今日は新しい問題を出していません。復習を消化すると新規が再開します。</p>' : ''}
      <div class="row">
        ${remainIds.length ? `<button class="btn primary big block" data-act="daily">${doneN ? '続きから' : 'はじめる'}（残り${remainIds.length}問）</button>` : '<span class="done">✓ 今日のノルマ達成！</span><button class="btn" data-act="dailymore">もう1セット</button>'}
        ${st.due ? `<button class="btn" data-act="review">復習待ち ${st.due}問</button>` : ''}
      </div>
    </section>
    <section class="grid3">
      <div class="tile"><div class="muted small">学習済み</div><div class="tv">${st.seen}<small>/${st.total}</small></div></div>
      <div class="tile"><div class="muted small">定着（間隔21日+）</div><div class="tv">${st.mastered}</div></div>
      <div class="tile"><div class="muted small">平均記憶保持率</div><div class="tv">${pct(st.avgR)}</div></div>
      <div class="tile" title="収録問題を今（試験日設定時は科目A試験日に）解いた場合の期待正答率。四択の当て推量を含む。本番の得点予測ではありません"><div class="muted small">収録問題の想起率 A-2${atA ? '（試験日）' : ''}</div><div class="tv">${pA2 == null ? '—' : Math.round(pA2 * 100) + '%'}</div></div>
      ${S.settings.a1Exempt ? '' : `<div class="tile" title="収録問題に対する指標で、本番の得点予測ではありません"><div class="muted small">収録問題の想起率 A-1${atA ? '（試験日）' : ''}</div><div class="tv">${pA1 == null ? '—' : Math.round(pA1 * 100) + '%'}</div></div>`}
      <div class="tile" title="各問題を初めて解いたときの正答率。問題を覚えていない状態での実力に近い指標"><div class="muted small">初見正答率 A-2</div><div class="tv">${ft2 ? pct(ft2.acc) + `<small> ${ft2.n}問</small>` : '<small>10問以上で表示</small>'}</div></div>
      <div class="tile"><div class="muted small">未学習</div><div class="tv">${unseen}${pace ? `<small> 1日${pace}問で完了</small>` : ''}</div></div>
    </section>
    <section class="card"><h3>モード</h3><div class="modes">
      <button class="mode" data-act="go" data-to="/exam"><b>本番模試</b><span>A-1/A-2/B-1/B-2 を本番と同じ時間・問題数で</span></button>
      <button class="mode" data-act="go" data-to="/practice"><b>分野別演習</b><span>分野・問題数を選んで集中特訓</span></button>
      <button class="mode" data-act="weak"><b>弱点克服</b><span>正答率が低い・何度も忘れた問題</span></button>
      <button class="mode" data-act="cram"><b>直前総仕上げ</b><span>試験日に忘れていそうな問題から</span></button>
      <button class="mode" data-act="go" data-to="/b1"><b>記述（B-1）演習</b><span>事例を1問45分で。模範解答と自己採点</span></button>
      <button class="mode" data-act="go" data-to="/b2"><b>論述（B-2）演習</b><span>骨子→論述→ルーブリック自己評価</span></button>
      <button class="mode" data-act="go" data-to="/browse"><b>問題一覧</b><span>検索・ブックマーク・メモの確認</span></button>
    </div></section>`;
    if (weakCats.length) h += `<section class="card"><h3>苦手分野</h3>${Charts.hbars(weakCats.map((c) => ({ label: c.cat, value: c.acc, sub: ` ${c.learned}/${c.total}問` })))}
      <div class="row">${weakCats.map((c) => `<button class="btn small" data-act="catgo" data-cat="${esc(c.cat)}">${esc(c.cat)}を演習</button>`).join('')}</div></section>`;
    app.innerHTML = h;
  }

  /** 演習メニュー（モバイルのタブ「演習」） */
  function practiceModes() {
    return `<div class="modes">
      <button class="mode" data-act="go" data-to="/practice"><b>分野別演習</b><span>分野・問題数を選んで集中特訓</span></button>
      <button class="mode" data-act="weak"><b>弱点克服</b><span>正答率が低い・何度も忘れた問題</span></button>
      <button class="mode" data-act="cram"><b>直前総仕上げ</b><span>試験日に忘れていそうな問題から</span></button>
      <button class="mode" data-act="go" data-to="/b1"><b>記述（B-1）演習</b><span>事例を1問45分。模範解答と自己採点</span></button>
      <button class="mode" data-act="go" data-to="/b2"><b>論述（B-2）演習</b><span>骨子→論述→評価観点で自己評価</span></button>
      <button class="mode" data-act="go" data-to="/browse"><b>問題一覧</b><span>検索・ブックマーク・メモの確認</span></button>
    </div>`;
  }
  function viewPractice() {
    const ex = S.settings.a1Exempt ? ['A2'] : ['A2', 'A1'];
    let h = `<section class="card"><h2>演習メニュー</h2>${practiceModes()}</section><section class="card"><h2>分野別演習</h2><form id="pform">`;
    ex.forEach((e) => {
      h += `<h3>${EXAM[e].label} <span class="muted small">${EXAM[e].sub}</span> <button type="button" class="btn small ghost" data-act="allcat" data-e="${e}">全選択</button></h3><div class="cats">`;
      catStats(e).forEach((c) => (h += `<label class="catopt"><input type="checkbox" name="cat" value="${e}|${esc(c.cat)}"><span>${esc(c.cat)}</span><small>${c.learned}/${c.total} ・ ${pct(c.acc)}</small></label>`));
      h += '</div>';
    });
    h += `<h3>出題</h3><div class="row wrap">
      <label>問題数 <select name="n"><option>5</option><option selected>10</option><option>20</option><option>30</option><option value="999">全部</option></select></label>
      <label>対象 <select name="f"><option value="all">すべて</option><option value="new">未学習のみ</option><option value="seen">学習済みのみ</option><option value="wrong">間違えたことがある</option><option value="mark">ブックマーク</option></select></label>
      <label>難易度 <select name="lv"><option value="0">すべて</option><option value="1">★ 基本</option><option value="2">★★ 標準</option><option value="3">★★★ 難問のみ</option><option value="23">★★以上</option></select></label>
            <label>出典 <select name="sr"><option value="all">すべて</option><option value="orig">オリジナルのみ</option><option value="past">IPA 過去問のみ</option></select></label>
      <label>順序 <select name="o"><option value="mix">ランダム（分野を混ぜる）</option><option value="block">分野ごとにまとめる</option></select></label>
      </div><p class="muted small">「分野を混ぜる」（インターリーブ）は解き方の選択から練習でき、本番に強くなります。初学の分野は「まとめる」から始めるのも有効です。</p>
      <div class="row end"><button class="btn primary" type="submit">開始</button></div></form></section>`;
    app.innerHTML = h;
  }
  function runPractice(form) {
    const fd = new FormData(form);
    const cats = fd.getAll('cat');
    if (!cats.length) { toast('分野を選んでください'); return; }
    const n = +fd.get('n'), f = fd.get('f'), o = fd.get('o'), lv = fd.get('lv') || '0';
    let qs = ALLA.filter((q) => cats.includes(q.exam + '|' + q.cat));
    if (lv !== '0') qs = qs.filter((q) => lv.includes(String(q.level || 2)));
    const sr = fd.get('sr') || 'all';
    // 出典で絞り込み（「すべて」は設定に従う。現行で通用しない過去問・重複は除外）
    qs = qs.filter((q) => (sr === 'orig' ? !isPast(q) : sr === 'past' ? isPast(q) && !q.obsolete && !q.dupOf : usable(q)));
    qs = qs.filter((q) => {
      const c = S.cards[q.id];
      if (f === 'new') return !c || !c.last;
      if (f === 'seen') return c && c.last;
      if (f === 'wrong') return c && c.seen > c.correct;
      if (f === 'mark') return S.marks[q.id];
      return true;
    });
    qs = o === 'mix' ? interleave(qs) : cats.flatMap((k) => shuffle(qs.filter((q) => q.exam + '|' + q.cat === k)));
    startQuiz(qs.slice(0, n).map((q) => q.id), 'practice', '分野別演習');
  }

  function viewExamMenu() {
    const hist = S.exams.slice().reverse().slice(0, 15);
    let h = '';
    if (S.active) h += `<a class="banner" href="#/exam/run">受験中の模試があります。再開する →</a>`;
    h += `<section class="card"><h2>本番模試</h2>
      <p class="muted small">2026年度（CBT方式）の試験構成に準拠。時間内は解説を表示せず、終了後にまとめて採点します。</p>
      <div class="modes">
        <button class="mode wide" data-act="exam" data-k="dayA"><b>科目A群の日（${S.settings.a1Exempt ? 'A-2' : 'A-1 → A-2'}）</b><span>本番と同じく連続実施。合計 ${(S.settings.a1Exempt ? 0 : 50) + 40}分</span></button>
        <button class="mode wide" data-act="exam" data-k="dayB" ${B1.length && B2.length ? '' : 'disabled'}><b>科目B群の日（B-1 → B-2）</b><span>本番と同じく連続実施。合計 210分</span></button>
      </div>
      <p class="muted small">本番（CBT）は科目A群と科目B群を別の日に受験します。科目間の休憩は最長10分。採点は多段階選抜（A-1→A-2→B-1→B-2 の順に、基準点に達しないとそれ以降は採点されない）です。</p>
      <div class="modes">
        ${Object.entries(EXAM).map(([k, e]) => `<button class="mode" data-act="exam" data-k="${k}" ${(k === 'B1' && !B1.length) || (k === 'B2' && !B2.length) ? 'disabled' : ''}><b>${e.label}のみ</b><span>${e.sub}${e.n ? ` ・ ${e.n}問` : ''} ・ ${e.min}分</span></button>`).join('')}
        <button class="mode" data-act="exam" data-k="A2" data-n="10" data-min="16"><b>ミニ模試</b><span>A-2 10問・16分（時間感覚の練習）</span></button>
      </div></section>`;
    const sets = Object.keys(SETS).sort((a, b) => b.localeCompare(a));
    if (sets.length) {
      const best = {};
      S.exams.forEach((r) => { if (r.kind === 'set' && r.opt && r.opt.set) { const x = r.results[0]; const v = x.type === 'B2' ? x.rank : x.score; best[r.opt.set] = best[r.opt.set] == null || (x.type !== 'B2' && v > best[r.opt.set]) ? v : best[r.opt.set]; } });
      h += `<section class="card"><h2>IPA 過去問（年度別）</h2><p class="muted small">実際の試験1回分を、当時と同じ問題数・制限時間で解きます。午前Ⅰ・Ⅱの正解は IPA 公表の解答例、解説は本アプリ独自です。</p>`;
      ['am2', 'am1', 'pm1', 'pm2'].forEach((t) => {
        const ss = sets.filter((x) => x.endsWith('-' + t));
        if (!ss.length) return;
        h += `<h3>${TIME_LABEL[t]}（${EXAM[SET_TYPE[t]].label}相当）</h3><div class="modes">${ss.map((x) => `<button class="mode" data-act="pastset" data-set="${x}"><b>${esc(ERA(x.split('-')[0]))}</b><span>${SETS[x].length}${t.startsWith('am') ? '問' : t === 'pm1' ? '問から2問選択' : '問から1問選択'} ・ ${EXAM[SET_TYPE[t]].min}分${best[x] != null ? ` ・ 最高 ${esc(best[x])}` : ''}</span></button>`).join('')}</div>`;
      });
      h += '</section>';
    }
    if (hist.length) {
      const series = {};
      S.exams.forEach((r) => r.results.forEach((x) => { if (x.detail || x.type === 'B1') (series[x.type] = series[x.type] || []).push(x.score); }));
      h += `<section class="card"><h3>得点の推移</h3>${Object.keys(series).length ? Object.entries(series).map(([k, v]) => `<div class="small">${EXAM[k].label}：${v.slice(-10).map((s) => `<span class="sc ${s >= 60 ? 'pass' : 'fail'}">${esc(s)}</span>`).join(' ')}</div>`).join('') : ''}
        <table class="tbl"><tr><th>日時</th><th>種別</th><th>結果</th><th></th></tr>${hist.map((r) => {
          const i = S.exams.indexOf(r);
          return `<tr><td>${fmtDate(r.t)}</td><td>${r.kind === 'set' && r.opt && r.opt.set ? esc(setLabel(r.opt.set)) : r.kind === 'dayA' ? 'A群' : r.kind === 'dayB' ? 'B群' : r.kind === 'full' ? '通し' : r.opt && r.opt.caseId ? '演習' : ''} ${r.results.map((x) => EXAM[x.type].label).join('・')}</td><td>${r.results.map((x) => esc(x.type === 'B2' ? x.rank : x.score)).join(' / ')}</td><td><a href="#/exam/result/${i}">詳細</a></td></tr>`;
        }).join('')}</table></section>`;
    }
    app.innerHTML = h;
  }

  function viewBList(kind) {
    const list = kind === 'b1' ? B1 : B2;
    const done = {};
    S.exams.forEach((r) => r.results.forEach((x) => { if (x.type === kind.toUpperCase()) (x.chosen ? [].concat(x.chosen) : []).forEach((id) => (done[id] = x.type === 'B2' ? x.rank : x.score)); }));
    let h = `<section class="card"><h2>${kind === 'b1' ? '記述式（B-1）演習' : '論述式（B-2）演習'}</h2>
      <p class="muted small">${kind === 'b1' ? '1事例を45分（本番は90分で2問）。解答後に模範解答と比較して自己採点します。' : '1テーマを120分。骨子→論述→ルーブリックで自己評価。書いた論述は結果画面から読み返せます。'}</p>
      <div class="modes">`;
    const item = (c) => `<button class="mode" data-act="${kind}" data-id="${c.id}"><b>${esc(c.title)}</b><span>${c.src ? esc(setLabel(c.set)) + ' 問' + c.no + ' ・ ' : ''}${esc(c.cat)}${done[c.id] != null ? ` ・ 前回 ${done[c.id]}` : ''}</span></button>`;
    const past = list.filter((c) => c.src), orig = list.filter((c) => !c.src);
    if (past.length) h += `<h3>IPA 過去問</h3><div class="modes">${past.slice().sort((a, b) => b.set.localeCompare(a.set) || a.no - b.no).map(item).join('')}</div><h3>オリジナル問題</h3><div class="modes">`;
    h += orig.map(item).join('');
    h += '</div></section>';
    if (!list.length) h += '<p class="muted">問題データがありません。</p>';
    app.innerHTML = h;
  }

  let browseState = { q: '', e: '', s: '' };
  function browseList() {
    const now = Date.now();
    const b = browseState;
    return ALLA.filter((q) => {
      if (b.e && q.exam + '|' + q.cat !== b.e && q.exam !== b.e) return false;
      const c = S.cards[q.id];
      if (b.s === 'new' && c && c.last) return false;
      if (b.s === 'due' && !SRS.isDue(c, now)) return false;
      if (b.s === 'mastered' && !SRS.isMastered(c)) return false;
      if (b.s === 'wrong' && !(c && c.seen > c.correct)) return false;
      if (b.s === 'mark' && !S.marks[q.id]) return false;
      if (b.s === 'note' && !S.notes[q.id]) return false;
      if (b.q && !(q.q + q.exp + q.choices.join('')).includes(b.q)) return false;
      return true;
    });
  }
  function browseItems(list) {
    const now = Date.now();
    return list.slice(0, 200).map((q) => {
      const c = S.cards[q.id];
      const r = SRS.retrievability(c, now);
      return `<li><a href="#" data-act="one" data-id="${q.id}"><span class="tag ${q.exam.toLowerCase()}">${q.exam === 'A1' ? 'A-1' : 'A-2'}</span> ${esc(q.q.slice(0, 70))}${q.q.length > 70 ? '…' : ''}</a>
          <span class="small muted">${esc(q.cat)} ・ ${c && c.seen ? `${c.correct}/${c.seen}回正解 ・ 保持 ${pct(r)}` : '未学習'}${S.marks[q.id] ? ' ・ ★' : ''}</span>
          ${S.notes[q.id] ? `<div class="small memo">📝 ${esc(S.notes[q.id])}</div>` : ''}</li>`;
    }).join('');
  }
  function renderBrowseList() {
    const ul = $('#blist');
    if (!ul) return;
    const list = browseList();
    ul.innerHTML = browseItems(list);
    const btn = $('[data-act=browsego]');
    if (btn) { btn.textContent = `この${list.length}問を演習`; btn.disabled = !list.length; }
  }
  function viewBrowse() {
    const list = browseList();
    const b = browseState;
    let h = `<section class="card"><h2>問題一覧</h2><div class="row wrap">
      <input type="search" id="bq" placeholder="キーワード検索" value="${esc(b.q)}">
      <select id="be"><option value="">全科目</option>${['A2', 'A1'].map((e) => `<option value="${e}" ${b.e === e ? 'selected' : ''}>${EXAM[e].label}すべて</option>${CATS[e].map((c) => `<option value="${e}|${esc(c)}" ${b.e === e + '|' + c ? 'selected' : ''}>　${esc(c)}</option>`).join('')}`).join('')}</select>
      <select id="bs">${[['', 'すべて'], ['new', '未学習'], ['due', '復習待ち'], ['mastered', '定着'], ['wrong', '間違えた'], ['mark', 'ブックマーク'], ['note', 'メモあり']].map(([v, l]) => `<option value="${v}" ${b.s === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
      <button class="btn primary" data-act="browsego" ${list.length ? '' : 'disabled'}>この${list.length}問を演習</button></div>
      <ul class="blist" id="blist">${browseItems(list)}</ul></section>`;
    app.innerHTML = h;
  }

  function viewStats() {
    const now = Date.now();
    const st = stats();
    // 直近30日の学習量と正答率
    const days = [];
    for (let i = 29; i >= 0; i--) days.push(SRS.dayKey(now - i * DAY));
    const byDay = {};
    S.log.forEach((l) => { const k = SRS.dayKey(l.t); (byDay[k] = byDay[k] || { n: 0, ok: 0 }).n++; if (l.ok) byDay[k].ok++; });
    const combo = days.map((k) => ({ label: k.slice(5).replace('-', '/'), bar: (byDay[k] || {}).n || 0, line: byDay[k] ? byDay[k].ok / byDay[k].n : null }));
    // 学習曲線（累積）
    const snapKeys = Object.keys(S.snapshots).sort();
    const sk = snapKeys.slice(-60);
    // 忘却曲線の予測（このまま復習しなかった場合）
    const horizon = Math.max(14, Math.min(120, (daysToExam() || 30)));
    const seenCards = eligibleA().map((q) => S.cards[q.id]).filter((c) => c && c.last);
    const proj = [], projLabels = [];
    for (let i = 0; i <= horizon; i += Math.max(1, Math.round(horizon / 30))) {
      projLabels.push(i === 0 ? '今日' : `+${i}日`);
      proj.push(seenCards.length ? seenCards.reduce((a, c) => a + SRS.retrievability(c, now + i * DAY), 0) / seenCards.length : null);
    }
    const dte = daysToExam();
    const markerIdx = dte != null && dte >= 0 && dte <= horizon ? Math.round(dte / Math.max(1, Math.round(horizon / 30))) : null;
    // 保持率の分布
    const bins = [0, 0, 0, 0, 0];
    seenCards.forEach((c) => { const r = SRS.retrievability(c, now); bins[Math.min(4, Math.floor(r * 5))]++; });
    // 自信度キャリブレーション
    const cal = CONF.map((cf) => { const ls = S.log.filter((l) => l.conf === cf.k); return { label: cf.label, value: ls.length ? ls.filter((l) => l.ok).length / ls.length : null, sub: ` ${ls.length}回` }; });
    const heat = {};
    S.log.forEach((l) => { const k = SRS.dayKey(l.t); heat[k] = (heat[k] || 0) + 1; });
    // 今後7日の復習予定
    const fut = [];
    for (let i = 0; i < 7; i++) {
      const s = SRS.startOfDay(now) + i * DAY, e = s + DAY;
      fut.push({ label: i === 0 ? '今日' : `+${i}`, bar: eligibleA().filter((q) => { const c = S.cards[q.id]; return c && c.last && (i === 0 ? c.due < e : c.due >= s && c.due < e); }).length, line: null });
    }

    let h = `<section class="grid3">
      <div class="tile"><div class="muted small">総解答数</div><div class="tv">${S.log.length}</div></div>
      <div class="tile"><div class="muted small">全体正答率</div><div class="tv">${pct(S.log.length ? S.log.filter((l) => l.ok).length / S.log.length : null)}</div></div>
      <div class="tile"><div class="muted small">連続学習</div><div class="tv">${streak()}日</div></div>
    </section>
    <section class="card"><h3>学習量と正答率（直近30日）</h3><p class="legend"><i class="lg bar"></i>解答数 <i class="lg line"></i>正答率</p>${Charts.combo(combo, { passLine: 0.6, title: '直近30日' })}</section>
    <section class="card"><h3>学習曲線</h3><p class="legend"><i class="lg line"></i>学習済み <i class="lg line2"></i>定着（間隔21日以上） ／ 全${st.total}問</p>
      ${sk.length >= 2 ? Charts.lines(sk.map((k) => k.slice(5).replace('-', '/')), [{ values: sk.map((k) => S.snapshots[k].seen) }, { values: sk.map((k) => S.snapshots[k].mastered), cls: 'l2' }], { yMax: st.total, title: '学習曲線' }) : '<p class="muted small">2日以上学習するとグラフが表示されます。</p>'}</section>
    <section class="card"><h3>忘却曲線の予測</h3><p class="muted small">学習済み ${seenCards.length} 問の平均記憶保持率が、今後まったく復習しなかった場合にどう下がるか（指数忘却モデル）。復習するたびに曲線はなだらかになります。${dte != null ? '縦線は試験日。' : ''}</p>
      ${seenCards.length ? Charts.lines(projLabels, [{ values: proj }], { yMax: 1, percent: true, marker: markerIdx, markerLabel: '試験日', title: '忘却曲線' }) : '<p class="muted small">まだデータがありません。</p>'}
      <p class="small">記憶保持率の分布：${['〜20%', '20〜40%', '40〜60%', '60〜80%', '80%〜'].map((l, i) => `${l} <b>${bins[i]}</b>`).join(' ・ ')}</p></section>
    <section class="card"><h3>今後7日の復習予定</h3>${Charts.combo(fut, { title: '復習予定' })}</section>
    <section class="card"><h3>分野別 正答率</h3>`;
    (S.settings.a1Exempt ? ['A2'] : ['A2', 'A1']).forEach((e) => (h += `<h4>${EXAM[e].label}</h4>` + Charts.hbars(catStats(e).map((c) => ({ label: c.cat, value: c.acc, sub: ` ${c.learned}/${c.total}問` })), { passLine: 0.6 })));
    h += `</section>
    <section class="card"><h3>自信度と正答率（メタ認知）</h3><p class="muted small">「自信あり」の正答率が高く「勘」が低いほど、自分の理解度を正しく把握できています。「自信あり」で正答率が低い場合は思い込みに注意。</p>${Charts.hbars(cal)}</section>
    <section class="card"><h3>学習カレンダー</h3>${Charts.heatmap(heat, 17, SRS.dayKey)}</section>`;
    app.innerHTML = h;
  }

  function viewSettings() {
    const s = S.settings;
    app.innerHTML = `<section class="card"><h2>設定</h2><form id="sform" class="form">
      <label>科目A群の受験日 <input type="date" name="examDate" value="${esc(s.examDate)}"></label>
      <label>科目B群の受験日 <input type="date" name="examDateB" value="${esc(s.examDateB)}"></label>
      <p class="muted small">CBT方式では科目A群と科目B群を別の日に受験します（2026年度：科目A 10/17〜10/27、科目B 11/11〜11/23）。2027年度から新試験制度へ移行予定のため、次回の受験予定日を入れてください。「直前総仕上げ」と想起率は科目A群の受験日を基準にします。</p>
      <label>今日の学習の問題数 <input type="number" name="dailyCount" min="3" max="100" value="${esc(s.dailyCount)}"></label>
      <label>新しい問題の割合（復習が少ないとき） <select name="newRatio">${[0.2, 0.3, 0.4, 0.5, 0.7].map((v) => `<option value="${v}" ${s.newRatio == v ? 'selected' : ''}>${v * 100}%</option>`).join('')}</select></label>
      <label class="chk"><input type="checkbox" name="a1Exempt" ${s.a1Exempt ? 'checked' : ''}> 科目A-1 免除（応用情報技術者試験の合格／高度試験・情報処理安全確保支援士試験の合格／高度試験・支援士試験の科目A-1（旧午前Ⅰ）で基準点以上、のいずれかから2年間）</label>
      <label class="chk"><input type="checkbox" name="confidence" ${s.confidence ? 'checked' : ''}> 解答時に自信度を選ぶ（推奨：復習間隔の精度が上がる）</label>
      <label class="chk"><input type="checkbox" name="retry" ${s.retry ? 'checked' : ''}> 間違えた問題をセッション内で再出題する</label>
      <label class="chk"><input type="checkbox" name="includePast" ${s.includePast !== false ? 'checked' : ''}> IPA 過去問を「今日の学習」や演習にも混ぜる（年度別模試はこの設定に関係なく使えます）</label>
      <h3>表示</h3>
      <label>テーマ <select name="theme">${[['auto', '端末の設定に合わせる'], ['light', 'ライト'], ['dark', 'ダーク']].map(([v, l]) => `<option value="${v}" ${s.theme === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label>文字サイズ <select name="fontScale">${[[0.9, '小'], [1, '標準'], [1.12, '大'], [1.25, '特大']].map(([v, l]) => `<option value="${v}" ${s.fontScale == v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="chk"><input type="checkbox" name="haptics" ${s.haptics ? 'checked' : ''}> 解答時に振動する（対応端末のみ）</label>
      <label class="chk"><input type="checkbox" name="effects" ${s.effects ? 'checked' : ''}> 達成時の演出（端末の「視差効果を減らす」設定時は自動で無効）</label>
      <div class="row end"><button class="btn primary">保存</button></div></form></section>
      <a class="card linkcard" href="#/guide"><b>このアプリの学習法</b><span class="muted small">取り入れた学習科学と、おすすめの使い方</span>${ICON.right}</a>
      <section class="card"><h3>データ</h3><p class="muted small">学習記録はこのブラウザ内（localStorage）だけに保存されます。機種変更やブラウザのデータ削除に備えて、ときどきバックアップしてください。</p>
      <div class="row wrap"><button class="btn" data-act="export">バックアップを書き出す</button>
      <label class="btn">バックアップを読み込む<input type="file" id="importf" accept="application/json" hidden></label>
      <button class="btn" data-act="redaily">今日の問題を作り直す</button>
      <button class="btn danger" data-act="reset">全データを消去</button></div>
      <p class="muted small">収録問題：A-1 ${A1.length}問 ／ A-2 ${A2.length}問 ／ B-1 ${B1.length}事例 ／ B-2 ${B2.length}テーマ（うち IPA 過去問 ${ALLA.concat(B1, B2).filter(isPast).length}）</p>
      <p class="muted small">IPA 過去問は、IPA が公表している問題を出典を明記して掲載しています（教育目的での利用は許諾不要と IPA が案内）。正解は IPA 公表の解答例、解説・骨子例は本アプリ独自です。</p></section>`;
  }

  function viewGuide() {
    app.innerHTML = `<article class="card guide">
    <h2>このアプリに取り入れた学習法</h2>
    <h3>1. 間隔反復（Spaced Repetition）</h3>
    <p>記憶は学習直後に急速に失われ、その後ゆるやかに失われていきます（エビングハウスの忘却曲線。べき関数で近似されることが多い：Wixted & Ebbesen, 1991）。忘れかけた頃に思い出すと記憶が強化され、次に忘れるまでの期間が延びます（分散学習効果）。分散学習は集中学習より最終テストの成績が高いことがメタ分析でも確認されています（Cepeda et al., 2006 / Latimier et al., 2021）。</p>
    <p>本アプリは SM-2 系のアルゴリズムで、問題ごとに次回の復習日を自動計算します。期日どおりに正解するたびに間隔は 1日 → 約3日 → 約1週間 → 数週間 と伸び、間違えると1日に戻ります。<b>同じ日に何度解き直しても間隔は伸びません</b>（間を空けて思い出すことに効果があるため）。期日より早く復習した場合も伸び幅を小さくします。<b>間隔が21日以上になった問題を「定着」</b>として数えています。</p>
    <p>復習待ちが1日の問題数を超えたときは、新しい問題を一時停止して復習を優先します（積み残しが雪だるま式に増えるのを防ぐため）。</p>
    <h3>2. 想起練習（テスト効果）</h3>
    <p>テキストを読み返すより、問題を解いて思い出す方が長期記憶に残ります（Roediger & Karpicke, 2006）。だからこのアプリは「読む」より「解く」が中心です。模試の解答も復習スケジュールに反映されます（自信度を聞かないため、正解でも控えめに間隔を伸ばします）。</p>
    <p><b>注意：</b>同じ問題集を繰り返すと「問題と答えを覚えた」状態になりやすく、本番の初見問題での実力とは別物になります。ホームの「初見正答率」（各問題を初めて解いたときの正答率）を実力の目安にし、「収録問題の想起率」は本番の得点予測ではないと考えてください。</p>
    <h3>3. 自信度の評価（メタ認知）</h3>
    <p>解答時に「自信あり／たぶん／勘」を選びます。勘で当たった問題は理解できていないとみなして短い間隔で、自信を持って正解した問題は長い間隔で復習します。また、<b>自信があったのに間違えた問題</b>は訂正後によく記憶に残ることが知られています（過剰修正効果：Butterfield & Metcalfe, 2001）。分析画面では自信度ごとの正答率（キャリブレーション）を確認できます。</p>
    <h3>4. インターリーブ（交互練習）</h3>
    <p>同じ種類の問題をまとめて解くより、混ぜて解く方が「どの知識・解法を使うか」を見分ける力がつくことがあります（Rohrer & Taylor, 2007）。ただしメタ分析では、効果は<b>互いに似ていて混同しやすいカテゴリどうし</b>で大きく、条件によっては逆効果にもなります（Brunmair & Richter, 2019）。本アプリの交互出題は主に分散学習の効果を狙ったもので、似た概念の区別には分野別演習で同じ分野をまとめて解くのも有効です。</p>
    <h3>5. 即時フィードバックと精緻化</h3>
    <p>演習では解答直後に解説を表示し、誤答の選択肢がなぜ誤りかまで説明します。さらに「自分の言葉で要点メモ」を書くと、次回その問題の解説と一緒に表示されます（自己説明・生成効果）。間違えた問題は同じセッション内で数問後に再出題し、短期の再想起も行います。</p>
    <h3>6. 本番を模した練習（転移適切処理）</h3>
    <p>学習時の条件が本番に近いほど成績が上がります。模試モードは本番と同じ問題数・制限時間で、時間中は解説を出しません。科目A群・科目B群は本番と同じく別日の想定で分けています。記述式（B-1）は字数制限付き入力、論述式（B-2）は字数カウンタ付きで実際に書き、IPA の評価観点に沿って自己評価します（自己評価は参考値）。</p>
    <h3>7. 毎日少しずつ・連続記録</h3>
    <p>1日15問前後の「今日の学習」を習慣にすることを推奨します。連続学習日数と学習カレンダーで継続を可視化しています。</p>

    <h2>おすすめの使い方</h2>
    <ol>
      <li><b>毎日</b>：「今日の学習」（10〜15分）。復習待ちが溜まっていたら先に消化。</li>
      <li><b>週1〜2回</b>：B-1 を1事例（45分）。B-2 は骨子だけ作る練習（20分）も効果的。</li>
      <li><b>2週に1回</b>：科目A の模試で時間配分を確認。弱点分野は分野別演習で補強。</li>
      <li><b>試験1か月前から</b>：科目A群・科目B群の本番形式模試を2〜3回ずつ、B-2 は時間を計って手を動かして書き切る練習。</li>
      <li><b>直前1週間</b>：「直前総仕上げ」で、試験日に忘れていそうな問題を優先して復習。</li>
    </ol>
    <h2>試験の概要（2026年度・CBT方式）</h2>
    <table class="tbl"><tr><th>科目</th><th>時間</th><th>形式</th><th>問題数</th></tr>
      <tr><td>科目A-1</td><td>50分</td><td>四肢択一</td><td>30問</td></tr>
      <tr><td>科目A-2</td><td>40分</td><td>四肢択一</td><td>25問</td></tr>
      <tr><td>科目B-1</td><td>90分</td><td>記述式</td><td>3問中2問</td></tr>
      <tr><td>科目B-2</td><td>120分</td><td>論述式</td><td>2問中1問</td></tr></table>
    <p class="muted small">合格基準は各科目 60点以上（B-2 はランク A）。科目A群と科目B群は別日に実施し、採点は多段階選抜です。出典：IPA システムアーキテクト試験ページ、試験要綱 Ver.5.6。収録問題はすべてオリジナルの練習問題です。最新の公式情報は IPA のサイトで確認してください。</p>
    </article>`;
  }

  // ---------------------------------------------------------------- ルーター
  let route = '/';
  function go(p) { if (location.hash !== '#' + p) location.hash = '#' + p; else render(); }
  /** 表示できる状態がないときの転送（履歴を増やさない。戻る操作で抜けられなくなるのを防ぐ） */
  function redirect(p) { if (location.hash !== '#' + p) location.replace('#' + p); else render(); }
  function render() {
    // 再描画でフォーカスが body に飛ばないよう、同じ操作要素へ戻す
    const ae = document.activeElement;
    const key = ae && ae.dataset && ae.dataset.act ? `[data-act="${ae.dataset.act}"]${ae.dataset.ci != null ? `[data-ci="${ae.dataset.ci}"]` : ''}${ae.dataset.i != null ? `[data-i="${ae.dataset.i}"]` : ''}${ae.dataset.conf != null ? `[data-conf="${ae.dataset.conf}"]` : ''}` : null;
    renderRoute();
    if (key && document.activeElement === document.body) {
      const el = $(key) || (Q && Q.phase === 'feedback' && route === '/quiz' ? $('[data-act="next"]') : null);
      if (el && !el.disabled) el.focus({ preventScroll: true });
    }
  }
  function renderRoute() {
    route = location.hash.slice(1) || '/';
    const nav = route.split('/')[1] || 'home';
    const navKey = { b1: 'practice', b2: 'practice', browse: 'practice', quiz: 'practice', guide: 'settings' }[nav] || nav;
    $$('[data-nav]').forEach((a) => { const on = a.dataset.nav === navKey; a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    // 演習・模試中は集中モード（ナビを隠す）
    document.body.classList.toggle('focus', route === '/quiz' || route === '/exam/run');
    closeSheet();
    if (route === '/' || route === '') return viewHome();
    if (route === '/quiz') return viewQuiz();
    if (route === '/practice') return viewPractice();
    if (route === '/exam') return viewExamMenu();
    if (route === '/exam/run') return viewExamRun();
    if (route.startsWith('/exam/result/')) return viewExamResult(+route.split('/')[3]);
    if (route === '/b1') return viewBList('b1');
    if (route === '/b2') return viewBList('b2');
    if (route === '/browse') return viewBrowse();
    if (route === '/stats') return viewStats();
    if (route === '/settings') return viewSettings();
    if (route === '/guide') return viewGuide();
    viewHome();
  }
  window.addEventListener('hashchange', () => {
    const run = () => { render(); window.scrollTo(0, 0); };
    if (document.startViewTransition && !reducedMotion()) {
      const vt = document.startViewTransition(run);
      // 連続遷移で前の遷移が中断されるのは正常なので握りつぶす
      [vt.ready, vt.finished, vt.updateCallbackDone].forEach((pr) => pr && pr.catch(() => {}));
    } else run();
  });

  // ---------------------------------------------------------------- イベント
  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-act]');
    if (!t || t.disabled) return;
    const a = t.dataset.act;
    const st = S.active && S.active.stage;
    switch (a) {
      case 'go': go(t.dataset.to); break;
      case 'sheet': openSheet(t.dataset.sheet); break;
      case 'closesheet': closeSheet(true); break;
      case 'quitquiz': if (!Q || Q.phase === 'done' || confirm('演習を終了しますか？（解答済みの記録は保存されています）')) { Q = null; go('/'); } break;
      case 'daily': ensureDaily(); startQuiz(dailyRemaining(), 'daily', '今日の学習'); break;
      case 'dailymore': { const ids = buildDaily(true); startQuiz(ids, 'daily', '今日の学習（追加）'); break; }
      case 'review': {
        const now = Date.now();
        const ids = eligibleA().filter((q) => SRS.isDue(S.cards[q.id], now)).sort((x, y) => SRS.retrievability(S.cards[x.id], now) - SRS.retrievability(S.cards[y.id], now)).slice(0, 30);
        startQuiz(interleave(ids).map((q) => q.id), 'review', '復習'); break;
      }
      case 'weak': { const qs = weakSet(15); if (!qs.length) toast('まだ弱点データがありません。まずは今日の学習から！'); else startQuiz(qs.map((q) => q.id), 'weak', '弱点克服'); break; }
      case 'cram': { const qs = cramSet(20); if (!qs.length) toast('学習済みの問題がまだありません'); else startQuiz(interleave(qs).map((q) => q.id), 'cram', '直前総仕上げ'); break; }
      case 'catgo': { const cat = t.dataset.cat; startQuiz(shuffle(eligibleA().filter((q) => q.cat === cat)).slice(0, 10).map((q) => q.id), 'practice', cat); break; }
      case 'one': e.preventDefault(); startQuiz([t.dataset.id], 'practice', '1問演習'); break;
      case 'retrywrong': startQuiz([...new Set(Q.results.filter((r) => !r.ok).map((r) => r.id))], 'practice', '間違えた問題'); break;
      case 'examwrong': { const r = S.exams[+t.dataset.r].results.find((x) => x.type === t.dataset.t); startQuiz(r.detail.filter((d) => !d.ok && QMAP[d.id]).map((d) => d.id), 'practice', '模試の復習'); break; }
      case 'browsego': startQuiz(shuffle(browseList()).map((q) => q.id).slice(0, 50), 'practice', '問題一覧から'); break;
      case 'mark': { const id = t.dataset.id; if (S.marks[id]) delete S.marks[id]; else S.marks[id] = Date.now(); save(); t.classList.toggle('on'); t.textContent = S.marks[id] ? '★' : '☆'; break; }
      case 'sel': if (Q && Q.phase === 'answer') { Q.sel = +t.dataset.ci; render(); } break;
      case 'conf': answerQuiz(t.dataset.conf || null); break;
      case 'next': nextQuiz(); break;
      case 'allcat': $$(`input[value^="${t.dataset.e}|"]`).forEach((i) => (i.checked = true)); break;
      // 模試
      case 'pastset': if (S.active && !confirm('受験中の模試を破棄して新しく始めますか？')) return; startExam('set', { set: t.dataset.set }); break;
      case 'exam': {
        if (S.active && !confirm('受験中の模試を破棄して新しく始めますか？')) return;
        const k = t.dataset.k;
        startExam(k, t.dataset.n ? { n: +t.dataset.n, min: +t.dataset.min } : {}); break;
      }
      case 'b1': if (S.active && !confirm('受験中の模試を破棄して始めますか？')) return; startExam('B1', { caseId: t.dataset.id }); break;
      case 'b2': if (S.active && !confirm('受験中の模試を破棄して始めますか？')) return; startExam('B2', { caseId: t.dataset.id }); break;
      case 'beginstage': beginStage(); break;
      case 'quitexam': sheetOpener = null; withSheetClosed(quitExam); break;
      case 'pause': togglePause(); break;
      case 'xsel': { const id = st.ids[st.idx]; const ci = +t.dataset.ci; if (st.ans[id] === ci) break; st.ans[id] = ci; haptic(8); save(); render(); break; }
      case 'xclear': { delete st.ans[st.ids[st.idx]]; save(); render(); break; }
      case 'xprev': examMove(-1); break;
      case 'xnext': examMove(1); break;
      case 'xgo': { const i = +t.dataset.i; sheetOpener = null; withSheetClosed(() => { trackSpent(); st.idx = i; save(); render(); window.scrollTo(0, 0); }); break; }
      case 'xflag': { const id = st.ids[st.idx]; if (st.flags[id]) delete st.flags[id]; else st.flags[id] = 1; save(); render(); break; }
      case 'xfinish': {
        const un = st.ids.length - Object.keys(st.ans).length;
        if (!confirm(un ? `未解答が ${un} 問あります。提出しますか？` : '提出しますか？')) return;
        sheetOpener = null; withSheetClosed(() => finishAStage(false)); break;
      }
      case 'b1pick': { const id = t.dataset.id; const i = st.chosen.indexOf(id); if (i >= 0) st.chosen.splice(i, 1); else if (st.chosen.length < EXAM.B1.pick) st.chosen.push(id); else toast(`${EXAM.B1.pick}問まで選べます`); save(); render(); break; }
      case 'b1start': st.phase = 'answer'; st.tab = 0; save(); render(); break;
      case 'b1tab': st.tab = +t.dataset.i; save(); render(); window.scrollTo(0, 0); break;
      case 'b1pane': {
        // タブごとにスクロール位置を覚えておき、行き来しても読んでいた位置に戻る
        const cur = st.pane || 'scen';
        if (cur === t.dataset.p) break;
        st.paneY = st.paneY || {}; st.paneY[cur] = window.scrollY;
        st.pane = t.dataset.p; save(); render();
        window.scrollTo(0, st.paneY[st.pane] || 0); break;
      }
      case 'b1submit': if (confirm('解答を終了して自己採点に進みますか？')) finishB1Answer(); break;
      case 'b1grade': st.grades[t.dataset.k] = +t.dataset.v; save(); $$(`[data-k="${t.dataset.k}"]`).forEach((b) => b.classList.toggle('on', b === t)); break;
      case 'b1done': finishB1Grade(); break;
      case 'b2pick': st.chosen = t.dataset.id; save(); render(); break;
      case 'b2start': st.phase = 'write'; save(); render(); break;
      case 'b2submit': if (confirm('論述を終了して自己評価に進みますか？')) finishB2Write(); break;
      case 'b2done': finishB2Grade(); break;
      // 設定
      case 'export': {
        const blob = new Blob([JSON.stringify(S)], { type: 'application/json' });
        const u = URL.createObjectURL(blob);
        const l = document.createElement('a'); l.href = u; l.download = `sa-study-backup-${today()}.json`; l.click();
        setTimeout(() => URL.revokeObjectURL(u), 1000); break;
      }
      case 'redaily': { const done = S.daily && S.daily.date === today() ? S.daily.done : {}; buildDaily(); S.daily.done = done; save(); toast('今日の問題を作り直しました'); break; }
      case 'reset': if (confirm('学習記録・模試結果をすべて消去します。よろしいですか？') && confirm('本当に消去しますか？（元に戻せません）')) { S = defaultState(); save(); toast('消去しました'); go('/'); } break;
    }
  });

  document.addEventListener('input', (e) => {
    const t = e.target;
    const st = S.active && S.active.stage;
    if (t.dataset.note) { const v = t.value.trim(); if (v) S.notes[t.dataset.note] = v; else delete S.notes[t.dataset.note]; saveSoon(); }
    else if (t.dataset.b1 && st) {
      st.ans[t.dataset.b1] = t.value; saveSoon();
      const [cid, qi] = t.dataset.b1.split(':');
      const q = B1MAP[cid].questions[+qi];
      const n = charCount(t.value);
      const cc = $(`[data-cc="${t.dataset.b1}"]`);
      if (cc) { cc.textContent = n + (q.limit ? ' / ' + q.limit + '字' : '字'); cc.classList.toggle('over', !!q.limit && n > q.limit); }
    } else if (t.dataset.b2 && st) {
      st.texts[t.dataset.b2] = t.value; saveSoon();
      const p = B2MAP[st.chosen].parts.find((x) => x.no === t.dataset.b2);
      const cc = $(`[data-cc2="${t.dataset.b2}"]`); if (cc) cc.innerHTML = b2Counter(p, t.value);
      const tot = $('#b2total'); if (tot) tot.textContent = '合計 ' + B2MAP[st.chosen].parts.reduce((a, p) => a + charCount(st.texts[p.no]), 0) + '字';
    } else if (t.dataset.b2o && st) { st.outline = t.value; saveSoon(); }
    else if (t.id === 'bq') {
      if (e.isComposing) return; // 日本語変換中は再描画しない
      browseState.q = t.value; clearTimeout(t._h); t._h = setTimeout(renderBrowseList, 300);
    }
  });
  document.addEventListener('compositionend', (e) => { if (e.target.id === 'bq') { browseState.q = e.target.value; renderBrowseList(); } });
  document.addEventListener('change', (e) => {
    const t = e.target;
    const st = S.active && S.active.stage;
    if (t.dataset.b2c && st) {
      st.checks[t.dataset.b2c] = t.checked; save();
      const ev = b2Eval(st); const r = $('#b2rank'); if (r) { r.textContent = ev.rank; r.className = 'rank r' + ev.rank; }
    } else if (t.id === 'be' || t.id === 'bs') { browseState[t.id === 'be' ? 'e' : 's'] = t.value; viewBrowse(); }
    else if (t.id === 'importf' && t.files[0]) {
      const fr = new FileReader();
      fr.onload = () => {
        try {
          const d = JSON.parse(fr.result);
          if (!isObj(d) || !isObj(d.cards) || !isObj(d.settings)) throw new Error('形式が違います');
          if (!confirm('現在のデータを上書きして読み込みますか？')) return;
          S = normalize(d); save(); toast('読み込みました'); go('/');
        } catch (err) { toast('読み込みに失敗：' + err.message); }
      };
      fr.readAsText(t.files[0]);
    }
  });
  document.addEventListener('submit', (e) => {
    e.preventDefault();
    if (e.target.id === 'pform') runPractice(e.target);
    if (e.target.id === 'sform') {
      const fd = new FormData(e.target);
      const s = S.settings;
      const prevExempt = s.a1Exempt;
      s.examDate = fd.get('examDate') || '';
      s.examDateB = fd.get('examDateB') || '';
      s.dailyCount = Math.max(3, Math.min(100, +fd.get('dailyCount') || 15));
      s.newRatio = +fd.get('newRatio');
      s.a1Exempt = !!fd.get('a1Exempt');
      s.confidence = !!fd.get('confidence');
      s.retry = !!fd.get('retry');
      const prevPast = s.includePast !== false;
      s.includePast = !!fd.get('includePast');
      if (prevPast !== s.includePast && S.daily) { const done = S.daily.done; buildDaily(); S.daily.done = done; }
      s.theme = ['auto', 'light', 'dark'].includes(fd.get('theme')) ? fd.get('theme') : 'auto';
      s.fontScale = +fd.get('fontScale') || 1;
      s.haptics = !!fd.get('haptics');
      s.effects = !!fd.get('effects');
      applyPrefs();
      if (prevExempt !== s.a1Exempt && S.daily) { const done = S.daily.done; buildDaily(); S.daily.done = done; }
      save(); toast('保存しました');
    }
  });
  document.addEventListener('keydown', (e) => {
    if (document.body.classList.contains('sheet-open')) { if (e.key === 'Escape') closeSheet(true); return; }
    if (e.target.matches('input, textarea, select') || e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    if (route === '/quiz' && Q) {
      if (Q.phase === 'answer') {
        if (k >= '1' && k <= '4') { Q.sel = Q.order[+k - 1]; render(); }
        const cf = CONF.find((c) => c.key === k);
        if (cf && S.settings.confidence) answerQuiz(cf.k);
        if (k === 'enter' && !S.settings.confidence) answerQuiz(null);
      } else if (Q.phase === 'feedback' && (k === 'enter' || k === ' ')) { e.preventDefault(); nextQuiz(); }
    } else if (route === '/exam/run' && S.active && S.active.stage && S.active.stage.ids && S.active.stage.pausedLeft == null) {
      const st = S.active.stage;
      if (k >= '1' && k <= '4') { st.ans[st.ids[st.idx]] = st.orders[st.ids[st.idx]][+k - 1]; save(); render(); }
      if (k === 'arrowright') examMove(1);
      if (k === 'arrowleft') examMove(-1);
      if (k === 'f') { const id = st.ids[st.idx]; if (st.flags[id]) delete st.flags[id]; else st.flags[id] = 1; save(); render(); }
    }
  });

  // ---------------------------------------------------------------- モバイル UX ヘルパー
  /** スクリーンリーダー向けの通知（常設のライブリージョン） */
  function announce(msg) {
    let lr = $('#live');
    if (!lr) { lr = document.createElement('div'); lr.id = 'live'; lr.className = 'vh'; lr.setAttribute('role', 'status'); lr.setAttribute('aria-live', 'polite'); document.body.appendChild(lr); }
    lr.textContent = ''; setTimeout(() => (lr.textContent = msg), 50);
  }
  function reducedMotion() { return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; }
  function haptic(p) { try { if (S.settings.haptics && navigator.vibrate) navigator.vibrate(p); } catch (e) { /* 非対応 */ } }
  function applyPrefs() {
    const s = S.settings, root = document.documentElement;
    if (s.theme === 'auto') root.removeAttribute('data-theme'); else root.dataset.theme = s.theme;
    root.style.setProperty('--scale', s.fontScale || 1);
    const dark = s.theme === 'dark' || (s.theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
    const m = $('meta[name=theme-color]'); if (m) m.content = dark ? '#12161c' : '#f5f7fa';
  }
  /** 円形の進捗リング */
  function ring(v, label, cls) {
    const r = 26, c = 2 * Math.PI * r, f = Math.max(0, Math.min(1, v || 0));
    return `<div class="ring ${cls || ''} ${f >= 1 ? 'full' : ''}"><svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="${r}" class="rt"/><circle cx="32" cy="32" r="${r}" class="rf" stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - f)}"/></svg><span>${label}</span></div>`;
  }
  /** ボトムシート */
  function sheetHtml(name, body) {
    return `<div class="sheet-backdrop" data-act="closesheet" data-sheetfor="${name}"></div><div class="sheet" data-sheet-name="${name}" role="dialog" aria-modal="true" aria-label="問題一覧" inert aria-hidden="true"><div class="grab" data-act="closesheet"></div>${body}</div>`;
  }
  let sheetOpener = null;
  function openSheet(name) {
    const sh = $(`[data-sheet-name="${name}"]`);
    if (!sh) return;
    sheetOpener = document.activeElement;
    document.body.classList.add('sheet-open');
    sh.classList.add('open'); sh.inert = false; sh.removeAttribute('aria-hidden');
    $(`[data-sheetfor="${name}"]`).classList.add('open');
    // 戻る操作でシートだけを閉じられるよう履歴を1つ積む
    history.pushState({ sheet: name }, '');
    const f = sh.querySelector('.nv.cur') || sh.querySelector('button'); if (f) f.focus({ preventScroll: true });
  }
  /** fromUi: ボタン等で閉じた場合は積んだ履歴を戻す */
  function closeSheet(fromUi) {
    const wasOpen = document.body.classList.contains('sheet-open');
    document.body.classList.remove('sheet-open');
    $$('.sheet.open, .sheet-backdrop.open').forEach((e) => e.classList.remove('open'));
    $$('.sheet').forEach((e) => { e.inert = true; e.setAttribute('aria-hidden', 'true'); });
    if (wasOpen && fromUi && history.state && history.state.sheet) history.back();
    if (wasOpen && sheetOpener && document.contains(sheetOpener)) sheetOpener.focus({ preventScroll: true });
    sheetOpener = null;
  }
  let afterSheet = null;
  /** シート用に積んだ履歴を戻し終えてから fn を実行（戻る処理と画面遷移の競合を防ぐ） */
  function withSheetClosed(fn) {
    if (history.state && history.state.sheet) { afterSheet = fn; history.back(); }
    else { closeSheet(false); fn(); }
  }
  window.addEventListener('popstate', () => {
    if (document.body.classList.contains('sheet-open')) closeSheet(false);
    if (afterSheet) { const f = afterSheet; afterSheet = null; f(); }
  });
  function examMove(d) {
    const st = S.active && S.active.stage;
    if (!st || !st.ids) return;
    const n = st.idx + d;
    if (n < 0 || n >= st.ids.length) return;
    trackSpent(); st.idx = n; save(); render(); window.scrollTo(0, 0);
  }
  /** 達成時の紙吹雪（軽量 canvas） */
  function celebrate() {
    haptic([20, 40, 20, 40, 60]);
    if (!S.settings.effects || reducedMotion()) return;
    const cv = document.createElement('canvas');
    cv.className = 'confetti'; cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio;
    document.body.appendChild(cv);
    const g = cv.getContext('2d'); g.scale(devicePixelRatio, devicePixelRatio);
    const cols = ['#1f5fa8', '#1f8a4c', '#e3a33a', '#c23b3b', '#7a4cc2', '#5b9be0'];
    const ps = Array.from({ length: 90 }, () => ({ x: innerWidth / 2, y: innerHeight * 0.35, vx: (Math.random() - 0.5) * 12, vy: -Math.random() * 12 - 4, r: Math.random() * 6 + 4, a: Math.random() * 6, va: (Math.random() - 0.5) * 0.4, c: cols[(Math.random() * cols.length) | 0] }));
    const t0 = performance.now();
    (function frame(t) {
      const k = (t - t0) / 1600;
      g.clearRect(0, 0, innerWidth, innerHeight);
      ps.forEach((p) => { p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.a += p.va; g.save(); g.globalAlpha = Math.max(0, 1 - k); g.translate(p.x, p.y); g.rotate(p.a); g.fillStyle = p.c; g.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); g.restore(); });
      if (k < 1) requestAnimationFrame(frame); else cv.remove();
    })(t0);
  }
  // スワイプ：演習のフィードバック画面で左へ→次へ、模試で左右→前後の問題
  (function () {
    let sx = 0, sy = 0, st0 = 0, tracking = false;
    document.addEventListener('touchstart', (e) => {
      const x0 = e.touches[0] && e.touches[0].clientX;
      // 画面端（OS の戻るジェスチャー）、入力欄、シート上、テキスト選択中は対象外
      if (e.touches.length !== 1 || !e.target.closest('[data-swipe]') || e.target.closest('textarea, input, .sheet') || x0 < 24 || x0 > innerWidth - 24 || String(getSelection()).length) { tracking = false; return; }
      tracking = true; sx = x0; sy = e.touches[0].clientY; st0 = Date.now();
    }, { passive: true });
    document.addEventListener('touchend', (e) => {
      if (!tracking) return;
      tracking = false;
      const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (String(getSelection()).length) return;
      if (Math.abs(dx) < 90 || Math.abs(dx) < Math.abs(dy) * 2 || Date.now() - st0 > 600) return;
      if (route === '/quiz' && Q && Q.phase === 'feedback' && dx < 0) nextQuiz();
      else if (route === '/exam/run' && S.active && S.active.stage && S.active.stage.ids) {
        const before = S.active.stage.idx;
        examMove(dx < 0 ? 1 : -1);
        if (S.active.stage.idx !== before) toast(`問${S.active.stage.idx + 1}へ移動`);
      }
    }, { passive: true });
  })();
  if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', applyPrefs);

  // タイマー
  setInterval(() => {
    tickElapsed();
    const bt = $('#breakt');
    if (bt && S.active && S.active.breakAt) { const left = 10 * 60000 - (Date.now() - S.active.breakAt); bt.textContent = left > 0 ? `休憩の残り目安 ${fmtClock(left)}` : '休憩時間（10分）を過ぎました。'; }
    if (route !== '/exam/run' || !S.active || !S.active.stage) return;
    const st = S.active.stage;
    if (st.pausedLeft != null) return;
    const inTimed = (st.type === 'A1' || st.type === 'A2') || (st.type === 'B1' && st.phase !== 'grade') || (st.type === 'B2' && st.phase !== 'grade');
    if (!inTimed) return;
    const left = remaining();
    const el = $('#timer');
    if (el) { el.textContent = fmtClock(left); el.classList.toggle('warn', left < 5 * 60000); }
    if (left <= 0) {
      toast('試験時間終了');
      if (st.type === 'A1' || st.type === 'A2') finishAStage(true);
      else if (st.type === 'B1') {
        if (st.phase === 'choose') st.options.forEach((id) => { if (st.chosen.length < Math.min(EXAM.B1.pick, st.options.length) && !st.chosen.includes(id)) st.chosen.push(id); });
        finishB1Answer();
      }
      else { if (!st.chosen) st.chosen = st.options[0]; finishB2Write(); }
    }
  }, 1000);
  window.addEventListener('beforeunload', save);
  window.addEventListener('pagehide', save);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') save(); });

  // PWA（http(s) で配信している場合のみ）
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});

  applyPrefs();
  render();
})();
