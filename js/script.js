/* ═══════════════════════════════════════
   👑 Ultra-Grand HappyBirthdayGF Script
   ═══════════════════════════════════════ */

const CONFIG = {
    name: 'Tongjai',
    greetingText: "I'm so glad to have you here. May this birthday be filled with smiles and happiness!",
    // Four, not three: the grid is two columns from 768px up (iPad included),
    // so an odd count leaves the last card stranded alone on its own row.
    // Keep this list even if you swap the pictures out.
    // `focus` is the crop anchor (a CSS object-position). The frame is wider
    // than it is tall, so a tall photo loses its top and bottom — and the
    // default centre crop lands below the face. Lower the second number to
    // pull the visible window UP toward the head. Omit it for a centre crop.
    photos: [
        { src: 'gallery/S__12705803_0.jpg', caption: 'Simply Stunning ✨' },
        { src: 'gallery/S__12705801_0.jpg', caption: 'Together Vibes 💕' },
        { src: 'gallery/S__12705827_0.jpg', caption: 'Soft & Sweet 🌸', focus: '50% 22%' },
        { src: 'gallery/S__12705812_0.jpg', caption: 'Pure Magic ✨', focus: '50% 20%' }
    ],
    timeline: [
        {
            img: 'gallery/S__12705810_0.jpg',
            title: 'Her Beautiful Smile',
            text: "You're honestly one of the sweetest people I've ever met. I feel so lucky and grateful to have such a wonderful bond with you."
        },
        {
            img: 'gallery/S__12705811_0.jpg',
            title: 'Together Vibes',
            text: "Growing, succeeding, and smiling through life together. 😊💕"
        },
        {
            img: 'gallery/S__12705821_0.jpg',
            title: 'Soft & Sweet',
            text: "Keep being the amazing person you are—you make every moment brighter. 🌸💖"
        }
    ],
    // Kept for reference only — the parchment letter it fed was removed when
    // the envelope stopped being a button. Nothing reads these now.
    letterText: `Dear Tongjai,\n\nOn this special day, I want you to know how truly amazing you are. Your smile lights up every room, your kindness touches every heart, and your spirit inspires everyone around you.\n\nYou deserve all the love, happiness, and beautiful things this world has to offer. May this new year of your life bring you closer to your dreams and fill your heart with joy.\n\nHappy Birthday, beautiful soul! 🎂✨`,
    letterSignature: 'With all my love 💝'
};

// ─── Shared helpers ───
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Retina-crisp canvas sizing (iPad Gen 11 is a @2x display — without this the
// particles render soft/blurry).
function fitCanvas(canvas, host) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = host.offsetWidth;
    const h = host.offsetHeight;
    canvas.width = Math.max(1, Math.floor(w * dpr));
    canvas.height = Math.max(1, Math.floor(h * dpr));
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    canvas.getContext('2d').setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w, h };
}

function debounce(fn, ms) {
    let t = null;
    return function () {
        clearTimeout(t);
        t = setTimeout(fn, ms);
    };
}

// ─── Sound Engine (Web Audio API) ───
class SoundEngine {
    constructor() {
        this.ctx = null;
        this.muted = false;
    }
    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return;
            this.ctx = new AudioCtx();
        }
        // iPadOS / Safari start the context suspended until a user gesture.
        if (this.ctx.state === 'suspended') this.ctx.resume();
    }
    playChime(freq = 523.25, duration = 0.5) {
        if (this.muted) return;
        this.init();
        if (!this.ctx) return;
        try {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch(e){}
    }
    playMagicPop() {
        if (this.muted) return;
        this.playChime(659.25, 0.2);
        setTimeout(() => this.playChime(880, 0.4), 100);
    }
    playFanfare() {
        if (this.muted) return;
        const notes = [523.25, 659.25, 783.99, 1046.50];
        notes.forEach((n, idx) => {
            setTimeout(() => this.playChime(n, 0.4), idx * 120);
        });
    }
}
const sounds = new SoundEngine();

// ─── Initialize Everything on Load ───
document.addEventListener('DOMContentLoaded', () => {
    initParticles();
    initCandles();
    initEnvelopeModal();
    init3DPolaroids();
    initTimeline();
    initLightbox();
    initScrollAnimations();
    initFinaleParticles();
    initCursorSparkles();
    initKeyboardShortcuts();
    domReady = true;
    if (landingQueued) initLandingAnimations();
});

