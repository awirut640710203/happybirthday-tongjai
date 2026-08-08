/* ══════════════════════════════════════════════════════════════════════
   Flowers For You — paper-cut flower trail
   ----------------------------------------------------------------------
   Drag a finger (or the mouse) and layered paper flowers bloom along the
   path, cast a soft shadow on whatever is underneath, hold for a while,
   then come apart petal by petal and fall away.

   Everything you'd want to change lives in CONFIG.
   ══════════════════════════════════════════════════════════════════════ */

'use strict';

const CONFIG = {
    /* ── the garden ─────────────────────────────────────────────────── */
    maxFlowers: 110,          // hard ceiling; the oldest is retired first
    trailGap: [13, 34],       // px between blooms along the trail
    life: [4600, 7200],       // ms a flower holds at full bloom
    witherMs: 1500,           // ms for the petals to come apart and fall

    /* size buckets — [weight, minRadius, maxRadius] (radius in px @ 1x) */
    sizes: [
        [0.30, 9, 17],
        [0.44, 18, 33],
        [0.20, 34, 56],
        [0.06, 58, 88],
    ],

    /* ── paper stock ────────────────────────────────────────────────── */
    palette: [
        '#fff4f7', '#ffe2ea', '#ffd0dd', '#f9bccb', '#f4acb7',
        '#f09aad', '#e8798f', '#e05576', '#d62b53', '#c9184a', '#a4133c',
    ],
    cores: ['#fff0f3', '#ffe5ec', '#ffd166', '#d90429', '#c9184a'],
    shadow: 'rgba(158, 54, 90, .42)',
    shadowOffset: [0.17, 0.23],   // × flower radius, down-right

    /* ── ambience ───────────────────────────────────────────────────── */
    ambientPetals: 14,
    maxSparkles: 90,

    /* ── it draws for you when you stop ─────────────────────────────── */
    idleMs: 4200,             // quiet time before the garden draws itself
    autoDrawMs: 5200,         // how long one auto-drawn shape takes
    autoScale: 0.30,          // × min(vw, vh)
};

/* ══════════════════════════════════════════════════════════════════════
   Small helpers
   ══════════════════════════════════════════════════════════════════════ */

const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeInOutSine = (t) => 0.5 - Math.cos(Math.PI * t) / 2;
const easeOutBack = (t) => {
    const c = 1.62;
    return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
};

/* ══════════════════════════════════════════════════════════════════════
   Adaptive quality
   ----------------------------------------------------------------------
   A bloomed flower costs one blit (it gets baked), but while it is opening
   or withering every petal is stamped twice — once for the shadow pass and
   once for colour. With a hundred flowers doing that at the same moment
   that is a few thousand draw calls in a single frame, which is where an
   iPad starts to drop frames.

   So we watch the real frame time and shed the most expensive work first,
   putting it straight back when there is headroom. The thresholds have a
   wide gap between them on purpose: without that hysteresis the garden
   would flicker in and out of shadows around the tipping point.
   ══════════════════════════════════════════════════════════════════════ */

const quality = {
    frameMs: 16.7,      // rolling average
    shadows: true,      // the doubled petal pass
    cap: CONFIG.maxFlowers,
};

const SHADOW_DROP_MS = 26;   // slower than ~38fps → stop stamping shadows
const SHADOW_BACK_MS = 19;   // faster than ~52fps → bring them back
const CAP_DROP_MS = 34;      // still struggling → thin the garden out
const CAP_BACK_MS = 22;

function trackFrame(dt) {
    // exponential moving average — one slow frame shouldn't change the mode
    quality.frameMs += (dt - quality.frameMs) * 0.05;

    if (quality.shadows && quality.frameMs > SHADOW_DROP_MS) quality.shadows = false;
    else if (!quality.shadows && quality.frameMs < SHADOW_BACK_MS) quality.shadows = true;

    if (quality.frameMs > CAP_DROP_MS) {
        quality.cap = Math.max(46, quality.cap - 1);
    } else if (quality.frameMs < CAP_BACK_MS && quality.cap < CONFIG.maxFlowers) {
        quality.cap = Math.min(CONFIG.maxFlowers, quality.cap + 1);
    }
}

