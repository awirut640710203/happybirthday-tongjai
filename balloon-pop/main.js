/* ══════════════════════════════════════════════════════════════════════
   Birthday Balloons
   ----------------------------------------------------------------------
   Balloons rise from below; tap one before it drifts off the top. Three
   escapes and the round is over. Consecutive pops build a combo, and the
   combo multiplies the score — so playing well is worth more than playing
   fast.

   Built for a finger on an iPad: every balloon is far larger than the 44px
   touch minimum, taps register on contact (pointerdown, not click), and
   nothing depends on hover.
   ══════════════════════════════════════════════════════════════════════ */

'use strict';

const CONFIG = {
    lives: 3,

    /* balloon radius in CSS px. The floor is deliberately generous: a
       48px-wide balloon is already the Apple touch minimum, and these
       are moving targets, so they start well above it. */
    radius: [30, 52],
    tapPadding: 12,          // extra forgiveness around the silhouette

    riseSpeed: [52, 92],     // px/sec at level 1
    speedPerLevel: 7,        // px/sec added each level
    spawnMs: [900, 1500],    // gap between balloons at level 1
    spawnFloorMs: 340,       // never spawn faster than this
    spawnTightenPerLevel: 62,
    levelEveryMs: 9000,
    maxOnScreen: 14,

    comboStep: 4,            // pops needed per multiplier step
    maxCombo: 5,
    maxShreds: 140,
    maxPops: 16,             // floating "+points" labels
    maxRings: 10,            // pop shockwaves

    /* a balloon inside this band of the screen height is about to escape,
       and gets a warning halo so it can be saved */
    dangerBand: 0.16,
    countdownFrom: 3,

    palette: [
        ['#ffd6e3', '#f48fb1'],
        ['#ffe0c7', '#ffb27a'],
        ['#e2c9ff', '#b78cf5'],
        ['#c9e8ff', '#7ec2f5'],
        ['#ffd0dd', '#e8798f'],
        ['#fff0b8', '#f5cf5a'],
    ],
};

const TAU = Math.PI * 2;
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[(Math.random() * a.length) | 0];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/* ══════════════════════════════════════════════════════════════════════
   Canvas
   ══════════════════════════════════════════════════════════════════════ */

const canvas = document.getElementById('field');
const ctx = canvas.getContext('2d');

let W = 0, H = 0, DPR = 1;

function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);   // 3x costs a lot for no visible gain
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}

resize();
window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 120));

/* ══════════════════════════════════════════════════════════════════════
   Sound — a short pluck per pop, pitched up with the combo
   ══════════════════════════════════════════════════════════════════════ */

let actx = null;

function tone(freq, dur, type = 'sine', vol = 0.13) {
    try {
        if (!actx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return;
            actx = new AC();
        }
        if (actx.state === 'suspended') actx.resume();
        const osc = actx.createOscillator();
        const gain = actx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, actx.currentTime);
        gain.gain.setValueAtTime(vol, actx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + dur);
        osc.connect(gain).connect(actx.destination);
        osc.start();
        osc.stop(actx.currentTime + dur);
    } catch (e) { /* audio is a nicety, never a failure */ }
}

/* ══════════════════════════════════════════════════════════════════════
   State
   ══════════════════════════════════════════════════════════════════════ */

const balloons = [];
const shreds = [];
const pops = [];      // floating score labels
const rings = [];     // pop shockwaves

const game = {
    running: false,
    score: 0,
    lives: CONFIG.lives,
    streak: 0,
    combo: 1,
    level: 1,
    elapsed: 0,
    nextSpawn: 0,
    best: 0,
};

try { game.best = parseInt(localStorage.getItem('bp_best') || '0', 10) || 0; } catch (e) { }

/* ══════════════════════════════════════════════════════════════════════
   Balloons
   ══════════════════════════════════════════════════════════════════════ */