/* ═══════════════════════════════════════
   🔓 Handoff from the lock screen
   The hero intro must not play behind the gate — lock.js calls
   startLandingExperience() the moment the passcode is accepted.
   ═══════════════════════════════════════ */
let domReady = false;
let landingQueued = false;
let landingStarted = false;

window.startLandingExperience = function () {
    if (landingStarted) return;
    landingStarted = true;
    if (!domReady) { landingQueued = true; return; }
    initLandingAnimations();
};

// Safety net: if lock.js fails to load for any reason, never leave the
// visitor staring at a frozen page.
window.addEventListener('load', () => {
    setTimeout(() => {
        if (!document.getElementById('lock-screen')) window.startLandingExperience();
    }, 100);
});

// Returning from companion pages lands on the chapter that launched them
// instead of the top of the page. lock.js dispatches this the
// moment the gate opens — for an already-unlocked session that happens
// synchronously during parsing, before DOMContentLoaded, so this listener
// has to be registered up here (not inside DOMContentLoaded) or it would
// miss the event entirely. The jump is instant so nothing flashes the hero
// section first.
document.addEventListener('birthday:unlocked', () => {
    const returnTargets = new Set(['#love-letter', '#gift-reveal']);
    if (!returnTargets.has(location.hash)) return;
    const target = document.getElementById(location.hash.slice(1));
    if (!target) return;
    const html = document.documentElement;
    const prevBehavior = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';
    target.scrollIntoView({ block: 'start' });
    html.style.scrollBehavior = prevBehavior;
}, { once: true });

/* ═══════════════════════════════════════
   Hero Landing & Typewriter
   ═══════════════════════════════════════ */
function initLandingAnimations() {
    if (window.gsap && !REDUCED_MOTION) {
        // fromTo (not from): the end state is stated explicitly, so a stalled
        // ticker or an interrupted tween can never leave the hero — especially
        // the CTA button — stranded at its invisible start state.
        const tl = gsap.timeline({
            defaults: { ease: 'back.out(1.7)' },
            onComplete: revealLanding
        });

        tl.fromTo('.landing-glow',
                { opacity: 0, scale: 0.6 }, { opacity: 1, scale: 1, duration: 1.1 })
          .fromTo('.hero-heart',
                { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.8 }, '-=0.9')
          .fromTo('.landing-title',
                { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.8 }, '-=0.45')
          .fromTo('.landing-cta',
                { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.7 }, '-=0.3');

        // Hard failsafe — whatever happens to the timeline, the hero is
        // guaranteed visible shortly after it should have finished.
        setTimeout(revealLanding, 4000);
    }

    const subtitleEl = document.querySelector('.landing-subtitle');
    if (!subtitleEl) return;

    const txt = CONFIG.greetingText;
    if (REDUCED_MOTION) {
        subtitleEl.textContent = txt;
        return;
    }

    subtitleEl.textContent = '';
    let idx = 0;
    (function type() {
        if (idx < txt.length) {
            subtitleEl.textContent += txt.charAt(idx);
            idx++;
            setTimeout(type, 45);
        }
    })();
}

// Strip every inline style the intro left behind and hand the hero back to CSS.
function revealLanding() {
    document.querySelectorAll(
        '.landing-glow, .hero-heart, .landing-title, .landing-cta'
    ).forEach(el => {
        el.style.removeProperty('opacity');
        el.style.removeProperty('transform');
        el.style.removeProperty('scale');
        el.style.removeProperty('rotate');
        el.style.removeProperty('translate');
    });
}

/* ═══════════════════════════════════════
   🫧 Canvas Particles (Landing) — floating bubbles
   ═══════════════════════════════════════ */