/* ══════════════════════════════════════════════════════════════════════
   Canvas
   ══════════════════════════════════════════════════════════════════════ */

const canvas = document.getElementById('garden');
const ctx = canvas.getContext('2d', { alpha: true });

let W = 0, H = 0, DPR = 1, sizeScale = 1;

function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

    /* flowers scale with the smaller edge so a phone, an iPad and a
       desktop all get the same visual density */
    sizeScale = clamp(Math.min(W, H) / 470, 0.70, 1.30);
}

window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 120));
resize();

/* ══════════════════════════════════════════════════════════════════════
   Petal sprites
   ----------------------------------------------------------------------
   Every petal shape is drawn once into an offscreen canvas at a reference
   height, then stamped with drawImage(). Sprites are cached per
   shape + colour, so a screen full of flowers costs a few hundred blits
   instead of a few thousand path fills.

   Sprite space: base of the petal at (SPR_CX, SPR_BASE), tip pointing up.
   ══════════════════════════════════════════════════════════════════════ */

const PETAL_H = 128;                 // reference petal height
const SPR_W = 168, SPR_H = 176;      // sprite canvas
const SPR_CX = SPR_W / 2, SPR_BASE = 154;

const SHAPES = ['sakura', 'tear', 'daisy', 'diamond', 'blade'];

function petalPath(c, shape) {
    const h = PETAL_H;
    c.beginPath();
    c.moveTo(0, 0);

    if (shape === 'sakura') {
        const w = h * 0.34;
        c.bezierCurveTo(-w * 1.30, -h * 0.20, -w * 1.24, -h * 0.72, -w * 0.42, -h * 0.95);
        c.quadraticCurveTo(-w * 0.16, -h * 1.02, 0, -h * 0.80);   // the notch
        c.quadraticCurveTo(w * 0.16, -h * 1.02, w * 0.42, -h * 0.95);
        c.bezierCurveTo(w * 1.24, -h * 0.72, w * 1.30, -h * 0.20, 0, 0);
    } else if (shape === 'tear') {
        const w = h * 0.30;
        c.bezierCurveTo(-w * 1.55, -h * 0.24, -w * 1.32, -h * 0.86, 0, -h);
        c.bezierCurveTo(w * 1.32, -h * 0.86, w * 1.55, -h * 0.24, 0, 0);
    } else if (shape === 'daisy') {
        const w = h * 0.155;
        c.bezierCurveTo(-w * 1.9, -h * 0.10, -w * 1.75, -h * 0.92, 0, -h);
        c.bezierCurveTo(w * 1.75, -h * 0.92, w * 1.9, -h * 0.10, 0, 0);
    } else if (shape === 'diamond') {
        const w = h * 0.40;
        c.quadraticCurveTo(-w * 1.05, -h * 0.30, -w, -h * 0.54);
        c.quadraticCurveTo(-w * 0.92, -h * 0.86, 0, -h);
        c.quadraticCurveTo(w * 0.92, -h * 0.86, w, -h * 0.54);
        c.quadraticCurveTo(w * 1.05, -h * 0.30, 0, 0);
    } else { /* blade — the sharp, star-like petal */
        const w = h * 0.30;
        c.quadraticCurveTo(-w * 1.30, -h * 0.34, 0, -h);
        c.quadraticCurveTo(w * 1.30, -h * 0.34, 0, 0);
    }
    c.closePath();
}

/* darken / lighten a #rrggbb by amount (-1 … 1) */
function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const t = amt < 0 ? 0 : 255, p = Math.abs(amt);
    r = Math.round((t - r) * p + r);
    g = Math.round((t - g) * p + g);
    b = Math.round((t - b) * p + b);
    return `rgb(${r},${g},${b})`;
}

const petalCache = new Map();

