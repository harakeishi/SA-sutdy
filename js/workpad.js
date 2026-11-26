/* 回答中の作業メモと関数電卓 */
(function () {
  'use strict';

  const POINT_LIMIT = 6000;
  const TEXT_LIMIT = 4000;
  const functions = {
    sqrt: Math.sqrt, log: Math.log10, ln: Math.log,
    sin: Math.sin, cos: Math.cos, tan: Math.tan, abs: Math.abs,
  };

  // 入力を数式として解釈する。JavaScript として実行しない。
  function calculate(input) {
    if (input.length > 160) throw new Error('式は160文字以内で入力してください');
    const source = input.replace(/\s/g, '').replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/π/g, 'pi');
    const tokens = source.match(/(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?|[a-z]+|[()+*/^-]/g) || [];
    const invalid = () => { throw new Error('式を確認してください'); };
    if (!source || tokens.join('') !== source) invalid();
    let position = 0;
    function take(token) {
      if (tokens[position] !== token) return false;
      position++;
      return true;
    }
    function group() {
      if (!take('(')) invalid();
      const value = sum();
      if (!take(')')) invalid();
      return value;
    }
    function atom() {
      if (tokens[position] === '(') return group();
      const token = tokens[position++];
      if (/^[\d.]/.test(token)) return Number(token);
      if (token === 'pi') return Math.PI;
      if (token === 'e') return Math.E;
      if (Object.hasOwn(functions, token)) return functions[token](group());
      invalid();
    }
    function signed() {
      if (take('+')) return signed();
      if (take('-')) return -signed();
      const base = atom();
      return take('^') ? base ** signed() : base;
    }
    function product() {
      let value = signed();
      while (true) {
        if (take('*')) value *= signed();
        else if (take('/')) value /= signed();
        else return value;
      }
    }
    function sum() {
      let value = product();
      while (true) {
        if (take('+')) value += product();
        else if (take('-')) value -= product();
        else return value;
      }
    }
    const result = sum();
    if (position !== tokens.length) invalid();
    if (!Number.isFinite(result)) throw new Error('計算できない値です');
    return Number(result.toPrecision(14)).toString();
  }

  function blank() { return { text: '', strokes: [] }; }

  function normalize(value) {
    const note = blank();
    if (!value || typeof value !== 'object') return note;
    if (typeof value.text === 'string') note.text = value.text.slice(0, TEXT_LIMIT);
    let remaining = POINT_LIMIT;
    for (const stroke of (Array.isArray(value.strokes) ? value.strokes.slice(0, POINT_LIMIT) : [])) {
      if (!remaining) break;
      if (!Array.isArray(stroke)) continue;
      const points = stroke.slice(0, remaining).filter((point) =>
        Array.isArray(point) && point.length === 2 &&
        point.every((coordinate) => Number.isInteger(coordinate) && coordinate >= 0 && coordinate <= 1000));
      if (points.length) note.strokes.push(points);
      remaining -= points.length;
    }
    return note;
  }

  function hasContent(note) { return !!(note && (note.text.trim() || note.strokes.length)); }

  function paths(strokes) {
    return strokes.map(([first, ...rest]) => {
      const lines = rest.length ? rest : [[first[0] + 0.1, first[1]]];
      return '<path d="M' + first.join(' ') + ' L' + lines.map((point) => point.join(' ')).join(' ') + '" vector-effect="non-scaling-stroke"/>';
    }).join('');
  }

  function drawing(strokes, editable) {
    return '<svg class="workpad-drawing" viewBox="0 0 1000 1000" preserveAspectRatio="none" role="img" aria-label="' +
      (editable ? '手書き入力欄' : '手書きメモ') + '">' + paths(strokes) + '</svg>';
  }

  function preview(note, escape) {
    if (!hasContent(note)) return '';
    return (note.text.trim() ? '<div class="pre small workpad-text">' + escape(note.text) + '</div>' : '') +
      (note.strokes.length ? drawing(note.strokes, false) : '');
  }

  function open({ mode, note, calculator, onSave, onDelete, saved, opener, onClose }) {
    const dialog = document.createElement('dialog');
    dialog.className = 'workpad-sheet';
    dialog.setAttribute('aria-labelledby', 'workpad-title');
    dialog.innerHTML = `<header class="row between"><h2 id="workpad-title"></h2><button type="button" class="btn small" data-pad="close" autofocus>閉じる</button></header>
      <div class="workpad-body"></div><p class="small muted workpad-status" role="status"></p>`;
    const body = dialog.querySelector('.workpad-body');
    const status = dialog.querySelector('.workpad-status');
    let pen = null;

    function show(nextMode) {
      mode = nextMode;
      pen = null;
      status.textContent = '';
      dialog.querySelector('h2').textContent = mode === 'calc' ? '関数電卓' : '途中計算メモ';
      if (mode === 'calc') {
        const keys = [
          ['sin(', 'cos(', 'tan(', 'π', 'e', '⌫'],
          ['sqrt(', 'log(', 'ln(', 'abs(', '^', 'AC'],
          ['7', '8', '9', '÷', '(', ')'],
          ['4', '5', '6', '×', '−', '+'],
          ['1', '2', '3', '0', '.', '='],
        ];
        body.innerHTML = `<input class="workpad-expression" aria-label="計算式" placeholder="例：2^1.2" maxlength="160" autocomplete="off" spellcheck="false">
          <output class="workpad-result" aria-live="polite"></output>
          <div class="workpad-keys">${keys.flat().map((key) => `<button type="button" class="btn" data-key="${key}">${key}</button>`).join('')}</div>
          <p class="small muted">log は底10、ln は自然対数、三角関数はラジアン</p>
          <div class="row wrap"><button type="button" class="btn small" data-pad="to-note">式と結果をメモに追加</button><button type="button" class="btn small ghost" data-pad="note">メモを開く</button></div>`;
        body.querySelector('input').value = calculator.expression;
        body.querySelector('output').textContent = calculator.result;
        return;
      }
      body.innerHTML = `<div class="row wrap workpad-modes">
          <button type="button" class="btn small" data-pad="type" aria-pressed="${mode === 'type'}">キーボード</button>
          <button type="button" class="btn small" data-pad="draw" aria-pressed="${mode === 'draw'}">手書き</button>
          <button type="button" class="btn small ghost" data-pad="calc">関数電卓</button>
        </div>
        ${mode === 'draw' ? drawing(note.strokes, true) + '<div class="row"><button type="button" class="btn small ghost" data-pad="undo">一画戻す</button><button type="button" class="btn small ghost" data-pad="clear-ink">手書きを消す</button></div>' :
          '<textarea aria-label="途中計算メモ" rows="4" maxlength="4000" placeholder="式や考えたことを入力"></textarea>'}
        <div class="row wrap"><button type="button" class="btn primary small" data-pad="save">この問題に保存</button>
          <button type="button" class="btn small ghost" data-pad="delete" ${saved ? '' : 'hidden'}>保存済みメモを削除</button></div>
        <p class="small muted">保存するまでは、この演習・模試の間だけ使えます。</p>`;
      if (mode === 'type') body.querySelector('textarea').value = note.text;
    }

    function evaluate() {
      try {
        calculator.result = calculate(calculator.expression);
        body.querySelector('output').textContent = calculator.result;
        return true;
      } catch (error) {
        calculator.result = '';
        body.querySelector('output').textContent = error.message;
        return false;
      }
    }

    dialog.addEventListener('input', (event) => {
      if (event.target.matches('textarea')) note.text = event.target.value;
      if (event.target.matches('input')) {
        calculator.expression = event.target.value;
        calculator.result = '';
        body.querySelector('output').textContent = '';
      }
    });
    dialog.addEventListener('keydown', (event) => {
      event.stopPropagation();
      if (event.key === 'Enter' && event.target.matches('input') && !event.isComposing) {
        event.preventDefault();
        evaluate();
      }
    });
    dialog.addEventListener('click', (event) => {
      const button = event.target.closest('button');
      if (!button) return;
      const key = button.dataset.key;
      if (key) {
        if (key === '=') { evaluate(); return; }
        const input = body.querySelector('input');
        const start = input.selectionStart;
        const end = input.selectionEnd;
        if (key === 'AC') input.value = '';
        else if (key === '⌫') input.setRangeText('', start === end ? Math.max(0, start - 1) : start, end, 'end');
        else if (input.value.length - (end - start) + key.length <= input.maxLength) input.setRangeText(key, start, end, 'end');
        calculator.expression = input.value;
        calculator.result = '';
        body.querySelector('output').textContent = '';
        return;
      }
      switch (button.dataset.pad) {
        case 'close': dialog.close(); break;
        case 'note': show('type'); break;
        case 'type': case 'draw': case 'calc':
          show(button.dataset.pad);
          dialog.querySelector(`[data-pad="${mode}"]`)?.focus();
          break;
        case 'to-note': {
          if (!evaluate()) break;
          const line = calculator.expression + ' = ' + calculator.result;
          const text = note.text ? note.text + '\n' + line : line;
          if (text.length > TEXT_LIMIT) { status.textContent = 'メモが文字数の上限に達しました'; break; }
          note.text = text;
          show('type');
          status.textContent = '式と結果を追加しました';
          break;
        }
        case 'undo': note.strokes.pop(); body.querySelector('svg').innerHTML = paths(note.strokes); break;
        case 'clear-ink': note.strokes.length = 0; body.querySelector('svg').replaceChildren(); break;
        case 'save':
          if (!hasContent(note)) { status.textContent = '文字か手書きでメモを入力してください'; break; }
          if (onSave(note)) {
            saved = true;
            body.querySelector('[data-pad="delete"]').hidden = false;
            status.textContent = 'この問題に保存しました';
          } else status.textContent = '保存できませんでした';
          break;
        case 'delete':
          if (onDelete()) {
            saved = false;
            button.hidden = true;
            status.textContent = '保存済みメモを削除しました';
          } else status.textContent = '削除できませんでした';
          break;
      }
    });

    function addPoint(event, svg) {
      const bounds = svg.getBoundingClientRect();
      const scale = (n, size) => Math.round(Math.max(0, Math.min(1000, n * 1000 / size)));
      const point = [scale(event.clientX - bounds.left, bounds.width), scale(event.clientY - bounds.top, bounds.height)];
      if (pen.stroke.at(-1)?.join() === point.join()) return;
      if (!pen.remaining) { status.textContent = '手書きの上限に達しました。一画戻すと続けられます'; return; }
      pen.remaining--;
      pen.stroke.push(point);
      const [first, ...rest] = pen.stroke;
      pen.path.setAttribute('d', 'M' + first.join(' ') + ' L' +
        (rest.length ? rest.map((p) => p.join(' ')).join(' ') : (first[0] + 0.1) + ' ' + first[1]));
    }

    body.addEventListener('pointerdown', (event) => {
      const svg = event.target.closest('svg');
      if (!svg || pen || event.button !== 0) return;
      const remaining = POINT_LIMIT - note.strokes.reduce((n, stroke) => n + stroke.length, 0);
      if (!remaining) { status.textContent = '手書きの上限に達しました。一画戻すと続けられます'; return; }
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('vector-effect', 'non-scaling-stroke');
      svg.appendChild(path);
      pen = { id: event.pointerId, stroke: [], path, remaining };
      note.strokes.push(pen.stroke);
      svg.setPointerCapture(event.pointerId);
      addPoint(event, svg);
    });
    body.addEventListener('pointermove', (event) => {
      if (pen?.id === event.pointerId) addPoint(event, event.target.closest('svg'));
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((type) => body.addEventListener(type, (event) => {
      if (pen?.id === event.pointerId) pen = null;
    }));

    dialog.addEventListener('close', () => {
      dialog.remove();
      onClose();
      if (opener.isConnected) opener.focus({ preventScroll: true });
    });
    dialog.addEventListener('click', (event) => {
      if (event.target === dialog && event.clientY < dialog.getBoundingClientRect().top) dialog.close();
    });
    show(mode);
    document.body.appendChild(dialog);
    dialog.showModal();
    return dialog;
  }

  window.Workpad = { blank, normalize, hasContent, preview, open, calculate };
})();