function initParticles() {
    const canvas = document.getElementById('landing-particles');
    const sec = document.getElementById('landing');
    if (!canvas || !sec || REDUCED_MOTION) return;

    const ctx = canvas.getContext('2d');
    // Soft pastel palette — same family as the gift-box gate.
    const colors = [
        [255, 143, 187],   // pink
        [183, 155, 255],   // lavender
        [255, 215, 110],   // butter
        [157, 214, 255],   // sky
        [255, 176, 206]    // blush
    ];
    let particles = [];
    let size = { w: 0, h: 0 };
    let rafId = null;
    let visible = true;

    function spawn(p) {
        p.x = Math.random() * size.w;
        p.y = size.h + 20 + Math.random() * 60;
        p.r = Math.random() * 14 + 6;
        p.sy = -(Math.random() * 0.85 + 0.3);
        p.rot = Math.random() * Math.PI * 2;
        p.vr = (Math.random() - 0.5) * 0.02;
        p.sway = Math.random() * Math.PI * 2;
        p.swaySpeed = Math.random() * 0.017 + 0.006;
        p.c = colors[Math.floor(Math.random() * colors.length)];
        p.alpha = Math.random() * 0.35 + 0.2;
        return p;
    }

    function drawParticle(p) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.globalAlpha = p.alpha;
        const [r, g, b] = p.c;

        // Bubble: translucent body, brighter rim, small highlight
        const grad = ctx.createRadialGradient(0, 0, p.r * 0.1, 0, 0, p.r);
        grad.addColorStop(0, `rgba(${r},${g},${b},0.05)`);
        grad.addColorStop(0.72, `rgba(${r},${g},${b},0.18)`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0.5)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, p.r, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = p.alpha * 0.85;
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.beginPath();
        ctx.arc(-p.r * 0.32, -p.r * 0.34, p.r * 0.17, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    function resize() {
        size = fitCanvas(canvas, sec);
        // Keep every particle inside the new box instead of stranding
        // them off-screen after an iPad rotation.
        particles.forEach(p => {
            if (p.x > size.w) p.x = Math.random() * size.w;
            if (p.y > size.h + 90) p.y = Math.random() * size.h;
        });
    }

    resize();
    particles = Array.from({ length: 60 }, () => {
        const p = spawn({});
        p.y = Math.random() * size.h;
        return p;
    });
    window.addEventListener('resize', debounce(resize, 150));

    function animate() {
        rafId = null;
        if (!visible || document.hidden) return;
        ctx.clearRect(0, 0, size.w, size.h);
        for (const p of particles) {
            p.sway += p.swaySpeed;
            p.y += p.sy;
            p.x += Math.sin(p.sway) * 0.6;
            p.rot += p.vr;
            if (p.y + p.r < -20) spawn(p);
            drawParticle(p);
        }
        ctx.globalAlpha = 1;
        rafId = requestAnimationFrame(animate);
    }

    function play() {
        if (rafId === null && visible && !document.hidden) rafId = requestAnimationFrame(animate);
    }

    // Only burn frames while the hero is actually on screen.
    if (typeof IntersectionObserver !== 'undefined') {
        new IntersectionObserver(entries => {
            visible = entries[0].isIntersecting;
            play();
        }, { threshold: 0.01 }).observe(sec);
    }
    document.addEventListener('visibilitychange', play);
    play();
}

/* ═══════════════════════════════════════
   🎂 Interactive Candles & Confetti
   ═══════════════════════════════════════ */
function initCandles() {
    const candles = document.querySelectorAll('.candle');
    const blowBtn = document.getElementById('blow-all-btn');
    const blowLabel = document.getElementById('blow-btn-label');
    const chargeFill = document.getElementById('blow-charge-fill');
    const blowHint = document.getElementById('blow-hint');
    let litCount = 0;

    // Coming back from the Galaxy Gallery (or reloading after already
    // blowing them out) — the wish has already happened, so light the
    // candles at rest instead of making the visitor blow again.
    let alreadyDone = false;
    try { alreadyDone = sessionStorage.getItem('bd_candles_done') === '1'; } catch (e) {}
    if (alreadyDone) {
        candles.forEach(c => c.classList.add('lit'));
        litCount = candles.length;
        if (blowLabel) blowLabel.textContent = 'Make A Wish Come True';
        if (chargeFill) chargeFill.style.width = '100%';
        if (blowBtn) blowBtn.classList.add('is-done');
    }

    /* Candles start unlit and are lit one-by-one as the reward for a
       completed blow — they are not individually clickable, because the
       whole point is that nothing lights up until the wish is finished. */
    function lightCandle(c) {
        if (c.classList.contains('lit')) return;
        c.classList.add('lit');
        litCount++;
        sounds.playChime(700 + litCount * 150, 0.3);
    }

    function lightAllCandles() {
        candles.forEach((c, i) => {
            // small stagger so they catch light one after another
            setTimeout(() => lightCandle(c), i * 220);
        });
        setTimeout(celebrateCake, candles.length * 220 + 120);
    }

    /* 🎤 Blow-to-charge: press and hold the button and the rail fills.
       Blowing hard is the fast path, but the rail never stalls: any faint
       sound speeds it up, and simply holding still charges it at a slow
       floor rate. That floor is the safety net for a mic that is muted,
       denied, unsupported, or just too quiet to cross the blow threshold —
       the button always completes eventually rather than sticking at 0. */
    const CHARGE_PER_FRAME = 1.7;    // real blow: ~60 frames (~1s @60fps) to fill
    const SOFT_CHARGE_PER_FRAME = 0.95; // faint sound picked up: middle speed
    const HOLD_FLOOR_PER_FRAME = 0.45;  // silent hold: ~3.7s to fill, never stalls
    const HOLD_ONLY_PER_FRAME = 0.6; // no-mic fallback: holding alone, slower
    const BLOW_RMS_THRESHOLD = 28;  // time-domain RMS out of a possible 0-128
    const SOFT_RMS_THRESHOLD = 7;   // "the mic hears something" floor

    let audioCtx = null, analyser = null, micData = null, micStream = null;
    let micState = 'idle'; // idle | requesting | ready | denied | unsupported
    let holding = false;
    let charge = 0;
    let chargeRaf = null;
    let justCompleted = false; // swallow the click that the completing pointerup itself fires

    function setHint(text) {
        if (blowHint) blowHint.textContent = text;
    }

    async function ensureMic() {
        if (micState === 'ready' || micState === 'requesting') return;
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            micState = 'unsupported';
            setHint('Hold the button to charge it up 🎂');
            return;
        }
        micState = 'requesting';
        setHint('Requesting microphone access…');
        try {
            micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            if (audioCtx.state === 'suspended') await audioCtx.resume();
            const source = audioCtx.createMediaStreamSource(micStream);
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 512;
            micData = new Uint8Array(analyser.fftSize);
            source.connect(analyser);
            micState = 'ready';
            if (holding) setHint('Keep holding — blow to fill it faster');
        } catch (err) {
            micState = 'denied';
            if (holding) setHint('No mic access — just keep holding to charge 🎂');
        }
    }

    function currentBlowLevel() {
        if (micState !== 'ready' || !analyser) return 0;
        analyser.getByteTimeDomainData(micData);
        let sumSq = 0;
        for (let i = 0; i < micData.length; i++) {
            const v = micData[i] - 128;
            sumSq += v * v;
        }
        return Math.sqrt(sumSq / micData.length);
    }

    function resetCharge() {
        charge = 0;
        if (chargeFill) chargeFill.style.width = '0%';
    }

    function stopMic() {
        if (micStream) { micStream.getTracks().forEach(t => t.stop()); micStream = null; }
        if (audioCtx) { audioCtx.close().catch(() => {}); audioCtx = null; }
        analyser = null;
    }

    function chargeStep() {
        if (!holding || blowBtn.classList.contains('is-done')) { chargeRaf = null; return; }

        // Holding always earns at least the floor rate, so a silent or
        // unheard mic can never leave the visitor stuck. Sound only makes
        // it faster.
        let gain = HOLD_FLOOR_PER_FRAME;
        let blowing = false;
        if (micState === 'ready') {
            const level = currentBlowLevel();
            if (level > BLOW_RMS_THRESHOLD) { gain = CHARGE_PER_FRAME; blowing = true; }
            else if (level > SOFT_RMS_THRESHOLD) { gain = SOFT_CHARGE_PER_FRAME; blowing = true; }
        } else if (micState === 'denied' || micState === 'unsupported') {
            gain = HOLD_ONLY_PER_FRAME;
        }
        blowBtn.classList.toggle('is-blowing', blowing);

        charge = Math.min(100, charge + gain);
        if (chargeFill) chargeFill.style.width = charge + '%';
        if (charge >= 100) {
            holding = false;
            justCompleted = true;
            blowBtn.classList.remove('is-blowing');
            stopMic();
            lightAllCandles();
            return;
        }
        chargeRaf = requestAnimationFrame(chargeStep);
    }

    function startHold() {
        if (blowBtn.classList.contains('is-done') || holding) return;
        holding = true;
        resetCharge();
        if (micState === 'ready') setHint('Keep holding — blow to fill it faster');
        else if (micState === 'denied' || micState === 'unsupported') setHint('Keep holding to charge it up 🎂');
        else setHint('Keep holding — blow to fill it faster');
        ensureMic();
        if (!chargeRaf) chargeRaf = requestAnimationFrame(chargeStep);
    }

    function endHold() {
        if (!holding) return;
        holding = false;
        blowBtn.classList.remove('is-blowing');
        if (!blowBtn.classList.contains('is-done')) {
            resetCharge();
            setHint('Press and hold, then blow into your mic');
        }
    }

    if (blowBtn) {
        blowBtn.addEventListener('pointerdown', (e) => {
            if (blowBtn.classList.contains('is-done')) return;
            e.preventDefault();
            // Hold the pointer for the whole gesture. A finger resting on a
            // button always wanders a little, and the page can still settle a
            // pixel underneath it — without capture either one crosses the
            // button edge, fires pointerleave, and silently cancels a charge
            // the visitor is still holding. With capture, the release is the
            // only thing that ends it.
            try { blowBtn.setPointerCapture(e.pointerId); } catch (err) { }
            startHold();
        });
        ['pointerup', 'pointercancel'].forEach(evt => blowBtn.addEventListener(evt, endHold));

        // Keyboard equivalent of press-and-hold — the candles are no longer
        // individually operable, so this is the only non-pointer way in.
        // Space/Enter auto-repeat while held, so ignore the repeats.
        blowBtn.addEventListener('keydown', (e) => {
            if (e.key !== ' ' && e.key !== 'Enter') return;
            if (blowBtn.classList.contains('is-done')) return;
            e.preventDefault();
            if (e.repeat) return;
            startHold();
        });
        blowBtn.addEventListener('keyup', (e) => {
            if (e.key !== ' ' && e.key !== 'Enter') return;
            e.preventDefault();
            endHold();
        });
        blowBtn.addEventListener('blur', endHold);

        blowBtn.addEventListener('click', () => {
            // The pointerup that just finished charging fires its own click
            // right after — let the visitor actually see the celebration
            // and the "Make A Wish Come True" label before a click navigates.
            if (justCompleted) { justCompleted = false; return; }
            if (blowBtn.classList.contains('is-done')) {
                const next = document.getElementById('love-letter');
                if (next) next.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }

    function celebrateCake() {
        sounds.playFanfare();
        const partyColors = ['#ff8fbb', '#ffb0ce', '#b79bff', '#d9c4ff', '#ffd76e', '#ffffff'];
        if (typeof confetti === 'function') {
            confetti({ particleCount: 110, spread: 78, origin: { y: 0.6 }, colors: partyColors, scalar: 1.15 });
            setTimeout(() => confetti({
                particleCount: 70, spread: 110, startVelocity: 38,
                origin: { y: 0.55 }, colors: partyColors, scalar: 1.3
            }), 280);
        }
        const cake = document.querySelector('.gourmet-cake-wrapper');
        if (cake) burstHeartsAround(cake);
        if (blowBtn) {
            if (blowLabel) blowLabel.textContent = 'Make A Wish Come True';
            blowBtn.classList.add('is-done');
        }
        setHint('');
        stopMic();
        try { sessionStorage.setItem('bd_candles_done', '1'); } catch (e) {}
    }
}

/* ═══════════════════════════════════════
   💌 Interactive 3D Envelope & Parchment Modal (BUGFIXED)
   ═══════════════════════════════════════ */
function initEnvelopeModal() {
    // The envelope is decoration; the wax seal is the only control here, and
    // it leaves the birthday site entirely for the Galaxy Gallery.
    const waxSeal = document.getElementById('wax-seal');
    if (!waxSeal) return;

    let leaving = false;
    const goToGalaxy = (e) => {
        if (leaving) return;
        leaving = true;
        e.preventDefault();
        sounds.playMagicPop();
        burstHeartsAround(waxSeal);
        // Reaching the wax seal means the cake section is already behind
        // them — the Home button in the gallery brings them back here,
        // and the candles should be waiting lit, not reset to unlit.
        try { sessionStorage.setItem('bd_candles_done', '1'); } catch (err) { }
        window.location.href = 'galaxy-gallery/index.html';
    };

    waxSeal.addEventListener('click', goToGalaxy);
    waxSeal.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') goToGalaxy(e);
    });
}

/* ═══════════════════════════════════════
   Overlay helpers — scroll lock so the page behind
   doesn't scroll under the letter / lightbox on iPad.
   ═══════════════════════════════════════ */
function openOverlay(el) {
    el.classList.add('active');
    document.body.classList.add('overlay-open');
}

function closeOverlay(el) {
    el.classList.remove('active');
    if (!document.querySelector('.lightbox.active')) {
        document.body.classList.remove('overlay-open');
    }
}

/* ═══════════════════════════════════════
   ⌨️ Keyboard shortcuts (Esc closes any overlay)
   ═══════════════════════════════════════ */
function initKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        document.querySelectorAll('.lightbox.active')
            .forEach(el => (el._close ? el._close() : closeOverlay(el)));
    });
}

