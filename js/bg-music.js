/* ═══════════════════════════════════════════════════════
   🎵 Background music — starts the instant the gate opens, and only
   ever plays on THIS page (index.html). Deliberately silent on
   galaxy-gallery / flowers-for-you / balloon-pop: those pages don't
   even load this file, so nothing plays there. Two things pause it
   here and resume it later from the same spot:

   1. Leaving the page (wax seal → galaxy-gallery, gift box → flowers-
      for-you): the navigation-trigger code calls `BGMusic.leavingPage()`
      right before it navigates, which pauses and saves the exact
      position. Coming back (the subpages' Home buttons land back on
      this same URL) re-loads this script fresh and resumes from that
      saved position.

   2. The candle-blow feature (js/script.js) opens the microphone to
      listen for blowing — on phones this can audibly degrade or duck
      whatever else is playing while the mic is live, so it calls
      `BGMusic.pause()` right when the mic opens and `BGMusic.resume()`
      right when it's released, on the same live element (no page
      reload involved, so no seeking needed either way).

   Why even the simple cases need care, not just `new Audio().play()`:

   - Safari (especially iOS) requires a genuine user gesture before it
     will let JS start audio with sound, and does NOT treat a link/JS
     navigation as a gesture inside the *new* document. So on load we
     first try to resume automatically (works on Chrome/Firefox, which
     do carry the gesture across a same-tab navigation); if that
     promise rejects, we arm a one-shot listener on the very next
     tap/keypress on the page and resume there instead.
   - On the lock screen specifically, the passcode's auto-submit fires
     from `setTimeout(submit, 230)` (see lock.js) — a real tap
     happened, but 230ms later that stack frame is no longer a "user
     gesture" as far as the browser's autoplay policy is concerned. So
     lock.js calls `BGMusic.arm()` on the very first tap/keypress on
     the keypad — a genuine gesture — which quietly (muted) plays and
     pauses the element to unlock it for the rest of this page's
     lifetime. When `unlock()` later calls `BGMusic.start()`, the
     element is already unlocked and the real play() succeeds even
     from inside that delayed callback.
   - Seeking a just-created element is its own two-stage race: at
     `readyState HAVE_METADATA` (1) no real media data is necessarily
     buffered yet, and a seek there can be silently ignored (observed
     empirically — currentTime read back as 0 immediately after being
     set, no exception thrown). Waiting for `loadeddata`/`canplay`
     (readyState >= 2) first, then confirming with the `seeked` event
     before calling play(), makes the seek actually land.
   ═══════════════════════════════════════════════════════ */