function spawn() {
    if (balloons.length >= CONFIG.maxOnScreen) return;

    // small balloons are quicker and worth more
    const r = rand(CONFIG.radius[0], CONFIG.radius[1]);
    const small = 1 - (r - CONFIG.radius[0]) / (CONFIG.radius[1] - CONFIG.radius[0]);
    const speed = rand(CONFIG.riseSpeed[0], CONFIG.riseSpeed[1])
        + CONFIG.speedPerLevel * (game.level - 1)
        + small * 26;

    const [light, deep] = pick(CONFIG.palette);
    balloons.push({
        x: rand(r + 14, Math.max(r + 15, W - r - 14)),
        y: H + r + rand(10, 90),
        r,
        speed,
        light,
        deep,
        value: Math.round(10 + small * 20),
        sway: rand(0, TAU),
        swaySpeed: rand(0.7, 1.5),
        swayAmp: rand(10, 30),
        tilt: 0,
        danger: 0,
    });
}

function drawBalloon(b) {
    const { x, y, r } = b;

    /* warning halo — a balloon this close to the line is one beat away from
       costing a life, so it announces itself instead of slipping out quietly */
    if (b.danger > 0) {
        const pulse = 0.5 + 0.5 * Math.sin(b.sway * 5);
        ctx.save();
        ctx.globalAlpha = b.danger * (0.28 + pulse * 0.34);
        ctx.strokeStyle = '#ff5f8a';
        ctx.lineWidth = 2 + pulse * 2.4;
        ctx.beginPath();
        ctx.ellipse(x, y, r * 0.86 + 9 + pulse * 5, r + 9 + pulse * 5, 0, 0, TAU);
        ctx.stroke();
        ctx.restore();
    }

    // string
    ctx.save();
    ctx.strokeStyle = 'rgba(180, 110, 135, .45)';
    ctx.lineWidth = Math.max(1, r * 0.045);
    ctx.beginPath();
    ctx.moveTo(x, y + r * 1.02);
    ctx.quadraticCurveTo(x + Math.sin(b.sway) * r * 0.34, y + r * 1.5, x, y + r * 1.95);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(b.tilt);

    // body — slightly taller than wide, with the classic knot
    const g = ctx.createRadialGradient(-r * 0.32, -r * 0.38, r * 0.08, 0, 0, r * 1.12);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.28, b.light);
    g.addColorStop(1, b.deep);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.86, r, 0, 0, TAU);
    ctx.fill();

    // knot
    ctx.fillStyle = b.deep;
    ctx.beginPath();
    ctx.moveTo(-r * 0.13, r * 0.98);
    ctx.lineTo(r * 0.13, r * 0.98);
    ctx.lineTo(0, r * 1.16);
    ctx.closePath();
    ctx.fill();

    // highlight
    ctx.fillStyle = 'rgba(255,255,255,.55)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.3, -r * 0.36, r * 0.17, r * 0.26, -0.4, 0, TAU);
    ctx.fill();

    ctx.restore();
}

/* ══════════════════════════════════════════════════════════════════════
   Pop — the balloon bursts into curls of its own colour
   ══════════════════════════════════════════════════════════════════════ */

function burst(b) {
    const n = Math.min(14, Math.round(b.r * 0.34));
    for (let i = 0; i < n; i++) {
        if (shreds.length >= CONFIG.maxShreds) break;
        const a = (i / n) * TAU + rand(-0.2, 0.2);
        const sp = rand(90, 260);
        shreds.push({
            x: b.x, y: b.y,
            vx: Math.cos(a) * sp,
            vy: Math.sin(a) * sp - 40,
            r: rand(3, 7),
            rot: rand(0, TAU),
            vr: rand(-9, 9),
            life: 1,
            fade: rand(1.5, 2.4),
            color: Math.random() < 0.5 ? b.light : b.deep,
        });
    }
}

function drawShreds() {
    for (const s of shreds) {
        ctx.save();
        ctx.globalAlpha = clamp(s.life, 0, 1);
        ctx.translate(s.x, s.y);
        ctx.rotate(s.rot);
        ctx.fillStyle = s.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, s.r, s.r * 0.56, 0, 0, TAU);
        ctx.fill();
        ctx.restore();
    }
    ctx.globalAlpha = 1;
}

/* a single expanding ring — reads as the "burst" far better than the
   confetti alone, and costs one stroke */