function petalSprite(shape, color) {
    const key = shape + '|' + color;
    let s = petalCache.get(key);
    if (s) return s;

    s = document.createElement('canvas');
    s.width = SPR_W;
    s.height = SPR_H;
    const c = s.getContext('2d');
    c.translate(SPR_CX, SPR_BASE);

    petalPath(c, shape);

    /* paper stock: a touch darker at the base, brighter toward the tip */
    const g = c.createLinearGradient(0, 0, 0, -PETAL_H);
    g.addColorStop(0, shade(color, -0.16));
    g.addColorStop(0.42, color);
    g.addColorStop(1, shade(color, 0.16));
    c.fillStyle = g;
    c.fill();

    /* a crisp cut edge keeps the petals reading as separate sheets */
    c.strokeStyle = shade(color, -0.24);
    c.globalAlpha = 0.26;
    c.lineWidth = 1.6;
    c.stroke();

    /* the fold: one half catches the light */
    c.globalAlpha = 0.16;
    c.save();
    c.clip();
    const fold = c.createLinearGradient(-PETAL_H * 0.3, 0, PETAL_H * 0.3, 0);
    fold.addColorStop(0, 'rgba(255,255,255,.95)');
    fold.addColorStop(0.5, 'rgba(255,255,255,0)');
    fold.addColorStop(1, 'rgba(120,30,60,.55)');
    c.fillStyle = fold;
    c.fillRect(-SPR_W, -SPR_H, SPR_W * 2, SPR_H * 2);
    c.restore();

    petalCache.set(key, s);
    return s;
}

const shadowCache = new Map();

function shadowSprite(shape) {
    let s = shadowCache.get(shape);
    if (s) return s;

    s = document.createElement('canvas');
    s.width = SPR_W;
    s.height = SPR_H;
    const c = s.getContext('2d');
    c.translate(SPR_CX, SPR_BASE);

    /* blur without ctx.filter (Safari-safe): draw the shape far off the
       canvas and let its offset shadow land where the shape would be */
    const OFF = 900;
    c.save();
    c.shadowColor = CONFIG.shadow;
    c.shadowBlur = 13;
    c.shadowOffsetX = OFF;
    c.translate(-OFF, 0);
    c.fillStyle = '#000';
    petalPath(c, shape);
    c.fill();
    c.fill();          // twice — a denser core to the shadow
    c.restore();

    shadowCache.set(shape, s);
    return s;
}

/* stamp one petal: base at the current origin, tip along -y */
function stampPetal(c, sprite, h) {
    const k = h / PETAL_H;
    c.drawImage(sprite, -SPR_CX * k, -SPR_BASE * k, SPR_W * k, SPR_H * k);
}

/* ══════════════════════════════════════════════════════════════════════
   Flowers
   ══════════════════════════════════════════════════════════════════════ */

const flowers = [];

function pickRadius() {
    let r = Math.random(), acc = 0;
    for (const [w, lo, hi] of CONFIG.sizes) {
        acc += w;
        if (r <= acc) return rand(lo, hi) * sizeScale;
    }
    return rand(18, 33) * sizeScale;
}

