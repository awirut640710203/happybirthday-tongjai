/* ═══════════════════════════════════════════════════════
   🎁 One More Gift — inline section, #love-letter → #gift-reveal → #gallery
   Opening the box branches away to flowers-for-you, same shape as the
   envelope's wax seal branching to galaxy-gallery. Kept in its own file,
   same reasoning as js/lock.js being separate from js/script.js.
   ═══════════════════════════════════════════════════════ */

(function () {
    'use strict';

    const DEST = 'flowers-for-you/index.html';
    const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const wrap = document.getElementById('reveal-box-wrap');
    const gift = document.getElementById('reveal-gift');
    const hintText = document.getElementById('reveal-hint');
    const statusMsg = document.getElementById('reveal-status');
    const bloomLayer = document.getElementById('reveal-bloom-layer');

    if (!gift || !wrap) return;

    const PALETTE = ['#f4acb7', '#ffb0ce', '#ffd9df', '#e2afff', '#ffd76e'];

    /* ───────────────────────────────
       🌸 Petal bloom burst — same construction as js/lock.js's
       bloomPetals(): CSS custom properties drive a shared keyframe, each
       node removes itself once its own animation ends. Bumped from 16 to
       22 petals and a wider throw to match the bigger rays/halo/flash now
       firing alongside it.
       ─────────────────────────────── */
    function bloomPetals() {
        if (!bloomLayer || REDUCED) return;

        const ring = document.createElement('span');
        ring.className = 'reveal-bloom-ring';
        bloomLayer.appendChild(ring);
        setTimeout(() => ring.remove(), 1300);

        const n = 22;
        for (let i = 0; i < n; i++) {
            const petal = document.createElement('span');
            petal.className = 'reveal-petal';
            const angle = Math.random() * Math.PI * 2;
            const dist = 100 + Math.random() * 160;
            const dx = Math.cos(angle) * dist;
            const dy = Math.sin(angle) * dist - 55;
            const size = 8 + Math.random() * 10;
            petal.style.setProperty('--dx', dx.toFixed(1) + 'px');
            petal.style.setProperty('--dy', dy.toFixed(1) + 'px');
            petal.style.setProperty('--rot', (Math.random() * 360 - 180).toFixed(0) + 'deg');
            petal.style.setProperty('--dur', (1.3 + Math.random() * 1.0).toFixed(2) + 's');
            petal.style.setProperty('--delay', (Math.random() * 0.4).toFixed(2) + 's');
            petal.style.width = size + 'px';
            petal.style.height = size + 'px';
            petal.style.background = PALETTE[i % PALETTE.length];
            bloomLayer.appendChild(petal);
            setTimeout(() => petal.remove(), 2600);
        }
    }

    /* ───────────────────────────────
       ✨ Flying emoji burst — same technique as js/lock.js's burstEmoji():
       plain fixed-position DOM nodes animated with GSAP (already loaded
       globally by index.html for the fireworks/scroll animations), so this
       page adds no new dependency. Anchored to the box's live position
       rather than a fixed viewport point, since where the box sits on
       screen depends on how far the visitor has scrolled.
       ─────────────────────────────── */
    function burstEmoji() {
        if (REDUCED || !window.gsap) return;
        const set = ['🎀', '💗', '✨', '💖', '🌸'];
        const count = 18;
        const box = gift.getBoundingClientRect();
        const cx = box.left + box.width / 2;
        const cy = box.top + box.height / 2;

        for (let i = 0; i < count; i++) {
            const el = document.createElement('div');
            el.textContent = set[i % set.length];
            el.setAttribute('aria-hidden', 'true');
            el.style.cssText = 'position:fixed;left:' + cx + 'px;top:' + cy + 'px;'
                + 'font-size:' + (Math.random() * 18 + 15) + 'px;z-index:100011;pointer-events:none;';
            document.body.appendChild(el);
            const a = (i / count) * Math.PI * 2;
            const dist = Math.random() * 220 + 140;
            gsap.to(el, {
                x: Math.cos(a) * dist,
                y: Math.sin(a) * dist - 80,
                rotation: (Math.random() - 0.5) * 360,
                opacity: 0, scale: 0.4,
                duration: 1.6, ease: 'power2.out',
                onComplete: () => el.remove()
            });
        }
    }

    /* ───────────────────────────────
       Tiny sound engine — same shape as js/lock.js's blip()/chord(). Full
       5-note chord rather than 3, to match the bigger visual payoff.
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

    function blip(freq, dur) {
        const a = audio();
        if (!a) return;
        try {
            const osc = a.createOscillator();
            const gain = a.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, a.currentTime);
            gain.gain.setValueAtTime(0.09, a.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
            osc.connect(gain).connect(a.destination);
            osc.start();
            osc.stop(a.currentTime + dur);
        } catch (e) { }
    }

    function chord() {
        [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((n, i) => {
            setTimeout(() => blip(n, 0.65), i * 100);
        });
    }

    /* ───────────────────────────────
       Open → burst → leave
       ─────────────────────────────── */
    let opening = false;

    function setStatus(text) {
        statusMsg.textContent = text;
        statusMsg.classList.add('is-visible');
    }

    function openGift() {
        if (opening) return;
        opening = true;

        gift.setAttribute('aria-disabled', 'true');
        gift.classList.add('is-open');
        wrap.classList.add('is-open');
        if (hintText) hintText.classList.add('is-hidden');

        if (REDUCED) {
            // No scale/particles/movement — same convention as every other
            // reduced-motion path on the site (opacity is not "movement").
            setStatus('Blooming, just for you... 🌸');
            setTimeout(() => { window.location.href = DEST; }, 1100);
            return;
        }

        chord();
        bloomPetals();
        setTimeout(burstEmoji, 260);
        setTimeout(() => setStatus('Blooming, just for you... 🌸'), 650);
        setTimeout(() => { window.location.href = DEST; }, 2500);
    }

    gift.addEventListener('click', openGift);
    gift.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openGift(); }
    });
})();
