/* all inc. — the venue as a plaster model: one artist, one device, three marks on a thread. */
(function () {
  'use strict';
  var root = document.documentElement, T = window.THREE;
  function bail() { root.classList.remove('gl'); }
  if (!root.classList.contains('gl')) return;
  if (!T) return bail();

  var canvas = document.getElementById('gl');
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches || /[?&]still\b/.test(location.search);
  var renderer;
  try { renderer = new T.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' }); }
  catch (e) { return bail(); }
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;

  var scene = new T.Scene();
  var camera = new T.PerspectiveCamera(24, 1, 1, 2400);

  /* ---------- light: one soft key, one sky ---------- */
  scene.add(new T.HemisphereLight(0xffffff, 0xbdb9b2, 0.57));
  var key = new T.DirectionalLight(0xfff0dc, 0.6);
  key.position.set(-110, 105, 50);
  key.castShadow = true;
  var small = Math.min(screen.width, screen.height) < 500;
  var sm = small || renderer.capabilities.maxTextureSize < 4096 ? 2048 : 4096;
  key.shadow.mapSize.set(sm, sm);
  var sc = key.shadow.camera; sc.left = -82; sc.right = 82; sc.top = 82; sc.bottom = -82; sc.near = 20; sc.far = 340;
  key.shadow.bias = -0.0005; key.shadow.normalBias = 0.05;
  scene.add(key); scene.add(key.target);

  /* ---------- materials ---------- */
  var BLUE = 0x2f6bff;
  var plaster = new T.MeshLambertMaterial({ color: 0xf3f1ec });
  var floorMat = new T.MeshLambertMaterial({ color: 0xe9e7e2 });
  var ink = new T.MeshLambertMaterial({ color: 0x18181a });
  var uni = { uT: { value: 0 }, uAmp: { value: 0 }, uBlue: { value: new T.Color(BLUE).convertSRGBToLinear() } };

  function mesh(geo, mat, x, y, z, cast) {
    var m = new T.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0);
    m.castShadow = cast !== false; m.receiveShadow = true; scene.add(m); return m;
  }
  function box(w, h, d, x, y, z, mat) { return mesh(new T.BoxGeometry(w, h, d), mat || plaster, x, y, z); }

  /* ---------- the bowl ---------- */
  var A0 = 17, B0 = 31, EXP = 3.2;
  function se(a, b, t) {
    var c = Math.cos(t), s = Math.sin(t);
    return [a * (c < 0 ? -1 : 1) * Math.pow(Math.abs(c), 2 / EXP), b * (s < 0 ? -1 : 1) * Math.pow(Math.abs(s), 2 / EXP)];
  }
  /* section through the seating: [distance out from the floor edge, height] */
  var prof = [[0, 0], [0, 1.2]], rows = [];
  (function () {
    var d = 0, y = 1.2, i;
    for (i = 0; i < 12; i++) { rows.push([d + 0.5, y]); d += 0.92; prof.push([d, y]); if (i < 11) { y += 0.46; prof.push([d, y]); } }
    d += 2.8; prof.push([d, y]); y += 2.3; prof.push([d, y]);
    for (i = 0; i < 10; i++) { rows.push([d + 0.5, y]); d += 0.92; prof.push([d, y]); if (i < 9) { y += 0.62; prof.push([d, y]); } }
    y += 1.1; prof.push([d, y]); d += 2.4; prof.push([d, y]); prof.push([d, 0]);
  })();
  var DOUT = prof[prof.length - 1][0], YTOP = prof[prof.length - 2][1];

  (function () {
    var N = 168, pos = [], k, j;
    function P(k, t) { var p = se(A0 + prof[k][0], B0 + prof[k][0], t); return [p[0], prof[k][1], p[1]]; }
    for (j = 0; j < N; j++) {
      var t0 = j / N * Math.PI * 2, t1 = (j + 1) / N * Math.PI * 2, tm = (t0 + t1) / 2;
      var rx = Math.cos(tm), rz = Math.sin(tm);
      for (k = 0; k < prof.length - 1; k++) {
        var a = P(k, t0), b = P(k + 1, t0), c = P(k + 1, t1), d = P(k, t1);
        var dd = prof[k + 1][0] - prof[k][0], dy = prof[k + 1][1] - prof[k][1];
        var ex = -dy * rx, ey = dd, ez = -dy * rz;   /* the side that should face out */
        var ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
        var nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        if (nx * ex + ny * ey + nz * ez < 0) { var s = b; b = d; d = s; }
        pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2], a[0], a[1], a[2], c[0], c[1], c[2], d[0], d[1], d[2]);
      }
    }
    var g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
    mesh(g, plaster);

    var sh = new T.Shape();
    for (j = 0; j <= 120; j++) { var p = se(A0 + 0.05, B0 + 0.05, j / 120 * Math.PI * 2); j ? sh.lineTo(p[0], p[1]) : sh.moveTo(p[0], p[1]); }
    var fl = mesh(new T.ShapeGeometry(sh, 1), floorMat, 0, 0.02, 0, false); fl.rotation.x = Math.PI / 2; fl.material.side = T.DoubleSide;

    /* fins around the outside */
    var per = [], M = 720, len = 0;
    for (j = 0; j <= M; j++) { var q = se(A0 + DOUT, B0 + DOUT, j / M * Math.PI * 2); if (j) len += Math.hypot(q[0] - per[j - 1][0], q[1] - per[j - 1][1]); per.push([q[0], q[1], len]); }
    var nf = Math.round(len / 3.1), fins = new T.InstancedMesh(new T.BoxGeometry(1.5, YTOP + 0.5, 0.3), plaster, nf), o = new T.Object3D(), w = 1;
    for (var f = 0; f < nf; f++) {
      var at = f / nf * len; while (per[w][2] < at) w++;
      var p0 = per[w - 1], p1 = per[w], u = (at - p0[2]) / (p1[2] - p0[2]);
      var tx = p1[0] - p0[0], tz = p1[1] - p0[1], tl = Math.hypot(tx, tz);
      o.position.set(p0[0] + (p1[0] - p0[0]) * u + tz / tl * 0.75, (YTOP + 0.5) / 2, p0[1] + (p1[1] - p0[1]) * u - tx / tl * 0.75);
      o.rotation.y = Math.atan2(tx / tl, tz / tl);
      o.updateMatrix(); fins.setMatrixAt(f, o.matrix);
    }
    fins.castShadow = true; fins.receiveShadow = true; scene.add(fins);
  })();

  /* the table it stands on only shows as shadow */
  var cat = new T.Mesh(new T.PlaneGeometry(1400, 1400), new T.ShadowMaterial({ opacity: 0.25 }));
  cat.rotation.x = -Math.PI / 2; cat.receiveShadow = true; scene.add(cat);

  /* ---------- the stage ---------- */
  var DECK = 1.8;
  box(27, DECK, 11.5, 0, DECK / 2, -24.5);
  box(3.4, DECK, 11, 0, DECK / 2, -13.25);
  box(2.4, 7.5, 2.4, -15.6, 3.75, -21.5); box(2.4, 7.5, 2.4, 15.6, 3.75, -21.5);
  /* the screen is the black display from allinc.fi, with its one line */
  box(23.4, 9.6, 0.5, 0, DECK + 5.0, -29.75, ink);
  var screenMat = new T.ShaderMaterial({
    uniforms: uni, transparent: true,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: [
      'precision highp float; varying vec2 vUv; uniform float uT; uniform vec3 uBlue;',
      'void main(){',
      '  vec2 s = vec2(24.0, 10.0), p = (vUv - 0.5) * s, q = abs(p) - s * 0.5 + 1.1;',
      '  float box = length(max(q, 0.0)) - 1.1;',
      '  if (box > 0.0) discard;',
      '  float u = vUv.x, y = (sin(u * 5.0 + uT * 0.7) * 0.55 + sin(u * 2.2 + uT * 0.35) * 0.45) * 1.5;',
      '  float d = abs(p.y - y);',
      '  float l = smoothstep(0.11, 0.035, d) + 0.22 * exp(-d * 2.4);',
      '  vec3 c = mix(vec3(0.0015), uBlue, clamp(l, 0.0, 1.0));',
      '  gl_FragColor = vec4(pow(c, vec3(1.0 / 2.2)), 1.0);',
      '}'
    ].join('\n')
  });
  var scr = new T.Mesh(new T.PlaneGeometry(24, 10), screenMat); scr.position.set(0, DECK + 5.0, -29.45); scene.add(scr);

  /* ---------- people, as model-makers' pins ---------- */
  var pinPts = [[0.001, 0], [0.21, 0], [0.17, 1.16], [0.06, 1.25], [0.13, 1.32], [0.175, 1.47], [0.13, 1.62], [0.001, 1.69]];
  var finePts = [[0.001, 0], [0.2, 0], [0.21, 0.02], [0.17, 1.14], [0.15, 1.2], [0.07, 1.245], [0.075, 1.27], [0.125, 1.31], [0.16, 1.37], [0.176, 1.45], [0.168, 1.54], [0.135, 1.62], [0.08, 1.675], [0.001, 1.695]];
  function lathe(pts, n) { return new T.LatheGeometry(pts.map(function (p) { return new T.Vector2(p[0], p[1]); }), n); }
  var pinGeo = lathe(pinPts, 7), fineGeo = lathe(finePts, 32);
  var seed = 7; function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  var ACT = new T.Vector3(0, DECK, -22.5), MID = new T.Vector3(0, 0, 4), FOH = new T.Vector3(0, 0.6, 20.6), TOP = 16;
  var people = [];
  (function () {
    var x, z, k, j;
    /* standing on the floor: close to the stage, thinner toward the back */
    for (x = -A0; x <= A0; x += 0.98) for (z = -19; z <= B0; z += 0.98) {
      var px = x + (rnd() - 0.5) * 0.7, pz = z + (rnd() - 0.5) * 0.7;
      var ex = Math.pow(Math.abs(px) / (A0 - 0.7), EXP) + Math.pow(Math.abs(pz) / (B0 - 0.7), EXP);
      var keep = rnd() < Math.max(0.22, Math.min(1, 1.12 - (pz + 18) / 50));
      if (ex > 1 || !keep) continue;
      if (Math.abs(px) < 14.6 && pz < -17.6) continue;
      if (Math.abs(px) < 2.9 && pz < -6.4) continue;
      if (Math.abs(px) < 5.2 && pz > 16.8 && pz < 24.4) continue;
      if (Math.hypot(px - MID.x, pz - MID.z) < 1.5) continue;
      people.push([px, 0, pz, 0.94 + rnd() * 0.14]);
    }
    /* seated in the rows; the end behind the stage stays empty */
    for (k = 0; k < rows.length; k++) {
      var a = A0 + rows[k][0], b = B0 + rows[k][0], M = 900, prev = se(a, b, 0), acc = rnd();
      for (j = 1; j <= M; j++) {
        var p = se(a, b, j / M * Math.PI * 2); acc += Math.hypot(p[0] - prev[0], p[1] - prev[1]); prev = p;
        if (acc < 1.04) continue; acc = 0;
        if (p[1] < -23.5 || rnd() < 0.07) continue;
        people.push([p[0], rows[k][1], p[1], 0.7 + rnd() * 0.08]);
      }
    }
  })();
  var pinMat = new T.MeshLambertMaterial({ color: 0xffffff });
  pinMat.onBeforeCompile = function (s) {
    s.uniforms.uT = uni.uT; s.uniforms.uAmp = uni.uAmp; s.uniforms.uBlue = uni.uBlue;
    s.vertexShader = 'uniform float uT; uniform float uAmp; varying float vW;\n' + s.vertexShader.replace('#include <begin_vertex>', [
      '#include <begin_vertex>',
      '#ifdef USE_INSTANCING',
      '  vec2 ip = instanceMatrix[3].xz;',
      '  float ph = fract(distance(ip, vec2(0.0, -9.0)) / 30.0 - uT * 0.3);',
      '  float w = smoothstep(0.0, 0.12, ph) * (1.0 - smoothstep(0.14, 0.46, ph));',
      '  vW = w * uAmp;',
      '  transformed.y += vW * 0.5 * step(0.5, position.y);',
      '  transformed.xz *= 1.0 + vW * 0.55;',
      '#else',
      '  vW = 0.0;',
      '#endif'
    ].join('\n'));
    s.fragmentShader = 'uniform vec3 uBlue; varying float vW;\n' + s.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n  diffuseColor.rgb = mix(diffuseColor.rgb, uBlue, clamp(vW, 0.0, 1.0) * 0.92);');
  };
  var crowd = new T.InstancedMesh(pinGeo, pinMat, people.length);
  (function () {
    var o = new T.Object3D(), c = new T.Color();
    var tones = [0xfdfcf9, 0xf6f3ed, 0xece7de, 0xe0d9cd, 0xd2c9ba, 0xc3b8a6];
    for (var i = 0; i < people.length; i++) {
      var p = people[i];
      o.position.set(p[0], p[1], p[2]); o.scale.set(1, p[3], 1); o.rotation.y = rnd() * 6.28; o.updateMatrix();
      crowd.setMatrixAt(i, o.matrix);
      var r = rnd(); c.setHex(tones[r < 0.7 ? (r * 10 | 0) % 3 : (rnd() * tones.length) | 0]).convertSRGBToLinear();
      crowd.setColorAt(i, c);
    }
  })();
  crowd.castShadow = true; crowd.receiveShadow = true; crowd.frustumCulled = false; scene.add(crowd);

  /* the artist, and the device */
  var artist = mesh(fineGeo, ink, -0.55, DECK, -11.4); artist.scale.set(1.06, 1.06, 1.06);
  mesh(new T.CylinderGeometry(0.025, 0.025, 1.05, 8), ink, 0.75, DECK + 0.525, -10.5);
  mesh(new T.CylinderGeometry(0.2, 0.2, 0.03, 20), ink, 0.75, DECK + 0.015, -10.5);
  var dev = new T.Group(); dev.position.set(0.75, DECK + 1.12, -10.5); dev.rotation.set(0.42, Math.PI, 0); dev.rotation.order = 'YXZ'; scene.add(dev);
  var slab = new T.Mesh(new T.BoxGeometry(0.46, 0.32, 0.03), ink); slab.castShadow = true; dev.add(slab);
  var dot = new T.Mesh(new T.CircleGeometry(0.062, 24), new T.MeshBasicMaterial({ color: 0xffffff })); dot.position.z = 0.017; dev.add(dot);

  /* front of house */
  box(8.6, 0.6, 5.6, 0, 0.3, FOH.z);
  box(3.4, 0.95, 1.1, 0, 1.075, FOH.z - 1.2);
  var eng = mesh(fineGeo, ink, -0.6, 0.6, FOH.z + 0.2); eng.scale.set(1, 1, 1);

  /* ---------- three marks on a thread ---------- */
  function tile(draw) {
    var c = document.createElement('canvas'); c.width = c.height = 256; var g = c.getContext('2d'), k = 2.56, r = 22.5 * k;
    g.fillStyle = '#000'; g.beginPath(); g.moveTo(r, 0); g.arcTo(256, 0, 256, 256, r); g.arcTo(256, 256, 0, 256, r); g.arcTo(0, 256, 0, 0, r); g.arcTo(0, 0, 256, 0, r); g.fill();
    g.fillStyle = g.strokeStyle = '#fff'; g.scale(k, k); draw(g);
    var t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 4; return t;
  }
  function disc(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill(); }
  function ring(g, r) { g.lineWidth = 5.5; g.beginPath(); g.arc(50, 50, r, 0, 6.2832); g.stroke(); }
  var marks = [
    { at: ACT, tex: tile(function (g) { disc(g, 50, 50, 20); }) },
    { at: MID, tex: tile(function (g) { disc(g, 29, 50, 11); disc(g, 71, 50, 11); g.fillRect(29, 46.5, 42, 7); }) },
    { at: FOH, tex: tile(function (g) { disc(g, 50, 50, 9); ring(g, 18.25); ring(g, 30.25); }) }
  ];
  marks.forEach(function (m) {
    var h = TOP - m.at.y;
    var n = mesh(new T.CylinderGeometry(0.08, 0.08, h, 6), ink, m.at.x, m.at.y + h / 2, m.at.z);
    m.sprite = new T.Sprite(new T.SpriteMaterial({ map: m.tex, transparent: true, depthWrite: false }));
    m.sprite.position.set(m.at.x, TOP, m.at.z); m.sprite.center.set(0.5, 0); m.o = 1; scene.add(m.sprite);
  });
  var thread = mesh(new T.CylinderGeometry(0.07, 0.07, FOH.z - ACT.z, 5), ink, 0, TOP, (FOH.z + ACT.z) / 2, false); thread.rotation.x = Math.PI / 2;
  var bead = new T.Mesh(new T.SphereGeometry(0.36, 16, 12), new T.MeshBasicMaterial({ color: BLUE })); bead.position.set(0, TOP, ACT.z); scene.add(bead);

  /* ---------- camera: one framing per section ---------- */
  var D = Math.PI / 180;
  var shots = [
    { t: [0, 2, 1],        az: 38 * D,  el: 30 * D, d: 318 },   /* the whole model on the table */
    { t: [-1.3, 2.7, -6],  az: 168 * D, el: 12 * D, d: 16.5 },    /* behind the artist, looking out */
    { t: [0, 8, 6],        az: 62 * D,  el: 27 * D, d: 112 },   /* along the thread */
    { t: [0, 0, 1.5],      az: 0,       el: 79 * D, d: 330 },   /* plan */
    { t: [0, 2, 0],        az: -34 * D, el: 24 * D, d: 440 }    /* stepping back */
  ];
  var BETA = Math.tan(11 * D);
  var W = 1, H = 1, vh = 1, upright = false, cx = 0, cy = 0;
  var probe = document.createElement('div'); probe.style.cssText = 'position:fixed;left:0;top:0;width:0;height:100svh;visibility:hidden;pointer-events:none'; document.body.appendChild(probe);
  var cur = null, goal = { t: [0, 0, 0], az: 0, el: 0, ld: 0 }, f = 0, px = 0, py = 0, sx = 0, sy = 0;

  function size() {
    W = canvas.clientWidth || innerWidth; H = canvas.clientHeight || innerHeight;
    vh = probe.offsetHeight || innerHeight; if (vh > H) vh = H;
    upright = W / vh <= 1 || W < 700;
    var rw, rh;
    if (upright) { rw = W; rh = vh * 0.56; cx = W / 2; cy = 56 + (rh - 56) / 2 + vh * 0.03; }
    else { rw = W * 0.58; rh = vh; cx = W * 0.69; cy = vh * 0.5; }
    var pr = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(4.2e6 / (W * H)));
    renderer.setPixelRatio(pr); renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.fov = 2 * Math.atan(BETA * H / (Math.min(rw, rh) * 0.94)) / D;
    camera.setViewOffset(W, H, W / 2 - cx, H / 2 - cy, W, H);
    camera.updateProjectionMatrix();
  }
  function ease(u) { u = Math.min(1, Math.max(0, (u - 0.1) / 0.8)); return u * u * u * (u * (u * 6 - 15) + 10); }
  function aim() {
    var secH = vh || 1;
    f = Math.max(0, Math.min(shots.length - 1, (window.pageYOffset || 0) / secH));
    var i = Math.min(shots.length - 2, Math.floor(f)), u = ease(f - i), a = shots[i], b = shots[i + 1];
    for (var k = 0; k < 3; k++) goal.t[k] = a.t[k] + (b.t[k] - a.t[k]) * u;
    goal.az = a.az + (b.az - a.az) * u; goal.el = a.el + (b.el - a.el) * u;
    goal.ld = Math.log(a.d) + (Math.log(b.d) - Math.log(a.d)) * u;
    /* swing a little higher mid-move so the camera clears the rim and the screen */
    goal.el += Math.sin(u * Math.PI) * (i === 0 ? 0.2 : i === 1 ? 0.12 : 0);
  }
  var v = new T.Vector3(), last = 0, time = 0, started = false;
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    if (!reduce) time += dt;
    aim();
    var k = reduce || !cur ? 1 : 1 - Math.exp(-dt * 5.5);
    if (!cur) cur = { t: goal.t.slice(), az: goal.az, el: goal.el, ld: goal.ld };
    for (var j = 0; j < 3; j++) cur.t[j] += (goal.t[j] - cur.t[j]) * k;
    cur.az += (goal.az - cur.az) * k; cur.el += (goal.el - cur.el) * k; cur.ld += (goal.ld - cur.ld) * k;
    sx += (px - sx) * 0.05; sy += (py - sy) * 0.05;
    var near = Math.max(0, 1 - Math.abs(f - 1)), sway = 1 - near * 0.6;
    var az = cur.az + (Math.sin(time * 0.11) * 1.5 + sx * 2.2) * D * sway, el = Math.min(1.45, cur.el + (Math.sin(time * 0.083) * 0.5 - sy * 1.1) * D * sway), d = Math.exp(cur.ld);
    camera.position.set(cur.t[0] + d * Math.sin(az) * Math.cos(el), cur.t[1] + d * Math.sin(el), cur.t[2] + d * Math.cos(az) * Math.cos(el));
    v.set(cur.t[0], cur.t[1], cur.t[2]); camera.lookAt(v);

    /* each mark steps forward in its own section */
    for (var m = 0; m < 3; m++) {
      var mk = marks[m], dist = camera.position.distanceTo(mk.sprite.position);
      var want = f < 0.5 || f > 3.5 ? 1 : Math.max(0.2, 1 - Math.abs(f - (m + 1)) * 1.3);
      mk.o += (want - mk.o) * (reduce ? 1 : 0.08); mk.sprite.material.opacity = mk.o;
      var s = Math.max(0.5, Math.min(5.2, dist * 0.0125 * (upright ? 1.25 : 1))); mk.sprite.scale.set(s, s, 1);
    }
    /* something always crossing the thread */
    var c = reduce ? 0.5 : (time * 0.16) % 1, e = c * c * (3 - 2 * c);
    bead.position.z = ACT.z + (FOH.z - ACT.z) * (Math.floor(time * 0.16) % 2 ? 1 - e : e);
    /* the room answers when antiphon listens */
    var amp = Math.max(0, 1 - Math.abs(f - 3) * 1.5);
    uni.uAmp.value += (amp - uni.uAmp.value) * (reduce ? 1 : 0.06);
    uni.uT.value = reduce ? 1.1 : time;
    renderer.render(scene, camera);
    if (!started) { started = true; root.classList.add('ready'); }
  }
  var raf = 0;
  function loop(now) { raf = 0; frame(now); if (!reduce && !document.hidden) raf = requestAnimationFrame(loop); }
  function kick() { if (!raf) raf = requestAnimationFrame(loop); }

  try {
    size();
    renderer.shadowMap.needsUpdate = true;
    frame(performance.now());   /* the first picture does not wait for a tick */
    kick();
  } catch (e) { return bail(); }

  var rt = 0;
  addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { size(); kick(); }, 60); });
  addEventListener('scroll', kick, { passive: true });
  document.addEventListener('visibilitychange', kick);
  if (matchMedia('(pointer: fine)').matches) addEventListener('pointermove', function (e) { px = e.clientX / innerWidth * 2 - 1; py = e.clientY / innerHeight * 2 - 1; }, { passive: true });
  canvas.addEventListener('webglcontextlost', function (e) { e.preventDefault(); });
  canvas.addEventListener('webglcontextrestored', function () { renderer.shadowMap.needsUpdate = true; kick(); });
})();
