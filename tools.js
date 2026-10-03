/* all inc. toolbox. eight small tools. everything runs on this device; nothing is uploaded. */
(function () {
  var AC = window.AudioContext || window.webkitAudioContext, _ac;
  function ac() { if (!_ac) _ac = new AC(); if (_ac.state === 'suspended') _ac.resume(); return _ac; }
  function $(el, s) { return el.querySelector(s); }
  function store(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem('tb-' + k)); localStorage.setItem('tb-' + k, JSON.stringify(v)); } catch (_) { return null; } }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function clock(s) { s = Math.max(0, Math.round(s)); var h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60; return (h ? h + ':' + (m < 10 ? '0' : '') : '') + m + ':' + (x < 10 ? '0' : '') + x; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function copy(text, btn) {
    var done = function () { var t = btn.textContent; btn.textContent = 'copied'; setTimeout(function () { btn.textContent = t; }, 1200); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, function () {});
    else { var ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); done(); } catch (_) {} ta.remove(); }
  }
  /* hold a button to repeat */
  function hold(btn, fn) {
    var t1, t2; function stop() { clearTimeout(t1); clearInterval(t2); }
    btn.addEventListener('pointerdown', function () { fn(); t1 = setTimeout(function () { t2 = setInterval(fn, 60); }, 400); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (e) { btn.addEventListener(e, stop); });
    return stop;
  }
  var SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  var FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  var T = window.TOOLS = {};

  /* ---------- tuner ---------- */
  function detect(buf, sr) {
    var n = buf.length, rms = 0, i, j;
    for (i = 0; i < n; i++) rms += buf[i] * buf[i];
    if (Math.sqrt(rms / n) < 0.01) return -1;
    var max = Math.min(n - 1, Math.floor(sr / 50)), c = new Float32Array(max + 1);
    for (i = 0; i <= max; i++) { var s = 0; for (j = 0; j < n - i; j++) s += buf[j] * buf[j + i]; c[i] = s; }
    var d = 0; while (d < max && c[d] > c[d + 1]) d++;
    var best = -1, at = -1;
    for (i = d; i <= max; i++) if (c[i] > best) { best = c[i]; at = i; }
    if (at <= 0 || at >= max || best < c[0] * 0.3) return -1;
    var a = (c[at - 1] + c[at + 1] - 2 * c[at]) / 2, b = (c[at + 1] - c[at - 1]) / 2;
    return sr / (a ? at - b / (2 * a) : at);
  }
  T.tuner = function (el) {
    el.innerHTML = '<div class="big nc" data-n>–</div><div class="sub" data-f>&nbsp;</div><div class="meter"><i data-d style="opacity:.25"></i></div><button class="key" data-go>start</button><p>uses the microphone. the sound stays on this device.</p>';
    var n = $(el, '[data-n]'), f = $(el, '[data-f]'), d = $(el, '[data-d]'), go = $(el, '[data-go]'), stream, an, buf, raf, hist = [], k = 0;
    function stop() { cancelAnimationFrame(raf); if (stream) stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; go.textContent = 'start'; go.classList.remove('on'); d.style.opacity = .25; }
    function loop() {
      raf = requestAnimationFrame(loop);
      if (k++ % 3) return;
      an.getFloatTimeDomainData(buf);
      var hz = detect(buf, ac().sampleRate);
      if (hz < 40 || hz > 2000) { d.style.opacity = .25; return; }
      hist.push(hz); if (hist.length > 5) hist.shift();
      var s = hist.slice().sort(function (a, b) { return a - b; })[hist.length >> 1];
      var m = 12 * Math.log2(s / 440) + 69, r = Math.round(m), cents = (m - r) * 100;
      n.textContent = SHARP[((r % 12) + 12) % 12];
      f.textContent = s.toFixed(1) + ' hz · ' + (cents >= 0 ? '+' : '') + cents.toFixed(0) + ' cents';
      d.style.opacity = 1; d.style.setProperty('--x', (cents / 50 * (d.parentNode.clientWidth / 2 - 9)).toFixed(1) + 'px');
    }
    go.onclick = function () {
      if (stream) return stop();
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { f.textContent = 'no microphone here'; return; }
      navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }).then(function (s) {
        stream = s; an = ac().createAnalyser(); an.fftSize = 2048; ac().createMediaStreamSource(s).connect(an);
        buf = new Float32Array(an.fftSize); go.textContent = 'stop'; go.classList.add('on'); loop();
      }, function () { f.textContent = 'microphone not allowed'; });
    };
    return stop;
  };

  /* ---------- key & bpm ---------- */
  function fft(re, im) {
    var n = re.length, i, j, k, len;
    for (i = 1, j = 0; i < n; i++) { var bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit; if (i < j) { var t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
    for (len = 2; len <= n; len <<= 1) {
      var ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
      for (i = 0; i < n; i += len) {
        var cr = 1, ci = 0;
        for (k = 0; k < len / 2; k++) {
          var a = i + k, b = a + len / 2, xr = re[b] * cr - im[b] * ci, xi = re[b] * ci + im[b] * cr;
          re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi;
          var nr = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = nr;
        }
      }
    }
  }
  function mono(audio, target) {
    var a = audio.getChannelData(0), b = audio.numberOfChannels > 1 ? audio.getChannelData(1) : null;
    var f = Math.max(1, Math.round(audio.sampleRate / target)), start = audio.duration > 150 ? Math.floor(30 * audio.sampleRate) : 0;
    var len = Math.min(a.length - start, Math.floor(120 * audio.sampleRate)), n = Math.floor(len / f), out = new Float32Array(n);
    for (var i = 0; i < n; i++) { var s = 0, o = start + i * f; for (var j = 0; j < f; j++) s += b ? (a[o + j] + b[o + j]) * 0.5 : a[o + j]; out[i] = s / f; }
    return { x: out, sr: audio.sampleRate / f };
  }
  function tempo(x, sr) {
    var hop = Math.max(1, Math.round(sr / 100)), n = Math.floor(x.length / hop), fps = sr / hop;
    var env = new Float32Array(n), eh = new Float32Array(n), lh = new Float32Array(n), lp = 0, k = Math.exp(-2 * Math.PI * 150 / sr), pe = 0, pl = 0, i, j, mean = 0;
    for (i = 0; i < n; i++) {
      var e0 = 0, l0 = 0;
      for (j = 0; j < hop; j++) { var v = x[i * hop + j]; lp = lp * k + v * (1 - k); e0 += v * v; l0 += lp * lp; }
      eh[i] = e0 / hop; lh[i] = l0 / hop;
    }
    /* energy over a 50 ms window, so held notes do not ripple from frame to frame */
    for (i = 0; i < n; i++) {
      var e = 0, l = 0, c = 0;
      for (j = Math.max(0, i - 4); j <= i; j++) { e += eh[j]; l += lh[j]; c++; }
      e = Math.log(1 + 1000 * e / c); l = Math.log(1 + 1000 * l / c);
      env[i] = Math.max(0, e - pe) + Math.max(0, l - pl); pe = e; pl = l; mean += env[i];
    }
    mean /= n || 1; for (i = 0; i < n; i++) env[i] -= mean;
    function acf(lag) {
      var a = Math.floor(lag), fr = lag - a, m = n - a - 1, s = 0;
      if (m < fps * 4) return 0;
      for (var q = 0; q < m; q++) s += env[q] * (env[q + a] * (1 - fr) + env[q + a + 1] * fr);
      return s / m;
    }
    function score(bpm, deep) {
      var lag = fps * 60 / bpm, s = acf(lag) + 0.5 * acf(lag * 2) + 0.25 * acf(lag * 4);
      if (deep) s += 0.25 * acf(lag * 3) + 0.15 * acf(lag * 8);
      return s;
    }
    var best = 0, at = 120, b;
    for (b = 60; b <= 200; b += 0.5) { var w = Math.exp(-0.5 * Math.pow(Math.log2(b / 125) / 0.7, 2)), s = score(b, false) * w; if (s > best) { best = s; at = b; } }
    var fine = at; best = -1e9;
    for (b = at - 1.5; b <= at + 1.5; b += 0.1) { var s2 = score(b, true); if (s2 > best) { best = s2; fine = b; } }
    return fine;
  }
  var MAJ = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88], MIN = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17];
  var CAMA = [8, 3, 10, 5, 12, 7, 2, 9, 4, 11, 6, 1], CAMI = [5, 12, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10];
  /* keys as musicians write them */
  var KMAJ = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'], KMIN = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'G#', 'A', 'Bb', 'B'];
  function keyOf(x, sr) {
    var N = 4096, re = new Float32Array(N), im = new Float32Array(N), win = new Float32Array(N), map = new Int8Array(N / 2), chroma = new Float64Array(12), i, k;
    for (i = 0; i < N; i++) win[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1));
    for (k = 0; k < N / 2; k++) { var f = k * sr / N; map[k] = f < 80 || f > 2000 ? -1 : (((Math.round(12 * Math.log2(f / 440)) + 69) % 12) + 12) % 12; }
    for (var o = 0; o + N <= x.length; o += N) {
      for (i = 0; i < N; i++) { re[i] = x[o + i] * win[i]; im[i] = 0; }
      fft(re, im);
      var fr = new Float64Array(12), sum = 0;
      for (k = 0; k < N / 2; k++) if (map[k] >= 0) { var m = Math.sqrt(re[k] * re[k] + im[k] * im[k]); fr[map[k]] += m; sum += m; }
      if (sum > 1e-6) for (i = 0; i < 12; i++) chroma[i] += fr[i] / sum;
    }
    function corr(p, rot) {
      var mx = 0, my = 0, i, a = 0, b = 0, c = 0;
      for (i = 0; i < 12; i++) { mx += chroma[(i + rot) % 12]; my += p[i]; } mx /= 12; my /= 12;
      for (i = 0; i < 12; i++) { var dx = chroma[(i + rot) % 12] - mx, dy = p[i] - my; a += dx * dy; b += dx * dx; c += dy * dy; }
      return a / Math.sqrt(b * c || 1);
    }
    var best = -2, root = 0, minor = false;
    for (i = 0; i < 12; i++) { var a = corr(MAJ, i), b = corr(MIN, i); if (a > best) { best = a; root = i; minor = false; } if (b > best) { best = b; root = i; minor = true; } }
    return { root: root, minor: minor };
  }
  T.analyse = function (audio) { var m = mono(audio, 11025); return { bpm: tempo(m.x, m.sr), key: keyOf(m.x, m.sr) }; };
  T.key = function (el) {
    el.innerHTML = '<div class="pair"><div><div class="big nc" data-k>–</div><div class="sub">key</div></div><div><div class="big" data-b>–</div><div class="sub">bpm</div></div></div><div class="sub nc" data-d>&nbsp;</div><label class="key">choose audio file<input type="file" accept="audio/*" hidden></label><p data-s>analysed on this device. nothing is uploaded.</p>';
    var kk = $(el, '[data-k]'), kb = $(el, '[data-b]'), kd = $(el, '[data-d]'), ks = $(el, '[data-s]'), input = $(el, 'input'), alive = true;
    function run(file) {
      if (!file) return;
      ks.textContent = 'listening to ' + file.name.toLowerCase() + '…'; kk.textContent = kb.textContent = '–'; kd.innerHTML = '&nbsp;';
      file.arrayBuffer().then(function (buf) { return new Promise(function (ok, no) { ac().decodeAudioData(buf, ok, no); }); }).then(function (audio) {
        if (!alive) return;
        setTimeout(function () {
          var r = T.analyse(audio), b = Math.round(r.bpm * 10) / 10;
          var name = (r.key.minor ? KMIN : KMAJ)[r.key.root];
          kk.textContent = name + (r.key.minor ? 'm' : '');
          kb.textContent = Math.abs(b - Math.round(b)) < 0.15 ? Math.round(b) : b.toFixed(1);
          var alt = b < 100 ? b * 2 : b / 2;
          kd.textContent = name + (r.key.minor ? ' minor' : ' major') + ' · camelot ' + (r.key.minor ? CAMI[r.key.root] + 'A' : CAMA[r.key.root] + 'B') + ' · or ' + (Math.round(alt * 10) / 10) + ' bpm';
          ks.textContent = 'an estimate from the audio. check it by ear.';
        }, 30);
      }).catch(function () { if (alive) ks.textContent = 'could not read this file.'; });
    }
    input.onchange = function () { run(input.files[0]); };
    function over(e) { e.preventDefault(); }
    function drop(e) { e.preventDefault(); run(e.dataTransfer.files[0]); }
    var stage = document.getElementById('stage') || el;
    stage.addEventListener('dragover', over); stage.addEventListener('drop', drop);
    return function () { alive = false; stage.removeEventListener('dragover', over); stage.removeEventListener('drop', drop); };
  };

  /* ---------- metronome ---------- */
  T.metronome = function (el) {
    el.innerHTML = '<div class="big" data-b></div><div class="beats" data-d></div><div class="keys"><button class="key" data-m>&minus;</button><button class="key" data-t>tap</button><button class="key" data-p>+</button></div><div class="keys" data-s></div><button class="key" data-go>start</button>';
    var out = $(el, '[data-b]'), dotsEl = $(el, '[data-d]'), sig = $(el, '[data-s]'), go = $(el, '[data-go]');
    var bpm = clamp(store('bpm') || 120, 30, 300), beats = store('beats') || 4, on = false, next = 0, beat = 0, timer, raf, q = [], taps = [], dots = [];
    function paint() {
      out.textContent = bpm; store('bpm', bpm); store('beats', beats);
      dotsEl.innerHTML = ''; dots = []; for (var i = 0; i < beats; i++) dots.push(dotsEl.appendChild(document.createElement('i')));
      sig.innerHTML = [2, 3, 4, 6].map(function (n) { return '<button class="key' + (n === beats ? ' on' : '') + '" data-n="' + n + '">' + n + '</button>'; }).join('');
    }
    function click(time, accent) {
      var a = ac(), o = a.createOscillator(), g = a.createGain();
      o.frequency.value = accent ? 1600 : 1000;
      g.gain.setValueAtTime(0.0001, time); g.gain.exponentialRampToValueAtTime(0.5, time + 0.001); g.gain.exponentialRampToValueAtTime(0.0001, time + 0.05);
      o.connect(g); g.connect(a.destination); o.start(time); o.stop(time + 0.06);
    }
    function sched() { var a = ac(); while (next < a.currentTime + 0.12) { click(next, beat === 0); q.push({ b: beat, t: next }); next += 60 / bpm; beat = (beat + 1) % beats; } }
    function vis() { var now = ac().currentTime; while (q.length && q[0].t <= now) { var b = q.shift().b; dots.forEach(function (d, i) { d.classList.toggle('on', i === b); }); } raf = requestAnimationFrame(vis); }
    function stop() { on = false; clearInterval(timer); cancelAnimationFrame(raf); q = []; dots.forEach(function (d) { d.classList.remove('on'); }); go.textContent = 'start'; go.classList.remove('on'); }
    function start() { on = true; beat = 0; next = ac().currentTime + 0.06; timer = setInterval(sched, 25); sched(); vis(); go.textContent = 'stop'; go.classList.add('on'); }
    function set(v) { bpm = clamp(Math.round(v), 30, 300); out.textContent = bpm; store('bpm', bpm); }
    var h1 = hold($(el, '[data-m]'), function () { set(bpm - 1); }), h2 = hold($(el, '[data-p]'), function () { set(bpm + 1); });
    $(el, '[data-t]').onclick = function () {
      var now = performance.now(); if (taps.length && now - taps[taps.length - 1] > 2000) taps = [];
      taps.push(now); if (taps.length > 6) taps.shift();
      if (taps.length > 1) set(60000 / ((taps[taps.length - 1] - taps[0]) / (taps.length - 1)));
    };
    sig.onclick = function (e) { var n = e.target.getAttribute && +e.target.getAttribute('data-n'); if (!n) return; beats = n; var was = on; if (was) stop(); paint(); if (was) start(); };
    go.onclick = function () { on ? stop() : start(); };
    paint();
    return function () { stop(); h1(); h2(); };
  };

  /* ---------- setlist ---------- */
  T.setlist = function (el) {
    el.innerHTML = '<div class="line"><input class="field" data-t placeholder="song title" style="flex:1"><input class="field" data-d placeholder="3:30" inputmode="decimal" style="width:76px;text-align:center"><button class="key" data-a>add</button></div><div class="list" data-l></div><div class="sub" data-sum></div><div class="keys"><button class="key" data-c>copy</button><button class="key" data-x>clear</button></div>';
    var ti = $(el, '[data-t]'), di = $(el, '[data-d]'), list = $(el, '[data-l]'), sum = $(el, '[data-sum]'), items = store('setlist') || [];
    function secs(v) { v = String(v).trim().replace(',', '.'); if (!v) return 0; if (v.indexOf(':') >= 0) return v.split(':').reduce(function (a, p) { return a * 60 + (parseFloat(p) || 0); }, 0); return Math.round((parseFloat(v) || 0) * 60); }
    function total() { return items.reduce(function (a, i) { return a + i.s; }, 0); }
    function paint() {
      store('setlist', items);
      list.innerHTML = items.map(function (it, i) { return '<div><span>' + (i + 1) + '</span><span class="nc">' + esc(it.t) + '</span><span>' + (it.s ? clock(it.s) : '') + '</span><button data-u="' + i + '" aria-label="move up">&uarr;</button><button data-r="' + i + '" aria-label="remove">&times;</button></div>'; }).join('');
      sum.textContent = items.length ? items.length + (items.length === 1 ? ' song · ' : ' songs · ') + clock(total()) : 'add the first song.';
    }
    function add() { var t = ti.value.trim(); if (!t) { ti.focus(); return; } items.push({ t: t, s: secs(di.value) }); ti.value = di.value = ''; paint(); list.scrollTop = list.scrollHeight; ti.focus(); }
    $(el, '[data-a]').onclick = add;
    [ti, di].forEach(function (f) { f.onkeydown = function (e) { if (e.key === 'Enter') add(); }; });
    list.onclick = function (e) {
      var u = e.target.getAttribute('data-u'), r = e.target.getAttribute('data-r');
      if (u !== null && +u > 0) { var x = items.splice(+u, 1)[0]; items.splice(+u - 1, 0, x); paint(); }
      if (r !== null) { items.splice(+r, 1); paint(); }
    };
    $(el, '[data-c]').onclick = function () { copy(items.map(function (it, i) { return (i + 1) + '. ' + it.t + (it.s ? '  ' + clock(it.s) : ''); }).join('\n') + (items.length ? '\n\ntotal ' + clock(total()) : ''), this); };
    $(el, '[data-x]').onclick = function () { items = []; paint(); };
    paint();
  };

  /* ---------- delay times ---------- */
  T.delay = function (el) {
    el.innerHTML = '<div class="line"><input class="field" data-b type="number" inputmode="decimal" min="20" max="400" style="width:110px;text-align:center"><span class="sub">bpm</span></div><div class="table" data-t></div>';
    var b = $(el, '[data-b]'), t = $(el, '[data-t]'), rows = [['1/1', 4], ['1/2', 2], ['1/4', 1], ['1/8', 0.5], ['1/8 dotted', 0.75], ['1/8 triplet', 1 / 3], ['1/16', 0.25]];
    function paint() {
      var bpm = parseFloat(b.value);
      t.innerHTML = rows.map(function (r) { var ms = bpm > 0 ? 60000 / bpm * r[1] : 0; return '<div><span>' + r[0] + '</span><span>' + (ms ? ms.toFixed(1) + ' ms' : '–') + '</span><span>' + (ms ? (1000 / ms).toFixed(2) + ' hz' : '') + '</span></div>'; }).join('');
    }
    b.value = store('bpm') || 120; b.oninput = paint; paint();
  };

  /* ---------- tone ---------- */
  T.tone = function (el) {
    el.innerHTML = '<div class="big nc" data-n></div><div class="sub" data-f></div><div class="keys notes nc" data-k></div><div class="keys"><button class="key" data-m>&minus;</button><span class="sub" style="min-width:64px">octave</span><button class="key" data-p>+</button></div><button class="key" data-go>play</button>';
    var n = $(el, '[data-n]'), f = $(el, '[data-f]'), keys = $(el, '[data-k]'), go = $(el, '[data-go]'), pc = 9, oct = 4, osc, gain;
    function hz() { return 440 * Math.pow(2, (12 * (oct + 1) + pc - 69) / 12); }
    function paint() {
      n.textContent = SHARP[pc] + oct; f.textContent = hz().toFixed(2) + ' hz';
      keys.innerHTML = SHARP.map(function (s, i) { return '<button class="key' + (i === pc ? ' on' : '') + '" data-i="' + i + '">' + s + '</button>'; }).join('');
      if (osc) osc.frequency.setTargetAtTime(hz(), ac().currentTime, 0.02);
    }
    function stop() { if (!osc) return; var a = ac(), o = osc; gain.gain.setTargetAtTime(0, a.currentTime, 0.03); setTimeout(function () { try { o.stop(); } catch (_) {} }, 250); osc = null; go.textContent = 'play'; go.classList.remove('on'); }
    go.onclick = function () {
      if (osc) return stop();
      var a = ac(); osc = a.createOscillator(); gain = a.createGain(); osc.type = 'sine'; osc.frequency.value = hz();
      gain.gain.value = 0; gain.gain.setTargetAtTime(0.2, a.currentTime, 0.03); osc.connect(gain); gain.connect(a.destination); osc.start();
      go.textContent = 'stop'; go.classList.add('on');
    };
    keys.onclick = function (e) { var i = e.target.getAttribute('data-i'); if (i !== null) { pc = +i; paint(); } };
    $(el, '[data-m]').onclick = function () { oct = clamp(oct - 1, 0, 8); paint(); };
    $(el, '[data-p]').onclick = function () { oct = clamp(oct + 1, 0, 8); paint(); };
    paint();
    return stop;
  };

  /* ---------- keys ---------- */
  T.keys = function (el) {
    el.innerHTML = '<div class="piano nc" data-p></div><div class="keys"><button class="key" data-m>&minus;</button><span class="sub" style="min-width:72px" data-o></span><button class="key" data-u>+</button></div>';
    var p = $(el, '[data-p]'), ol = $(el, '[data-o]'), oct = clamp(store('oct') || 4, 1, 6), voices = {}, down = {}, bus;
    var WH = [0, 2, 4, 5, 7, 9, 11], BL = { 0: 1, 1: 3, 3: 6, 4: 8, 5: 10 }, QWERTY = 'awsedftgyhujk';
    function build() {
      var n = p.clientWidth >= 500 ? 15 : 8, base = 12 * (oct + 1), h = '', i, m;
      for (i = 0; i < n; i++) { m = base + 12 * Math.floor(i / 7) + WH[i % 7]; h += '<i class="w" data-n="' + m + '"><b>' + SHARP[m % 12] + (m % 12 ? '' : Math.floor(m / 12) - 1) + '</b></i>'; }
      for (i = 0; i < n - 1; i++) if (BL[i % 7] !== undefined) { m = base + 12 * Math.floor(i / 7) + BL[i % 7]; h += '<i class="b" data-n="' + m + '" style="left:' + ((i + 1) / n * 100).toFixed(3) + '%;width:' + (62 / n).toFixed(3) + '%"><b>' + SHARP[m % 12] + '</b></i>'; }
      p.innerHTML = h; ol.textContent = 'octave ' + oct; store('oct', oct);
    }
    function keyEl(m) { return p.querySelector('[data-n="' + m + '"]'); }
    function out() { if (!bus) { var a = ac(), g = a.createGain(); bus = a.createDynamicsCompressor(); g.gain.value = 0.7; bus.connect(g); g.connect(a.destination); } return bus; }
    function on(m) {
      if (voices[m]) off(m);
      var a = ac(), t = a.currentTime, f = 440 * Math.pow(2, (m - 69) / 12), g = a.createGain(), o1 = a.createOscillator(), o2 = a.createOscillator(), g2 = a.createGain();
      o1.type = 'triangle'; o1.frequency.value = f; o2.type = 'sine'; o2.frequency.value = f * 2; g2.gain.value = 0.25;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
      o1.connect(g); o2.connect(g2); g2.connect(g); g.connect(out()); o1.start(t); o2.start(t); o1.stop(t + 2.5); o2.stop(t + 2.5);
      voices[m] = { g: g, o: [o1, o2] };
      var k = keyEl(m); if (k) k.classList.add('on');
    }
    function off(m) {
      var v = voices[m]; if (!v) return;
      var t = ac().currentTime;
      if (v.g.gain.cancelAndHoldAtTime) v.g.gain.cancelAndHoldAtTime(t); else { v.g.gain.cancelScheduledValues(t); v.g.gain.setValueAtTime(v.g.gain.value, t); }
      v.g.gain.setTargetAtTime(0.0001, t, 0.07);
      v.o.forEach(function (o) { try { o.stop(t + 0.5); } catch (_) {} });
      delete voices[m];
      var k = keyEl(m); if (k) k.classList.remove('on');
    }
    function held(m) { for (var id in down) if (down[id] === m) return true; return false; }
    function at(e) { var x = document.elementFromPoint(e.clientX, e.clientY), k = x && x.closest ? x.closest('.piano i') : null; return k ? +k.getAttribute('data-n') : null; }
    function pd(e) { e.preventDefault(); var m = at(e); if (m === null) return; down[e.pointerId] = m; on(m); }
    function pm(e) { if (!(e.pointerId in down)) return; var m = at(e), was = down[e.pointerId]; if (m === was) return; down[e.pointerId] = m; if (was !== null && !held(was)) off(was); if (m !== null) on(m); }
    function pu(e) { if (!(e.pointerId in down)) return; var was = down[e.pointerId]; delete down[e.pointerId]; if (was !== null && !held(was)) off(was); }
    function kd(e) { if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return; var i = QWERTY.indexOf(e.key.toLowerCase()); if (i < 0) return; var m = 12 * (oct + 1) + i; down['k' + i] = m; on(m); }
    function ku(e) { var i = QWERTY.indexOf(e.key.toLowerCase()); if (i < 0 || !('k' + i in down)) return; var m = down['k' + i]; delete down['k' + i]; if (!held(m)) off(m); }
    function all() { Object.keys(voices).forEach(function (m) { off(+m); }); down = {}; }
    function shift(d) { all(); oct = clamp(oct + d, 1, 6); build(); }
    p.addEventListener('pointerdown', pd);
    addEventListener('pointermove', pm); addEventListener('pointerup', pu); addEventListener('pointercancel', pu);
    addEventListener('keydown', kd); addEventListener('keyup', ku); addEventListener('resize', build);
    $(el, '[data-m]').onclick = function () { shift(-1); };
    $(el, '[data-u]').onclick = function () { shift(1); };
    build();
    return function () {
      all();
      removeEventListener('pointermove', pm); removeEventListener('pointerup', pu); removeEventListener('pointercancel', pu);
      removeEventListener('keydown', kd); removeEventListener('keyup', ku); removeEventListener('resize', build);
    };
  };

  /* ---------- transpose ---------- */
  var PC = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, Fb: 4, 'E#': 5, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11, Cb: 11, 'B#': 0 };
  var CHORD = /^([A-G][#b]?)((?:maj|min|dim|aug|sus|add|m|M)?[0-9]*(?:(?:sus|add|maj|min|dim|aug|[#b+\-])[0-9]*)*(?:\([^)]*\))?)(?:\/([A-G][#b]?))?$/;
  T.shift = function (text, n, flats) {
    var names = flats ? FLAT : SHARP;
    function move(r) { return names[(((PC[r] + n) % 12) + 12) % 12]; }
    return text.split('\n').map(function (line) {
      var parts = line.split(/(\s+|\|)/), words = parts.filter(function (p) { return p && !/^(\s+|\|)$/.test(p); });
      var hits = words.filter(function (w) { return CHORD.test(w); }).length;
      if (!hits || hits * 2 < words.length) return line;
      return parts.map(function (p) { var m = CHORD.exec(p); return m ? move(m[1]) + m[2] + (m[3] ? '/' + move(m[3]) : '') : p; }).join('');
    }).join('\n');
  };
  T.transpose = function (el) {
    el.innerHTML = '<textarea class="field" data-i placeholder="paste chords, for example:  Am  F  C  G" spellcheck="false" autocapitalize="off"></textarea><div class="keys"><button class="key" data-m>&minus;</button><span class="sub" data-n style="min-width:44px">0</span><button class="key" data-p>+</button><button class="key" data-f>sharps</button><button class="key" data-c>copy</button></div><div class="out nc" data-o></div>';
    var i = $(el, '[data-i]'), o = $(el, '[data-o]'), nn = $(el, '[data-n]'), fb = $(el, '[data-f]'), n = 0, flats = false;
    function paint() { nn.textContent = (n > 0 ? '+' : '') + n; fb.textContent = flats ? 'flats' : 'sharps'; o.textContent = T.shift(i.value, n, flats); store('chords', i.value); }
    i.value = store('chords') || ''; i.oninput = paint;
    $(el, '[data-m]').onclick = function () { n = clamp(n - 1, -11, 11); paint(); };
    $(el, '[data-p]').onclick = function () { n = clamp(n + 1, -11, 11); paint(); };
    fb.onclick = function () { flats = !flats; paint(); };
    $(el, '[data-c]').onclick = function () { copy(o.textContent, this); };
    paint();
  };

  /* ---------- stage timer ---------- */
  T.timer = function (el) {
    var stage = document.getElementById('stage');
    el.innerHTML = '<div class="big" data-t></div><div class="keys" data-p></div><div class="keys"><button class="key" data-dn aria-label="one minute less">&minus;</button><button class="key" data-go>start</button><button class="key" data-r>reset</button><button class="key" data-up aria-label="one minute more">+</button>' + (stage && stage.requestFullscreen ? '<button class="key" data-fs>full screen</button>' : '') + '</div>';
    var out = $(el, '[data-t]'), pre = $(el, '[data-p]'), go = $(el, '[data-go]'), mins = store('timer') || 45, left = mins * 60, end = 0, iv, lock;
    function paint() {
      var s = end ? Math.ceil((end - Date.now()) / 1000) : left;
      out.textContent = s >= 0 ? clock(s) : '+' + clock(-s);
      pre.innerHTML = [10, 15, 30, 45, 60, 90].map(function (m) { return '<button class="key' + (m === mins ? ' on' : '') + '" data-m="' + m + '">' + m + '</button>'; }).join('');
    }
    function tick() { var s = Math.ceil((end - Date.now()) / 1000); out.textContent = s >= 0 ? clock(s) : '+' + clock(-s); }
    function pause() { if (!end) return; left = Math.ceil((end - Date.now()) / 1000); end = 0; clearInterval(iv); go.textContent = 'start'; go.classList.remove('on'); if (lock) { try { lock.release(); } catch (_) {} lock = null; } }
    function start() {
      end = Date.now() + left * 1000; iv = setInterval(tick, 200); go.textContent = 'pause'; go.classList.add('on');
      if (navigator.wakeLock) navigator.wakeLock.request('screen').then(function (l) { lock = l; }, function () {});
    }
    go.onclick = function () { end ? pause() : start(); };
    $(el, '[data-r]').onclick = function () { pause(); left = mins * 60; paint(); };
    pre.onclick = function (e) { var m = e.target.getAttribute && +e.target.getAttribute('data-m'); if (!m) return; pause(); mins = m; left = m * 60; store('timer', m); paint(); };
    function nudge(d) { pause(); mins = clamp(mins + d, 1, 600); left = mins * 60; store('timer', mins); paint(); }
    var s1 = hold($(el, '[data-dn]'), function () { nudge(-1); }), s2 = hold($(el, '[data-up]'), function () { nudge(1); });
    var fs = $(el, '[data-fs]');
    if (fs) fs.onclick = function () { document.fullscreenElement ? document.exitFullscreen() : stage.requestFullscreen().catch(function () {}); };
    paint();
    return function () { pause(); s1(); s2(); };
  };
})();