function drawRings() {
    for (const g of rings) {
        const t = 1 - g.life;                 // 0 → 1
        const rad = g.r0 + t * g.grow;
        ctx.save();
        ctx.globalAlpha = clamp(g.life, 0, 1) * 0.5;
        ctx.strokeStyle = g.color;
        ctx.lineWidth = Math.max(1, 5 * g.life);
        ctx.beginPath();
        ctx.arc(g.x, g.y, rad, 0, TAU);
        ctx.stroke();
        ctx.restore();
    }
    ctx.globalAlpha = 1;
}

/* the score that just landed, drifting up from where it was earned —
   feedback exactly where the eye already is */
function drawPops() {
    for (const p of pops) {
        const t = clamp(p.life, 0, 1);
        ctx.save();
        ctx.globalAlpha = t;
        ctx.translate(p.x, p.y - (1 - t) * 46);
        ctx.scale(p.scale, p.scale);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `700 ${p.size}px Quicksand, system-ui, sans-serif`;
        ctx.lineWidth = 4;
        ctx.strokeStyle = 'rgba(255,255,255,.9)';
        ctx.strokeText(p.text, 0, 0);
        ctx.fillStyle = p.color;
        ctx.fillText(p.text, 0, 0);
        ctx.restore();
    }
    ctx.globalAlpha = 1;
}

/* ══════════════════════════════════════════════════════════════════════
   HUD
   ══════════════════════════════════════════════════════════════════════ */

const el = {
    score: document.getElementById('score'),
    comboChip: document.getElementById('comboChip'),
    lifeDots: [...document.querySelectorAll('.life-dot')],
    skyLine: document.getElementById('skyLine'),
    countdown: document.getElementById('countdown'),
    countdownNum: document.getElementById('countdownNum'),
    kicker: document.getElementById('cardKicker'),
    title: document.getElementById('cardTitle'),
    text: document.getElementById('cardText'),
    art: document.getElementById('cardArt'),
    scoreRow: document.getElementById('scoreRow'),
    finalScore: document.getElementById('finalScore'),
    bestScore: document.getElementById('bestScore'),
    note: document.getElementById('cardNote'),
    play: document.getElementById('btnPlay'),
};

let shownCombo = 1;

function paintHud() {
    el.score.textContent = game.score;

    // the chip only exists while a streak does, so an idle HUD stays quiet
    el.comboChip.textContent = '×' + game.combo;
    el.comboChip.classList.toggle('is-on', game.combo > 1);
    if (game.combo > shownCombo) {
        el.comboChip.classList.remove('is-bump');
        void el.comboChip.offsetWidth;          // restart the animation
        el.comboChip.classList.add('is-bump');
    }
    shownCombo = game.combo;

    el.lifeDots.forEach((d, i) => d.classList.toggle('is-lost', i >= game.lives));
}

/* ══════════════════════════════════════════════════════════════════════
   Round flow
   ══════════════════════════════════════════════════════════════════════ */

let countdownTimers = [];

function clearCountdown() {
    countdownTimers.forEach(clearTimeout);
    countdownTimers = [];
    el.countdown.classList.remove('is-on');
}

/* Give the player a beat to settle before the first balloon — starting
   mid-tap felt like the round had begun without them. */
function startGame() {
    clearCountdown();
    balloons.length = 0;
    shreds.length = 0;
    pops.length = 0;
    rings.length = 0;

    game.running = false;          // the countdown runs first
    game.score = 0;
    game.lives = CONFIG.lives;
    game.streak = 0;
    game.combo = 1;
    shownCombo = 1;
    game.level = 1;
    game.elapsed = 0;
    game.nextSpawn = 200;
    paintHud();
    document.body.classList.add('is-playing');

    const steps = CONFIG.countdownFrom;
    for (let i = 0; i < steps; i++) {
        countdownTimers.push(setTimeout(() => {
            el.countdownNum.textContent = String(steps - i);
            el.countdown.classList.add('is-on');
            // restart the pop animation on each tick
            el.countdownNum.style.animation = 'none';
            void el.countdownNum.offsetWidth;
            el.countdownNum.style.animation = '';
            tone(480 + i * 90, 0.13, 'sine', 0.09);
        }, i * 620));
    }
    countdownTimers.push(setTimeout(() => {
        el.countdown.classList.remove('is-on');
        game.running = true;
        tone(880, 0.2, 'sine', 0.11);
    }, steps * 620));
}