function makeFlower(x, y, radius) {
    const r = radius || pickRadius();
    const P = CONFIG.palette;

    /* mostly blush, with a fifth of the garden in deep crimson so the
       trail keeps the reference's light/dark rhythm */
    const base = Math.random() < 0.22 ? randInt(7, 10) : randInt(1, 6);
    const shape = pick(SHAPES);
    const petals = [];

    /* ── outer ring ─────────────────────────────────────────────────── */
    const n1 = randInt(5, 11);
    const spin1 = rand(0, TAU);
    const jitter = (TAU / n1) * 0.13;
    for (let i = 0; i < n1; i++) {
        petals.push({
            ang: spin1 + (i / n1) * TAU + rand(-jitter, jitter),
            dist: r * 0.10,
            h: r * rand(0.90, 1.03),
            sprite: petalSprite(shape, P[base]),
            shadow: shadowSprite(shape),
            delay: i * 26,
        });
    }

    /* ── inner ring, offset half a step so the petals interleave ────── */
    if (Math.random() < 0.72) {
        const n2 = clamp(n1 + randInt(-1, 1), 5, 11);
        const shape2 = Math.random() < 0.55 ? shape : pick(SHAPES);
        const tone = P[clamp(base + (Math.random() < 0.5 ? -3 : 3), 0, P.length - 1)];
        const spin2 = spin1 + TAU / (n2 * 2);
        for (let i = 0; i < n2; i++) {
            petals.push({
                ang: spin2 + (i / n2) * TAU + rand(-jitter, jitter),
                dist: r * 0.06,
                h: r * rand(0.54, 0.70),
                sprite: petalSprite(shape2, tone),
                shadow: shadowSprite(shape2),
                delay: 90 + i * 20,
            });
        }
    }

    /* ── the little floret sitting in the middle ────────────────────── */
    const nc = randInt(6, 9);
    const centreTone = Math.random() < 0.62
        ? pick(['#fff4f7', '#ffe2ea', '#fff0f3'])
        : pick(['#d62b53', '#c9184a', '#a4133c']);
    const shape3 = Math.random() < 0.5 ? 'sakura' : 'daisy';
    const spin3 = rand(0, TAU);
    for (let i = 0; i < nc; i++) {
        petals.push({
            ang: spin3 + (i / nc) * TAU,
            dist: r * 0.05,
            h: r * rand(0.26, 0.34),
            sprite: petalSprite(shape3, centreTone),
            shadow: shadowSprite(shape3),
            delay: 190 + i * 14,
        });
    }

    const lastDelay = petals[petals.length - 1].delay;

    const f = {
        x, y, r,
        petals,
        core: { rad: r * rand(0.10, 0.15), color: pick(CONFIG.cores) },
        rot0: rand(-0.42, 0.42),
        rot: 0,
        rotFinal: rand(-0.12, 0.12),
        phase: 'bloom',
        t: 0,
        bloomMs: lastDelay + 420,
        coreDelay: lastDelay + 60,
        hold: rand(CONFIG.life[0], CONFIG.life[1]),
        breathe: rand(0, TAU),
        baked: null,
        bakedSize: 0,
        alpha: 1,
    };
    f.rot = f.rot0;

    flowers.push(f);
    // `quality.cap` normally equals CONFIG.maxFlowers and only tightens if
    // the device genuinely can't keep up (see trackFrame).
    if (flowers.length > quality.cap) {
        const old = flowers.find((o) => o.phase !== 'wither');
        if (old) startWither(old);
        else flowers.shift();
    }

    if (r > 30 * sizeScale) sparkleBurst(x, y, r);
    return f;
}

/* ── drawing a flower petal by petal (bloom + wither) ─────────────────── */

