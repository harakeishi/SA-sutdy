/*
 * 間隔反復（Spaced Repetition）エンジン
 *
 * SM-2 系アルゴリズムをベースに、回答時の「自信度」を評価に使う。
 *   不正解            → Again（忘却。間隔リセット、易しさ係数ダウン）
 *   正解 ＋「勘」      → Hard （まぐれ当たりの可能性。間隔は控えめ）
 *   正解 ＋「たぶん」  → Good
 *   正解 ＋「自信あり」→ Easy （間隔を大きく伸ばす）
 *
 * 記憶保持率（retrievability）はべき関数型の忘却曲線 R(t) = (1 + t / (9S))^-1 で近似する
 * （FSRS と同じ形。実際の忘却は指数関数よりべき関数に近いとされる：Wixted & Ebbesen, 1991）。
 * S は現在の復習間隔（日）で、「次の復習日に保持率が約 90%」という仮定を置いた推定値。
 *
 * 分散学習の効果は「間を空けて思い出す」ことで得られるので、
 *  - 同じ学習日に同じ問題を再び正解しても間隔は伸ばさない（不正解なら忘却として扱う）
 *  - 期日前に正解した場合は、経過日数の割合に応じて伸び幅を縮める
 */
(function () {
  const DAY = 86400000;
  const GRADE = { AGAIN: 0, HARD: 1, GOOD: 2, EASY: 3 };
  const MASTERED_DAYS = 21; // この間隔以上を「定着」とみなす

  function newCard() {
    return { reps: 0, lapses: 0, ease: 2.5, interval: 0, due: 0, last: 0, seen: 0, correct: 0 };
  }

  function gradeFrom(ok, conf) {
    if (!ok) return GRADE.AGAIN;
    if (conf === 'guess') return GRADE.HARD;
    if (conf === 'sure') return GRADE.EASY;
    return GRADE.GOOD;
  }

  function fuzz(days) {
    if (days < 3) return days;
    const f = 1 + (Math.random() * 0.1 - 0.05); // ±5% 同じ日に復習が固まるのを防ぐ
    return days * f;
  }

  /** カードを更新して返す（破壊的） */
  function review(card, grade, now) {
    now = now || Date.now();
    card.seen++;
    if (grade > GRADE.AGAIN) card.correct++;
    const sameDay = card.last && startOfDay(card.last) === startOfDay(now);
    if (sameDay && grade > GRADE.AGAIN) return card; // 当日の解き直しは記録だけ
    let iv;
    if (grade === GRADE.AGAIN) {
      if (!sameDay || card.reps > 0) card.lapses++;
      card.reps = 0;
      card.ease = Math.max(1.3, card.ease - 0.2);
      iv = 1; // 翌日に再出題（セッション内でも数問後に再挑戦させる）
    } else {
      const elapsed = card.last ? (now - card.last) / DAY : 0;
      // 期日前の復習は経過割合に応じて伸びを縮める（詰め込みで間隔が膨らむのを防ぐ）
      const ratio = card.interval > 0 ? Math.min(1, Math.max(0, elapsed / card.interval)) : 1;
      const grow = (target) => card.interval + (target - card.interval) * ratio;
      if (grade === GRADE.HARD) {
        card.ease = Math.max(1.3, card.ease - 0.15);
        iv = card.reps === 0 ? 1 : grow(Math.max(card.interval + 1, card.interval * 1.2));
      } else if (grade === GRADE.GOOD) {
        iv = card.reps === 0 ? 1 : card.reps === 1 ? grow(3) : grow(card.interval * card.ease);
      } else {
        card.ease = card.ease + 0.15 * ratio;
        iv = card.reps === 0 ? 3 : card.reps === 1 ? grow(6) : grow(card.interval * card.ease * 1.3);
      }
      iv = Math.max(1, iv);
      card.reps++;
    }
    iv = Math.min(365, fuzz(iv));
    card.interval = iv;
    card.last = now;
    // 復習は日単位。その日の 4:00 を境に扱う
    card.due = startOfDay(now) + Math.round(iv) * DAY;
    return card;
  }

  /** 「学習日」の開始（午前4時区切り。夜更かし学習を前日扱いにする。夏時間でも現地4時） */
  function startOfDay(t) {
    const d = new Date(t);
    if (d.getHours() < 4) d.setDate(d.getDate() - 1);
    d.setHours(4, 0, 0, 0);
    return d.getTime();
  }

  function dayKey(t) {
    const d = new Date((t || Date.now()) - 4 * 3600000);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  /** 時刻 at における推定保持率 (0..1)。未学習は null */
  function retrievability(card, at) {
    if (!card || !card.last) return null;
    const S = Math.max(card.interval, 0.5);
    const t = Math.max(0, ((at || Date.now()) - card.last) / DAY);
    return 1 / (1 + t / (9 * S));
  }

  function reviewedToday(card, now) {
    return !!(card && card.last && startOfDay(card.last) === startOfDay(now || Date.now()));
  }

  function isDue(card, now) {
    return card && card.last && card.due <= (now || Date.now());
  }

  function isMastered(card) {
    return card && card.interval >= MASTERED_DAYS;
  }

  window.SRS = { GRADE, DAY, MASTERED_DAYS, newCard, gradeFrom, review, retrievability, isDue, reviewedToday, isMastered, startOfDay, dayKey };
})();