function burstHeartsAround(el) {
    if (!window.gsap || REDUCED_MOTION) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const hearts = ['💖', '💌', '🌸', '✨', '💕', '🌷', '💐'];

    for (let i = 0; i < 15; i++) {
        const h = document.createElement('div');
        h.textContent = hearts[Math.floor(Math.random() * hearts.length)];
        h.style.position = 'fixed';
        h.style.left = cx + 'px';
        h.style.top = cy + 'px';
        h.style.fontSize = (Math.random() * 20 + 16) + 'px';
        h.style.zIndex = '10006';
        h.style.pointerEvents = 'none';
        document.body.appendChild(h);

        const angle = (i / 15) * Math.PI * 2;
        const dist = Math.random() * 140 + 80;

        gsap.to(h, {
            x: Math.cos(angle) * dist,
            y: Math.sin(angle) * dist - 80,
            opacity: 0,
            scale: 0.5,
            duration: 1.2,
            ease: 'power2.out',
            onComplete: () => h.remove()
        });
    }
}

/* ═══════════════════════════════════════
   📸 3D Tilt Polaroid Gallery
   ═══════════════════════════════════════ */
function init3DPolaroids() {
    const grid = document.getElementById('polaroid-grid');
    if (!grid) return;

    CONFIG.photos.forEach((photo, idx) => {
        const card = document.createElement('div');
        card.className = 'polaroid-card';
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-label', `View full photo: ${photo.caption}`);
        card.innerHTML = `
            <div class="polaroid-img-wrap">
                <img src="${photo.src}" alt="${photo.caption}" loading="lazy" decoding="async">
            </div>
            <div class="polaroid-caption">${photo.caption}</div>
        `;

        // Crop anchor, read by .polaroid-img-wrap img's object-position.
        if (photo.focus) card.style.setProperty('--focus', photo.focus);

        // 3D Parallax Tilt — pointer only, so it never sticks after a tap on iPad.
        card.addEventListener('pointermove', (e) => {
            if (e.pointerType !== 'mouse' || REDUCED_MOTION) return;
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            card.style.transform =
                `perspective(1000px) rotateX(${-y / 12}deg) rotateY(${x / 12}deg) scale(1.04)`;
        });

        const reset = () => { card.style.transform = ''; };
        card.addEventListener('pointerleave', reset);
        card.addEventListener('pointercancel', reset);

        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                card.click();
            }
        });

        card.dataset.src = photo.src;
        card.dataset.caption = photo.caption;
        grid.appendChild(card);
    });
}

