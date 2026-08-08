/* ═══════════════════════════════════════
   👑 Ultra-Grand HappyBirthdayGF Script
   ═══════════════════════════════════════ */

const CONFIG = {
    name: 'Tongjai',
    greetingText: "I'm so glad to have you here. May this birthday be filled with smiles and happiness!",
    photos: [
        { src: 'assets/photos/d1.jpg', caption: 'Her Smile Says It All ✨' },
        { src: 'assets/photos/d2.jpg', caption: 'Together Vibes 💕' },
        { src: 'assets/photos/d3.jpg', caption: 'Pretty Soul 🌸' }
    ],
    timeline: [
        {
            img: 'assets/photos/d1.jpg',
            title: 'Her Beautiful Smile',
            text: "You're truly one of the sweetest girls I know, and I feel lucky to have a bond like ours. ❤️"
        },
        {
            img: 'assets/photos/d2.jpg',
            title: 'Together Vibes',
            text: "May your journey ahead be filled with happiness, success, and endless smiles. 😊💕"
        },
        {
            img: 'assets/photos/d3.jpg',
            title: 'Pretty Soul',
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
// particles and fireworks render soft/blurry).
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
    initAudioPill();
    initParticles();
    initCandles();
    initEnvelopeModal();
    init3DPolaroids();
    initTimeline();
    initLightbox();
    initScrollAnimations();
    initFireworks();
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

// Returning from the Galaxy Gallery (via its Home button) lands on
// #love-letter instead of the top of the page. lock.js dispatches this the
// moment the gate opens — for an already-unlocked session that happens
// synchronously during parsing, before DOMContentLoaded, so this listener
// has to be registered up here (not inside DOMContentLoaded) or it would
// miss the event entirely. The jump is instant (scroll-behavior overridden
// briefly) so nothing flashes the hero section first.
document.addEventListener('birthday:unlocked', () => {
    if (location.hash !== '#love-letter') return;
    const target = document.getElementById('love-letter');
    if (!target) return;
    const html = document.documentElement;
    const prevBehavior = html.style.scrollBehavior;
    html.style.scrollBehavior = 'auto';
    target.scrollIntoView({ block: 'start' });
    html.style.scrollBehavior = prevBehavior;
}, { once: true });

/* ═══════════════════════════════════════
   🎵 Audio Control Pill
   ═══════════════════════════════════════ */
function initAudioPill() {
    const pill = document.getElementById('audio-control-pill');
    const label = document.getElementById('audio-label');
    const icon = document.getElementById('audio-icon');

    if (!pill) return;

    pill.addEventListener('click', () => {
        sounds.muted = !sounds.muted;
        if (sounds.muted) {
            pill.classList.add('muted');
            label.textContent = 'Sound FX: OFF';
            icon.textContent = '🔇';
        } else {
            pill.classList.remove('muted');
            label.textContent = 'Sound FX: ON';
            icon.textContent = '🎵';
            sounds.playMagicPop();
        }
    });
}

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
                <span class="polaroid-slot-number" aria-hidden="true">${idx + 1}</span>
                <img src="${photo.src}" alt="${photo.caption}" loading="lazy" decoding="async">
            </div>
            <div class="polaroid-caption">${photo.caption}</div>
        `;

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
function initTimeline() {
    const wrapper = document.getElementById('timeline-wrapper');
    if (!wrapper) return;

    CONFIG.timeline.forEach(m => {
        const item = document.createElement('div');
        item.className = 'timeline-item';
        item.innerHTML = `
            <div class="timeline-dot"></div>
            <div class="timeline-card">
                <img src="${m.img}" alt="${m.title}" loading="lazy" decoding="async">
                <div class="timeline-card-title">${m.title}</div>
                <div>${m.text}</div>
            </div>
        `;
        wrapper.appendChild(item);
    });
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
        gsap.from(item, {
            scrollTrigger: { trigger: item, start: 'top 80%' },
            opacity: 0,
            y: 50,
            duration: 0.8,
            delay: idx * 0.2,
            clearProps: 'transform'
        });
    });

}

/* ═══════════════════════════════════════
   🌌 Fireworks (Finale)
   ═══════════════════════════════════════ */
function initFireworks() {
    const canvas = document.getElementById('fireworks-canvas');
    const sec = document.getElementById('finale');
    if (!canvas || !sec || REDUCED_MOTION) return;

    const ctx = canvas.getContext('2d');
    let running = false;
    let rafId = null;
    let sparks = [];
    let rockets = [];
    let cooldown = 0;
    let size = { w: 0, h: 0 };

    function resize() {
        size = fitCanvas(canvas, sec);
    }
    resize();
    window.addEventListener('resize', debounce(resize, 150));

    const TAU = Math.PI * 2;

    /* Pastel confetti-light palette (rose, blush, lavender, butter, sky)
       — the finale sits on a blush background now, so saturated rainbow
       sparks on black would read as a foreign element. */
    const SPARK_COLORS = [
        [217, 4, 41],     // deep rose
        [255, 95, 138],   // pink
        [244, 172, 183],  // rose gold
        [226, 175, 255],  // lavender
        [255, 215, 110],  // butter gold
        [157, 214, 255]   // soft sky
    ];
    const pickColor = () => SPARK_COLORS[(Math.random() * SPARK_COLORS.length) | 0];

    // Nudge each spark a little off its shell's colour so a burst reads as
    // one firework rather than a flat block of identical dots.
    function shade(rgb) {
        const d = () => (Math.random() - 0.5) * 38;
        return [
            Math.max(0, Math.min(255, rgb[0] + d())),
            Math.max(0, Math.min(255, rgb[1] + d())),
            Math.max(0, Math.min(255, rgb[2] + d()))
        ];
    }

    function glowDot(x, y, radius, rgb, alpha) {
        const [r, g, b] = rgb;
        const halo = radius * 3.2;
        const grad = ctx.createRadialGradient(x, y, 0, x, y, halo);
        grad.addColorStop(0, `rgba(${r|0},${g|0},${b|0},${alpha * 0.5})`);
        grad.addColorStop(1, `rgba(${r|0},${g|0},${b|0},0)`);
        ctx.globalAlpha = 1;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, halo, 0, TAU);
        ctx.fill();

        ctx.globalAlpha = alpha;
        ctx.fillStyle = `rgb(${r|0},${g|0},${b|0})`;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, TAU);
        ctx.fill();
    }

    /* A burst particle thrown out along a true polar angle — the previous
       version randomised vx/vy inside a square, which scattered a blob
       instead of opening a round shell. Drag + gravity let each spark slow
       and arc over the way a real firework does. */
    class Spark {
        constructor(x, y, angle, speed, rgb, life) {
            this.x = x;
            this.y = y;
            this.vx = Math.cos(angle) * speed;
            this.vy = Math.sin(angle) * speed;
            this.rgb = rgb;
            this.life = life;
            this.maxLife = life;
            this.radius = Math.random() * 1.4 + 1.7;
            this.phase = Math.random() * TAU;
        }
        update() {
            this.vx *= 0.962;          // air drag
            this.vy *= 0.962;
            this.vy += 0.055;          // gravity
            this.x += this.vx;
            this.y += this.vy;
            this.life--;
        }
        draw() {
            // Clamp at 0: update() runs before draw() and can push life
            // negative, and Math.pow(negative, 1.25) is NaN.
            const t = Math.max(0, this.life / this.maxLife);   // 1 → 0
            // Gentle falloff — a squared curve dimmed the shell to a haze
            // almost immediately against this pale background.
            let a = Math.pow(t, 1.25);
            // Twinkle as it dies, like real firework embers
            if (t < 0.6) a *= 0.62 + 0.38 * Math.sin(this.phase + (1 - t) * 24);
            a = Math.max(0, Math.min(1, a));
            glowDot(this.x, this.y, this.radius, this.rgb, a);
        }
        get dead() { return this.life <= 0; }
    }

    /* The shell climbing to its burst height, trailing a comet tail. */
    const ROCKET_GRAVITY = 0.13;

    class Rocket {
        constructor() {
            this.x = size.w * (0.14 + Math.random() * 0.72);
            this.y = size.h + 8;
            this.targetY = size.h * (0.14 + Math.random() * 0.26);
            // Derive the launch speed from the distance it actually has to
            // climb (v = √(2·a·d)). A hard-coded speed can't reach the top
            // of a tall section, and the shell would burst near the floor.
            const rise = Math.max(60, this.y - this.targetY);
            this.vy = -Math.sqrt(2 * ROCKET_GRAVITY * rise);
            this.rgb = pickColor();
            this.heart = Math.random() < 0.3;
            this.trail = [];
        }
        update() {
            this.trail.push({ x: this.x, y: this.y });
            if (this.trail.length > 7) this.trail.shift();
            this.vy += ROCKET_GRAVITY;     // slows as it climbs
            this.y += this.vy;
        }
        draw() {
            // Stroke between the sampled points rather than dotting them —
            // the shell covers ~13px per frame, so plain dots read as a
            // dashed line instead of a comet tail.
            const [r, g, b] = this.rgb;
            ctx.globalAlpha = 1;
            ctx.lineCap = 'round';
            for (let i = 1; i < this.trail.length; i++) {
                const p0 = this.trail[i - 1];
                const p1 = this.trail[i];
                const f = i / this.trail.length;    // tapers toward the tail
                ctx.strokeStyle = `rgba(${r|0},${g|0},${b|0},${f * 0.5})`;
                ctx.lineWidth = 0.6 + f * 2.4;
                ctx.beginPath();
                ctx.moveTo(p0.x, p0.y);
                ctx.lineTo(p1.x, p1.y);
                ctx.stroke();
            }
            glowDot(this.x, this.y, 2.5, this.rgb, 0.95);
        }
        // Burst at the top of the arc, or once it has run out of climb.
        get ready() { return this.y <= this.targetY || this.vy >= -0.7; }
    }

    function burstRing(x, y, rgb) {
        const count = 34 + (Math.random() * 12 | 0);
        const base = 3.3 + Math.random() * 1.5;
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * TAU + Math.random() * 0.07;
            // A little speed jitter keeps the ring from looking mechanical
            const speed = base * (0.8 + Math.random() * 0.4);
            sparks.push(new Spark(x, y, angle, speed, shade(rgb), 56 + Math.random() * 24));
        }
    }

    // Parametric heart, sampled evenly — the shell opens into a heart
    // rather than a circle, which suits the occasion better than a
    // generic starburst.
    function burstHeart(x, y, rgb) {
        const count = 46;
        const scale = (0.26 + Math.random() * 0.08);
        for (let i = 0; i < count; i++) {
            const t = (i / count) * TAU;
            const hx = 16 * Math.pow(Math.sin(t), 3);
            const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
            sparks.push(new Spark(
                x, y,
                Math.atan2(hy, hx),
                Math.hypot(hx, hy) * scale,
                shade(rgb),
                64 + Math.random() * 22
            ));
        }
    }

    function explode(rocket) {
        if (rocket.heart) burstHeart(rocket.x, rocket.y, rocket.rgb);
        else burstRing(rocket.x, rocket.y, rocket.rgb);
        sounds.playChime(760 + Math.random() * 420, 0.22);
    }

    function animate() {
        rafId = null;
        if (!running || document.hidden) return;

        // Fade the previous frame toward TRANSPARENT rather than painting a
        // colour over it. Painting cream would slowly build an opaque sheet
        // that hides the section's own gradient; destination-out just lowers
        // alpha, so trails dissolve and the blush background stays visible.
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.17)';
        ctx.fillRect(0, 0, size.w, size.h);
        ctx.globalCompositeOperation = 'source-over';

        // Space the launches out instead of rolling the dice every frame,
        // so shells arrive in a steady rhythm rather than in clumps.
        if (--cooldown <= 0 && rockets.length < 3) {
            rockets.push(new Rocket());
            cooldown = 34 + (Math.random() * 40 | 0);
        }

        rockets = rockets.filter(r => {
            r.update();
            if (r.ready) { explode(r); return false; }
            r.draw();
            return true;
        });

        sparks = sparks.filter(s => {
            s.update();
            s.draw();
            return !s.dead;
        });

        ctx.globalAlpha = 1;
        rafId = requestAnimationFrame(animate);
    }

    // Guard against stacking a second RAF loop on re-entry.
    function play() {
        if (running && rafId === null && !document.hidden) rafId = requestAnimationFrame(animate);
    }

    document.addEventListener('visibilitychange', play);

    if (!window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.create({
        trigger: '#finale',
        start: 'top 70%',
        onEnter: () => { running = true; play(); },
        onLeaveBack: () => { running = false; }
    });
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