function drawFlowerLive(c, f, ox, oy, rot, alpha) {
    const elapsed = f.phase === 'bloom' ? f.t * f.bloomMs : f.bloomMs;
    const shX = f.r * CONFIG.shadowOffset[0];
    const shY = f.r * CONFIG.shadowOffset[1];

    /* shadow pass — the whole silhouette, nudged down-right in screen
       space so the light direction never rotates with the flower.
       This doubles the petal blits, so it is the first thing the quality
       governor drops when frames start slipping (see trackFrame). */
    if (quality.shadows) {
        c.save();
        c.globalAlpha = alpha * 0.9;
        c.translate(ox + shX, oy + shY);
        c.rotate(rot);
        for (const p of f.petals) {
            const s = petalScale(f, p, elapsed);
            if (s <= 0.001 || p.gone) continue;
            c.save();
            if (p.det) { c.translate(p.dx, p.dy); c.rotate(p.dr); c.globalAlpha = alpha * p.al * 0.9; }
            c.rotate(p.ang);
            c.translate(0, -p.dist * s);
            stampPetal(c, p.shadow, p.h * s * 1.05);   // a hair wider than the sheet
            c.restore();
        }
        c.restore();
    }

    /* colour pass */
    c.save();
    c.globalAlpha = alpha;
    c.translate(ox, oy);
    c.rotate(rot);
    for (const p of f.petals) {
        const s = petalScale(f, p, elapsed);
        if (s <= 0.001 || p.gone) continue;
        c.save();
        if (p.det) { c.translate(p.dx, p.dy); c.rotate(p.dr); c.globalAlpha = alpha * p.al; }
        c.rotate(p.ang);
        c.translate(0, -p.dist * s);
        stampPetal(c, p.sprite, p.h * s);
        c.restore();
    }

    /* the seed core, last and on top */
    const cs = f.phase === 'bloom'
        ? clamp(easeOutBack(clamp((elapsed - f.coreDelay) / 260, 0, 1)), 0, 1.25)
        : 1;
    if (cs > 0.001) {
        c.globalAlpha = alpha * (f.coreAlpha === undefined ? 1 : f.coreAlpha);
        const rad = f.core.rad * cs;
        const g = c.createRadialGradient(-rad * 0.3, -rad * 0.3, rad * 0.1, 0, 0, rad);
        g.addColorStop(0, shade(f.core.color, 0.35));
        g.addColorStop(1, shade(f.core.color, -0.18));
        c.fillStyle = g;
        c.beginPath();
        c.arc(0, 0, rad, 0, TAU);
        c.fill();
    }
    c.restore();
}

function petalScale(f, p, elapsed) {
    if (f.phase === 'bloom') {
        const t = clamp((elapsed - p.delay) / 330, 0, 1);
        return clamp(easeOutBack(t), 0, 1.3);
    }
    return 1;
}

/* ── bake a finished flower into one sprite: 1 blit instead of ~40 ───── */

function bakeFlower(f) {
    const pad = f.r * 0.62 + 16;
    const size = Math.ceil((f.r + pad) * 2);
    /* the rare giants stay live — baking them would cost far more memory
       than the blits they save */
    if (size > 220) return;

    const c2 = document.createElement('canvas');
    c2.width = Math.round(size * DPR);
    c2.height = Math.round(size * DPR);
    const c = c2.getContext('2d');
    c.setTransform(DPR, 0, 0, DPR, 0, 0);

    const saved = f.phase;
    f.phase = 'hold';
    drawFlowerLive(c, f, size / 2, size / 2, f.rotFinal, 1);
    f.phase = saved;

    f.baked = c2;
    f.bakedSize = size;
}

function startWither(f) {
    if (f.phase === 'wither') return;
    f.phase = 'wither';
    f.t = 0;
    f.baked = null;
    for (const p of f.petals) {
        const out = p.ang - Math.PI / 2;          // petals fly outward
        p.det = false;
        p.detAt = rand(0, 0.55);
        p.dx = 0; p.dy = 0; p.dr = 0; p.al = 1;
        p.vx = Math.cos(out) * rand(6, 26) + rand(-8, 8);
        p.vy = Math.sin(out) * rand(6, 22) - rand(6, 26);
        p.vr = rand(-2.4, 2.4);
        p.sway = rand(0, TAU);
        p.gone = false;
    }
}

function updateFlower(f, dt) {
    if (f.phase === 'bloom') {
        f.t += dt / f.bloomMs;
        f.rot = f.rot0 + (f.rotFinal - f.rot0) * easeOutCubic(clamp(f.t, 0, 1));
        if (f.t >= 1) {
            f.t = 1;
            f.phase = 'hold';
            f.rot = f.rotFinal;
            bakeFlower(f);
        }
    } else if (f.phase === 'hold') {
        f.hold -= dt;
        f.breathe += dt * 0.0016;
        if (f.hold <= 0) startWither(f);
    } else {
        f.t += dt / CONFIG.witherMs;
        const s = dt / 1000;
        f.coreAlpha = clamp(1 - f.t * 3.6, 0, 1);   // the seed goes first
        for (const p of f.petals) {
            if (!p.det) {
                if (f.t >= p.detAt) p.det = true;
                continue;
            }
            p.sway += s * 3.1;
            p.vy += 62 * s;                        // gravity
            p.vx += Math.cos(p.sway) * 26 * s;     // the flutter
            p.dx += p.vx * s;
            p.dy += p.vy * s;
            p.dr += p.vr * s;
            p.al = clamp(1 - (f.t - p.detAt) / (1 - p.detAt), 0, 1);
            if (p.al <= 0.01) p.gone = true;
        }
        if (f.t >= 1) return false;
    }
    return true;
}