/* ═══════════════════════════════════════
   Lightbox
   ═══════════════════════════════════════ */
function initLightbox() {
    const lightbox = document.getElementById('lightbox');
    const lbClose = document.getElementById('lightbox-close');
    if (!lightbox) return;

    const lbImg = lightbox.querySelector('.lightbox-content img');

    document.addEventListener('click', (e) => {
        const card = e.target.closest('.polaroid-card');
        if (!card) return;
        sounds.playChime(600, 0.2);
        lbImg.src = card.dataset.src;
        lbImg.alt = card.dataset.caption || 'Full size photo';
        openOverlay(lightbox);
        if (lbClose) lbClose.focus({ preventScroll: true });
    });

    function close() {
        if (!lightbox.classList.contains('active')) return;
        closeOverlay(lightbox);
        // Free the decoded full-size image once it's off screen.
        setTimeout(() => {
            if (!lightbox.classList.contains('active')) lbImg.removeAttribute('src');
        }, 450);
    }

    if (lbClose) lbClose.addEventListener('click', close);
    lightbox.addEventListener('click', (e) => {
        if (e.target === lightbox) close();
    });

    lightbox._close = close;
}

/* ═══════════════════════════════════════
   🕰️ Timeline
   ═══════════════════════════════════════ */
function getTimelineDotIcon(idx) {
    return `
    <svg viewBox="0 0 24 24" class="timeline-dot-svg">
        <defs>
            <linearGradient id="grad-heart-${idx}" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="#ffb0ce" />
                <stop offset="100%" stop-color="#ff4d6d" />
            </linearGradient>
        </defs>
        <path fill="url(#grad-heart-${idx})" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
    </svg>`;
}

