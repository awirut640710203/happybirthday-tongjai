/* ══════════════════════════════════════════════════════════════
   ✦ GALAXY GALLERY ✦
   A 3D love-galaxy built with Three.js.

   Scene anatomy (matching the reference):
     · deep starfield dome
     · tilted spiral galaxy disc of ~90k particles
     · golden accretion disc + black-hole core
     · magenta particle beam rising from the core
     · a billboarded particle heart floating above
     · glowing love-phrases lying flat on the galaxy plane
     · 12 numbered memory hearts ringing the disc rim, rimmed in rose light
       (tap to enlarge; drop 01.png … 12.png into photos/)
     · cinematic auto-orbit camera + drag / pinch controls
     · confetti burst transition from the intro card
   ══════════════════════════════════════════════════════════════ */

import * as THREE from 'three';

/* ───────────────────────── CONFIG ───────────────────────── */

const CONFIG = {
    introArt: '../assets/photos/gif2.gif',

    phrases: [
        'MI CORAZÓN ES TUYO',
        'AMOR ETERNO ✦',
        'INFINITO ∞',
        'CONTIGO SIEMPRE',
        'TE AMO ♥'
    ],

    /* Numbered locket frames orbiting the disc.
       Drop your artwork in  galaxy-gallery/photos/  named  01.png … 12.png
       (any extension in `exts` works). A slot with no file on disk shows a
       numbered placeholder card, so the layout is always complete and you can
       fill the numbers in one at a time. */
    photos: {
        count: 12,
        dir: 'photos/',
        exts: ['png', 'jpg', 'webp', 'gif'],

        // world size of a card (texture is 512×600, same 0.85 ratio)
        cardW: 8.0,
        cardH: 9.4,

        // One wide garland just outside the disc rim rather than two nested
        // rings: nested rings project onto the same screen band and collide.
        // `wave` lifts every other card, so the row zigzags like a necklace
        // and neighbours never overlap even edge-on.
        rings: [
            { count: 12, radius: 64, height: 7.5, wave: 6.0, spin: 0.042, phase: 0.30 }
        ],

        // optional per-number caption, e.g. { 1: 'Su sonrisa' }
        captions: {}
    },

    galaxy: {
        count: 120000,
        radius: 68,

        // structure — concentric elliptical rings rather than spiral arms,
        // so the disc reads as a clean oval instead of an "S"
        ringCount: 7,
        ringInner: 12,
        ringWidth: 1.9,       // gaussian thickness of each ring
        ringFraction: 0.76,   // rest is smooth dust filling between the rings
        bulgeFraction: 0.10,  // spheroidal core population
        bulgeRadius: 8,
        thickness: 0.7,       // disc scale height

        // palette — soft and dusty rather than neon
        coreColor:  '#fff3dd',
        innerColor: '#ffcf9b',
        midColor:   '#f5a0c0',
        outerColor: '#8f9fdb'
    },

    heart: {
        count: 13000,
        scale: 1.02,          // overall size of the heart
        height: 37,           // pivot height above the galaxy plane
        color: '#ff2fd0',
        rimColor: '#ff9bec',

        auraCount: 3200,      // soft halo of particles around the outline
        sparkCount: 260,      // twinkling motes orbiting the heart
        emberCount: 16        // little hearts drifting upward
    }
};

/* ───────────────────────── BOOT ───────────────────────── */

const canvas = document.querySelector('#scene');
const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance'
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor(0x04020a, 1);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x06030e, 0.0042);

const camera = new THREE.PerspectiveCamera(
    58, window.innerWidth / window.innerHeight, 0.1, 900
);
scene.add(camera);

/* ───────────────────── shared sprite texture ───────────────────── */

function makeDotTexture(size = 128) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    // a wide, gentle falloff — overlapping points then blend into soft dust
    grd.addColorStop(0.0,  'rgba(255,255,255,1)');
    grd.addColorStop(0.14, 'rgba(255,255,255,0.72)');
    grd.addColorStop(0.36, 'rgba(255,255,255,0.24)');
    grd.addColorStop(0.65, 'rgba(255,255,255,0.06)');
    grd.addColorStop(1.0,  'rgba(255,255,255,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, size, size);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
}

const DOT = makeDotTexture();

/* ───────────────────── particle shader material ───────────────────── */