function drawFlower(c, f) {
    if (f.phase === 'hold' && f.baked) {
        const s = 1 + Math.sin(f.breathe) * 0.014;
        const d = f.bakedSize * s;
        c.drawImage(f.baked, f.x - d / 2, f.y - d / 2, d, d);
        return;
    }
    drawFlowerLive(c, f, f.x, f.y, f.phase === 'wither' ? f.rotFinal : f.rot, 1);
}

/* ══════════════════════════════════════════════════════════════════════
   Ambience — a few petals always drifting, and sparkle dust on a bloom
   ══════════════════════════════════════════════════════════════════════ */

const ambient = [];

function newAmbient(seeded) {
    const shape = pick(SHAPES);
    return {
        x: rand(-40, W + 40),
        y: seeded ? rand(-40, H) : rand(-160, -40),
        h: rand(14, 34) * sizeScale,
        sprite: petalSprite(shape, pick(CONFIG.palette.slice(1, 6))),
        rot: rand(0, TAU),
        vr: rand(-0.5, 0.5),
        vy: rand(14, 40),
        sway: rand(0, TAU),
        swayAmp: rand(10, 34),
        alpha: rand(0.16, 0.42),
    };
}

for (let i = 0; i < CONFIG.ambientPetals; i++) ambient.push(newAmbient(true));

function updateAmbient(dt) {
    const s = dt / 1000;
    for (let i = 0; i < ambient.length; i++) {
        const a = ambient[i];
        a.sway += s * 0.9;
        a.y += a.vy * s;
        a.x += Math.cos(a.sway) * a.swayAmp * s;
        a.rot += a.vr * s;
        if (a.y > H + 60) ambient[i] = newAmbient(false);
    }
}

function drawAmbient(c) {
    for (const a of ambient) {
        c.save();
        c.globalAlpha = a.alpha;
        c.translate(a.x, a.y);
        c.rotate(a.rot);
        stampPetal(c, a.sprite, a.h);
        c.restore();
    }
}

const sparkles = [];

function sparkleBurst(x, y, r) {
    const n = randInt(4, 8);
    for (let i = 0; i < n; i++) {
        if (sparkles.length >= CONFIG.maxSparkles) break;
        const a = rand(0, TAU), d = rand(r * 0.4, r * 1.25);
        sparkles.push({
            x: x + Math.cos(a) * d,
            y: y + Math.sin(a) * d,
            r: rand(2.5, 7) * sizeScale,
            rot: rand(0, TAU),
            life: 0,
            max: rand(520, 1050),
        });
    }
}

function updateSparkles(dt) {
    for (let i = sparkles.length - 1; i >= 0; i--) {
        const s = sparkles[i];
        s.life += dt;
        s.y -= dt * 0.012;
        if (s.life >= s.max) sparkles.splice(i, 1);
    }
}

function drawSparkles(c) {
    c.save();
    for (const s of sparkles) {
        const t = s.life / s.max;
        const a = Math.sin(t * Math.PI);
        const k = s.r * (0.5 + a * 0.7);
        c.globalAlpha = a * 0.85;
        c.fillStyle = '#fff';
        c.save();
        c.translate(s.x, s.y);
        c.rotate(s.rot);
        c.beginPath();
        c.moveTo(0, -k);
        c.quadraticCurveTo(0, 0, k, 0);
        c.quadraticCurveTo(0, 0, 0, k);
        c.quadraticCurveTo(0, 0, -k, 0);
        c.quadraticCurveTo(0, 0, 0, -k);
        c.fill();
        c.restore();
    }
    c.restore();
}