function initTimeline() {
    const wrapper = document.getElementById('timeline-wrapper');
    if (!wrapper) return;

    wrapper.innerHTML = CONFIG.timeline.map((m, idx) => `
        <article class="timeline-item timeline-item-${idx + 1}">
            <div class="timeline-dot" aria-hidden="true">${getTimelineDotIcon(idx)}</div>
            <div class="timeline-card">
                <img src="${m.img}" alt="${m.title}" loading="lazy" decoding="async">
                <h3 class="timeline-card-title">${m.title}</h3>
                <p class="timeline-card-text">${m.text}</p>
            </div>
        </article>
    `).join('');
}

/* ═══════════════════════════════════════
   Scroll Animations (GSAP)
   ═══════════════════════════════════════ */
function initScrollAnimations() {
    if (!window.gsap || !window.ScrollTrigger || REDUCED_MOTION) return;
    gsap.registerPlugin(ScrollTrigger);

    gsap.utils.toArray('.polaroid-card').forEach((card, idx) => {
        gsap.from(card, {
            scrollTrigger: { trigger: card, start: 'top 85%' },
            opacity: 0,
            y: 40,
            duration: 0.8,
            delay: idx * 0.15,
            // Hand the transform back to CSS so the 3D tilt isn't fighting GSAP.
            clearProps: 'transform'
        });
    });

    gsap.utils.toArray('.timeline-item').forEach((item, idx) => {
        const dot = item.querySelector('.timeline-dot');
        gsap.from(item, {
            scrollTrigger: { 
                trigger: item, 
                start: 'top 80%',
                onEnter: () => {
                    if (dot) dot.classList.add('is-active');
                }
            },
            opacity: 0,
            y: 50,
            duration: 0.8,
            delay: idx * 0.18,
            clearProps: 'transform'
        });
    });

}

