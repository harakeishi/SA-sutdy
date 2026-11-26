const assert = require('node:assert/strict');
const test = require('node:test');

global.window = {};
require('../js/workpad.js');
const { calculate, normalize, normalizeNotes, hasContent, preview } = window.Workpad;

test('scientific functions, precedence, signed and right-associative powers', () => {
  for (const [expression, result] of [
    ['2^1.2', '2.2973967099941'],
    ['(2 + 3) × 4 ÷ 2', '10'],
    ['-2^2', '-4'],
    ['2^3^2', '512'],
    ['2^-2', '0.25'],
    ['Sqrt(16) + log(100) + ln(e)', '7'],
    ['1E-3 + 2e-3', '0.003'],
    ['2e+3', '2000'],
    ['abs(−3)', '3'],
  ]) {
    assert.equal(calculate(expression), result, expression);
  }
});

test('invalid expressions and ambiguous adjacency are rejected', () => {
  for (const expression of ['3 4', '2e3', '1 e+3', '1/0', 'sqrt(-1)', 'alert(1)', '1;', '2^^2', '.', '', '1'.repeat(161)]) {
    assert.throws(() => calculate(expression), undefined, expression);
  }
});

test('legacy ink is rescaled, downsampled and isolated from the original', () => {
  const original = { text: '途中計算', strokes: [[[0, 0], [1, 2], [10, 20], [1000, 1000], [0, -1], [2, 3, 4]], []] };
  const note = normalize(original);
  assert.deepEqual(note, { text: '途中計算', strokes: [[[0, 0], [10, 10], [1000, 500]]], inkVersion: 1 });
  assert.deepEqual(normalize(note), note);
  note.strokes[0][0][0] = 50;
  assert.equal(original.strokes[0][0][0], 0);
  assert.match(preview(note, (text) => text), /viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid meet"/);
});

test('invalid, empty and excessive note data are bounded', () => {
  assert.equal(hasContent(normalize(null)), false);
  assert.equal(hasContent(normalize({ text: '  ' })), false);
  assert.equal(normalize({ text: 'a'.repeat(4100) }).text.length, 4000);
  const note = normalize({ inkVersion: 1, strokes: [Array.from({ length: 6100 }, (_, i) => [i % 2 * 500, 100])] });
  assert.equal(note.strokes[0].length, 6000);
  assert.equal(normalize({ inkVersion: 1, strokes: [[[0, 501]]] }).strokes.length, 0);
});

test('backups retain notes for unknown IDs without inheriting object keys', () => {
  const notes = normalizeNotes(JSON.parse('{"removed-question":{"text":"keep"},"__proto__":{"text":"also keep"},"empty":{"text":""}}'));
  assert.deepEqual(Object.keys(notes), ['removed-question', '__proto__']);
  assert.equal(notes['__proto__'].text, 'also keep');
  assert.equal(Object.getPrototypeOf(notes), null);
});