/* ══════════════════════════════════════════════════════════════════════
   The trail — flowers are spaced by distance travelled, not by event
   ══════════════════════════════════════════════════════════════════════ */

let trailX = null, trailY = null, gapLeft = 0;

function resetTrail(x, y) {
    trailX = x;
    trailY = y;
    gapLeft = nextGap();
}

function nextGap() {
    return rand(CONFIG.trailGap[0], CONFIG.trailGap[1]) * sizeScale;
}

function trailTo(x, y) {
    if (trailX === null) { resetTrail(x, y); makeFlower(x, y); return; }

    let dx = x - trailX, dy = y - trailY;
    let dist = Math.hypot(dx, dy);
    if (dist < 0.001) return;

    /* a fast flick shouldn't carpet the screen */
    if (dist > 220) { resetTrail(x, y); makeFlower(x, y); return; }

    while (dist >= gapLeft) {
        const k = gapLeft / dist;
        trailX += dx * k;
        trailY += dy * k;
        makeFlower(trailX, trailY);
        dx = x - trailX;
        dy = y - trailY;
        dist = Math.hypot(dx, dy);
        gapLeft = nextGap();
    }
    gapLeft -= dist;
    trailX = x;
    trailY = y;
}

/* ══════════════════════════════════════════════════════════════════════
   Auto-draw — when you stop, the garden keeps drawing for you
   ══════════════════════════════════════════════════════════════════════ */

const PATHS = {
    heart(t) {
        const a = Math.PI + t * TAU;               // start at the bottom tip
        const x = 16 * Math.pow(Math.sin(a), 3);
        const y = 13 * Math.cos(a) - 5 * Math.cos(2 * a)
            - 2 * Math.cos(3 * a) - Math.cos(4 * a);
        return [x / 17, -y / 17];
    },
    infinity(t) {
        const a = -Math.PI / 2 + t * TAU;
        return [Math.cos(a) * 1.05, Math.sin(a) * Math.cos(a) * 1.25];
    },
    spiral(t) {
        const a = t * TAU * 2.1;
        const r = 0.14 + t * 0.96;
        return [Math.cos(a) * r * 1.05, Math.sin(a) * r];
    },
    ribbon(t) {
        return [-1.15 + t * 2.3, Math.sin(t * TAU * 1.5) * 0.52];
    },
};

const PATH_ORDER = ['heart', 'ribbon', 'heart', 'infinity', 'heart', 'spiral'];
let pathIdx = 0;

let auto = null;          // { fn, t, dur }
let lastInput = performance.now();

function startAuto(name) {
    const key = name || PATH_ORDER[pathIdx++ % PATH_ORDER.length];
    auto = { fn: PATHS[key], t: 0, dur: CONFIG.autoDrawMs };
    trailX = null;
    document.getElementById('btnHeart').classList.toggle('is-busy', key === 'heart');
}

function stopAuto() {
    if (!auto) return;
    auto = null;
    trailX = null;
    document.getElementById('btnHeart').classList.remove('is-busy');
}

function updateAuto(dt) {
    if (!auto) {
        if (performance.now() - lastInput > CONFIG.idleMs) startAuto();
        return;
    }
    auto.t += dt / auto.dur;
    const t = clamp(auto.t, 0, 1);
    const R = Math.min(W, H) * CONFIG.autoScale;
    const [nx, ny] = auto.fn(easeInOutSine(t));   // ease in and out of the stroke
    /* the shape always sits on the exact centre axis of the screen */
    trailTo(W / 2 + nx * R, H / 2 + ny * R * 1.02);
    if (auto.t >= 1) {
        stopAuto();
        lastInput = performance.now();            // pause before the next one
    }
}