/* ═══════════════════════════════════════
   🫧 Finale Background Particles (bubbles / hearts / sparkles)
   ═══════════════════════════════════════ */
function initFinaleParticles() {
    const canvas = document.getElementById('bg-particles-canvas');
    const sec = document.getElementById('finale');
    if (!canvas || !sec || REDUCED_MOTION) return;

    const ctx = canvas.getContext('2d');
    const TAU = Math.PI * 2;
    let size = { w: 0, h: 0 };
    let particles = [];
    let rafId = null;
    let visible = true;

    const PALETTE = [
        [237, 41, 89],   // vibrant rose
        [255, 107, 157], // hot pink
        [155, 44, 244],  // electric purple
        [255, 183, 3],   // gold
        [255, 77, 109]   // crimson
    ];

    function spawn(p) {
        p.x = Math.random() * size.w;
        p.y = size.h + 20 + Math.random() * 60;
        p.radius = Math.random() * 14 + 8;
        p.speedY = -(Math.random() * 0.55 + 0.22);
        p.sway = Math.random() * TAU;
        p.swaySpeed = Math.random() * 0.016 + 0.006;
        p.alpha = Math.random() * 0.4 + 0.45; // High contrast: 45%-85% opacity
        p.type = Math.random() < 0.45 ? 'bubble' : (Math.random() < 0.55 ? 'heart' : 'sparkle');
        p.color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
        return p;
    }

    function drawParticle(p) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.globalAlpha = p.alpha;
        const [r, g, b] = p.color;

        if (p.type === 'bubble') {
            const grad = ctx.createRadialGradient(0, 0, p.radius * 0.1, 0, 0, p.radius);
            grad.addColorStop(0, `rgba(255, 255, 255, 0.8)`);
            grad.addColorStop(0.5, `rgba(${r},${g},${b}, 0.5)`);
            grad.addColorStop(1, `rgba(${r},${g},${b}, 0.85)`);
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(0, 0, p.radius, 0, TAU);
            ctx.fill();
            ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
            ctx.beginPath();
            ctx.arc(-p.radius * 0.35, -p.radius * 0.35, p.radius * 0.22, 0, TAU);
            ctx.fill();
        } else if (p.type === 'heart') {
            ctx.fillStyle = `rgba(${r},${g},${b}, 0.85)`;
            const s = p.radius * 0.075;
            ctx.beginPath();
            for (let i = 0; i < 60; i++) {
                const t = (i / 60) * TAU;
                const hx = 16 * Math.pow(Math.sin(t), 3) * s;
                const hy = -(13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t)) * s;
                i === 0 ? ctx.moveTo(hx, hy) : ctx.lineTo(hx, hy);
            }
            ctx.closePath();
            ctx.fill();
        } else {
            ctx.fillStyle = `rgba(${r},${g},${b}, 0.9)`;
            const d = p.radius * 0.9;
            ctx.beginPath();
            ctx.moveTo(0, -d);
            ctx.quadraticCurveTo(d * 0.22, -d * 0.22, d, 0);
            ctx.quadraticCurveTo(d * 0.22, d * 0.22, 0, d);
            ctx.quadraticCurveTo(-d * 0.22, d * 0.22, -d, 0);
            ctx.quadraticCurveTo(-d * 0.22, -d * 0.22, 0, -d);
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    }

    function resize() {
        size = fitCanvas(canvas, sec);
        particles = Array.from({ length: 36 }, () => {
            const p = spawn({});
            p.y = Math.random() * size.h;
            return p;
        });
    }

    function animate() {
        rafId = null;
        if (!visible || document.hidden) return;
        ctx.clearRect(0, 0, size.w, size.h);
        for (const p of particles) {
            p.sway += p.swaySpeed;
            p.y += p.speedY;
            p.x += Math.sin(p.sway) * 0.28;
            if (p.y + p.radius < -20) spawn(p);
            drawParticle(p);
        }
        rafId = requestAnimationFrame(animate);
    }

    function play() {
        if (visible && rafId === null && !document.hidden) rafId = requestAnimationFrame(animate);
    }

    resize();
    window.addEventListener('resize', debounce(resize, 150));
    document.addEventListener('visibilitychange', play);

    if (typeof IntersectionObserver !== 'undefined') {
        new IntersectionObserver(entries => {
            visible = entries[0].isIntersecting;
            if (visible) play();
        }, { threshold: 0.01 }).observe(sec);
    } else {
        visible = true;
        play();
    }
}

/* ═══════════════════════════════════════
   ✨ Cursor Sparkle Trail
   ═══════════════════════════════════════ */
function initCursorSparkles() {
    // Skip on touch/coarse pointers and when the visitor asked for less motion.
    if (REDUCED_MOTION) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    let lastTime = 0;
    const sparkles = ['✨', '💖', '⭐', '🌸', '🌷'];

    document.addEventListener('mousemove', (e) => {
        const now = Date.now();
        if (now - lastTime > 45) {
            lastTime = now;
            const s = document.createElement('div');
            s.className = 'sparkle-particle';
            s.textContent = sparkles[Math.floor(Math.random() * sparkles.length)];
            s.style.left = e.clientX + 'px';
            s.style.top = e.clientY + 'px';
            s.style.setProperty('--dx', (Math.random() - 0.5) * 40 + 'px');
            s.style.setProperty('--dy', (Math.random() - 0.5) * 40 - 20 + 'px');
            document.body.appendChild(s);
            setTimeout(() => s.remove(), 800);
        }
    });
}