(function () {
    'use strict';

    // Captured synchronously — this must stay the very first statement,
    // before any await/async boundary, or document.currentScript is lost.
    var THIS_SCRIPT = document.currentScript;

    var AUDIO_URL;
    try {
        var base = THIS_SCRIPT && THIS_SCRIPT.src;
        AUDIO_URL = base
            ? new URL('../assets/audio/bday-song.mp3', base).href
            : 'assets/audio/bday-song.mp3';
    } catch (e) {
        AUDIO_URL = 'assets/audio/bday-song.mp3';
    }

    var STORAGE_KEY = 'bd_music_state';

    function loadState() {
        try {
            var raw = sessionStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) { return null; }
    }

    // `pos` is the last known playback position, in seconds. That's all
    // that's needed now — the song never plays on any page other than
    // this one, so there's no elapsed-real-time gap to account for like a
    // multi-page-playing design would need.
    function saveState(pos) {
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ playing: true, pos: pos || 0 }));
        } catch (e) { /* private-mode storage can throw — music still plays, just won't resume later */ }
    }

    var audio = null;
    function ensureAudio() {
        if (audio) return audio;
        audio = new Audio(AUDIO_URL);
        audio.loop = true;
        audio.preload = 'auto';

        // Belt-and-braces: a handful of older WebKit builds have had bugs
        // where the native `loop` attribute occasionally fails to restart
        // playback gaplessly. If `ended` ever fires anyway, restart by hand
        // instead of letting the music silently stop.
        audio.addEventListener('ended', function () {
            if (!audio.loop) return;
            try { audio.currentTime = 0; audio.play().catch(function () {}); } catch (e) {}
        });

        // Keeps the saved position fresh in case the page goes away in a
        // way that isn't leavingPage() below (back button, closed tab,
        // anything not explicitly hooked) — a generic safety net on top of
        // the precise, deliberate saves at the two known exit points.
        audio.addEventListener('timeupdate', function () {
            saveState(audio.currentTime);
        });

        audio.addEventListener('error', function () {
            try { console.warn('[bg-music] could not load', AUDIO_URL); } catch (e) {}
        });

        // Mobile browsers can pause a playing <audio> element out from
        // under a page for reasons that never touch our own code and
        // never reject a play() promise (an incoming call, another app
        // grabbing the audio session, etc.) — this is the generic recovery
        // for that. Deliberate pauses (arm(), pause(), leavingPage()) flag
        // markIntentionalPause() first so this doesn't fight them.
        audio.addEventListener('pause', function () {
            if (suppressPauseRecovery) return;
            resumeIfPlaying();
        });

        return audio;
    }

    var fallbackArmed = false;
    function armResumeFallback(a, getPos) {
        if (fallbackArmed) return;
        fallbackArmed = true;

        var retry = function () {
            document.removeEventListener('pointerdown', retry, true);
            document.removeEventListener('keydown', retry, true);
            document.removeEventListener('touchstart', retry, true);
            fallbackArmed = false;
            // This IS the gesture — Safari requires play() to happen in the
            // same synchronous tick as a real pointerdown/keydown/touchstart,
            // so this deliberately skips the loadeddata/seeked choreography
            // in seekAndPlay() below (which defers play() to a later async
            // callback). By the time a fallback tap happens the element has
            // had the whole page load to buffer, so a direct seek is reliable
            // enough in practice — and preserving the gesture matters more
            // here than perfecting the seek.
            try { a.currentTime = getPos(); } catch (e) {}
            attemptPlay(a, getPos);
        };
        document.addEventListener('pointerdown', retry, true);
        document.addEventListener('keydown', retry, true);
        document.addEventListener('touchstart', retry, true);
    }

    function attemptPlay(a, getPos) {
        var p;
        try { p = a.play(); } catch (e) { armResumeFallback(a, getPos); return; }
        if (p && typeof p.catch === 'function') {
            p.catch(function () { armResumeFallback(a, getPos); });
        }
    }

    function seekAndPlay(a, getPos) {
        function performSeek() {
            var target = getPos();
            var settled = false;
            var proceed = function () {
                if (settled) return;
                settled = true;
                a.removeEventListener('seeked', proceed);
                attemptPlay(a, getPos);
            };
            a.addEventListener('seeked', proceed, { once: true });
            try { a.currentTime = target; } catch (e) {}
            setTimeout(proceed, 500);
        }
        if (a.readyState >= 2 /* HAVE_CURRENT_DATA: real data is buffered, seeking is reliable */) {
            performSeek();
            return;
        }
        var ran = false;
        var onReady = function () {
            if (ran) return;
            ran = true;
            a.removeEventListener('loadeddata', onReady);
            a.removeEventListener('canplay', onReady);
            a.removeEventListener('error', onReady);
            performSeek();
        };
        a.addEventListener('loadeddata', onReady, { once: true });
        a.addEventListener('canplay', onReady, { once: true });
        // If data never arrives (bad network), still attempt to play rather
        // than silently waiting forever.
        a.addEventListener('error', onReady, { once: true });
    }

    // Re-checks sessionStorage and, if we still believe the song should be
    // playing, seeks/resumes the shared element. Used at page load, at
    // bfcache restore, and by the `pause` listener above.
    function resumeIfPlaying() {
        var state = loadState();
        if (!state || !state.playing) return;
        var a = ensureAudio();
        seekAndPlay(a, function () { return state.pos || 0; });
    }

    var suppressPauseRecovery = false;
    function markIntentionalPause() {
        suppressPauseRecovery = true;
        // `pause()` firing its `pause` event is spec'd as a queued task, not
        // synchronous, so this can't just be reset on the next line — but it
        // also shouldn't stay armed indefinitely if that event never shows
        // up for some reason, so back it with a short timeout too.
        setTimeout(function () { suppressPauseRecovery = false; }, 200);
    }

    // Fires on a genuine user gesture (first tap/keypress on the lock
    // screen) purely to satisfy Safari's "must have played with sound
    // once, from a real gesture" rule. Silent — plays muted, then
    // immediately pauses and rewinds, so the visitor hears nothing yet.
    var primed = false;
    function arm() {
        if (primed) return;
        primed = true;
        var a = ensureAudio();
        a.muted = true;
        var finish = function () {
            markIntentionalPause();
            try { a.pause(); a.currentTime = 0; } catch (e) {}
            a.muted = false;
        };
        var p;
        try { p = a.play(); } catch (e) { finish(); return; }
        if (p && typeof p.then === 'function') p.then(finish).catch(finish);
        else finish();
    }

    // Called the instant the passcode is confirmed correct.
    function start() {
        var a = ensureAudio();
        a.muted = false;
        saveState(0);
        seekAndPlay(a, function () { return 0; });
    }

    // Same-document pause/resume — for a caller that knows it's about to do
    // something that competes for the audio session (the mic, for the
    // candle-blow feature) and wants it back afterwards. No seeking: the
    // element already has the right currentTime, it just needs to keep
    // playing from there once whatever needed quiet is done.
    function pauseMusic() {
        if (!audio) return;
        markIntentionalPause();
        try { audio.pause(); } catch (e) {}
    }
    function resumeMusic() {
        if (!audio) return;
        attemptPlay(audio, function () { return audio.currentTime; });
    }

    // Call right before navigating away to a page that doesn't load this
    // script — pauses and saves the exact position so the next time this
    // page loads (via that page's Home button, or any other route back
    // here) it picks up right where it left off instead of restarting.
    function leavingPage() {
        if (!audio) return;
        markIntentionalPause();
        try { audio.pause(); } catch (e) {}
        saveState(audio.currentTime);
    }

    window.BGMusic = {
        arm: arm,
        start: start,
        pause: pauseMusic,
        resume: resumeMusic,
        leavingPage: leavingPage,
        // Read-only introspection of the live element — for manual console
        // debugging only, nothing on the site depends on this.
        _debug: function () {
            return audio ? {
                paused: audio.paused, currentTime: audio.currentTime,
                duration: audio.duration, readyState: audio.readyState, src: audio.src
            } : null;
        }
    };

    // A page restored from bfcache (Back/Forward) keeps its old Audio
    // element, but the browser typically paused it on the way into the
    // cache — nudge it awake again.
    window.addEventListener('pageshow', function (e) {
        if (e.persisted && audio && audio.paused) resumeIfPlaying();
    });

    resumeIfPlaying();
})();
