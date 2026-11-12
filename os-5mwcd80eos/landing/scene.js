/* all inc. — the venue as a plaster model. the stage, the band and all link come from the venue twin. */
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
  var hemi = new T.HemisphereLight(0xffffff, 0xbdb9b2, 0.57); scene.add(hemi);
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
  var plaster = new T.MeshStandardMaterial({ color: 0xf3f1ec, roughness: 1 });
  var floorMat = new T.MeshStandardMaterial({ color: 0xe9e7e2, roughness: 1 });
  var ink = new T.MeshLambertMaterial({ color: 0x18181a });
  var uni = { uT: { value: 0 }, uAmp: { value: 0 }, uGlow: { value: 0 }, uBlue: { value: new T.Color(BLUE).convertSRGBToLinear() } };

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

  /* ---------- the stage, laid out as in the venue twin ---------- */
  var DECK = 1.8;
  box(22, DECK, 12, 0, DECK / 2, -20);          /* main deck  z -26..-14 */
  box(3.2, DECK, 12, 0, DECK / 2, -8);          /* thrust     z -14..-2 */
  box(8, DECK, 6, 0, DECK / 2, 1);              /* b-stage    z -2..4 */
  /* the upstage wall is the black display from allinc.fi, with its one line */
  box(15.2, 8.9, 0.35, 0, DECK + 0.35 + 4.45, -25.05, ink);
  var screenMat = new T.ShaderMaterial({
    uniforms: uni, transparent: true,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: [
      'precision highp float; varying vec2 vUv; uniform float uT; uniform vec3 uBlue;',
      'void main(){',
      '  vec2 s = vec2(15.2, 8.9), p = (vUv - 0.5) * s, q = abs(p) - s * 0.5 + 0.6;',
      '  float box = length(max(q, 0.0)) - 0.6;',
      '  if (box > 0.0) discard;',
      '  float u = vUv.x, y = (sin(u * 5.0 + uT * 0.7) * 0.55 + sin(u * 2.2 + uT * 0.35) * 0.45) * 1.2;',
      '  float d = abs(p.y - y);',
      '  float l = smoothstep(0.09, 0.03, d) + 0.22 * exp(-d * 2.6);',
      '  vec3 c = mix(vec3(0.0015), uBlue, clamp(l, 0.0, 1.0));',
      '  gl_FragColor = vec4(pow(c, vec3(1.0 / 2.2)), 1.0);',
      '}'
    ].join('\n')
  });
  var scr = new T.Mesh(new T.PlaneGeometry(15.2, 8.9), screenMat); scr.position.set(0, DECK + 0.35 + 4.45, -24.86); scene.add(scr);

  /* ---------- show light, from the venue twin: warm spots on the deck, thrust and b-stage, a follow spot from foh,
     a faint spill on the front rows, and soft shafts in the haze. they come up as the house lights go down. ---------- */
  var WARM = 0xffd2a8, SHOW = [];
  [[-7, -19], [-2.5, -19.5], [2.5, -19.5], [7, -19], [0, -8], [0, 1]].forEach(function (p, i) {
    var sp = new T.SpotLight(WARM, 0, 34, 0.32, 0.65, 1.4); sp.userData.full = i < 4 ? 1.25 : 1.6;
    sp.position.set(p[0] * 0.9, 13.4, i < 4 ? -14.5 : p[1] - 1.5); sp.target.position.set(p[0], DECK, p[1]);
    scene.add(sp); scene.add(sp.target); SHOW.push(sp);
  });
  var follow = new T.SpotLight(0xfff6ee, 0, 60, 0.07, 0.7, 1.2); follow.userData.full = 2.2;
  follow.position.set(0.6, 10.5, 21); follow.target.position.set(0, DECK + 1.2, 1.2); scene.add(follow); scene.add(follow.target);
  var spill = new T.SpotLight(0xffe6d0, 0, 44, 0.8, 1, 1.5); spill.userData.full = 0.45;
  spill.position.set(0, 12.6, -11); spill.target.position.set(0, 0, 5); scene.add(spill); scene.add(spill.target);
  var shaftMat = new T.ShaderMaterial({
    uniforms: { uC: { value: new T.Color(0xf4efe8).convertSRGBToLinear().multiplyScalar(0.034) }, uK: { value: 0 } },
    vertexShader: 'varying float vY; varying float vF; void main(){ vY=uv.y; vec4 mv=modelViewMatrix*vec4(position,1.0); vF=abs(dot(normalize(normalMatrix*normal),normalize(-mv.xyz))); gl_Position=projectionMatrix*mv; }',
    fragmentShader: 'uniform vec3 uC; uniform float uK; varying float vY; varying float vF; void main(){ float a=pow(vF,3.0)*(0.15+0.85*vY*vY)*uK; gl_FragColor=vec4(pow(uC*a, vec3(1.0/2.2)),1.0); }',
    blending: T.AdditiveBlending, transparent: true, depthWrite: false, side: T.DoubleSide
  });
  SHOW.forEach(function (sp) {
    var a = sp.position, b = sp.target.position, len = a.distanceTo(b);
    var m = new T.Mesh(new T.CylinderGeometry(0.14, len * Math.tan(sp.angle) * 0.72, len, 28, 1, true).translate(0, -len / 2, 0), shaftMat);
    m.position.copy(a); m.quaternion.setFromUnitVectors(new T.Vector3(0, -1, 0), b.clone().sub(a).normalize()); m.renderOrder = 2; scene.add(m);
  });
  var lights = SHOW.concat([follow, spill]), showK = 0.8;

  /* ---------- people, as model-makers' pins ---------- */
  var pinPts = [[0.001, 0], [0.21, 0], [0.17, 1.16], [0.06, 1.25], [0.13, 1.32], [0.175, 1.47], [0.13, 1.62], [0.001, 1.69]];
  var pinGeo = new T.LatheGeometry(pinPts.map(function (p) { return new T.Vector2(p[0], p[1]); }), 7);
  var seed = 7; function rnd() { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; }
  var people = [];
  (function () {
    var x, z, k, j;
    /* standing on the floor: close to the stage, thinner toward the back */
    for (x = -A0; x <= A0; x += 0.98) for (z = -14; z <= B0; z += 0.98) {
      var px = x + (rnd() - 0.5) * 0.7, pz = z + (rnd() - 0.5) * 0.7;
      var ex = Math.pow(Math.abs(px) / (A0 - 0.7), EXP) + Math.pow(Math.abs(pz) / (B0 - 0.7), EXP);
      var keep = rnd() < Math.max(0.22, Math.min(1, 1.12 - (pz + 18) / 50));
      if (ex > 1 || !keep) continue;
      if (Math.abs(px) < 11.7 && pz < -13.3) continue;                 /* main deck */
      if (Math.abs(px) < 2.3 && pz < -1.3) continue;                   /* thrust */
      if (Math.abs(px) < 4.7 && pz > -2.7 && pz < 4.7) continue;        /* b-stage */
      if (Math.abs(px) < 5.7 && pz > 16.9 && pz < 24.3) continue;       /* foh */
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
    s.uniforms.uT = uni.uT; s.uniforms.uAmp = uni.uAmp; s.uniforms.uBlue = uni.uBlue; s.uniforms.uGlow = uni.uGlow;
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
    s.fragmentShader = 'uniform vec3 uBlue; uniform float uGlow; varying float vW;\n' + s.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n  diffuseColor.rgb = mix(diffuseColor.rgb, uBlue, clamp(vW, 0.0, 1.0) * 0.92);').replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n  totalEmissiveRadiance += uBlue * clamp(vW, 0.0, 1.0) * uGlow * 1.6;');
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

  /* ---------- the show: band, instruments and backline, carried over from the venue twin ---------- */
  const V = (x, y, z) => new T.Vector3(x, y, z), lin = h => new T.Color(h).convertSRGBToLinear();
  const std = (hex, r, m) => new T.MeshStandardMaterial({ color: lin(hex), roughness: r, metalness: m || 0 });
  const M = {
    black: std(0x161616, 0.6), inst: std(0x242424, 0.5), shell: std(0x2e2e2e, 0.35, 0.2), metal: std(0x8c8c8c, 0.32, 0.75),
    keys: std(0xb4b4b4, 0.4), cab: std(0x151515, 0.8), grille: std(0x2a2a2a, 1), body: std(0xcfcdc8, 0.38), dark: std(0x151515, 0.45, 0.2),
    glow: new T.MeshBasicMaterial({ color: lin(0x26282b) }),
    actGlow: new T.MeshBasicMaterial({ color: lin(0x1434b8) }), antGlow: new T.MeshBasicMaterial({ color: lin(0x2e9be6) }), linkGlow: new T.MeshBasicMaterial({ color: lin(0x6cc0ff) })
  };
  const instEdge = new T.LineBasicMaterial({ color: lin(0x1c1c1c) });
  const obox = (w, h, d, mat, x, y, z, ry) => { const m = mesh(new T.BoxGeometry(w, h, d), mat, x, y, z); if (ry) m.rotation.y = ry; return m; };

  /* backline and risers */
  obox(3.4, 0.5, 2.8, M.black, -5, DECK + 0.25, -22.4, 0.25);      /* drum riser */
  obox(3, 0.4, 2.4, M.black, 5.2, DECK + 0.2, -22.3, -0.3);        /* keys riser */
  const WEDGE = (function () { const sh = new T.Shape(); sh.moveTo(-0.25, 0); sh.lineTo(0.25, 0); sh.lineTo(0.25, 0.36); sh.lineTo(-0.25, 0.1); sh.closePath();
    return new T.ExtrudeGeometry(sh, { depth: 0.7, bevelEnabled: false }).rotateY(-Math.PI / 2).translate(0.35, 0, 0); })();
  const wedge = (x, z, ry) => { const m = mesh(WEDGE, M.cab, x, DECK, z); m.rotation.y = ry; return m; };
  [-8.1, 8.1].forEach(x => wedge(x, -16.4, x < 0 ? 0.4 : -0.4));
  [-9.6, -8.4, 8.4, 9.6].forEach(x => obox(0.9, 1.6, 0.7, M.black, x, DECK + 0.8, -24.8));
  [-6, -2.2, 2.2, 6].forEach((x, i) => wedge(x, -14.55, i < 2 ? 0.2 : -0.2));
  [-0.95, 0.95].forEach(x => wedge(x, 3.45, x < 0 ? 0.25 : -0.25));    /* the vocalist's pair on the b-stage */

  function oLathe(pts, seg, sz) { const g = new T.LatheGeometry(pts.map(([r, y]) => new T.Vector2(r, y)), seg); g.scale(1, 1, sz); return g; }
  /* limbs are capsules hanging from their joint: rounded at both ends, so a bent elbow or knee closes without a gap */
  const LIMB = (r0, r1, len, s) => { const p = []; for (let i = 0; i <= 5; i++) { const a = i / 5 * Math.PI / 2; p.push([r1 * Math.sin(a), -len - r1 * Math.cos(a)]); } for (let i = 0; i <= 5; i++) { const a = i / 5 * Math.PI / 2; p.push([r0 * Math.cos(a), r0 * Math.sin(a)]); } p[p.length - 1][0] = 0.0001; p[0][0] = 0.0001; return oLathe(p, s || 12, 1); };
  const PG = {
    thigh: LIMB(0.07, 0.06, 0.43), shin: LIMB(0.058, 0.05, 0.41), thighB: LIMB(0.09, 0.084, 0.43), shinB: LIMB(0.083, 0.088, 0.41),
    pelvis: new T.CylinderGeometry(0.148, 0.156, 0.2, 16).scale(1, 1, 0.68),
    shoe: new T.SphereGeometry(1, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.062, 0.075, 0.14), sole: new T.BoxGeometry(0.124, 0.032, 0.3),
    torso: {
      hoodie: oLathe([[0.001, -0.09], [0.188, -0.09], [0.195, -0.02], [0.186, 0.06], [0.178, 0.18], [0.188, 0.36], [0.208, 0.5], [0.202, 0.57], [0.14, 0.63], [0.06, 0.655], [0.001, 0.66]], 18, 0.68),
      bomber: oLathe([[0.001, -0.02], [0.158, -0.02], [0.166, 0.04], [0.17, 0.2], [0.19, 0.38], [0.212, 0.5], [0.206, 0.57], [0.14, 0.625], [0.055, 0.65], [0.001, 0.655]], 18, 0.66),
      tee: oLathe([[0.001, 0], [0.134, 0], [0.14, 0.06], [0.136, 0.22], [0.15, 0.4], [0.178, 0.52], [0.172, 0.58], [0.12, 0.62], [0.05, 0.64], [0.001, 0.645]], 18, 0.62)
    },
    hood: new T.SphereGeometry(0.13, 16, 6, 0, Math.PI * 2, 0, Math.PI * 0.62).scale(1.08, 0.72, 0.86),
    hem: new T.CylinderGeometry(0.172, 0.166, 0.07, 18).scale(1, 1, 0.68), cord: new T.CylinderGeometry(0.005, 0.005, 0.16, 4), strip: new T.BoxGeometry(0.075, 0.44, 0.012),
    neck: new T.CylinderGeometry(0.042, 0.048, 0.12, 10), head: new T.SphereGeometry(0.108, 20, 14).scale(0.93, 1.1, 1),
    crown: new T.SphereGeometry(0.115, 20, 6, 0, Math.PI * 2, 0, Math.PI / 2), brim: new T.CylinderGeometry(0.092, 0.092, 0.012, 20).scale(1, 1, 1.25), fold: new T.CylinderGeometry(0.118, 0.118, 0.045, 20),
    upper: { hoodie: LIMB(0.064, 0.056, 0.31), bomber: LIMB(0.066, 0.058, 0.31), tee: LIMB(0.06, 0.055, 0.15) },
    fore: { hoodie: LIMB(0.054, 0.047, 0.29), bomber: LIMB(0.055, 0.048, 0.29), tee: null },
    armSkin: LIMB(0.04, 0.036, 0.31, 8), foreSkin: LIMB(0.037, 0.031, 0.3, 8), cuff: new T.CylinderGeometry(0.05, 0.05, 0.04, 10),
    hand: new T.SphereGeometry(0.046, 10, 8).scale(0.82, 1.15, 0.62), palm: new T.SphereGeometry(0.05, 12, 8).scale(0.95, 1.25, 0.5),
    nose: new T.SphereGeometry(0.02, 8, 6).scale(0.8, 1, 1), ear: new T.SphereGeometry(0.024, 8, 6).scale(0.5, 1, 0.8),
    band: new T.TorusGeometry(0.13, 0.013, 6, 24, Math.PI), cup: new T.CylinderGeometry(0.052, 0.052, 0.04, 16).rotateZ(Math.PI / 2),
    chain: new T.TorusGeometry(0.1, 0.007, 6, 28)
  };
  /* a stylised figure facing +z, dressed from a palette w {top, bottom, shoe, skin, hat, inner}
     o: top hoodie|bomber|tee, hat cap|capb|beanie, baggy, phones true|'half', chain, girth, lean, twist, nod, look, tilt, wide, sit
     arms are [left, right] as [forward, elbow, outward] in radians */
  function person(parent, w, o) {
    const top = o.top || 'tee', gi = o.girth || 1, wide = o.wide || 0.04;
    const g = new T.Group(); g.position.set(o.x || 0, o.y || 0, o.z || 0); g.rotation.y = o.ry || 0;
    const put = (geo, p, mat, x, y, z, rx, ry, rz) => { const m = new T.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); m.rotation.set(rx || 0, ry || 0, rz || 0); m.castShadow = true; m.receiveShadow = true; p.add(m); return m; };
    const hipY = o.sit ? 0.48 : 0.87;
    put(PG.pelvis, g, w.bottom, 0, hipY - 0.02, 0).scale.set(gi, 1, gi);
    [-1, 1].forEach(s => {
      const hip = new T.Group(); hip.position.set(s * 0.09 * gi, hipY, 0); g.add(hip); put(o.baggy ? PG.thighB : PG.thigh, hip, w.bottom);
      const knee = new T.Group(); knee.position.y = -0.43; hip.add(knee); put(o.baggy ? PG.shinB : PG.shin, knee, w.bottom);
      put(PG.shoe, knee, w.shoe, 0, -0.41, 0.045); put(PG.sole, knee, w.sole || w.shoe, 0, -0.425, 0.045);
      if (o.sit) { hip.rotation.set(-1.45, 0, s * 0.16); knee.rotation.x = 1.45; }
      else if (o.legs) { const [hz, hx, kx] = o.legs[s > 0 ? 0 : 1]; hip.rotation.set(hx, 0, s * hz); knee.rotation.set(kx, s * 0.22, -s * hz * 0.5); }
      else { hip.rotation.z = s * wide; knee.rotation.set(0, s * 0.2, -s * wide * 0.6); }
      (g.userData.legs || (g.userData.legs = [])).push({ hip, knee, hx: hip.rotation.x, kx: knee.rotation.x });
    });
    const torso = new T.Group(); torso.position.y = hipY; torso.rotation.set(o.lean || 0, o.twist || 0, o.lilt || 0); g.add(torso);
    put(PG.torso[top], torso, w.top).scale.set(gi, 1, gi);
    if (top === 'hoodie') { put(PG.hood, torso, w.top, 0, 0.6, -0.075 * gi, -0.35); [-1, 1].forEach(s => put(PG.cord, torso, w.inner, s * 0.035, 0.52, 0.13 * gi, -0.12)); }
    if (top === 'bomber') { put(PG.hem, torso, w.bottom, 0, 0, 0).scale.set(gi, 1, gi); put(PG.strip, torso, w.inner, 0, 0.34, 0.125 * gi, 0.06); }
    if (o.chain) put(PG.chain, torso, M.metal, 0, 0.6, 0.035, 1.25).scale.set(1, 0.82, 1);
    put(PG.neck, torso, w.skin, 0, 0.68, 0.01);
    const hd = new T.Group(); hd.position.set(0, 0.79, 0.02); hd.rotation.set(o.nod || 0, o.look || 0, o.tilt || 0); torso.add(hd);
    put(PG.head, hd, w.skin); put(PG.nose, hd, w.skin, 0, -0.005, 0.104); [-1, 1].forEach(s => put(PG.ear, hd, w.skin, s * 0.1, 0, 0));
    if (o.hat === 'cap' || o.hat === 'capb') { const f = o.hat === 'cap' ? 1 : -1; put(PG.crown, hd, w.hat, 0, 0.025, 0).scale.set(1, 0.9, 1.05); put(PG.brim, hd, w.hat, 0, 0.035, f * 0.1, f * 0.12); }
    if (o.hat === 'beanie') { put(PG.crown, hd, w.hat, 0, 0.01, 0).scale.set(1.02, 1.28, 1.03); put(PG.fold, hd, w.hat, 0, 0.03, 0); }
    if (o.phones) {                                             /* 'half': one cup on the ear, the other pushed back */
      const ph = new T.Group(); hd.add(ph); if (o.phones === 'half') { ph.rotation.y = -0.45; ph.position.z = -0.05; }
      put(PG.band, ph, w.gear || M.inst); [-1, 1].forEach(s => put(PG.cup, ph, w.gear || M.inst, s * 0.125, -0.01, 0));
    }
    const arms = [];
    (o.arms || [[0.08, 0.12, 0.06], [0.08, 0.12, 0.06]]).forEach(([sh, el, sz, tw], i) => {   /* tw: forearm turned about the upper arm */
      const s = i ? -1 : 1;
      const sp = new T.Group(); sp.position.set(s * 0.2 * gi, 0.55, 0); sp.rotation.set(-sh, 0, s * sz); torso.add(sp);
      put(PG.upper[top], sp, w.top); if (top === 'tee') put(PG.armSkin, sp, w.skin);
      const eb = new T.Group(); eb.position.y = -0.3; eb.rotation.set(-el, tw || 0, 0, 'YXZ'); sp.add(eb);
      if (PG.fore[top]) { put(PG.fore[top], eb, w.top); put(PG.cuff, eb, w.top, 0, -0.27, 0); } else put(PG.foreSkin, eb, w.skin);
      put(o.open === i ? PG.palm : PG.hand, eb, w.skin, 0, -0.33, 0);
      arms.push(sp);
    });
    g.userData.torso = torso; g.userData.arms = arms; g.userData.head = hd;
    parent.add(g); return g;
  }
  const showRoot = new T.Group(); scene.add(showRoot);
  /* idle motion: a slow sway every bar and a small nod on the beat; one arm can talk, or strike on the beat */
  const BPM = 88, MOVERS = [];
  function mover(g, amt, arm, gest, hit) { const t = g.userData.torso, a = arm == null ? null : g.userData.arms[arm]; return { g, t, rx: t.rotation.x, rz: t.rotation.z, ph: Math.random() * 0.8, amt, a, ax: a ? a.rotation.x : 0, az: a ? a.rotation.z : 0, gest, hit, ry: g.rotation.y, ty: t.rotation.y }; }
  const dance = (g, amt) => { MOVERS.push(mover(g, amt)); return g; };
  function moveOne(m, b) {
    m.t.rotation.z = m.rz + Math.sin(b * 0.25 + m.ph) * 0.035 * m.amt;
    m.t.rotation.x = m.rx + (0.5 + 0.5 * Math.sin(b * 0.5 + m.ph)) * 0.035 * m.amt;
    if (m.hit) { m.a.rotation.x = m.ax + Math.pow(0.5 + 0.5 * Math.cos(b), 4) * 0.55; return; }   /* the stick comes down on the beat */
    if (m.a) m.a.rotation.z = m.az + Math.sin(b * 0.25 + m.ph + 1) * 0.12;
    if (m.gest) {                                               /* talking hand and a small bounce in the knees */
      m.a.rotation.x = m.ax + Math.sin(b * 0.5 + m.ph) * 0.24;
      const dip = 0.5 + 0.5 * Math.sin(b * 0.5 + m.ph);
      (m.g.userData.legs || []).forEach(l => { l.hip.rotation.x = l.hx - dip * 0.07; l.knee.rotation.x = l.kx + dip * 0.14; });
      m.g.position.y = -dip * 0.012;
      m.t.rotation.y = m.ty + Math.sin(b * 0.25 + m.ph) * 0.07;
      m.g.rotation.y = m.ry + Math.sin(b * 0.125 + m.ph) * 0.08;
    }
  }
  /* what the band wears: neutral greys only */
  const wear = (hex, r) => std(hex, r || 0.86);
  const WR = { ink: wear(0x1f1f1f), coal: wear(0x2f2f2f), slate: wear(0x4a4a4a), ash: wear(0x9a9a9a), bone: wear(0xd0cec9, 0.8), white: wear(0xe6e6e4, 0.7),
    skin1: wear(0xa29d98, 0.7), skin2: wear(0x86807a, 0.7), skin3: wear(0xbcb6b0, 0.7) };
  const ACT_DEV = V(0, 0, 0);                                     /* the all act show device, beside the dj's decks */
  const collars = [];                                             /* where the signal lines land on each player */
  const cyl = (r, h, s) => new T.CylinderGeometry(r, r, h, s || 20), bx = (w, h, d) => new T.BoxGeometry(w, h, d);
  const cym = r => new T.CylinderGeometry(0.022, r, 0.026, 28);
  function mk(geo, mat, p, x, y, z, rx, ry, rz, edges) {
    const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx || 0, ry || 0, rz || 0); m.castShadow = true; m.receiveShadow = true;
    if (edges) m.add(new T.LineSegments(new T.EdgesGeometry(geo, 30), instEdge));
    p.add(m); return m;
  }
  function at(x, y, z, ry) { const g = new T.Group(); g.position.set(x, y, z); g.rotation.y = ry || 0; showRoot.add(g); return g; }
  function stand(p, x, z, h) { mk(cyl(0.012, h, 6), M.metal, p, x, h / 2, z); mk(cyl(0.15, 0.015, 12), M.inst, p, x, 0.008, z); }
  function collar(g, y) { g.updateMatrixWorld(true); collars.push(g.localToWorld(V(0, y, 0.1))); return g; }
  const sources = [];                                             /* mics and instruments, where link picks the signal up */
  function src(o, x, y, z) { o.updateMatrixWorld(true); sources.push(o.localToWorld(V(x, y, z))); }
  const stick = a => mk(cyl(0.009, 0.42, 6), M.keys, a.children.find(c => c.isGroup), 0, -0.35, 0.16, 1.25, 0, 0);

  /* drums on the riser, upstage left: the drummer mid-hit, right stick up */
  (function () {
    const g = at(-5, DECK + 0.5, -22.4, 0.25);
    mk(cyl(0.19, 0.48, 14), M.inst, g, 0, 0.24, -0.04);
    const dr = person(g, { top: WR.bone, bottom: WR.coal, shoe: WR.white, skin: WR.skin2, hat: WR.ink, inner: WR.ink }, { sit: true, top: 'tee', hat: 'capb', girth: 1.15, lean: 0.16, look: -0.12, arms: [[1.75, 1.6, 0.35], [0.5, 1.15, -0.2]] });
    dr.userData.arms.forEach(stick); collar(dr, 1.02); MOVERS.push(mover(dr, 0.6, 0, false, true));
    mk(cyl(0.28, 0.42), M.shell, g, 0, 0.29, 0.8, Math.PI / 2, 0, 0, true);           /* kick, with a pale front head */
    mk(cyl(0.262, 0.01), M.keys, g, 0, 0.29, 1.016, Math.PI / 2, 0, 0);
    mk(cyl(0.17, 0.14), M.shell, g, -0.18, 0.62, 0.46, 0.15, 0, 0, true);           /* snare */
    mk(cyl(0.13, 0.17), M.shell, g, 0.17, 0.9, 0.68, 0.45, 0, 0, true);             /* rack toms */
    mk(cyl(0.14, 0.18), M.shell, g, -0.17, 0.9, 0.68, 0.45, 0, 0, true);
    mk(cyl(0.2, 0.36), M.shell, g, 0.55, 0.42, 0.36, 0, 0, 0, true);                /* floor tom */
    stand(g, -0.18, 0.46, 0.55); src(g, -0.18, 0.7, 0.46);
    stand(g, -0.6, 0.3, 0.95); mk(cym(0.18), M.metal, g, -0.6, 0.95, 0.3); mk(cym(0.18), M.metal, g, -0.6, 0.985, 0.3, Math.PI, 0, 0);   /* hi-hat */
    [[-0.5, 1.42, 0.85, 0.23, 0.2], [0.62, 1.22, 0.74, 0.27, -0.14]].forEach(([x, y, z, r, t]) => { stand(g, x, z, y); mk(cym(r), M.metal, g, x, y, z, t, 0, 0); });   /* crash, ride */
  })();
  /* keys on the riser, upstage right: leaning in, both hands down */
  const keyTex = (function () {
    const c = document.createElement('canvas'); c.width = 512; c.height = 64; const g = c.getContext('2d'), n = 36, w = 512 / n;
    g.fillStyle = '#d6d6d4'; g.fillRect(0, 0, 512, 64); g.fillStyle = '#4a4a4a'; for (let i = 1; i < n; i++) g.fillRect(Math.round(i * w), 0, 1, 64);
    g.fillStyle = '#141414'; for (let i = 0; i < n - 1; i++) { const k = i % 7; if (k === 2 || k === 6) continue; g.fillRect(Math.round((i + 1) * w - w * 0.3), 0, Math.round(w * 0.6), 38); }
    const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t;
  })();
  M.keyTop = new T.MeshStandardMaterial({ map: keyTex, roughness: 0.45 });
  (function () {
    const g = at(5.2, DECK + 0.4, -22.3, -0.3);
    collar(dance(person(g, { top: WR.slate, bottom: WR.ink, shoe: WR.bone, skin: WR.skin1, hat: WR.bone, inner: WR.ash }, { top: 'hoodie', hat: 'beanie', lean: 0.3, nod: 0.22, look: 0.1, wide: 0.07, girth: 0.95, arms: [[0.25, 1.2, 0.1], [0.3, 1.15, 0]] }), 0.8), 1.4);
    [-0.42, 0.42].forEach(x => [-0.6, 0.6].forEach(r => mk(bx(0.035, 0.98, 0.035), M.metal, g, x, 0.42, 0.5, 0, 0, r)));
    mk(bx(1.25, 0.09, 0.36), M.inst, g, 0, 0.86, 0.5, 0, 0, 0, true);
    mk(new T.PlaneGeometry(1.12, 0.15).rotateX(-Math.PI / 2), M.keyTop, g, 0, 0.906, 0.43);
    mk(bx(1.05, 0.07, 0.3), M.inst, g, 0, 1.13, 0.68, -0.3, 0, 0, true);
    mk(new T.PlaneGeometry(0.95, 0.12).rotateX(-Math.PI / 2), M.keyTop, g, 0, 1.168, 0.62, -0.3, 0, 0); src(g, 0, 0.95, 0.5);
  })();
  /* bass and guitar, low slung, each with an amp behind */
  function strings(x, z, ry, neck, ax, az, bass) {
    const g = at(x, DECK, z, ry);
    const p = bass ? person(g, { top: WR.ink, bottom: WR.slate, shoe: WR.white, skin: WR.skin3, hat: WR.ink, inner: WR.bone }, { top: 'bomber', hat: 'cap', wide: 0.1, lean: 0.05, look: 0.25, nod: 0.12, girth: 1.08, arms: [[0.65, 0.05, 0.75], [0.3, 0.2, -0.25]] })
                   : person(g, { top: WR.ash, bottom: WR.ink, shoe: WR.ink, skin: WR.skin1, hat: WR.coal, inner: WR.coal }, { top: 'tee', baggy: true, wide: 0.08, lean: 0.03, look: -0.2, tilt: 0.1, girth: 0.92, arms: [[0.65, 0.05, 0.75], [0.3, 0.2, -0.25]] });
    collar(dance(p, 1), 1.4);
    const ins = new T.Group(); ins.position.set(-0.04, 0.86, 0.2); ins.rotation.z = 0.3; g.add(ins);
    const bm = bass ? M.shell : M.body, r0 = bass ? 0.19 : 0.17, r1 = bass ? 0.145 : 0.125;
    mk(cyl(r0, 0.06, 28), bm, ins, -0.08, 0, 0, Math.PI / 2, 0, 0, true);           /* lower and upper bout */
    mk(cyl(r1, 0.06, 28), bm, ins, 0.12, 0.025, 0, Math.PI / 2, 0, 0, true);
    mk(bx(0.12, 0.1, 0.012), bass ? M.keys : M.inst, ins, -0.06, -0.06, 0.034, 0, 0, 0.2);
    mk(bx(neck, 0.048, 0.03), M.inst, ins, 0.24 + neck / 2, 0, 0.01);
    mk(bx(0.17, 0.075, 0.026), M.inst, ins, 0.24 + neck + 0.085, 0, 0.01); src(ins, -0.08, 0, 0.05);
    const a = at(ax, DECK, az, -ry * 0.6);
    const w = bass ? 0.75 : 0.66, h = bass ? 1.1 : 0.52, y = bass ? 0.55 : 0.42;
    mk(bx(w, h, bass ? 0.5 : 0.3), M.cab, a, 0, y, 0, 0, 0, 0, true);
    mk(bx(w - 0.08, h - 0.1, 0.01), M.grille, a, 0, y, (bass ? 0.25 : 0.15) + 0.006);
    if (bass) mk(bx(0.75, 0.24, 0.42), M.inst, a, 0, 1.22, -0.02, 0, 0, 0, true); else mk(bx(0.5, 0.16, 0.3), M.inst, a, 0, 0.08, 0);
  }
  strings(-8.2, -18.2, 0.4, 0.85, -9.1, -21.6, true);
  strings(8.2, -18.2, -0.4, 0.6, 9.1, -21.6, false);
  /* dj upstage centre on a low riser: headphones half on, one hand on the deck; the all act show device sits beside the decks */
  obox(3.4, 0.4, 2.4, M.black, 0, DECK + 0.2, -21.4);
  (function () {
    const g = at(0, DECK + 0.4, -21.4, 0);
    collar(dance(person(g, { top: WR.coal, bottom: WR.ink, shoe: WR.white, skin: WR.skin2, hat: WR.ink, inner: WR.bone, gear: M.inst }, { z: -0.45, top: 'bomber', phones: 'half', lean: 0.16, look: -0.28, tilt: 0.1, girth: 1.05, arms: [[2.1, 2.4, 0.6], [0.85, 0, 0.65]] }), 0.9), 1.4);
    mk(bx(2.3, 0.9, 0.7), M.inst, g, 0, 0.45, 0, 0, 0, 0, true);
    mk(bx(2.4, 0.04, 0.8), M.inst, g, 0, 0.92, 0, 0, 0, 0, true);
    [-0.66, 0.66].forEach(x => {                                   /* decks: platter, spindle, tone arm */
      mk(bx(0.48, 0.07, 0.38), M.inst, g, x, 0.975, 0); mk(cyl(0.15, 0.012, 32), M.metal, g, x - 0.03, 1.016, 0);
      mk(cyl(0.012, 0.03, 8), M.keys, g, x - 0.03, 1.03, 0); mk(bx(0.018, 0.014, 0.22), M.metal, g, x + 0.17, 1.025, -0.02, 0, 0.35, 0);
    });
    mk(bx(0.32, 0.08, 0.38), M.inst, g, 0, 0.98, 0);                /* mixer: knobs and faders */
    for (let i = 0; i < 4; i++) { mk(bx(0.014, 0.014, 0.07), M.keys, g, -0.1 + i * 0.066, 1.027, 0.09); for (let j = 0; j < 3; j++) mk(cyl(0.013, 0.02, 8), M.keys, g, -0.1 + i * 0.066, 1.03, -0.12 + j * 0.055); }
    mk(bx(0.3, 0.012, 0.22), M.shell, g, 0, 1.09, -0.27, 0.3, 0, 0); mk(bx(0.3, 0.2, 0.01), M.shell, g, 0, 1.2, -0.39, -0.25, 0, 0);   /* laptop */
    mk(bx(0.34, 0.05, 0.22), M.shell, g, 1.02, 0.965, -0.18, 0, -0.3, 0);
    mk(bx(0.26, 0.012, 0.012), M.actGlow, g, 1.02 + 0.11 * Math.sin(-0.3), 0.965, -0.18 + 0.11 * Math.cos(-0.3), 0, -0.3, 0);
    g.updateMatrixWorld(true); ACT_DEV.copy(g.localToWorld(V(1.02, 1.0, -0.18)));
  })();
  /* lead vocalist on the b-stage: handheld mic at the mouth, free hand talking, leaning in */
  const vo = {};
  (function () {
    const g = at(0, DECK, 1.2, 0);
    const pg = person(g, { top: WR.bone, bottom: WR.ink, shoe: WR.white, skin: WR.skin2, hat: WR.ink, inner: WR.ash }, { top: 'hoodie', hat: 'cap', baggy: true, chain: true, girth: 1.12, lean: -0.05, twist: -0.22, lilt: 0.04, tilt: 0.1, nod: -0.08, look: -0.12, legs: [[0.03, 0, 0], [0.2, -0.14, 0.12]], open: 0, arms: [[2.3, 0.3, 0.65], [1.1, 2.1, 0.5, 1.0]] });
    const tor = pg.userData.torso, eb = pg.userData.arms[1].children.find(c => c.isGroup);
    pg.updateMatrixWorld(true);
    const hand = tor.worldToLocal(eb.localToWorld(V(0, -0.33, 0))), mouth = V(-0.03, 0.77, 0.25), dir = mouth.clone().sub(hand).normalize();
    const start = hand.clone().addScaledVector(dir, -0.06), len = start.distanceTo(mouth) - 0.035;
    const body = new T.Mesh(new T.CylinderGeometry(0.017, 0.013, len, 10), M.inst);
    body.position.copy(start).addScaledVector(dir, len / 2); body.quaternion.setFromUnitVectors(V(0, 1, 0), dir);
    const head = new T.Mesh(new T.SphereGeometry(0.034, 14, 10), M.metal); head.position.copy(mouth).addScaledVector(dir, -0.034);
    [body, head].forEach(m => { m.castShadow = true; tor.add(m); });
    vo.mic = head; vo.ear = new T.Object3D(); vo.ear.position.set(0.1, 0.79, 0.02); tor.add(vo.ear);
    MOVERS.push(mover(pg, 1.3, 0, true));
  })();

  /* front of house: the riser, two desks with their screens, and antiphon's one device on the desk */
  var FZ = 20.6;
  box(10, 0.6, 6, 0, 0.3, FZ);
  obox(7.2, 0.85, 0.9, M.black, 0.4, 0.6 + 0.425, FZ - 0.6);
  obox(5.6, 0.85, 0.9, M.black, 0.4, 0.6 + 0.425, FZ + 1.6);
  [[-2.2, -0.9], [0, -0.9], [2.6, -0.9], [-1.4, 1.3], [1.8, 1.3]].forEach(([x, dz]) => {
    obox(0.9, 0.04, 0.5, M.black, x, 1.47, FZ + dz + 0.1);
    const s = mesh(new T.PlaneGeometry(0.7, 0.4), M.glow, x, 1.72, FZ + dz - 0.1, false); s.rotation.x = -0.25;
  });
  const FOHP = V(0.6, 0.6 + 0.97, FZ - 0.6);
  (function () {
    const g = at(0.6, 0.6, FZ - 0.6, 0), top = 0.85;
    mk(bx(0.46, 0.11, 0.24), M.dark, g, 0, top + 0.055, 0, 0, 0, 0, true);
    mk(new T.CylinderGeometry(0.055, 0.055, 0.014, 24), M.metal, g, -0.12, top + 0.117, 0);
    mk(new T.CylinderGeometry(0.055, 0.055, 0.014, 24), M.metal, g, 0.12, top + 0.117, 0);
    mk(bx(0.05, 0.012, 0.012), M.antGlow, g, 0, top + 0.07, 0.122);
  })();

  /* ---------- all link, as in the venue twin: two quiet points at the downstage corners, and short streaks of light
     between each device and its nearest tower; quiet by default, dense in link's own section ---------- */
  const towers = [V(-9.6, DECK + 3.2, -14.4), V(9.6, DECK + 3.2, -14.4)];
  towers.forEach(p => { mesh(bx(0.05, 3.05, 0.05), M.dark, p.x, DECK + 1.525, p.z); mesh(new T.OctahedronGeometry(0.2, 0), M.linkGlow, p.x, p.y, p.z, false); });
  const LK = { speed: 170, burst: 2, gap: 0.04, r: 0.026, slots: 5 };
  const lkMat = new T.MeshBasicMaterial({ color: lin(0x6cc0ff).multiplyScalar(1.1), transparent: true, opacity: 0.85, blending: T.AdditiveBlending, depthWrite: false });
  const lkGeo = new T.CylinderGeometry(1, 0.12, 1, 6, 1).rotateX(Math.PI / 2).translate(0, 0, -0.5);   /* head at 0, tail at -1 */
  const lkRoutes = [], LK_MAX = ((collars.length + sources.length + 4) * 2 + 2) * LK.slots * LK.burst;
  const lkMesh = new T.InstancedMesh(lkGeo, lkMat, LK_MAX); lkMesh.frustumCulled = false;
  lkMesh.instanceMatrix.setUsage(T.DynamicDrawUsage); scene.add(lkMesh);
  for (let i = 0; i < LK_MAX; i++) lkMesh.setColorAt(i, new T.Color().setScalar(1 - (i % LK.burst) * 0.28));
  const _d = new T.Object3D(), _h = V(0, 0, 0), _t = V(0, 0, 0), _dir = V(0, 0, 0), _w = V(0, 0, 0);
  let lkSeed = 0, linkH = 0;
  function lkRoute(list, a, b, main) { const r = lkRoutes[list.n] || (lkRoutes[list.n] = { a: V(0, 0, 0), b: V(0, 0, 0), period: 0.95 + ((lkSeed++ * 0.618) % 1) * 0.4, phase: (lkSeed * 0.377) % 1 }); r.a.copy(a); r.b.copy(b); r.main = !!main; list.n++; }
  /* every path runs through the two link towers: device -> nearest tower -> device, both ways */
  function viaTower(list, p, main) { const w = p.distanceTo(towers[0]) <= p.distanceTo(towers[1]) ? towers[0] : towers[1]; lkRoute(list, p, w, main); lkRoute(list, w, p, main); }
  function updateLink(t) {
    const list = { n: 0 };
    vo.mic.getWorldPosition(_w); viaTower(list, _w, true);            /* the vocalist's handheld mic */
    vo.ear.getWorldPosition(_w); viaTower(list, _w, false);           /* and in-ears */
    viaTower(list, ACT_DEV, true);                                    /* the show device by the decks */
    viaTower(list, FOHP, true);                                       /* foh */
    collars.forEach(c => viaTower(list, _w.copy(c).setY(c.y + 0.22), false));   /* each player's in-ears */
    sources.forEach(c => viaTower(list, c, false));                   /* instruments */
    lkRoute(list, towers[0], towers[1], true); lkRoute(list, towers[1], towers[0], true);   /* tower to tower */
    const h = linkH, slots = 1 + Math.round(h * (LK.slots - 1));
    let k = 0;
    for (let i = 0; i < list.n; i++) {
      const r = lkRoutes[i]; if (!r.main && h < 0.3) continue;
      const len = r.a.distanceTo(r.b), travel = Math.max(0.09, len / LK.speed), L = Math.min(0.8, len * 0.12);
      _dir.subVectors(r.b, r.a).normalize();
      for (let s2 = 0; s2 < slots; s2++) {
        const tc = ((t + r.phase * r.period + s2 * r.period / slots) % r.period);
        for (let j = 0; j < LK.burst; j++, k++) {
          const tk = tc - j * LK.gap, head = Math.min(len, tk / travel * len), tail = Math.max(0, tk / travel * len - L);
          if (tk < 0 || tail >= len) { _d.scale.set(0, 0, 0); _d.position.set(0, -99, 0); }
          else {
            _h.copy(r.a).addScaledVector(_dir, head);
            _d.position.copy(_h); _d.lookAt(_t.copy(_h).add(_dir)); _d.scale.set(LK.r, LK.r, Math.max(0.001, head - tail));
          }
          _d.updateMatrix(); lkMesh.setMatrixAt(k, _d.matrix);
        }
      }
    }
    lkMesh.count = k; lkMesh.instanceMatrix.needsUpdate = true;
  }

  /* ---------- the three marks, each standing over its own thing ---------- */
  function tile(draw) {
    var c = document.createElement('canvas'); c.width = c.height = 256; var g = c.getContext('2d'), k = 2.56, r = 22.5 * k;
    g.fillStyle = '#000'; g.beginPath(); g.moveTo(r, 0); g.arcTo(256, 0, 256, 256, r); g.arcTo(256, 256, 0, 256, r); g.arcTo(0, 256, 0, 0, r); g.arcTo(0, 0, 256, 0, r); g.closePath(); g.fill();
    g.lineWidth = 5; g.strokeStyle = 'rgba(255,255,255,.42)'; g.stroke();
    g.fillStyle = g.strokeStyle = '#fff'; g.scale(k, k); draw(g);
    var t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.anisotropy = 4; return t;
  }
  function disc(g, x, y, r) { g.beginPath(); g.arc(x, y, r, 0, 6.2832); g.fill(); }
  function ring(g, r) { g.lineWidth = 5.5; g.beginPath(); g.arc(50, 50, r, 0, 6.2832); g.stroke(); }
  var marks = [
    { at: V(ACT_DEV.x, ACT_DEV.y + 0.06, ACT_DEV.z), top: ACT_DEV.y + 1.9, tex: tile(function (g) { disc(g, 50, 50, 20); }) },
    { at: V(-9.6, DECK + 3.45, -14.4), top: 7.4, tex: tile(function (g) { disc(g, 29, 50, 11); disc(g, 71, 50, 11); g.fillRect(29, 46.5, 42, 7); }) },
    { at: V(0.6, 1.75, FZ - 0.6), top: 4.6, tex: tile(function (g) { disc(g, 50, 50, 9); ring(g, 18.25); ring(g, 30.25); }) }
  ];
  marks.forEach(function (m) {
    var h = m.top - m.at.y;
    mesh(new T.CylinderGeometry(0.02, 0.02, h, 5), ink, m.at.x, m.at.y + h / 2, m.at.z, false);
    m.sprite = new T.Sprite(new T.SpriteMaterial({ map: m.tex, transparent: true, depthWrite: false }));
    m.sprite.position.set(m.at.x, m.top, m.at.z); m.sprite.center.set(0.5, 0); m.o = 1; scene.add(m.sprite);
  });

  /* ---------- camera: one framing per section ---------- */
  var D = Math.PI / 180;
  var shots = [
    { t: [0, 2, 1],         az: 38 * D,    el: 30 * D,   d: 318 },    /* the whole model on the table */
    { t: [-1.2, 4.3, -6],   az: 19.8 * D,  el: 7.5 * D,  d: 28 },   /* all act: front three-quarter from the crowd, as in the twin (mirrored, so the words sit on open floor) */
    { t: [0, 3.0, -10],     az: 63.4 * D,  el: 19.7 * D, d: 58 },     /* all link: along the stage, as in the twin */
    { t: [0, 0, 1.5],       az: 0,         el: 79 * D,   d: 330 },    /* all antiphon: plan */
    { t: [0, 2, 0],         az: -34 * D,   el: 24 * D,   d: 440 }     /* stepping back */
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
    goal.el += Math.sin(u * Math.PI) * (i === 0 ? 0.22 : i === 1 ? 0.16 : i === 2 ? 0.1 : 0);
  }
  var v = new T.Vector3(), last = 0, time = 0, started = false, isDark = false;
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    if (!reduce) time += dt;
    aim();
    var k = reduce || !cur ? 1 : 1 - Math.exp(-dt * 5.5);
    if (!cur) cur = { t: goal.t.slice(), az: goal.az, el: goal.el, ld: goal.ld };
    for (var j = 0; j < 3; j++) cur.t[j] += (goal.t[j] - cur.t[j]) * k;
    cur.az += (goal.az - cur.az) * k; cur.el += (goal.el - cur.el) * k; cur.ld += (goal.ld - cur.ld) * k;
    sx += (px - sx) * 0.05; sy += (py - sy) * 0.05;
    var near = Math.max(0, Math.min(1, 1.5 - Math.abs(f - 1.5))), sway = 1 - near * 0.75;
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
    /* house lights down for the show, up again at the end */
    var kd = Math.min(1, Math.max(0, (f - 0.22) / 0.5)) * (1 - Math.min(1, Math.max(0, (f - 3.3) / 0.5))); kd = kd * kd * (3 - 2 * kd); kd = 0.8 + 0.2 * kd;   /* one tone throughout; the stage only comes up a little as you arrive */
    showK += (kd - showK) * (reduce ? 1 : 0.1);
    hemi.intensity = 0.57 + (0.085 - 0.57) * showK; key.intensity = 0.6 + (0.1 - 0.6) * showK;
    for (var li = 0; li < lights.length; li++) lights[li].intensity = lights[li].userData.full * showK;
    shaftMat.uniforms.uK.value = showK; uni.uGlow.value = showK;
        /* the band keeps time; link runs quiet, and dense in its own section */
    if (!reduce) { var beat = time * BPM / 60 * Math.PI * 2; for (var q = 0; q < MOVERS.length; q++) moveOne(MOVERS[q], beat); }
    linkH += (Math.max(0, Math.min(1, 1.6 - Math.abs(f - 2) * 2)) - linkH) * (reduce ? 1 : 0.08);
    updateLink(reduce ? 0.31 : time);
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