function particleMaterial(extraUniforms = {}) {
    return new THREE.ShaderMaterial({
        uniforms: {
            uTex:      { value: DOT },
            uProgress: { value: 0 },
            uOpacity:  { value: 1 },
            uTime:     { value: 0 },
            uPixel:    { value: renderer.getPixelRatio() },
            // Height fade, used by the beam to dissolve into the heart instead
            // of ending on a hard edge. Defaults are far above any geometry, so
            // smoothstep returns 0 and the fade is a no-op for every other system.
            uFadeY0:   { value: 1e8 },
            uFadeY1:   { value: 1e9 },
            ...extraUniforms
        },
        vertexShader: /* glsl */`
            attribute float aSize;
            attribute vec3  aColor;
            attribute float aSeed;
            uniform float uProgress;
            uniform float uTime;
            uniform float uPixel;
            uniform float uFadeY0;
            uniform float uFadeY1;
            varying vec3  vColor;
            varying float vTwinkle;

            void main() {
                vColor = aColor;
                vTwinkle = 0.65 + 0.35 * sin(uTime * 2.2 + aSeed * 90.0);
                vTwinkle *= 1.0 - smoothstep(uFadeY0, uFadeY1, position.y);

                vec3 p = position * uProgress;
                vec4 mv = modelViewMatrix * vec4(p, 1.0);
                gl_PointSize = aSize * uPixel * (240.0 / max(-mv.z, 0.001));
                gl_Position = projectionMatrix * mv;
            }
        `,
        fragmentShader: /* glsl */`
            uniform sampler2D uTex;
            uniform float uOpacity;
            varying vec3  vColor;
            varying float vTwinkle;

            void main() {
                float a = texture2D(uTex, gl_PointCoord).a;
                if (a < 0.01) discard;
                gl_FragColor = vec4(vColor * vTwinkle, a * uOpacity * vTwinkle);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
}

/* ───────────────────── 1. starfield dome ───────────────────── */

function buildStars() {
    const N = 2600;
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const siz = new Float32Array(N);
    const seed = new Float32Array(N);
    const c = new THREE.Color();

    for (let i = 0; i < N; i++) {
        // uniform points on a large sphere shell
        const u = Math.random() * 2 - 1;
        const th = Math.random() * Math.PI * 2;
        const r = 300 + Math.random() * 260;
        const s = Math.sqrt(1 - u * u);
        pos[i * 3    ] = r * s * Math.cos(th);
        pos[i * 3 + 1] = r * u * 0.75;
        pos[i * 3 + 2] = r * s * Math.sin(th);

        const pick = Math.random();
        if (pick < 0.72)      c.setHSL(0.72, 0.15, 0.86);   // near-white
        else if (pick < 0.9)  c.setHSL(0.88, 0.55, 0.78);   // pink
        else                  c.setHSL(0.6,  0.6,  0.76);   // blue
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;

        siz[i] = 0.7 + Math.random() * 2.1;
        seed[i] = Math.random();
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aColor',   new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aSize',    new THREE.BufferAttribute(siz, 1));
    geo.setAttribute('aSeed',    new THREE.BufferAttribute(seed, 1));

    const mat = particleMaterial();
    mat.uniforms.uProgress.value = 1;
    mat.uniforms.uOpacity.value = 0.85;

    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    scene.add(pts);
    return { pts, mat };
}

/* ───────────────────── 2. spiral galaxy disc ───────────────────── */

// standard normal, via Box–Muller
function gauss() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function buildGalaxy() {
    const P = CONFIG.galaxy;
    const N = P.count;
    const pos  = new Float32Array(N * 3);
    const col  = new Float32Array(N * 3);
    const siz  = new Float32Array(N);
    const seed = new Float32Array(N);

    const cCore  = new THREE.Color(P.coreColor);
    const cInner = new THREE.Color(P.innerColor);
    const cMid   = new THREE.Color(P.midColor);
    const cOuter = new THREE.Color(P.outerColor);
    const cBlue  = new THREE.Color('#cfe0ff');
    const c      = new THREE.Color();

    const scaleLength = P.radius / 2.45;  // exponential disc falloff

    for (let i = 0; i < N; i++) {
        const i3 = i * 3;

        let x, y, z, r, isRing = false, isBulge = false;

        if (Math.random() < P.bulgeFraction) {
            /* ── spheroidal bulge: a soft ball of old, warm stars ── */
            isBulge = true;
            r = Math.pow(Math.random(), 2.1) * P.bulgeRadius;
            const u = Math.random() * 2 - 1;
            const th = Math.random() * Math.PI * 2;
            const s = Math.sqrt(1 - u * u);
            x = r * s * Math.cos(th);
            y = r * u * 0.55;
            z = r * s * Math.sin(th);
        } else {
            /* ── disc ── */
            isRing = Math.random() < P.ringFraction;

            if (isRing) {
                // concentric rings, each a soft gaussian band. Spacing widens
                // slightly outward so the rings feel natural, not mechanical.
                const k = i % P.ringCount;
                const u = (k + 0.5) / P.ringCount;
                const rk = P.ringInner + Math.pow(u, 1.15) * (P.radius - P.ringInner);
                r = rk + gauss() * P.ringWidth * (0.7 + u * 0.9);
            } else {
                // smooth dust fills the gaps so the rings never look like
                // hard concentric stripes
                r = -scaleLength * Math.log(1 - Math.random() * 0.988);
                if (r > P.radius) r = P.radius * (0.85 + Math.random() * 0.15);
            }

            const theta = Math.random() * Math.PI * 2;

            if (r < 0.5) r = 0.5;

            // scale height: puffy near the core, thin at the rim
            const h = P.thickness * (0.55 + 4.2 * Math.exp(-r / 7));
            x = Math.cos(theta) * r;
            y = gauss() * h;
            z = Math.sin(theta) * r;
        }

        pos[i3] = x; pos[i3 + 1] = y; pos[i3 + 2] = z;

        /* ── colour: warm core → rose → dusty periwinkle rim ── */
        const t = Math.min(1, r / P.radius);
        if (t < 0.14)      c.copy(cCore).lerp(cInner, t / 0.14);
        else if (t < 0.44) c.copy(cInner).lerp(cMid, (t - 0.14) / 0.30);
        else               c.copy(cMid).lerp(cOuter, (t - 0.44) / 0.56);

        // young blue-white stars trace the rings; bulge skews warm
        if (isRing && Math.random() < 0.10) c.lerp(cBlue, 0.55);
        if (isBulge) c.lerp(cCore, 0.35);

        // scatter the hue a little per particle so no colour band clumps up
        c.offsetHSL((Math.random() - 0.5) * 0.05, (Math.random() - 0.5) * 0.18, 0);

        /* ── per-particle brightness ──
           Most particles are faint. With additive blending this is what turns
           a mass of points into soft luminous dust instead of a solid slab. */
        let bright;
        if (isBulge)     bright = 0.34 + Math.pow(Math.random(), 2.0) * 0.55;
        else if (isRing) bright = 0.55 + Math.pow(Math.random(), 2.0) * 1.30;
        else             bright = 0.12 + Math.pow(Math.random(), 3.2) * 0.40;

        // only a whisper of rim falloff — the exponential disc already thins
        // outward, and crushing it further hides the outer arms entirely
        bright *= 1 - Math.pow(t, 3.0) * 0.15;

        col[i3] = c.r * bright; col[i3 + 1] = c.g * bright; col[i3 + 2] = c.b * bright;

        /* ── size: fine dust, with a sparse scatter of brighter stars ── */
        let s = 0.42 + Math.pow(Math.random(), 2.2) * 1.0;
        if (Math.random() < 0.015) s += 1.4;         // occasional bright star
        if (isBulge) s *= 0.82;
        siz[i]  = s;
        seed[i] = Math.random();
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aColor',   new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aSize',    new THREE.BufferAttribute(siz, 1));
    geo.setAttribute('aSeed',    new THREE.BufferAttribute(seed, 1));

    const mat = particleMaterial();
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    scene.add(pts);
    return { pts, mat };
}

/* ───────────────────── 3. accretion disc + black hole ───────────────────── */

function buildCore() {
    const group = new THREE.Group();

    // black-hole sphere
    const hole = new THREE.Mesh(
        new THREE.SphereGeometry(3.1, 48, 48),
        new THREE.MeshBasicMaterial({ color: 0x000000 })
    );
    group.add(hole);

    // golden speckled accretion disc
    const N = 11000;
    const pos  = new Float32Array(N * 3);
    const col  = new Float32Array(N * 3);
    const siz  = new Float32Array(N);
    const seed = new Float32Array(N);
    const c = new THREE.Color();

    for (let i = 0; i < N; i++) {
        const i3 = i * 3;
        const t = Math.pow(Math.random(), 0.8);
        const radius = 3.3 + t * 8.4;
        const ang = Math.random() * Math.PI * 2;

        pos[i3    ] = Math.cos(ang) * radius;
        pos[i3 + 1] = gauss() * 0.22 * (1 + t);
        pos[i3 + 2] = Math.sin(ang) * radius;

        // white-gold inside → amber outside
        c.setHSL(0.13 - t * 0.05, 0.9, 0.84 - t * 0.26);

        // brightest at the inner edge, dissolving outward into the disc
        const bright = (0.9 - Math.pow(t, 1.3) * 0.72) * (0.35 + Math.pow(Math.random(), 2.2) * 0.9);
        col[i3] = c.r * bright; col[i3 + 1] = c.g * bright; col[i3 + 2] = c.b * bright;

        siz[i]  = 0.4 + Math.pow(Math.random(), 2.2) * 1.15;
        seed[i] = Math.random();
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aColor',   new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aSize',    new THREE.BufferAttribute(siz, 1));
    geo.setAttribute('aSeed',    new THREE.BufferAttribute(seed, 1));

    const mat = particleMaterial();
    const disc = new THREE.Points(geo, mat);
    disc.frustumCulled = false;
    group.add(disc);

    // warm halo glow behind the core
    const glowTex = (() => {
        const s = 256, cv = document.createElement('canvas');
        cv.width = cv.height = s;
        const g = cv.getContext('2d');
        const grd = g.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2);
        grd.addColorStop(0,    'rgba(255,240,205,0.5)');
        grd.addColorStop(0.18, 'rgba(255,205,150,0.26)');
        grd.addColorStop(0.45, 'rgba(255,150,120,0.10)');
        grd.addColorStop(1,    'rgba(220,120,140,0)');
        g.fillStyle = grd; g.fillRect(0, 0, s, s);
        const t = new THREE.CanvasTexture(cv);
        t.colorSpace = THREE.SRGBColorSpace;
        return t;
    })();

    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: glowTex, blending: THREE.AdditiveBlending,
        depthWrite: false, transparent: true, opacity: 0.5
    }));
    glow.scale.set(30, 30, 1);
    group.add(glow);

    scene.add(group);
    return { group, disc, mat, glow };
}

/* ───────────────────── 4. particle heart ───────────────────── */

function heartCurve(t) {
    // classic parametric heart
    const a = t * Math.PI * 2;
    return {
        x: 16 * Math.pow(Math.sin(a), 3),
        y: 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)
    };
}

/* Arc-length lookup for the heart outline.
   Sampling the parametric curve by `t` bunches particles at the tip and the
   lobes; walking it by arc length instead spreads them evenly. */
const HEART_LUT = (() => {
    const M = 3000;
    const pts = new Array(M + 1);
    const cum = new Float64Array(M + 1);
    for (let i = 0; i <= M; i++) pts[i] = heartCurve(i / M);
    for (let i = 1; i <= M; i++) {
        const dx = pts[i].x - pts[i - 1].x;
        const dy = pts[i].y - pts[i - 1].y;
        cum[i] = cum[i - 1] + Math.hypot(dx, dy);
    }
    return { pts, cum, total: cum[M], M };
})();

function heartAtArcLength(s) {
    const target = s * HEART_LUT.total;
    let lo = 0, hi = HEART_LUT.M;
    while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (HEART_LUT.cum[mid] < target) lo = mid + 1; else hi = mid;
    }
    return HEART_LUT.pts[lo];
}

/* A real "lub-dub" beat: two gaussian thumps per cycle rather than a sine. */
function heartbeatPulse(time) {
    const period = 1.25;
    const t = (time % period) / period;
    const thump = (x, c, w) => Math.exp(-((x - c) / w) * ((x - c) / w));
    return thump(t, 0.10, 0.052) + thump(t, 0.28, 0.046) * 0.62;
}

/* Filled heart glyph, used for the glow halo and the drifting embers. */
function makeHeartGlyphTexture(size = 256) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const g = cv.getContext('2d');
    g.translate(size / 2, size * 0.54);
    const s = size / 42;

    g.beginPath();
    for (let i = 0; i <= 160; i++) {
        const p = heartCurve(i / 160);
        const x = p.x * s, y = -p.y * s;      // canvas Y points down
        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.closePath();

    const grd = g.createRadialGradient(0, 0, 0, 0, 0, size / 2);
    grd.addColorStop(0.0, 'rgba(255,215,248,1)');
    grd.addColorStop(0.55, 'rgba(255,110,225,0.75)');
    grd.addColorStop(1.0, 'rgba(230,40,180,0.25)');
    g.fillStyle = grd;
    g.shadowColor = 'rgba(255,90,215,0.95)';
    g.shadowBlur = size * 0.1;
    g.fill();

    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
}

const HEART_GLYPH = makeHeartGlyphTexture();

/* Formless radial bloom. Using the heart glyph here instead would just paint a
   second, solid heart silhouette behind the particles. */
function makeSoftGlowTexture(size = 256) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const g = cv.getContext('2d');
    const grd = g.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    grd.addColorStop(0.0,  'rgba(255,170,235,0.55)');
    grd.addColorStop(0.28, 'rgba(255,90,210,0.22)');
    grd.addColorStop(0.6,  'rgba(200,60,190,0.07)');
    grd.addColorStop(1.0,  'rgba(160,40,170,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, size, size);
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
}

const HEART_GLOW = makeSoftGlowTexture();

/* Soft halo of particles hugging the outline — gives the heart depth and
   lets it breathe with the beat without thickening the crisp rim. */
function buildHeartAura(P) {
    const N = P.auraCount;
    const pos  = new Float32Array(N * 3);
    const col  = new Float32Array(N * 3);
    const siz  = new Float32Array(N);
    const seed = new Float32Array(N);
    const c = new THREE.Color();

    for (let i = 0; i < N; i++) {
        const i3 = i * 3;
        const pt = heartAtArcLength(Math.random());
        // sits just outside the rim, fading outward
        const r = 1.0 + Math.pow(Math.random(), 1.6) * 0.42;

        pos[i3    ] = pt.x * r * P.scale + gauss() * 0.55;
        pos[i3 + 1] = pt.y * r * P.scale + gauss() * 0.55;
        pos[i3 + 2] = gauss() * 1.6;

        c.set(P.rimColor).offsetHSL((Math.random() - 0.5) * 0.08, 0, 0);
        const fade = 1 - (r - 1.0) / 0.42;                 // dimmer further out
        const bright = (0.10 + Math.pow(Math.random(), 2.6) * 0.35) * fade;
        col[i3] = c.r * bright; col[i3 + 1] = c.g * bright; col[i3 + 2] = c.b * bright;

        siz[i]  = 0.55 + Math.pow(Math.random(), 2.0) * 1.1;
        seed[i] = Math.random();
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aColor',   new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aSize',    new THREE.BufferAttribute(siz, 1));
    geo.setAttribute('aSeed',    new THREE.BufferAttribute(seed, 1));

    const mat = particleMaterial();
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    return { pts, mat };
}

/* Twinkling motes that orbit the heart in 3D. */
function buildHeartSparks(P) {
    const N = P.sparkCount;
    const pos  = new Float32Array(N * 3);
    const col  = new Float32Array(N * 3);
    const siz  = new Float32Array(N);
    const seed = new Float32Array(N);
    const c = new THREE.Color();

    const orbit = [];
    for (let i = 0; i < N; i++) {
        const i3 = i * 3;
        const a  = Math.random() * Math.PI * 2;
        const rad = 9 + Math.random() * 12;
        const yy  = gauss() * 7;

        orbit.push({
            angle: a,
            radius: rad,
            y: yy,
            speed: (0.16 + Math.random() * 0.3) * (Math.random() < 0.5 ? 1 : -1),
            bob: Math.random() * Math.PI * 2
        });

        pos[i3] = Math.cos(a) * rad; pos[i3 + 1] = yy; pos[i3 + 2] = Math.sin(a) * rad;

        c.set(Math.random() < 0.4 ? '#ffffff' : P.rimColor);
        const bright = 0.5 + Math.pow(Math.random(), 1.6) * 0.9;
        col[i3] = c.r * bright; col[i3 + 1] = c.g * bright; col[i3 + 2] = c.b * bright;

        siz[i]  = 0.8 + Math.random() * 1.5;
        seed[i] = Math.random();
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aColor',   new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aSize',    new THREE.BufferAttribute(siz, 1));
    geo.setAttribute('aSeed',    new THREE.BufferAttribute(seed, 1));

    const mat = particleMaterial();
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    return { pts, mat, geo, orbit };
}

/* Little hearts that drift up past the big one and fade out. */
function buildHeartEmbers(P) {
    const list = [];
    for (let i = 0; i < P.emberCount; i++) {
        const mat = new THREE.SpriteMaterial({
            map: HEART_GLYPH,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            transparent: true,
            opacity: 0
        });
        const sp = new THREE.Sprite(mat);
        list.push({
            sprite: sp,
            reset() {
                this.angle = Math.random() * Math.PI * 2;
                this.radius = 4 + Math.random() * 14;
                this.y = -14 - Math.random() * 8;
                this.speed = 3.0 + Math.random() * 3.8;
                this.size = 0.85 + Math.random() * 1.5;
                this.life = 1;
                this.spin = (Math.random() - 0.5) * 0.6;
            }
        });
        list[i].reset();
        list[i].y = -14 + Math.random() * 34;   // stagger the first cycle
    }
    return list;
}

function buildHeart() {
    const P = CONFIG.heart;
    const N = P.count;
    const pos  = new Float32Array(N * 3);
    const col  = new Float32Array(N * 3);
    const siz  = new Float32Array(N);
    const seed = new Float32Array(N);

    const cCore = new THREE.Color(P.color);
    const cRim  = new THREE.Color(P.rimColor);
    const c = new THREE.Color();

    for (let i = 0; i < N; i++) {
        const i3 = i * 3;
        // even spacing along the outline — no clumping at the tip or lobes
        const pt = heartAtArcLength(Math.random());

        // a slim rim band with a light inner veil, so the heart reads thin
        const onRim = Math.random() < 0.74;
        const r = onRim
            ? 0.965 + gauss() * 0.028
            : Math.pow(Math.random(), 0.45) * 0.93;

        const jitter = onRim ? 0.22 : 0.34;
        pos[i3    ] = pt.x * r * P.scale + gauss() * jitter;
        pos[i3 + 1] = pt.y * r * P.scale + gauss() * jitter;
        pos[i3 + 2] = gauss() * (onRim ? 0.5 : 1.0);

        c.copy(onRim ? cRim : cCore).lerp(cRim, Math.random() * 0.45);
        // spread the pink across a range instead of one saturated tone
        c.offsetHSL((Math.random() - 0.5) * 0.06, (Math.random() - 0.5) * 0.22, 0);

        const bright = onRim
            ? 0.55 + Math.pow(Math.random(), 1.8) * 0.7
            : 0.20 + Math.pow(Math.random(), 2.4) * 0.45;
        col[i3] = c.r * bright; col[i3 + 1] = c.g * bright; col[i3 + 2] = c.b * bright;

        siz[i]  = (onRim ? 1.05 : 0.8) * (0.45 + Math.pow(Math.random(), 1.8) * 0.9);
        seed[i] = Math.random();
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aColor',   new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aSize',    new THREE.BufferAttribute(siz, 1));
    geo.setAttribute('aSeed',    new THREE.BufferAttribute(seed, 1));

    const mat = particleMaterial();
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;

    const pivot = new THREE.Group();      // billboards around Y
    pivot.position.y = P.height;
    scene.add(pivot);

    // ── glow halo behind the outline ──
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({
        map: HEART_GLOW,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        opacity: 0.2
    }));
    const glowSize = 40 * P.scale;
    glow.scale.set(glowSize, glowSize, 1);
    glow.position.y = -1.0 * P.scale;
    pivot.add(glow);

    const aura   = buildHeartAura(P);
    const sparks = buildHeartSparks(P);
    pivot.add(aura.pts);
    pivot.add(sparks.pts);
    pivot.add(pts);                        // crisp rim drawn last

    const embers = buildHeartEmbers(P);
    embers.forEach(e => pivot.add(e.sprite));

    return { pivot, pts, mat, glow, aura, sparks, embers };
}

/* ───────────────────── 5. beam from core to heart ───────────────────── */

/* How far the heart's bottom tip hangs below its pivot, in world units.
   The parametric curve reaches y = -17 at its tip; rim particles sit at
   r ≈ 0.98 of that. The beam must stop here, not at the pivot, or it ends
   up floating inside the heart with a visible break under the cleft. */
const HEART_TIP_DROP = 17 * 0.98 * CONFIG.heart.scale;
const BEAM_OVERLAP = 6.0;   // reach up into the heart's belly, not just its tip

/* Radius of the column at height fraction k (0 = core, 1 = top).
   A plain taper pinches to a point and reads as an abrupt cut where it meets
   the heart. This tapers up the stem, then flares back open like a funnel so
   the stream widens into the heart's lower V and the join flows. */
function beamRadiusProfile(k) {
    const stem  = 3.0 * Math.pow(1 - k, 0.85) + 0.5;
    const f     = Math.max(0, (k - 0.62) / 0.38);
    const flare = Math.pow(f, 1.7) * 3.1;
    return stem + flare;
}

function beamTopFor(pivotY) {
    return pivotY - HEART_TIP_DROP + BEAM_OVERLAP;
}

function buildBeam() {
    const N = 5600;
    const pos  = new Float32Array(N * 3);
    const col  = new Float32Array(N * 3);
    const siz  = new Float32Array(N);
    const seed = new Float32Array(N);
    const c = new THREE.Color();
    const top = beamTopFor(CONFIG.heart.height);

    const speeds = new Float32Array(N);
    const radii  = new Float32Array(N);   // per-particle multiplier on the profile
    const angs   = new Float32Array(N);

    for (let i = 0; i < N; i++) {
        const i3 = i * 3;
        // slight bias toward the base: dense at the root, spraying open above
        const y = top * Math.pow(Math.random(), 1.18);
        const k = y / top;

        // particles sit anywhere across the column, denser toward its axis
        const radScale = 0.25 + Math.pow(Math.random(), 0.7) * 0.85;
        const rad = beamRadiusProfile(k) * radScale;
        const ang = Math.random() * Math.PI * 2;

        radii[i] = radScale; angs[i] = ang;
        speeds[i] = 5 + Math.random() * 11;

        pos[i3] = Math.cos(ang) * rad;
        pos[i3 + 1] = y;
        pos[i3 + 2] = Math.sin(ang) * rad;

        c.setHSL(0.86 + Math.random() * 0.05, 0.95, 0.6 + Math.random() * 0.22);
        col[i3] = c.r; col[i3 + 1] = c.g; col[i3 + 2] = c.b;

        siz[i]  = 0.7 + Math.random() * 1.5;
        seed[i] = Math.random();
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aColor',   new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aSize',    new THREE.BufferAttribute(siz, 1));
    geo.setAttribute('aSeed',    new THREE.BufferAttribute(seed, 1));

    const mat = particleMaterial();
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false;
    scene.add(pts);

    return { pts, mat, geo, speeds, radii, angs, top };
}

/* ───────────────────── 6. flat glowing phrases ───────────────────── */

function makeTextTexture(text) {
    const pad = 40;
    const fontSize = 92;
    const measure = document.createElement('canvas').getContext('2d');
    measure.font = `600 ${fontSize}px Jost, Helvetica, Arial, sans-serif`;

    // manual letter-spacing
    const spacing = fontSize * 0.16;
    const chars = [...text];
    const width = chars.reduce((w, ch) => w + measure.measureText(ch).width + spacing, 0);

    const cv = document.createElement('canvas');
    cv.width  = Math.ceil(width + pad * 2);
    cv.height = Math.ceil(fontSize * 2.1);
    const g = cv.getContext('2d');

    g.font = `600 ${fontSize}px Jost, Helvetica, Arial, sans-serif`;
    g.textBaseline = 'middle';
    g.shadowColor = 'rgba(255, 90, 200, 0.95)';
    g.shadowBlur = 26;
    g.fillStyle = '#ffd7f4';

    let x = pad;
    const y = cv.height / 2;
    for (const ch of chars) {
        g.fillText(ch, x, y);
        x += measure.measureText(ch).width + spacing;
    }

    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return { texture: t, aspect: cv.width / cv.height };
}

function buildPhrases() {
    const root = new THREE.Group();
    const items = [];
    const list = CONFIG.phrases;

    // two concentric rings of phrases, offset — like the reference
    const rings = [
        { radius: 30, y: 0.6,  size: 3.4, opacity: 0.95, count: list.length },
        { radius: 52, y: 0.25, size: 5.6, opacity: 0.8,  count: list.length }
    ];

    rings.forEach((ring, ri) => {
        for (let i = 0; i < ring.count; i++) {
            const text = list[i % list.length];
            const { texture, aspect } = makeTextTexture(text);

            const h = ring.size;
            const w = h * aspect;
            const mesh = new THREE.Mesh(
                new THREE.PlaneGeometry(w, h),
                new THREE.MeshBasicMaterial({
                    map: texture,
                    transparent: true,
                    depthWrite: false,
                    blending: THREE.AdditiveBlending,
                    opacity: ring.opacity,
                    side: THREE.DoubleSide
                })
            );
            mesh.rotation.x = -Math.PI / 2;          // lie flat on the disc
            mesh.position.set(0, ring.y, -ring.radius);

            const pivot = new THREE.Group();
            pivot.rotation.y = (i / ring.count) * Math.PI * 2 + ri * 0.6;
            pivot.add(mesh);
            root.add(pivot);
            items.push({ pivot, mesh, ring: ri });
        }
    });

    scene.add(root);
    return { root, items };
}

/* ───────────────────── 7. numbered memory hearts ─────────────────────
   The same parametric heart the scene's centrepiece is drawn from, used here
   as the outline of each photo: held in a filament of rose light, with the
   slot number written beneath in hairline type. */

const CARD_TEX = { W: 512, H: 600 };

/* The curve sampled once, with its own bounding box, so the shape can be
   fitted to any rectangle without guessing its proportions. */
const HEART_SHAPE = (() => {
    const N = 512;
    const pts = [];
    let minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
    for (let i = 0; i < N; i++) {
        const a = (i / N) * Math.PI * 2;
        const s = Math.sin(a);
        const ux = 16 * s * s * s;
        const uy = 13 * Math.cos(a) - 5 * Math.cos(2 * a)
                 - 2 * Math.cos(3 * a) - Math.cos(4 * a);
        pts.push([ux, uy]);
        if (ux < minX) minX = ux;
        if (ux > maxX) maxX = ux;
        if (uy < minY) minY = uy;
        if (uy > maxY) maxY = uy;
    }
    return { pts, minX, maxX, minY, maxY, cleftU: 5, aspect: (maxX - minX) / (maxY - minY) };
})();

/* `inset` walks every point along its own inward normal rather than scaling
   the shape down, so the padding stays uniform all the way round — a scaled
   copy would pinch at the tip and gape at the lobes. */
function heartPath(g, x, y, w, h, inset = 0) {
    const S = HEART_SHAPE;
    const sx = w / (S.maxX - S.minX), sy = h / (S.maxY - S.minY);
    const P = S.pts.map(([ux, uy]) => [
        x + (ux - S.minX) * sx,
        y + (S.maxY - uy) * sy
    ]);
    const n = P.length;

    g.beginPath();
    for (let i = 0; i < n; i++) {
        let p = P[i];
        if (inset) {
            const a = P[(i - 1 + n) % n], b = P[(i + 1) % n];
            const tx = b[0] - a[0], ty = b[1] - a[1];
            const len = Math.hypot(tx, ty) || 1;
            let nx = -ty / len, ny = tx / len;
            // flip the normal so it always points into the shape
            if ((p[0] - (x + w / 2)) * nx + (p[1] - (y + h / 2)) * ny > 0) {
                nx = -nx; ny = -ny;
            }
            p = [p[0] + nx * inset, p[1] + ny * inset];
        }
        i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]);
    }
    g.closePath();
}

/* Canvas y of the cleft between the lobes, for anything hung there. */
function heartCleftY(y, h) {
    const S = HEART_SHAPE;
    return y + (S.maxY - S.cleftU) * (h / (S.maxY - S.minY));
}

/* Rim palette: mother-of-pearl through rose, with one warm stop borrowed
   from the accretion disc so the hearts belong to the same light. */
function rimGradient(g, x, y, w, h) {
    const grd = g.createLinearGradient(x, y, x + w, y + h);
    grd.addColorStop(0.00, 'rgba(255, 247, 253, 0.95)');
    grd.addColorStop(0.28, 'rgba(255, 166, 235, 0.88)');
    grd.addColorStop(0.55, 'rgba(255, 228, 190, 0.82)');
    grd.addColorStop(0.80, 'rgba(206, 148, 255, 0.80)');
    grd.addColorStop(1.00, 'rgba(255, 212, 247, 0.92)');
    return grd;
}

function fourPointStar(g, cx, cy, R, r) {
    g.beginPath();
    for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
        const rr = i % 2 ? r : R;
        const sx = cx + Math.cos(a) * rr, sy = cy + Math.sin(a) * rr;
        i ? g.lineTo(sx, sy) : g.moveTo(sx, sy);
    }
    g.closePath();
}

/* `img` may be null — the slot then shows its number on a nebula plate. */
function lockFrameTexture(img, number) {
    const { W, H } = CARD_TEX;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const g = cv.getContext('2d');

    const px = 30, py = 14;
    const pw = W - px * 2;
    // the heart keeps its own proportions; the rest of the canvas is the number
    const ph = Math.round(pw / HEART_SHAPE.aspect);
    const cx = W / 2;
    const label = String(number).padStart(2, '0');

    // ── contents, clipped to the heart ────────────────────────────
    g.save();
    heartPath(g, px, py, pw, ph);
    g.clip();

    if (img) {
        const ar = img.width / img.height;
        let dw = pw, dh = ph;
        if (ar > pw / ph) dw = ph * ar; else dh = pw / ar;
        g.drawImage(img, px + (pw - dw) / 2, py + (ph - dh) / 2, dw, dh);
    } else {
        const bg = g.createLinearGradient(px, py, px + pw, py + ph);
        // each heart takes its colour from a different part of the disc —
        // rose at 01, walking through violet to periwinkle at 12
        const hue = 322 - ((number - 1) / Math.max(1, CONFIG.photos.count - 1)) * 96;
        bg.addColorStop(0.00, `hsl(${hue + 8}, 56%, 40%)`);
        bg.addColorStop(0.50, `hsl(${hue - 6}, 52%, 19%)`);
        bg.addColorStop(1.00, `hsl(${hue - 24}, 48%, 36%)`);
        g.fillStyle = bg;
        g.fillRect(px, py, pw, ph);

        // two nebula blooms, so an empty slot still has depth
        [[0.34, 0.26, 'rgba(255, 128, 218, 0.52)'],
         [0.70, 0.72, 'rgba(160, 140, 255, 0.46)']].forEach(([u, v, col]) => {
            const rg = g.createRadialGradient(
                px + pw * u, py + ph * v, 6,
                px + pw * u, py + ph * v, pw * 0.72
            );
            rg.addColorStop(0, col);
            rg.addColorStop(1, 'rgba(0,0,0,0)');
            g.fillStyle = rg;
            g.fillRect(px, py, pw, ph);
        });

        for (let i = 0; i < 46; i++) {
            g.fillStyle = `rgba(255,232,255,${0.07 + Math.random() * 0.20})`;
            g.beginPath();
            g.arc(px + Math.random() * pw, py + Math.random() * ph,
                  0.7 + Math.random() * 1.8, 0, Math.PI * 2);
            g.fill();
        }

        // the number, ghosted onto the plate
        g.textAlign = 'center';
        g.textBaseline = 'middle';
        g.font = '400 150px Georgia, "Playfair Display", serif';
        g.shadowColor = 'rgba(255, 150, 230, 0.5)';
        g.shadowBlur = 34;
        g.fillStyle = 'rgba(255, 238, 252, 0.17)';
        g.fillText(label, cx, py + ph * 0.44);
        g.shadowBlur = 0;
        g.lineWidth = 1.8;
        g.strokeStyle = 'rgba(255, 198, 243, 0.42)';
        g.strokeText(label, cx, py + ph * 0.44);
    }

    // sink the image into the dark instead of letting it sit on top
    const vg = g.createRadialGradient(
        cx, py + ph * 0.42, pw * 0.18,
        cx, py + ph * 0.42, pw * 0.92
    );
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(16, 5, 30, 0.42)');
    g.fillStyle = vg;
    g.fillRect(px, py, pw, ph);

    // one static light streak — no flicker, as asked
    const gl = g.createLinearGradient(px, py, px + pw * 0.9, py + ph * 0.7);
    gl.addColorStop(0.00, 'rgba(255,255,255,0.15)');
    gl.addColorStop(0.34, 'rgba(255,255,255,0.02)');
    gl.addColorStop(1.00, 'rgba(255,255,255,0)');
    g.fillStyle = gl;
    g.fillRect(px, py, pw, ph);
    g.restore();

    // ── feather the edge: a blurred silhouette used as the alpha mask, so
    //    the heart dissolves into the night rather than ending on a cut ──
    g.save();
    g.globalCompositeOperation = 'destination-in';
    g.filter = 'blur(8px)';
    g.fillStyle = '#fff';
    heartPath(g, px, py, pw, ph, 3);
    g.fill();
    g.restore();

    // ── rim of light: a wide bloom, then a crisp filament on top of it, so
    //    the edge still reads as a bright thread when the heart is far away ──
    const rimHue = 322 - ((number - 1) / Math.max(1, CONFIG.photos.count - 1)) * 96;
    g.save();
    g.shadowColor = `hsla(${rimHue}, 92%, 68%, 0.95)`;
    g.shadowBlur = 34;
    g.strokeStyle = rimGradient(g, px, py, pw, ph);
    g.lineWidth = 11;
    g.globalAlpha = 0.5;
    heartPath(g, px, py, pw, ph, 5);
    g.stroke();
    g.stroke();
    g.restore();

    g.save();
    g.shadowColor = 'rgba(255, 150, 230, 0.9)';
    g.shadowBlur = 10;
    g.strokeStyle = rimGradient(g, px, py, pw, ph);
    g.lineWidth = 4.2;
    heartPath(g, px, py, pw, ph, 5);
    g.stroke();
    g.restore();

    g.strokeStyle = 'rgba(255, 246, 255, 0.28)';
    g.lineWidth = 1.4;
    heartPath(g, px, py, pw, ph, 20);
    g.stroke();

    // ── a spark caught on the gem's crown ──
    g.save();
    g.shadowColor = 'rgba(255, 176, 240, 0.95)';
    g.shadowBlur = 20;
    g.fillStyle = '#fff4fd';
    fourPointStar(g, cx, heartCleftY(py, ph) + 7, 15, 3.9);
    g.fill();
    g.restore();

    // ── the number, written beneath the gem ──
    const by = py + ph + 34;

    g.strokeStyle = 'rgba(255, 196, 240, 0.38)';
    g.lineWidth = 1.3;
    [-1, 1].forEach(s => {
        g.beginPath();
        g.moveTo(cx + s * 26, by);
        g.lineTo(cx + s * 112, by);
        g.stroke();
    });

    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.font = '18px Georgia, serif';
    g.fillStyle = 'rgba(255, 148, 224, 0.9)';
    g.fillText('♥', cx, by);

    g.save();
    g.font = '400 76px Georgia, "Playfair Display", serif';
    g.letterSpacing = '14px';
    g.shadowColor = 'rgba(255, 110, 222, 0.95)';
    g.shadowBlur = 28;
    g.fillStyle = 'rgba(255, 246, 254, 0.98)';
    g.fillText(label, cx + 7, by + 56);
    g.fillText(label, cx + 7, by + 56);
    g.restore();

    const caption = CONFIG.photos.captions[number];
    if (caption) {
        g.save();
        g.font = '400 22px Georgia, serif';
        g.letterSpacing = '5px';
        g.fillStyle = 'rgba(255, 226, 249, 0.6)';
        g.fillText(caption.toUpperCase(), cx + 2, by + 110);
        g.restore();
    }

    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return { texture: t, dataUrl: cv.toDataURL() };
}

/* Try each extension in turn; give up quietly when the slot has no file. */
function loadFirstAvailable(loader, urls, onLoad, onMissing) {
    let i = 0;
    const attempt = () => {
        if (i >= urls.length) { onMissing(); return; }
        const url = urls[i++];
        loader.load(url, (img) => onLoad(img, url), undefined, attempt);
    };
    attempt();
}

function buildFrames() {
    const P = CONFIG.photos;
    const frames = [];
    const loader = new THREE.ImageLoader();
    loader.setCrossOrigin('anonymous');

    let n = 0;
    P.rings.forEach((ring, ri) => {
        for (let k = 0; k < ring.count && n < P.count; k++, n++) {
            const number = n + 1;
            const angle = (k / ring.count) * Math.PI * 2 + ring.phase;
            // zigzag: every other card rides high, so the garland never
            // presents two frames at the same screen height side by side
            const height = ring.height + (k % 2 ? -1 : 1) * (ring.wave || 0) * 0.5;

            const placeholder = lockFrameTexture(null, number);
            const mat = new THREE.SpriteMaterial({
                map: placeholder.texture,
                transparent: true, opacity: 0, depthWrite: false
            });
            const sprite = new THREE.Sprite(mat);
            sprite.scale.set(P.cardW, P.cardH, 1);
            sprite.position.set(
                Math.cos(angle) * ring.radius, height, Math.sin(angle) * ring.radius
            );
            sprite.userData = {
                number,
                caption: P.captions[number] || `N.º ${String(number).padStart(2, '0')}`,
                src: placeholder.dataUrl
            };
            scene.add(sprite);

            // swap in the real artwork the moment one is found on disk
            const stem = `${P.dir}${String(number).padStart(2, '0')}`;
            loadFirstAvailable(
                loader,
                P.exts.map(e => `${stem}.${e}`),
                (img, url) => {
                    const built = lockFrameTexture(img, number);
                    mat.map.dispose();
                    mat.map = built.texture;
                    mat.needsUpdate = true;
                    // the lightbox shows the artwork itself, not the framed card
                    sprite.userData.src = url;
                },
                () => { /* empty slot keeps its numbered placeholder */ }
            );

            frames.push({
                sprite,
                baseAngle: angle,
                radius: ring.radius,
                height,
                // shared per-ring speed, so cards never bunch up together
                spin: ring.spin,
                ring: ri,
                bob: Math.random() * Math.PI * 2
            });
        }
    });

    return frames;
}

/* ───────────────────── build everything ───────────────────── */

const stars   = buildStars();
const galaxy  = buildGalaxy();
const core    = buildCore();
const heart   = buildHeart();
const beam    = buildBeam();
const phrases = buildPhrases();
const frames  = buildFrames();

// everything that blooms during the reveal
const bloomMats = [galaxy.mat, core.mat, heart.mat, beam.mat];
bloomMats.forEach(m => { m.uniforms.uProgress.value = 0.001; });
phrases.root.visible = false;
heart.pivot.visible = false;
beam.pts.visible = false;
frames.forEach(f => (f.sprite.visible = false));

/* ───────────────────── camera rig ───────────────────── */

const cam = {
    azimuth: 0.6,
    elevation: 0.42,      // radians above the disc plane
    distance: 130,
    targetDistance: 130,
    autoOrbit: true,
    velocity: { az: 0, el: 0 },
    dragging: false,
    lookAt: new THREE.Vector3(0, 12, 0)
};

// wide screens frame less of the disc vertically, so pull the camera in
function distanceFactor() {
    const aspect = window.innerWidth / window.innerHeight;
    return THREE.MathUtils.clamp(1.0 - (aspect - 0.5) * 0.22, 0.6, 1.0);
}

function updateCamera(dt, elapsed) {
    if (cam.autoOrbit && !cam.dragging) {
        cam.azimuth += dt * 0.085;
        // cinematic sweep: mostly a low, near-horizon angle that occasionally
        // lifts to reveal the spiral from above — as in the reference clip
        cam.elevation = 0.26 + Math.sin(elapsed * 0.10) * 0.24;
        cam.targetDistance = (148 + Math.sin(elapsed * 0.065) * 30) * distanceFactor();
    }

    // inertia from dragging
    if (!cam.dragging) {
        cam.azimuth   += cam.velocity.az;
        cam.elevation += cam.velocity.el;
        cam.velocity.az *= 0.93;
        cam.velocity.el *= 0.93;
    }

    cam.elevation = THREE.MathUtils.clamp(cam.elevation, -0.12, 1.32);
    cam.distance += (cam.targetDistance - cam.distance) * 0.06;

    const d = cam.distance;
    camera.position.set(
        Math.cos(cam.azimuth) * Math.cos(cam.elevation) * d,
        Math.sin(cam.elevation) * d + 6,
        Math.sin(cam.azimuth) * Math.cos(cam.elevation) * d
    );
    camera.lookAt(cam.lookAt);
}

/* ───────────────────── pointer controls ───────────────────── */

let pointers = new Map();
let pinchStart = 0, pinchStartDist = 0;
let lastPointer = null;
let interacted = false;

function onDown(e) {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    cam.dragging = true;
    lastPointer = { x: e.clientX, y: e.clientY };
    canvas.setPointerCapture?.(e.pointerId);

    if (!interacted) {
        interacted = true;
        document.getElementById('hudHint')?.classList.add('gone');
    }
    if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinchStartDist = Math.hypot(a.x - b.x, a.y - b.y);
        pinchStart = cam.targetDistance;
    }
}

function onMove(e) {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinchStartDist > 0) {
            cam.targetDistance = THREE.MathUtils.clamp(
                pinchStart * (pinchStartDist / dist), 26, 260
            );
        }
        return;
    }

    if (lastPointer) {
        const dx = e.clientX - lastPointer.x;
        const dy = e.clientY - lastPointer.y;
        cam.azimuth   -= dx * 0.005;
        cam.elevation += dy * 0.004;
        cam.velocity.az = -dx * 0.0016;
        cam.velocity.el =  dy * 0.0013;
        lastPointer = { x: e.clientX, y: e.clientY };
    }
}

function onUp(e) {
    pointers.delete(e.pointerId);
    if (pointers.size === 0) { cam.dragging = false; lastPointer = null; }
    if (pointers.size < 2) pinchStartDist = 0;
}

canvas.addEventListener('pointerdown', onDown);
canvas.addEventListener('pointermove', onMove);
window.addEventListener('pointerup', onUp);
window.addEventListener('pointercancel', onUp);

canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    cam.targetDistance = THREE.MathUtils.clamp(
        cam.targetDistance + e.deltaY * 0.09, 26, 260
    );
}, { passive: false });

/* ───────────────────── frame tap → lightbox ───────────────────── */

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxCap = document.getElementById('lightboxCap');

let downAt = null;
canvas.addEventListener('pointerdown', (e) => { downAt = { x: e.clientX, y: e.clientY, t: performance.now() }; });
canvas.addEventListener('pointerup', (e) => {
    if (!downAt) return;
    const moved = Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y);
    const quick = performance.now() - downAt.t < 400;
    downAt = null;
    if (moved > 8 || !quick) return;   // it was a drag, not a tap

    ndc.x =  (e.clientX / window.innerWidth)  * 2 - 1;
    ndc.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(frames.map(f => f.sprite), false);
    if (hits.length) {
        const d = hits[0].object.userData;
        lightboxImg.src = d.src;
        lightboxCap.textContent = d.caption;
        lightbox.classList.add('open');
    }
});

lightbox.addEventListener('click', () => lightbox.classList.remove('open'));

/* ───────────────────── HUD buttons ───────────────────── */

const btnOrbit = document.getElementById('btnOrbit');
const btnHeart = document.getElementById('btnHeart');
const btnHome = document.getElementById('btnHome');

let heartBeat = true;

btnOrbit.addEventListener('click', () => {
    cam.autoOrbit = !cam.autoOrbit;
    btnOrbit.classList.toggle('off', !cam.autoOrbit);
});

btnHeart.addEventListener('click', () => {
    heartBeat = !heartBeat;
    btnHeart.classList.toggle('off', !heartBeat);
});

// Returning visitors came from the wax seal on the love-letter section, so
// the candles there are marked already-lit before we leave (see the wax
// seal handler in ../script.js) — this just sends them back to that spot.
btnHome.addEventListener('click', () => {
    window.location.href = '../index.html#love-letter';
});

/* ───────────────────── confetti transition ───────────────────── */

const confettiCanvas = document.getElementById('confetti');
const cctx = confettiCanvas.getContext('2d');
let confetti = [];

function sizeConfetti() {
    confettiCanvas.width  = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
}
sizeConfetti();

/* The burst is the first thing anyone sees, so it has to be made of the same
   light as the galaxy behind it: the disc's own palette, drawn as soft
   additive motes rather than flat party dots, drifting outward in a curl
   instead of raining down. */
const MOTE_PALETTE = [
    { hex: '#ffeccb', weight: 0.13 },   // core cream
    { hex: '#ffc98f', weight: 0.15 },   // inner amber
    { hex: '#f7a4c6', weight: 0.27 },   // mid rose
    { hex: '#ff5ad9', weight: 0.24 },   // heart magenta
    { hex: '#ffa6ee', weight: 0.14 },   // heart rim
    { hex: '#ab8ee0', weight: 0.07 }    // outer rim — violet-leaning, and as sparse as on the disc
];

function rgba(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

/* Pre-rendered once per colour — building a gradient per particle per frame
   for 500 particles would cost more than the whole 3D scene. */
function makeMoteSprite(hex, withStreaks) {
    const S = 96, r = S / 2;
    const cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const g = cv.getContext('2d');

    const grd = g.createRadialGradient(r, r, 0, r, r, r);
    // only a small hot centre, or every mote reads as plain white
    grd.addColorStop(0.00, 'rgba(255,255,255,0.85)');
    grd.addColorStop(0.10, rgba(hex, 0.94));
    grd.addColorStop(0.42, rgba(hex, 0.34));
    grd.addColorStop(1.00, rgba(hex, 0));
    g.fillStyle = grd;
    g.fillRect(0, 0, S, S);

    if (withStreaks) {
        // a soft cross, so a few motes read as stars among the dust
        [[S, 5], [5, S]].forEach(([w, h]) => {
            const lg = g.createLinearGradient(
                r - w / 2, r - h / 2, r + w / 2, r + h / 2
            );
            lg.addColorStop(0.00, rgba(hex, 0));
            lg.addColorStop(0.50, 'rgba(255,255,255,0.75)');
            lg.addColorStop(1.00, rgba(hex, 0));
            g.fillStyle = lg;
            g.fillRect(r - w / 2, r - h / 2, w, h);
        });
    }

    return cv;
}

const MOTE_SPRITES = MOTE_PALETTE.map(p => ({
    plain: makeMoteSprite(p.hex, false),
    star:  makeMoteSprite(p.hex, true),
    weight: p.weight
}));

function pickMote() {
    let t = Math.random();
    for (const s of MOTE_SPRITES) {
        t -= s.weight;
        if (t <= 0) return s;
    }
    return MOTE_SPRITES[MOTE_SPRITES.length - 1];
}

function launchConfetti() {
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    confetti = [];
    for (let i = 0; i < 520; i++) {
        const ang = Math.random() * Math.PI * 2;
        const speed = (2 + Math.pow(Math.random(), 0.55) * 21) * 60;   // px per second
        const s = pickMote();
        const big = Math.random() < 0.18;                              // bokeh depth
        confetti.push({
            x: cx, y: cy,
            vx: Math.cos(ang) * speed,
            vy: Math.sin(ang) * speed,
            // the disc spins, so the burst curls rather than falling straight
            swirl: (Math.random() < 0.5 ? -1 : 1) * (0.5 + Math.random() * 0.8),
            r: big ? 16 + Math.random() * 20 : 4 + Math.random() * 11,
            dim: big ? 0.34 : 1,
            sprite: Math.random() < 0.14 ? s.star : s.plain,
            life: 1,
            decay: 0.42 + Math.random() * 0.5    // life lost per second → ~1.2-2.4s
        });
    }
}

function drawConfetti(dt) {
    cctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    if (!confetti.length) return;

    // frame-rate independent: damping and drift scaled by real elapsed time
    const damp = Math.pow(0.35, dt);

    cctx.save();
    cctx.globalCompositeOperation = 'lighter';   // light adds, like the scene

    for (let i = confetti.length - 1; i >= 0; i--) {
        const p = confetti[i];

        // curl the velocity instead of pulling it down
        const a = p.swirl * dt;
        const c = Math.cos(a), s = Math.sin(a);
        const vx = p.vx * c - p.vy * s;
        p.vy = p.vx * s + p.vy * c;
        p.vx = vx;

        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vx *= damp; p.vy *= damp;
        p.vy += 26 * dt;                  // barely any gravity — this is dust
        p.life -= p.decay * dt;
        if (p.life <= 0) { confetti.splice(i, 1); continue; }

        const fade = Math.max(0, Math.min(1, p.life));
        cctx.globalAlpha = fade * fade * p.dim;   // holds bright, then lets go
        cctx.drawImage(p.sprite, p.x - p.r, p.y - p.r, p.r * 2, p.r * 2);
    }

    cctx.restore();
}

/* ───────────────────── intro → scene ───────────────────── */

const intro = document.getElementById('intro');
const hud = document.getElementById('hud');
const introArt = document.getElementById('introArt');

// intro artwork
{
    const img = document.createElement('img');
    img.src = CONFIG.introArt;
    img.alt = '';
    img.onerror = () => { introArt.textContent = '💖'; introArt.style.fontSize = '76px'; };
    introArt.appendChild(img);
}

let revealStart = null;
let heartReveal = 0;      // 0→1 as the heart fades in; gates its effect layers

// The intro card is skipped — visitors arrive here already having chosen
// to open the gallery (from the 💖 on the birthday page), so the scene
// reveals itself immediately instead of waiting for a second "Iniciar" tap.
// (Called at the bottom of this file, once `clock` below exists.)
function startExperience() {
    intro.classList.add('hidden');
    launchConfetti();
    revealStart = clock.getElapsedTime() + 0.35;
    setTimeout(() => hud.classList.add('visible'), 900);
}

/* ───────────────────── resize ───────────────────── */

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    sizeConfetti();
    [stars.mat, galaxy.mat, core.mat, heart.mat, beam.mat]
        .forEach(m => (m.uniforms.uPixel.value = renderer.getPixelRatio()));
});

/* ───────────────────── animation loop ───────────────────── */

const clock = new THREE.Clock();
const beamPos = beam.geo.attributes.position.array;
const tmpVec = new THREE.Vector3();

function tick() {
    const rawDt = clock.getDelta();          // true wall-clock delta
    const dt = Math.min(rawDt, 0.05);        // clamped, for stable simulation
    const elapsed = clock.getElapsedTime();

    // ── reveal choreography ──────────────────────────────
    if (revealStart !== null) {
        const t = elapsed - revealStart;

        // galaxy blooms outward from the singularity
        const gp = THREE.MathUtils.clamp(t / 2.4, 0, 1);
        const gEase = 1 - Math.pow(1 - gp, 3);
        galaxy.mat.uniforms.uProgress.value = Math.max(0.001, gEase);
        core.mat.uniforms.uProgress.value   = Math.max(0.001, gEase);

        // then the beam, the heart, the phrases, the photos
        if (t > 1.5) {
            beam.pts.visible = true;
            beam.mat.uniforms.uProgress.value = 1;
            beam.mat.uniforms.uOpacity.value = THREE.MathUtils.clamp((t - 1.5) / 1.2, 0, 1);
        }
        if (t > 2.1) {
            heart.pivot.visible = true;
            const hp = THREE.MathUtils.clamp((t - 2.1) / 1.6, 0, 1);
            heart.mat.uniforms.uProgress.value = 1 - Math.pow(1 - hp, 3);
            heart.mat.uniforms.uOpacity.value = hp;
            heart.aura.mat.uniforms.uProgress.value = 1 - Math.pow(1 - hp, 3);
            heart.sparks.mat.uniforms.uProgress.value = 1;
            heartReveal = hp;
        }
        if (t > 2.6) {
            phrases.root.visible = true;
            const pp = THREE.MathUtils.clamp((t - 2.6) / 1.4, 0, 1);
            phrases.items.forEach(it => {
                it.mesh.material.opacity = pp * (it.ring === 0 ? 0.95 : 0.8);
            });
        }
        if (t > 3.0) {
            frames.forEach((f, i) => {
                f.sprite.visible = true;
                const bp = THREE.MathUtils.clamp((t - 3.0 - i * 0.11) / 0.9, 0, 1);
                // overshoot slightly, so each locket snaps into place
                const e = 1 - Math.pow(1 - bp, 3);
                f.sprite.material.opacity = bp;
                const s = 0.45 + 0.55 * e + Math.sin(bp * Math.PI) * 0.06;
                f.sprite.scale.set(CONFIG.photos.cardW * s, CONFIG.photos.cardH * s, 1);
            });
        }
    }

    // ── shader time ──────────────────────────────────────
    [stars.mat, galaxy.mat, core.mat, heart.mat, beam.mat]
        .forEach(m => (m.uniforms.uTime.value = elapsed));

    // ── rotations ────────────────────────────────────────
    galaxy.pts.rotation.y  = elapsed * 0.048;
    core.disc.rotation.y   = elapsed * 0.42;
    phrases.root.rotation.y = -elapsed * 0.026;
    stars.pts.rotation.y   = elapsed * 0.004;

    // ── heart: billboard to camera + heartbeat ───────────
    tmpVec.copy(camera.position).setY(heart.pivot.position.y);
    heart.pivot.lookAt(tmpVec);

    const pulse = heartBeat ? heartbeatPulse(elapsed) : 0;
    heart.pts.scale.setScalar(1 + pulse * 0.085);
    heart.pivot.position.y = CONFIG.heart.height + Math.sin(elapsed * 0.7) * 0.6;

    // ── heart effect layers ──────────────────────────────
    heart.aura.pts.scale.setScalar(1 + pulse * 0.17);
    heart.aura.mat.uniforms.uOpacity.value = heartReveal * (0.7 + pulse * 0.55);
    heart.aura.mat.uniforms.uTime.value = elapsed;

    heart.glow.material.opacity = heartReveal * (0.16 + pulse * 0.3);
    const gs = 40 * CONFIG.heart.scale * (1 + pulse * 0.12);
    heart.glow.scale.set(gs, gs, 1);

    // motes orbiting the heart
    const sp = heart.sparks.geo.attributes.position.array;
    heart.sparks.orbit.forEach((o, i) => {
        const i3 = i * 3;
        o.angle += o.speed * dt;
        sp[i3    ] = Math.cos(o.angle) * o.radius;
        sp[i3 + 1] = o.y + Math.sin(elapsed * 0.8 + o.bob) * 1.6;
        sp[i3 + 2] = Math.sin(o.angle) * o.radius;
    });
    heart.sparks.geo.attributes.position.needsUpdate = true;
    heart.sparks.mat.uniforms.uOpacity.value = heartReveal;
    heart.sparks.mat.uniforms.uTime.value = elapsed;

    // little hearts drifting upward past the big one
    heart.embers.forEach((e) => {
        e.y += e.speed * dt;
        e.angle += e.spin * dt;
        e.life -= dt * 0.16;
        if (e.y > 24 || e.life <= 0) e.reset();

        const fadeIn = THREE.MathUtils.clamp((e.y + 14) / 7, 0, 1);
        e.sprite.position.set(
            Math.cos(e.angle) * e.radius, e.y, Math.sin(e.angle) * e.radius
        );
        e.sprite.scale.set(e.size, e.size, 1);
        e.sprite.material.opacity =
            heartReveal * 0.45 * THREE.MathUtils.clamp(e.life, 0, 1) * fadeIn;
    });

    // ── beam: particles stream upward and recycle ────────
    // top follows the heart so the column always meets its tip
    beam.top = beamTopFor(heart.pivot.position.y);

    for (let i = 0; i < beam.speeds.length; i++) {
        const i3 = i * 3;
        beamPos[i3 + 1] += beam.speeds[i] * dt;
        if (beamPos[i3 + 1] > beam.top) beamPos[i3 + 1] -= beam.top;

        const k = beamPos[i3 + 1] / beam.top;
        const rad = beamRadiusProfile(k) * beam.radii[i];
        // swirl slows as the stream opens out, so the flare doesn't shear apart
        const ang = beam.angs[i] + elapsed * 1.4 * (1 - k * 0.6);
        beamPos[i3    ] = Math.cos(ang) * rad;
        beamPos[i3 + 2] = Math.sin(ang) * rad;
    }
    beam.geo.attributes.position.needsUpdate = true;

    // dissolve the top of the column into the heart's belly rather than
    // ending it on a hard edge
    beam.mat.uniforms.uFadeY0.value = beam.top * 0.55;
    beam.mat.uniforms.uFadeY1.value = beam.top * 1.02;

    // ── locket frames: counter-rotating orbits, bob + gentle sway ──
    frames.forEach((f) => {
        const ang = f.baseAngle + elapsed * f.spin;
        f.sprite.position.set(
            Math.cos(ang) * f.radius,
            f.height + Math.sin(elapsed * 0.75 + f.bob) * 1.7,
            Math.sin(ang) * f.radius
        );
        // a few degrees of rocking, like a pendant hanging on a chain
        f.sprite.material.rotation = Math.sin(elapsed * 0.5 + f.bob) * 0.045;
    });

    // ── camera + render ──────────────────────────────────
    updateCamera(dt, elapsed);
    renderer.render(scene, camera);
    // confetti fades on real elapsed time so the burst always clears in ~2s,
    // even if the first frames after the reveal are slow
    drawConfetti(Math.min(rawDt, 0.25));

    requestAnimationFrame(tick);
}

tick();
startExperience();
