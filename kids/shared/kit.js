/* Kids kit: shared helpers for every game. One global: Kit. See kids/PRD.md section 2.
   No dependencies, no network calls. Every browser API is wrapped so a missing one never throws. */
(function () {
  'use strict';

  var KIT_KEY = 'kids.kit.v1';
  var synth = null;
  try { synth = window.speechSynthesis || null; } catch (e) { synth = null; }

  /* ---------- tiny helpers ---------- */

  function shuffle(arr) {
    var a = Array.prototype.slice.call(arr);
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function sample(arr, n) { return shuffle(arr).slice(0, Math.max(0, n)); }
  function randInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function clone(o) { return JSON.parse(JSON.stringify(o === undefined ? {} : o)); }

  /* ---------- store (localStorage with in-memory fallback) ---------- */

  var memory = {};
  function readRaw(key) {
    try {
      var raw = window.localStorage.getItem(key);
      if (raw === null) return memory[key] ? clone(memory[key]) : {};
      var obj = JSON.parse(raw);
      return obj && typeof obj === 'object' && !Array.isArray(obj) ? obj : {};
    } catch (e) {
      return memory[key] ? clone(memory[key]) : {};
    }
  }
  function writeRaw(key, obj) {
    memory[key] = clone(obj);
    try { window.localStorage.setItem(key, JSON.stringify(obj)); } catch (e) { /* works without storage */ }
  }

  /* store(slug).get(defaults) -> defaults merged (shallow) with what was saved.
     store(slug).set(obj)      -> shallow-merges obj into what was saved. */
  function store(slug) {
    var key = 'kids.' + slug + '.v1';
    return {
      get: function (defaults) { return Object.assign(clone(defaults), readRaw(key)); },
      set: function (obj) { writeRaw(key, Object.assign(readRaw(key), clone(obj))); }
    };
  }

  /* ---------- mute (shared by speech and sounds) ---------- */

  var muted = !!readRaw(KIT_KEY).muted;

  function setMuted(m) {
    muted = !!m;
    writeRaw(KIT_KEY, Object.assign(readRaw(KIT_KEY), { muted: muted }));
    if (muted) { try { if (synth) synth.cancel(); } catch (e) { /* ignore */ } }
    refreshHeader();
  }

  /* ---------- speech ---------- */

  var voicesPromise = new Promise(function (resolve) {
    function have() { try { return !!(synth && synth.getVoices().length); } catch (e) { return false; } }
    if (!synth || have()) { resolve(); return; }
    var done = false;
    function finish() { if (!done) { done = true; resolve(); } }
    try {
      if (synth.addEventListener) synth.addEventListener('voiceschanged', finish);
      else synth.onvoiceschanged = finish;
    } catch (e) { /* ignore */ }
    setTimeout(finish, 1000);
  });

  function voicesFor(lang) {
    var prefix = String(lang).toLowerCase();
    var list = [];
    try { list = synth ? synth.getVoices() || [] : []; } catch (e) { list = []; }
    return list.filter(function (v) {
      return String(v.lang || '').toLowerCase().replace('_', '-').split('-')[0] === prefix;
    });
  }

  function pickVoice(lang) {
    var wanted = lang === 'en' ? 'en-gb' : 'es-es';
    var best = null, bestScore = -1;
    voicesFor(lang).forEach(function (v) {
      var score = 0;
      if (String(v.lang || '').toLowerCase().replace('_', '-') === wanted) score += 2;
      if (v.localService) score += 1;
      if (score > bestScore) { best = v; bestScore = score; }
    });
    return best;
  }

  function canSpeak(lang) { return voicesFor(lang || 'es').length > 0; }

  var currentUtterance = null; // keep a reference: some browsers drop 'end' events if it is collected

  function speak(text, lang, opts) {
    lang = lang || 'es';
    var rate = (opts && opts.rate) || 0.9;
    return new Promise(function (resolve) {
      try {
        if (muted || !synth || !text) { resolve(); return; }
        var voice = pickVoice(lang);
        if (!voice) { resolve(); return; }
        synth.cancel();
        var u = new SpeechSynthesisUtterance(String(text));
        u.voice = voice;
        u.lang = voice.lang;
        u.rate = rate;
        var finished = false, timer = null;
        var finish = function () {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          if (currentUtterance === u) currentUtterance = null;
          resolve();
        };
        u.onend = finish;
        u.onerror = finish;
        timer = setTimeout(finish, Math.max(2500, String(text).length * 170 / rate + 1500));
        currentUtterance = u;
        synth.speak(u);
      } catch (e) {
        resolve();
      }
    });
  }

  /* ---------- sound effects (WebAudio) ---------- */

  var audioCtx = null;
  function ctx() {
    if (audioCtx) return audioCtx;
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    } catch (e) { audioCtx = null; }
    return audioCtx;
  }

  function tone(c, freq, start, dur, type, vol) {
    var o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine';
    o.frequency.value = freq;
    var t0 = c.currentTime + start;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }

  var SFX = {
    tap: function (c) { tone(c, 660, 0, 0.07, 'triangle', 0.15); },
    ok: function (c) { tone(c, 523, 0, 0.12, 'triangle', 0.22); tone(c, 784, 0.1, 0.22, 'triangle', 0.22); },
    ko: function (c) { tone(c, 330, 0, 0.16, 'sine', 0.2); tone(c, 262, 0.14, 0.26, 'sine', 0.2); },
    win: function (c) {
      [523, 659, 784, 1047].forEach(function (f, i) { tone(c, f, i * 0.12, 0.28, 'triangle', 0.22); });
      tone(c, 1047, 0.5, 0.5, 'sine', 0.18);
    }
  };

  function sfx(name) {
    try {
      if (muted || !SFX[name]) return;
      var c = ctx();
      if (!c) return;
      if (c.state === 'suspended' && c.resume) c.resume();
      SFX[name](c);
    } catch (e) { /* never throw */ }
  }

  // iOS only allows audio and speech after a user gesture: unlock on the first one.
  var unlocked = false;
  function unlock() {
    if (unlocked) return;
    unlocked = true;
    try {
      var c = ctx();
      if (c && c.state === 'suspended' && c.resume) c.resume();
      if (synth && !muted) {
        var u = new SpeechSynthesisUtterance(' ');
        u.volume = 0;
        synth.speak(u);
      }
    } catch (e) { /* ignore */ }
    window.removeEventListener('pointerdown', unlock, true);
    window.removeEventListener('keydown', unlock, true);
  }
  window.addEventListener('pointerdown', unlock, true);
  window.addEventListener('keydown', unlock, true);

  /* ---------- praise ---------- */

  var PRAISE = ['¡Muy bien!', '¡Genial!', '¡Perfecto!', '¡Eso es!', '¡Bravo!', '¡Fantástico!', '¡Estupendo!', '¡Lo has conseguido!'];
  var ENCOURAGE = ['¡Casi!', '¡Casi lo tienes!', '¡Uy, casi!', '¡Casi, casi!'];
  function praise() { return pick(PRAISE); }
  function encourage() { return pick(ENCOURAGE); }

  /* ---------- stars ---------- */

  function calcStars(score, total) {
    var pct = total > 0 ? score / total : 0;
    return pct >= 0.9 ? 3 : pct >= 0.7 ? 2 : 1;
  }

  function starsGet(slug) {
    var s = store(slug).get({ stars: { best: 0, rounds: 0 } }).stars || {};
    return { best: Number(s.best) || 0, rounds: Number(s.rounds) || 0 };
  }

  function starsAward(slug, score, total) {
    var n = calcStars(score, total);
    var cur = starsGet(slug);
    store(slug).set({ stars: { best: Math.max(cur.best, n), rounds: cur.rounds + 1 } });
    refreshHeader();
    return n;
  }

  function starsEl(n, max, cls) {
    max = max || 3;
    var wrap = document.createElement('span');
    wrap.className = 'k-stars' + (cls ? ' ' + cls : '');
    wrap.setAttribute('role', 'img');
    wrap.setAttribute('aria-label', n + ' de ' + max + ' estrellas');
    for (var i = 0; i < max; i++) {
      var s = document.createElement('span');
      s.className = i < n ? 'on' : 'off';
      s.setAttribute('aria-hidden', 'true');
      s.textContent = '★';
      wrap.appendChild(s);
    }
    return wrap;
  }

  /* ---------- deck (Leitner boxes 1 to 3, kept in the game's store) ---------- */

  function deck(slug, ids) {
    var st = store(slug);
    var list = Array.from(new Set(ids.map(String)));
    var last = null;

    function boxes() {
      var b = st.get({ deck: {} }).deck;
      return b && typeof b === 'object' ? b : {};
    }

    return {
      next: function (n) {
        var b = boxes();
        var pool = [];
        var out = [];
        function refill() {
          // shuffle first, then a stable sort by box: random inside a box, low boxes first (unseen = 0)
          pool = pool.concat(shuffle(list).sort(function (x, y) { return (b[x] || 0) - (b[y] || 0); }));
        }
        for (var i = 0; i < n && list.length; i++) {
          var prev = out.length ? out[out.length - 1] : last;
          if (!pool.length) refill();
          var idx = pool.findIndex(function (id) { return id !== prev; });
          if (idx < 0) { refill(); idx = pool.findIndex(function (id) { return id !== prev; }); }
          if (idx < 0) idx = 0; // a one-item deck cannot avoid repeating
          out.push(pool.splice(idx, 1)[0]);
        }
        if (out.length) last = out[out.length - 1];
        return out;
      },
      mark: function (id, ok) {
        id = String(id);
        var b = boxes();
        var cur = b[id] || 1;
        b[id] = ok ? Math.min(3, cur + 1) : 1;
        st.set({ deck: b });
      },
      stats: function () {
        var b = boxes(), seen = 0, mastered = 0;
        list.forEach(function (id) {
          if (b[id]) seen++;
          if (b[id] === 3) mastered++;
        });
        return { seen: seen, mastered: mastered, total: list.length };
      }
    };
  }

  /* ---------- confetti ---------- */

  function reducedMotion() {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }

  function confetti() {
    try {
      if (reducedMotion()) return;
      var cv = document.createElement('canvas');
      cv.className = 'k-confetti';
      var w = cv.width = window.innerWidth, h = cv.height = window.innerHeight;
      document.body.appendChild(cv);
      var g = cv.getContext('2d');
      var colors = ['#ff6b4a', '#f2c200', '#2e9e5b', '#3d7de0', '#8e5be8', '#eb5e9a'];
      var parts = [];
      for (var i = 0; i < 90; i++) {
        parts.push({
          x: w / 2, y: h * 0.4,
          vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 14 - 4,
          s: 6 + Math.random() * 8, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
          c: colors[i % colors.length]
        });
      }
      var t0 = null;
      (function frame(t) {
        if (t0 === null) t0 = t;
        var el = t - t0;
        g.clearRect(0, 0, w, h);
        parts.forEach(function (p) {
          p.vy += 0.35; p.x += p.vx; p.y += p.vy; p.r += p.vr;
          g.save(); g.translate(p.x, p.y); g.rotate(p.r);
          g.fillStyle = p.c; g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
          g.restore();
        });
        if (el < 1800) requestAnimationFrame(frame);
        else if (cv.parentNode) cv.parentNode.removeChild(cv);
      })(performance.now());
    } catch (e) { /* ignore */ }
  }

  /* ---------- games.js (needed for accent colours) ---------- */

  var gamesPromise = new Promise(function (resolve) {
    if (window.KIDS_GAMES) { resolve(window.KIDS_GAMES); return; }
    try {
      var src = document.currentScript && document.currentScript.src;
      if (!src) { resolve([]); return; }
      var s = document.createElement('script');
      s.src = new URL('../games.js', src).href;
      s.onload = function () { resolve(window.KIDS_GAMES || []); };
      s.onerror = function () { resolve([]); };
      document.head.appendChild(s);
    } catch (e) { resolve([]); }
  });

  /* ---------- header ---------- */

  var mounted = null;

  function refreshHeader() {
    if (!mounted) return;
    var stars = document.getElementById('k-header-stars');
    if (stars) {
      stars.textContent = '';
      stars.appendChild(starsEl(starsGet(mounted.slug).best, 3));
    }
    var btn = document.getElementById('k-mute');
    if (btn) {
      btn.textContent = muted ? '🔇' : '🔊';
      btn.setAttribute('aria-pressed', muted ? 'true' : 'false');
      btn.setAttribute('aria-label', muted ? 'Activar el sonido' : 'Silenciar');
    }
  }

  function applyAccent(slug) {
    return gamesPromise.then(function (games) {
      var g = (games || []).filter(function (x) { return x.slug === slug; })[0];
      if (g) {
        document.documentElement.style.setProperty('--accent', g.color);
        document.documentElement.style.setProperty('--on-accent', g.onAccent);
      }
    });
  }

  function mount(opts) {
    var slug = opts.slug, title = opts.title;
    mounted = { slug: slug, title: title };
    var header = document.getElementById('k-header');
    if (header) {
      header.classList.add('k-header');
      header.textContent = '';

      var back = document.createElement('a');
      back.className = 'k-header__back';
      back.href = '../';
      back.setAttribute('aria-label', 'Volver a los juegos');
      var arrow = document.createElement('span');
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '‹';
      var word = document.createElement('span');
      word.className = 'k-header__back-text';
      word.textContent = ' Juegos';
      back.appendChild(arrow);
      back.appendChild(word);

      var h1 = document.createElement('h1');
      h1.className = 'k-header__title';
      h1.textContent = title;

      var stars = document.createElement('span');
      stars.id = 'k-header-stars';
      stars.className = 'k-header__stars';

      var mute = document.createElement('button');
      mute.id = 'k-mute';
      mute.type = 'button';
      mute.className = 'k-mute';
      mute.addEventListener('click', function () { setMuted(!muted); if (!muted) sfx('tap'); });

      header.appendChild(back);
      header.appendChild(h1);
      header.appendChild(stars);
      header.appendChild(mute);
    }
    document.title = title;
    refreshHeader();
    return applyAccent(slug);
  }

  /* ---------- result screen ---------- */

  function result(opts) {
    var slug = opts.slug, score = opts.score, total = opts.total;
    var n = starsAward(slug, score, total);
    sfx('win');
    confetti();

    var old = document.querySelector('.k-overlay');
    if (old && old.parentNode) old.parentNode.removeChild(old);

    var overlay = document.createElement('div');
    overlay.className = 'k-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Resultado');

    var card = document.createElement('div');
    card.className = 'k-card k-result';

    if (opts.extra) card.appendChild(opts.extra);
    card.appendChild(starsEl(n, 3, 'k-stars--big'));

    var msg = document.createElement('h2');
    msg.textContent = opts.message || (n === 3 ? '¡Increíble!' : n === 2 ? '¡Muy bien!' : '¡Bien hecho!');
    card.appendChild(msg);

    var sc = document.createElement('p');
    sc.textContent = score + ' de ' + total + ' a la primera';
    card.appendChild(sc);

    var actions = document.createElement('div');
    actions.className = 'k-actions';

    var again = document.createElement('button');
    again.type = 'button';
    again.className = 'k-btn k-btn--big';
    again.textContent = 'Otra vez';
    again.addEventListener('click', function () {
      sfx('tap');
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      if (typeof opts.onAgain === 'function') opts.onAgain();
    });

    var exit = document.createElement('a');
    exit.className = 'k-btn k-btn--big k-btn--ghost';
    exit.href = '../';
    exit.textContent = 'Salir';

    actions.appendChild(again);
    (opts.actions || []).forEach(function (a) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'k-btn k-btn--big' + (a.primary ? '' : ' k-btn--ghost');
      b.textContent = a.label;
      b.addEventListener('click', function () {
        sfx('tap');
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        if (typeof a.onClick === 'function') a.onClick();
      });
      actions.appendChild(b);
    });
    actions.appendChild(exit);
    card.appendChild(actions);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    again.focus();
    return n;
  }

  /* ---------- public API ---------- */

  window.Kit = {
    ready: Promise.all([voicesPromise, gamesPromise]).then(function () {}),
    mount: mount,
    speak: speak,
    canSpeak: canSpeak,
    sfx: sfx,
    store: store,
    deck: deck,
    stars: { award: starsAward, get: starsGet, calc: calcStars, el: starsEl },
    result: result,
    confetti: confetti,
    praise: praise,
    encourage: encourage,
    shuffle: shuffle,
    sample: sample,
    randInt: randInt,
    // extras beyond the PRD contract
    isMuted: function () { return muted; },
    setMuted: setMuted
  };
})();