function endGame() {
    game.running = false;
    clearCountdown();
    el.skyLine.classList.remove('is-alert');
    document.body.classList.remove('is-playing');

    const prevBest = game.best;
    const record = game.score > prevBest;
    if (record) {
        game.best = game.score;
        try { localStorage.setItem('bp_best', String(game.best)); } catch (e) { }
    }

    el.kicker.textContent = 'Round over';
    el.title.textContent = record ? 'New Best!' : 'Well Played';
    el.text.textContent = record
        ? 'You just beat your own record'
        : 'One more round? The record is still there to break';
    el.finalScore.textContent = game.score;
    el.bestScore.textContent = game.best;
    el.scoreRow.hidden = false;

    // The heading already says "New Best!" — repeating it here would waste the
    // line, so it carries the actual number instead: how much better, or how
    // far off the record this round was.
    if (record) {
        el.note.textContent = prevBest > 0
            ? `+${game.score - prevBest} points above your old best 🎉`
            : 'Your very first record 🎉';
        el.note.hidden = false;
    } else if (game.score > 0) {
        el.note.textContent = `${prevBest - game.score} more points to match your best`;
        el.note.hidden = false;
    } else {
        el.note.hidden = true;
    }
    el.play.textContent = 'Play Again';

    tone(record ? 880 : 300, 0.4, record ? 'sine' : 'triangle', 0.12);
    if (record) {
        setTimeout(() => tone(1170, 0.45), 130);
        setTimeout(() => tone(1400, 0.5), 260);
    }
}

/* ══════════════════════════════════════════════════════════════════════
   Input — pointerdown so a tap lands the instant the finger touches
   ══════════════════════════════════════════════════════════════════════ */

function popAt(px, py) {
    if (!game.running) return;

    // Topmost first: the balloon nearest the top of the screen is the one
    // about to escape, so it should win an overlapping tap.
    let hit = -1;
    let bestY = Infinity;
    for (let i = 0; i < balloons.length; i++) {
        const b = balloons[i];
        const dx = px - b.x;
        const dy = (py - b.y) * 0.86;          // the body is an ellipse
        const reach = b.r + CONFIG.tapPadding;
        if (dx * dx + dy * dy <= reach * reach && b.y < bestY) {
            bestY = b.y;
            hit = i;
        }
    }
    if (hit === -1) {
        // a miss breaks the streak but never costs a life
        game.streak = 0;
        game.combo = 1;
        paintHud();
        return;
    }

    const b = balloons[hit];
    balloons.splice(hit, 1);
    burst(b);

    const prevCombo = game.combo;
    game.streak++;
    game.combo = clamp(1 + Math.floor(game.streak / CONFIG.comboStep), 1, CONFIG.maxCombo);
    const gained = b.value * game.combo;
    game.score += gained;
    paintHud();

    // shockwave
    if (rings.length < CONFIG.maxRings) {
        rings.push({ x: b.x, y: b.y, r0: b.r * 0.7, grow: b.r * 1.5, life: 1, fade: 2.6, color: b.deep });
    }
    // the points, floating up from where they were earned
    if (pops.length < CONFIG.maxPops) {
        const levelled = game.combo > prevCombo;
        pops.push({
            x: clamp(b.x, 46, W - 46),
            y: b.y - b.r * 0.5,
            text: (game.combo > 1 ? `+${gained} ×${game.combo}` : `+${gained}`),
            size: (levelled ? 30 : 22) * clamp(Math.min(W, H) / 800, 0.85, 1.35),
            color: levelled ? '#d90429' : '#e8567f',
            scale: 1,
            life: 1,
            fade: 1.5,
        });
    }

    tone(520 + game.combo * 90, 0.11, 'triangle', 0.12);
    if (game.combo > prevCombo) setTimeout(() => tone(760 + game.combo * 110, 0.16, 'sine', 0.1), 70);
}

