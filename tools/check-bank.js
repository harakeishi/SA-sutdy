#!/usr/bin/env node
/*
 * 問題データの検査：形式の不備と「知識なしで当てられる手がかり」を集計する。
 *   node tools/check-bank.js
 * 形式エラーがあれば終了コード 1。手がかりの偏りは警告として表示する。
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const files = [...html.matchAll(/<script src="(data\/[^"]+\.js)"><\/script>/g)].map((m) => m[1]);
const win = {};
const loadErrors = [];
for (const f of files) {
  try { vm.runInNewContext(fs.readFileSync(path.join(root, f), 'utf8'), { window: win }, { filename: f }); }
  catch (e) { loadErrors.push(`${f} を読み込めない：${e.message}`); }
}
const QB = win.QB || {};

const CATS = {
  a1: ['基礎理論', 'アルゴリズム・プログラミング', 'コンピュータシステム', 'データベース', 'ネットワーク', 'セキュリティ', '開発技術', 'マネジメント', 'ストラテジ'],
  a2: ['システム企画・要件定義', '設計・モデリング', 'アーキテクチャ・方式設計', '信頼性・性能', '開発技術・テスト', 'プロジェクト・見積り', 'セキュリティ', '組込み・IoT', '法務・標準', 'ストラテジ'],
};
let errors = 0;
const err = (m) => { errors++; console.log('  ✗ ' + m); };
loadErrors.forEach(err);
const pct = (x, n) => (n ? Math.round((x / n) * 100) + '%' : '—');
const num = (s) => { const m = s.replace(/,/g, '').match(/-?\d+(\.\d+)?/); return m ? +m[0] : null; };
const isNumeric = (q) => q.choices.every((c) => num(c) !== null && c.replace(/[\d.,\s約%％円万千億件台日年月秒分時間個回人ビットバイトMBGBKBms/^-]/g, '').length <= 4);

const ids = new Set();
for (const k of ['a1', 'a2']) {
  const a = QB[k] || [];
  console.log(`\n■ ${k.toUpperCase()}：${a.length}問`);
  const pos = [0, 0, 0, 0], lv = [0, 0, 0], cats = {}, past = {}, obsolete = [], dups = [];
  const lenR = [0, 0, 0, 0]; let lenN = 0;
  const numR = [0, 0, 0, 0]; let numN = 0;
  for (const q of a) {
    if (ids.has(q.id)) err(`id 重複 ${q.id}`); ids.add(q.id);
    if (!CATS[k].includes(q.cat)) err(`${q.id} 不明な分野「${q.cat}」`);
    if (!Array.isArray(q.choices) || q.choices.length !== 4) { err(`${q.id} 選択肢が4つでない`); continue; }
    if (new Set(q.choices).size !== 4) err(`${q.id} 同じ選択肢がある`);
    if (!(q.answer >= 0 && q.answer <= 3)) err(`${q.id} answer が範囲外`);
    if (!q.q || !q.exp) err(`${q.id} 問題文または解説が空`);
    if (!q.noShuffle && /^[アイウエ][はがの、]/.test(q.choices.join('|'))) err(`${q.id} 選択肢が記号を参照（noShuffle が必要）`);
    lv[(q.level || 2) - 1]++; cats[q.cat] = (cats[q.cat] || 0) + 1;
    if (q.set) {
      // IPA 過去問：原文どおりなので偏りの集計からは除外し、出典・図・順序を確認
      past[q.set] = (past[q.set] || 0) + 1;
      if (!q.src) err(`${q.id} 出典 src がない`);
      if (!q.noShuffle) err(`${q.id} 過去問は noShuffle: true にする`);
      if (q.fig && !fs.existsSync(path.join(root, q.fig))) err(`${q.id} 図 ${q.fig} がない`);
      if (q.obsolete) obsolete.push(q.id);
      if (q.dupOf) dups.push(q.id);
      continue;
    }
    pos[q.answer]++;
    const L = q.choices.map((c) => c.length);
    if (isNumeric(q)) {
      const v = q.choices.map(num);
      if (new Set(v).size === 4) { const s = [...v].sort((x, y) => x - y); numR[s.indexOf(v[q.answer])]++; numN++; }
    } else if (L.every((l) => l >= 12)) {
      const s = [...L].sort((x, y) => y - x), f = s.indexOf(L[q.answer]), l = s.lastIndexOf(L[q.answer]);
      for (let i = f; i <= l; i++) lenR[i] += 1 / (l - f + 1);
      lenN++;
    }
  }
  console.log(`  分野：${CATS[k].map((c) => `${c} ${cats[c] || 0}`).join('、')}`);
  console.log(`  難易度：★ ${lv[0]} ／ ★★ ${lv[1]} ／ ★★★ ${lv[2]}`);
  if (Object.keys(past).length) {
    console.log(`  IPA 過去問：${Object.entries(past).sort().map(([k, v]) => `${k} ${v}問`).join('、')}${obsolete.length ? `（現行注意 ${obsolete.length}問：${obsolete.join(', ')}）` : ''}${dups.length ? `（再出題のため通常出題から除外 ${dups.length}問）` : ''}`);
    Object.entries(past).forEach(([k, v]) => { const need = k.endsWith('am1') ? 30 : 25; if (v !== need) err(`${k} の問題数が ${v}（本来 ${need}）`); });
  }
  console.log(`  正解の位置（オリジナル問題）：${pos.join(' / ')}`);
  console.log(`  文章型 ${lenN}問の正解の長さ順位（最長→最短）：${lenR.map((x) => pct(x, lenN)).join(' / ')}`);
  console.log(`  数値型 ${numN}問の正解の大小順位（最小→最大）：${numR.map((x) => pct(x, numN)).join(' / ')}`);
  // 偶然（25%）から大きく外れたら警告
  [['長さ', lenR, lenN], ['数値', numR, numN]].forEach(([name, r, n]) => {
    if (n >= 12 && r.some((x) => x / n > 0.35 || x / n < 0.15)) console.log(`  ⚠ ${name}の順位に偏りがあります（目安：各20〜30%）`);
  });
}
for (const k of ['b1', 'b2']) console.log(`\n■ ${k.toUpperCase()}：${(QB[k] || []).length}${k === 'b1' ? '事例' : 'テーマ'}`);
for (const c of (QB.b1 || []).concat(QB.b2 || [])) {
  if (c.set && !c.src) err(`${c.id} 出典 src がない`);
  for (const f of Object.values(c.figs || {})) if (!fs.existsSync(path.join(root, f))) err(`${c.id} 図 ${f} がない`);
}
for (const c of QB.b1 || []) for (const q of c.questions) {
  const n = Array.from(q.answer.replace(/\n/g, '')).length;
  // 過去問は IPA 解答例を原文どおり（複数例の併記や小問の結合を含む）ので字数は確認しない
  if (!c.set && q.limit && n > q.limit) err(`${c.id} ${q.no} 模範解答が字数超過（${n}/${q.limit}）`);
  for (const kw of q.keywords || []) if (!q.answer.includes(kw)) err(`${c.id} ${q.no} キーワード「${kw}」が模範解答に含まれない`);
}
const swFiles = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
for (const f of files) if (!swFiles.includes(`'${f}'`)) err(`sw.js のキャッシュ対象に ${f} がない`);

console.log(errors ? `\n形式エラー ${errors} 件` : '\n形式エラーなし');
process.exit(errors ? 1 : 0);
