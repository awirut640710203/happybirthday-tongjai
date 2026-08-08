/* ═══════════════════════════════════════════════════════
   🎁 Gift Box Unwrap — Lock Screen
   - 8-digit PIN gate (keypad + hardware keyboard)
   - Floating bubbles & hearts, pastel mesh background
   - Correct code → bow flies off, lid lifts, light bursts out
   ═══════════════════════════════════════════════════════ */

(function () {
    'use strict';

    const PASSCODE = '11082546';
    const STORAGE_KEY = 'bd_gate_unlocked';
    const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const screenEl = document.getElementById('lock-screen');
    if (!screenEl) {
        if (typeof window.startLandingExperience === 'function') window.startLandingExperience();
        return;
    }

    const panel = document.getElementById('lock-panel');
    const dotsWrap = document.getElementById('pin-dots');
    const keypad = document.getElementById('keypad');
    const msgEl = document.getElementById('lock-msg');
    const ghostInput = document.getElementById('lock-ghost-input');
    const flashEl = document.getElementById('lock-flash');
    const raysEl = document.getElementById('lock-rays');
    const giftEl = document.getElementById('gift');
    const catEl = document.getElementById('cat-trio');
    const catBubbleEl = document.getElementById('cat-bubble');
    const bloomLayer = document.getElementById('bloomLayer');

    let entered = '';
    let attempts = 0;
    let busy = false;
    let catTimer = null;

    /* ───────────────────────────────
       Keypad
       ─────────────────────────────── */
    function buildKeypad() {
        const keys = [
            { v: '1' }, { v: '2' }, { v: '3' },
            { v: '4' }, { v: '5' }, { v: '6' },
            { v: '7' }, { v: '8' }, { v: '9' },
            { v: 'del', label: '⌫', cls: 'key-action', aria: 'Delete last digit' },
            { v: '0' },
            { v: 'ok', label: '→', cls: 'key-enter', aria: 'Confirm code' }
        ];

        keypad.innerHTML = keys.map(k => `
            <button type="button" class="key ${k.cls || ''}" data-key="${k.v}"
                    aria-label="${k.aria || k.v}">${k.label || k.v}</button>
        `).join('');

        keypad.addEventListener('pointerdown', e => {
            const btn = e.target.closest('.key');
            if (btn) ripple(btn, e);
        });

        keypad.addEventListener('click', e => {
            const btn = e.target.closest('.key');
            if (!btn) return;
            const v = btn.dataset.key;
            if (v === 'del') removeDigit();
            else if (v === 'ok') submit();
            else addDigit(v);
        });
    }

    function ripple(btn, e) {
        if (REDUCED) return;
        const rect = btn.getBoundingClientRect();
        const r = document.createElement('span');
        r.className = 'ripple';
        const size = Math.max(rect.width, rect.height);
        r.style.width = r.style.height = size + 'px';
        r.style.left = (e.clientX - rect.left) + 'px';
        r.style.top = (e.clientY - rect.top) + 'px';
        btn.appendChild(r);
        setTimeout(() => r.remove(), 550);
    }

    /* ───────────────────────────────
       PIN state
       ─────────────────────────────── */
    function buildDots() {
        dotsWrap.innerHTML = Array.from({ length: PASSCODE.length },
            () => '<span class="pin-dot"></span>').join('');
    }

    function renderDots() {
        const dots = dotsWrap.children;
        for (let i = 0; i < dots.length; i++) {
            dots[i].classList.toggle('filled', i < entered.length);
        }
        if (ghostInput) {
            ghostInput.setAttribute('aria-label',
                `Passcode: ${entered.length} of ${PASSCODE.length} digits entered`);
        }
    }

    // The box gives a happy little bounce on every digit.
    function giftReact(cls, ms) {
        if (!giftEl || REDUCED) return;
        giftEl.classList.remove(cls);
        void giftEl.offsetWidth;   // restart the animation
        giftEl.classList.add(cls);
        setTimeout(() => giftEl.classList.remove(cls), ms);
    }

    // 😾😼😹 Angry cat trio — all three hop in together on every wrong try.
    let lastLineIndex = -1;
    const trioLines = [
        'Wrong code! 😾😼😹',
        'We cannot wait any longer!!!',
        'Give it another try~'
    ];

    function pickLine() {
        if (trioLines.length === 1) return 0;
        let i = Math.floor(Math.random() * trioLines.length);
        if (i === lastLineIndex) i = (i + 1) % trioLines.length; // never repeat back-to-back
        lastLineIndex = i;
        return i;
    }

    function showAngryCat() {
        if (!catEl) return;
        if (catBubbleEl) catBubbleEl.textContent = trioLines[pickLine()];

        clearTimeout(catTimer);
        catEl.classList.remove('is-leaving');
        void catEl.offsetWidth;   // restart the transition cleanly
        catEl.classList.add('is-visible');
        catTimer = setTimeout(() => {
            catEl.classList.add('is-leaving');
            setTimeout(() => catEl.classList.remove('is-visible', 'is-leaving'), 400);
        }, 1700);
    }

    function hideAngryCat() {
        if (!catEl) return;
        clearTimeout(catTimer);
        catEl.classList.remove('is-visible');
        catEl.classList.add('is-leaving');
        setTimeout(() => catEl.classList.remove('is-leaving'), 400);
    }

    function addDigit(d) {
        if (busy || entered.length >= PASSCODE.length) return;
        entered += d;
        renderDots();
        blip(540 + entered.length * 42, 0.11);
        giftReact('is-pop', 380);
        puffHearts(2);
        if (entered.length === PASSCODE.length) setTimeout(submit, 230);
    }

    function removeDigit() {
        if (busy || !entered.length) return;
        entered = entered.slice(0, -1);
        renderDots();
        blip(300, 0.11);
    }

    function submit() {
        if (busy || entered.length < PASSCODE.length) {
            if (!busy && entered.length)
                setMsg(`That is not all ${PASSCODE.length} digits yet 🎀`, '');
            return;
        }
        if (entered === PASSCODE) unlock();
        else reject();
    }

    // Gradient text (`-webkit-text-fill-color: transparent` + `background-
    // clip: text`, used by .lock-msg.hint) clips colour emoji the same way
    // it clips letters — the browser can't paint a colour bitmap glyph
    // through a gradient fill, so it flattens the emoji into a solid blob
    // instead of showing it. Wrapping each emoji in its own span and
    // resetting the fill/clip there lets it render as a normal colour glyph
    // no matter what style the surrounding text carries.
    const EMOJI_RE = /\p{Extended_Pictographic}️?/gu;
    function setMsg(text, cls) {
        msgEl.innerHTML = text.replace(EMOJI_RE, m => `<span class="msg-emoji">${m}</span>`);
        msgEl.className = 'lock-msg' + (cls ? ' ' + cls : '');
    }

    function reject() {
        busy = true;
        attempts++;
        dotsWrap.classList.add('wrong');
        panel.classList.add('is-wrong');
        giftReact('is-wrong', 600);
        showAngryCat();
        blip(170, 0.3, 'triangle');

        const lines = [
            'Not quite — try again 🥺',
            'So close 😉',
            'Hint: a date that means something to us 😉'
        ];
        // The hint carries the title's own look (serif italic gradient),
        // not the plain red error styling the first two lines use.
        const idx = Math.min(attempts - 1, lines.length - 1);
        setMsg(lines[idx], idx === lines.length - 1 ? 'hint' : 'error');

        setTimeout(() => {
            entered = '';
            dotsWrap.classList.remove('wrong');
            panel.classList.remove('is-wrong');
            renderDots();
            busy = false;
            if (ghostInput) ghostInput.focus({ preventScroll: true });
        }, 700);
    }

    /* ───────────────────────────────
       🎉 Unwrap sequence
       ─────────────────────────────── */
    function unlock() {
        busy = true;
        try { sessionStorage.setItem(STORAGE_KEY, '1'); } catch (e) { }

        dotsWrap.classList.remove('wrong');
        dotsWrap.classList.add('correct');
        setMsg('That is it!! 🔓', 'success');
        hideAngryCat();

        // No scale/particles/movement here, but the message still deserves
        // a beat to actually be read before the screen fades — the old
        // 400ms cut it off mid-glance.
        if (REDUCED) { finish(900); return; }

        screenEl.classList.add('is-unlocked');
        chord();

        if (window.gsap) {
            if (raysEl) {
                gsap.to(raysEl, { opacity: 0.85, duration: 0.6, delay: 0.25, ease: 'power2.out' });
                gsap.to(raysEl, { opacity: 0, duration: 1, delay: 1.25, ease: 'power2.in' });
            }
            if (flashEl) {
                gsap.to(flashEl, {
                    opacity: 1, duration: 0.3, delay: 0.75, ease: 'power2.out',
                    onComplete: () => gsap.to(flashEl, { opacity: 0, duration: 0.85 })
                });
            }
            // The card steps aside so the light show owns the screen.
            gsap.to(panel, { y: 26, opacity: 0, scale: 0.96, duration: 0.6, delay: 0.45, ease: 'power2.in' });
        }

        bloomPetals();
        puffHearts(28);
        setTimeout(giftConfetti, 400);
        setTimeout(() => burstEmoji(['🎀', '💗', '✨', '🎉', '🩷', '🫧'], 24), 520);

        finish(1650);
    }

    function finish(delay) {
        setTimeout(() => {
            screenEl.classList.add('is-hidden');
            document.body.classList.remove('is-locked');
            document.body.classList.add('is-unlocked');

            setTimeout(() => {
                screenEl.classList.add('is-removed');
                stopBokeh();
            }, 900);

            document.removeEventListener('keydown', onKey);
            if (typeof window.startLandingExperience === 'function') {
                window.startLandingExperience();
            }
            document.dispatchEvent(new CustomEvent('birthday:unlocked'));
        }, delay);
    }

    /* ───────────────────────────────
       Effects
       ─────────────────────────────── */
    const PARTY = ['#ff8fbb', '#ffb0ce', '#b79bff', '#d9c4ff', '#ffd76e', '#ffffff', '#9dd6ff'];

    function giftConfetti() {
        if (typeof confetti !== 'function') return;
        const shoot = (x, angle) => confetti({
            particleCount: 65, spread: 74, startVelocity: 52, angle: angle,
            origin: { x: x, y: 0.68 }, colors: PARTY, scalar: 1.1, ticks: 210, zIndex: 100010
        });
        shoot(0.1, 62);
        shoot(0.9, 118);
        setTimeout(() => confetti({
            particleCount: 120, spread: 125, startVelocity: 40,
            origin: { y: 0.48 }, colors: PARTY, scalar: 1.25, ticks: 250, zIndex: 100010
        }), 240);
    }

    function burstEmoji(set, count) {
        const cx = window.innerWidth / 2;
        const cy = window.innerHeight * 0.44;
        for (let i = 0; i < count; i++) {
            const el = document.createElement('div');
            el.textContent = set[i % set.length];
            el.style.cssText = `position:fixed;left:${cx}px;top:${cy}px;
                font-size:${Math.random() * 20 + 16}px;z-index:100011;pointer-events:none`;
            document.body.appendChild(el);
            const a = (i / count) * Math.PI * 2;
            const dist = Math.random() * 230 + 150;
            if (window.gsap) {
                gsap.to(el, {
                    x: Math.cos(a) * dist,
                    y: Math.sin(a) * dist - 70,
                    rotation: (Math.random() - 0.5) * 380,
                    opacity: 0, scale: 0.4,
                    duration: 1.5, ease: 'power2.out',
                    onComplete: () => el.remove()
                });
            } else {
                setTimeout(() => el.remove(), 1200);
            }
        }
    }

    /* ───────────────────────────────
       🫧 Floating bubbles & hearts (Retina-aware)
       ─────────────────────────────── */
    const canvas = document.getElementById('lock-bokeh');
    const ctx = canvas ? canvas.getContext('2d') : null;
    let bits = [];
    let rafId = null;

    function sizeCanvas() {
        if (!canvas) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(window.innerWidth * dpr);
        canvas.height = Math.floor(window.innerHeight * dpr);
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    const HUES = [
        [255, 143, 187],   // pink
        [183, 155, 255],   // lavender
        [255, 215, 110],   // butter
        [157, 214, 255]    // sky
    ];

    function makeBit(fromBottom) {
        const h = window.innerHeight;
        const c = HUES[(Math.random() * HUES.length) | 0];
        return {
            heart: Math.random() < 0.32,
            x: Math.random() * window.innerWidth,
            y: fromBottom ? h + 40 + Math.random() * 120 : Math.random() * h,
            size: Math.random() * 15 + 7,
            vy: -(Math.random() * 0.55 + 0.22),
            rot: Math.random() * Math.PI * 2,
            vr: (Math.random() - 0.5) * 0.02,
            sway: Math.random() * Math.PI * 2,
            swaySpeed: Math.random() * 0.016 + 0.006,
            c: c,
            alpha: Math.random() * 0.4 + 0.22
        };
    }

    function drawHeart(s) {
        ctx.beginPath();
        ctx.moveTo(0, s * 0.32);
        ctx.bezierCurveTo(-s * 0.58, -s * 0.12, -s * 0.5, -s * 0.68, 0, -s * 0.36);
        ctx.bezierCurveTo(s * 0.5, -s * 0.68, s * 0.58, -s * 0.12, 0, s * 0.32);
        ctx.closePath();
        ctx.fill();
    }

    function drawBit(b) {
        ctx.save();
        ctx.translate(b.x, b.y);
        ctx.rotate(b.rot);
        ctx.globalAlpha = b.alpha;
        const [r, g, bl] = b.c;

        if (b.heart) {
            ctx.fillStyle = `rgb(${r},${g},${bl})`;
            drawHeart(b.size);
        } else {
            // Soft bubble: translucent fill + a bright rim and a highlight dot
            const grad = ctx.createRadialGradient(0, 0, b.size * 0.1, 0, 0, b.size);
            grad.addColorStop(0, `rgba(${r},${g},${bl},0.05)`);
            grad.addColorStop(0.72, `rgba(${r},${g},${bl},0.16)`);
            grad.addColorStop(1, `rgba(${r},${g},${bl},0.45)`);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, b.size, 0, Math.PI * 2);
            ctx.fill();

            ctx.globalAlpha = b.alpha * 0.8;
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ctx.beginPath();
            ctx.arc(-b.size * 0.32, -b.size * 0.34, b.size * 0.17, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    function tick() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        ctx.clearRect(0, 0, w, h);
        for (const b of bits) {
            b.sway += b.swaySpeed;
            b.y += b.vy;
            b.x += Math.sin(b.sway) * 0.55;
            b.rot += b.vr;
            if (b.y + b.size < -20) { b.y = h + b.size + 20; b.x = Math.random() * w; }
            if (b.x < -60) b.x = w + 40;
            if (b.x > w + 60) b.x = -40;
            drawBit(b);
        }
        ctx.globalAlpha = 1;
        rafId = requestAnimationFrame(tick);
    }

    function startBokeh() {
        if (!ctx || REDUCED) return;
        sizeCanvas();
        const count = window.innerWidth < 768 ? 26 : 44;
        bits = Array.from({ length: count }, () => makeBit(false));
        if (rafId === null) rafId = requestAnimationFrame(tick);
    }

    function stopBokeh() {
        if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
        bits = [];
        if (ctx) ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }

    // Extra hearts rising from the box
    function puffHearts(n) {
        if (!ctx || REDUCED || bits.length > 110) return;
        for (let i = 0; i < n; i++) {
            const b = makeBit(true);
            b.heart = true;
            b.vy *= 2.4;
            b.alpha = Math.random() * 0.35 + 0.45;
            bits.push(b);
        }
    }

    // 🌸 A quiet, natural payoff for the correct code — a soft ring of light
    // and a handful of petals drifting up and fading. Deliberately gentler
    // than the confetti/emoji burst firing alongside it, so the unlock
    // moment has a soft layer under the loud one, not just more loud.
    const PETAL_COLORS = ['#ff8fbb', '#ffb0ce', '#b79bff', '#d9c4ff', '#ffd76e'];
    function bloomPetals() {
        if (!bloomLayer || REDUCED) return;

        const ring = document.createElement('span');
        ring.className = 'bloom-ring';
        bloomLayer.appendChild(ring);
        setTimeout(() => ring.remove(), 1300);

        const n = 10;
        for (let i = 0; i < n; i++) {
            const petal = document.createElement('span');
            petal.className = 'petal';
            // Spread in a soft upward fan rather than a full circle, so it
            // reads as "rising" instead of "exploding".
            const angle = (Math.random() * 140 - 70) * (Math.PI / 180);
            const dist = 70 + Math.random() * 90;
            const dx = Math.sin(angle) * dist;
            const dy = -Math.cos(angle) * dist - 30;
            const size = 7 + Math.random() * 7;
            petal.style.setProperty('--dx', dx.toFixed(1) + 'px');
            petal.style.setProperty('--dy', dy.toFixed(1) + 'px');
            petal.style.setProperty('--rot', (Math.random() * 360 - 180).toFixed(0) + 'deg');
            petal.style.setProperty('--dur', (1.3 + Math.random() * 0.8).toFixed(2) + 's');
            petal.style.setProperty('--delay', (Math.random() * 0.35).toFixed(2) + 's');
            petal.style.width = size + 'px';
            petal.style.height = size + 'px';
            petal.style.background = PETAL_COLORS[i % PETAL_COLORS.length];
            bloomLayer.appendChild(petal);
            setTimeout(() => petal.remove(), 2300);
        }
    }

    /* ───────────────────────────────
       Tiny sound engine
       ─────────────────────────────── */
    let actx = null;
    function audio() {
        if (!actx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return null;
            actx = new AC();
        }
        if (actx.state === 'suspended') actx.resume();
        return actx;
    }

    function blip(freq, dur, type) {
        const a = audio();
        if (!a) return;
        try {
            const osc = a.createOscillator();
            const gain = a.createGain();
            osc.type = type || 'sine';
            osc.frequency.setValueAtTime(freq, a.currentTime);
            gain.gain.setValueAtTime(0.1, a.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
            osc.connect(gain).connect(a.destination);
            osc.start();
            osc.stop(a.currentTime + dur);
        } catch (e) { }
    }

    function chord() {
        [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((n, i) => {
            setTimeout(() => blip(n, 0.7), i * 105);
        });
    }

    /* ───────────────────────────────
       Keyboard support
       ─────────────────────────────── */
    function onKey(e) {
        if (e.key >= '0' && e.key <= '9') { addDigit(e.key); e.preventDefault(); }
        else if (e.key === 'Backspace') { removeDigit(); e.preventDefault(); }
        else if (e.key === 'Enter') { submit(); e.preventDefault(); }
    }

    /* ───────────────────────────────
       Boot
       ─────────────────────────────── */
    let resizeTimer = null;
    window.addEventListener('resize', () => {
        if (screenEl.classList.contains('is-removed')) return;
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(sizeCanvas, 150);
    });

    document.addEventListener('visibilitychange', () => {
        if (screenEl.classList.contains('is-removed')) return;
        if (document.hidden) stopBokeh();
        else startBokeh();
    });

    buildDots();
    buildKeypad();
    renderDots();
    setMsg('', '');

    let alreadyIn = false;
    try { alreadyIn = sessionStorage.getItem(STORAGE_KEY) === '1'; } catch (e) { }

    if (alreadyIn) {
        // Same tab session — skip the gate entirely, no flash of the lock screen.
        screenEl.classList.add('is-hidden', 'is-removed');
        document.body.classList.remove('is-locked');
        document.body.classList.add('is-unlocked');
        stopBokeh();
        if (typeof window.startLandingExperience === 'function') window.startLandingExperience();
        document.dispatchEvent(new CustomEvent('birthday:unlocked'));
    } else {
        document.body.classList.add('is-locked');
        // One-shot entrance; dropped once finished so a later shake can't restart it.
        panel.classList.add('is-entering');
        setTimeout(() => panel.classList.remove('is-entering'), 1300);
        startBokeh();
        document.addEventListener('keydown', onKey);
        setTimeout(() => { if (ghostInput) ghostInput.focus({ preventScroll: true }); }, 600);
    }
})();