/* ══════════════════════════════════════════════════════════════════════
   Input
   ══════════════════════════════════════════════════════════════════════ */

const hint = document.getElementById('hint');
let hintGone = false;

function touched() {
    lastInput = performance.now();
    stopAuto();
    if (!hintGone) {
        hintGone = true;
        hint.classList.add('is-gone');
    }
}

let drawing = false;

canvas.addEventListener('pointerdown', (e) => {
    touched();
    drawing = true;
    canvas.setPointerCapture(e.pointerId);
    resetTrail(e.clientX, e.clientY);
    makeFlower(e.clientX, e.clientY);
});

canvas.addEventListener('pointermove', (e) => {
    /* mouse paints on hover; a finger has to be down */
    if (!drawing && e.pointerType !== 'mouse') return;
    touched();
    if (e.getCoalescedEvents) {
        for (const ev of e.getCoalescedEvents()) trailTo(ev.clientX, ev.clientY);
    } else {
        trailTo(e.clientX, e.clientY);
    }
});

for (const type of ['pointerup', 'pointercancel', 'pointerleave']) {
    canvas.addEventListener(type, () => {
        drawing = false;
        trailX = null;
        lastInput = performance.now();
    });
}

canvas.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

/* ── HUD ─────────────────────────────────────────────────────────────── */

/* This garden is used on an iPad, so the buttons fire on pointerdown rather
   than waiting for `click` to resolve — a tap feels immediate instead of
   lagging a frame behind the finger. `click` still runs the same action for
   keyboards and assistive tech, guarded so one tap never fires twice. */
function wireHudButton(id, action) {
    const btn = document.getElementById(id);
    if (!btn) return;
    let firedByPointer = false;

    btn.addEventListener('pointerdown', (e) => {
        if (!e.isPrimary) return;
        e.preventDefault();               // no synthetic mouse events, no focus flash
        btn.classList.add('is-pressed');
        firedByPointer = true;
        action();
    });

    const release = () => btn.classList.remove('is-pressed');
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => btn.addEventListener(t, release));

    btn.addEventListener('click', () => {
        // pointerdown already ran it; swallow the click it synthesises
        if (firedByPointer) { firedByPointer = false; return; }
        action();
    });
}

wireHudButton('btnHeart', () => {
    stopAuto();
    startAuto('heart');
    lastInput = performance.now();
    if (!hintGone) { hintGone = true; hint.classList.add('is-gone'); }
});

wireHudButton('btnBouquet', () => {
    touched();
    /* a round posy on the centre axis */
    const R = Math.min(W, H) * 0.19;
    const n = 16;
    for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU + rand(-0.1, 0.1);
        const d = R * rand(0.35, 1);
        setTimeout(() => makeFlower(
            W / 2 + Math.cos(a) * d,
            H / 2 + Math.sin(a) * d * 0.92,
        ), i * 34);
    }
    setTimeout(() => makeFlower(W / 2, H / 2, rand(46, 70) * sizeScale), n * 34);
});

wireHudButton('btnClear', () => {
    touched();
    flowers.forEach((f, i) => setTimeout(() => startWither(f), i * 14));
});

/* ══════════════════════════════════════════════════════════════════════
   Loop
   ══════════════════════════════════════════════════════════════════════ */

let prev = performance.now();

function frame(now) {
    const dt = Math.min(now - prev, 48);      // a backgrounded tab shouldn't jump
    prev = now;
    trackFrame(dt);

    updateAuto(dt);
    updateAmbient(dt);
    updateSparkles(dt);

    for (let i = flowers.length - 1; i >= 0; i--) {
        if (!updateFlower(flowers[i], dt)) flowers.splice(i, 1);
    }

    ctx.clearRect(0, 0, W, H);
    drawAmbient(ctx);
    for (const f of flowers) drawFlower(ctx, f);
    drawSparkles(ctx);

    requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

/* a first flourish so the page is never empty */
setTimeout(() => startAuto('heart'), 1600);