canvas.addEventListener('pointerdown', (e) => {
    if (!e.isPrimary) return;
    e.preventDefault();
    popAt(e.clientX, e.clientY);
});

// stop iPadOS gestures / rubber-banding from interrupting a round
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });

/* buttons: fire on contact, with a click fallback for keyboard / AT */
function wireButton(node, action) {
    if (!node) return;
    let firedByPointer = false;
    node.addEventListener('pointerdown', (e) => {
        if (!e.isPrimary) return;
        node.classList.add('is-pressed');
        firedByPointer = true;
        action(e);
    });
    const release = () => node.classList.remove('is-pressed');
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(t => node.addEventListener(t, release));
    node.addEventListener('click', (e) => {
        if (firedByPointer) { firedByPointer = false; return; }
        action(e);
    });
}

wireButton(el.play, () => { if (!game.running) startGame(); });
// the Home link keeps its normal navigation — only the press feedback is wired
wireButton(document.getElementById('btnHome'), () => { });

/* ══════════════════════════════════════════════════════════════════════
   Loop
   ══════════════════════════════════════════════════════════════════════ */

let prev = performance.now();

function frame(now) {
    const dtMs = Math.min(now - prev, 48);     // a backgrounded tab must not jump
    prev = now;
    const dt = dtMs / 1000;

    if (game.running) {
        game.elapsed += dtMs;
        game.level = 1 + Math.floor(game.elapsed / CONFIG.levelEveryMs);

        game.nextSpawn -= dtMs;
        if (game.nextSpawn <= 0) {
            spawn();
            const tighten = CONFIG.spawnTightenPerLevel * (game.level - 1);
            game.nextSpawn = Math.max(
                CONFIG.spawnFloorMs,
                rand(CONFIG.spawnMs[0], CONFIG.spawnMs[1]) - tighten
            );
        }
    }

    let anyDanger = false;

    for (let i = balloons.length - 1; i >= 0; i--) {
        const b = balloons[i];
        b.y -= b.speed * dt;
        b.sway += b.swaySpeed * dt;
        b.x += Math.cos(b.sway) * b.swayAmp * dt;
        b.tilt = Math.sin(b.sway) * 0.09;
        b.x = clamp(b.x, b.r * 0.9, W - b.r * 0.9);

        // 0 → 1 as it enters the danger band near the top
        const band = H * CONFIG.dangerBand;
        b.danger = clamp(1 - (b.y - b.r) / band, 0, 1);
        if (b.danger > 0.15 && game.running) anyDanger = true;

        if (b.y + b.r * 1.2 < 0) {
            balloons.splice(i, 1);
            if (game.running) {
                game.lives--;
                game.streak = 0;
                game.combo = 1;
                paintHud();
                tone(200, 0.22, 'sawtooth', 0.07);
                if (game.lives <= 0) endGame();
            }
        }
    }

    el.skyLine.classList.toggle('is-alert', anyDanger);

    for (let i = shreds.length - 1; i >= 0; i--) {
        const s = shreds[i];
        s.vy += 620 * dt;                     // gravity
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.rot += s.vr * dt;
        s.life -= s.fade * dt;
        if (s.life <= 0) shreds.splice(i, 1);
    }

    for (let i = rings.length - 1; i >= 0; i--) {
        rings[i].life -= rings[i].fade * dt;
        if (rings[i].life <= 0) rings.splice(i, 1);
    }

    for (let i = pops.length - 1; i >= 0; i--) {
        const p = pops[i];
        p.life -= p.fade * dt;
        // a quick overshoot as it appears, then settle
        p.scale = 1 + Math.max(0, p.life - 0.72) * 1.1;
        if (p.life <= 0) pops.splice(i, 1);
    }

    ctx.clearRect(0, 0, W, H);
    for (const b of balloons) drawBalloon(b);
    drawRings();
    drawShreds();
    drawPops();

    requestAnimationFrame(frame);
}

requestAnimationFrame(frame);

/* show the stored best on the opening card */
el.bestScore.textContent = game.best;
