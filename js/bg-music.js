/* ═══════════════════════════════════════════════════════
   🎵 Background music — starts the instant the gate opens,
   then survives every full-page navigation on the site
   (galaxy-gallery, flowers-for-you, balloon-pop, gift-reveal
   and back to the letter) by resuming from the right position.

   Why this needs care, not just `new Audio().play()`:

   1. Every one of those pages is a *separate* HTML document — this
      is not a single-page app. A full navigation always tears down
      the old page's Audio element and JS state, so there is no way
      to keep one Audio instance literally playing across pages.

      The position to resume at is derived from a wall-clock anchor
      (`{ startedAt, startPos }` saved once, when the song starts)
      rather than by reading `audio.currentTime` on the way out. That
      matters: browsers commonly reset a media element's playback
      state as part of tearing a document down, and that reset can
      fire one last `timeupdate` at currentTime 0 right as the page
      navigates away — sampling the *live* element at that exact
      moment is exactly the wrong time to trust it. Wall-clock elapsed
      time doesn't care what the old document's Audio element did on
      its way out, so it can't be clobbered by that teardown.

   2. Safari (especially iOS) requires a genuine user gesture before
      it will let JS start audio with sound — and it does NOT treat a
      link/JS navigation as a gesture inside the *new* document. So on
      every page load we first try to resume automatically (works on
      Chrome/Firefox, which do carry the gesture across a same-tab
      navigation); if that promise rejects, we arm a one-shot listener
      on the very next tap/keypress on that page and resume there
      instead. Every page here already requires interaction (photos,
      balloons, flowers, the keypad), so that's effectively instant.

   3. On the lock screen specifically, the passcode's auto-submit is
      fired from `setTimeout(submit, 230)` (see lock.js) — a real tap
      happened, but 230ms later that stack frame is no longer a
      "user gesture" as far as the browser's autoplay policy is
      concerned. So lock.js calls `BGMusic.arm()` on the very first
      tap/keypress on the keypad — that's a genuine gesture, and it
      quietly (muted) plays+pauses the audio element to unlock it for
      the rest of this page's lifetime. When `unlock()` later calls
      `BGMusic.start()`, the element is already unlocked and the real
      play() succeeds even from inside the delayed callback.
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

    // `startedAt` (epoch ms) + `startPos` (seconds) anchor a timeline:
    // "at this wall-clock moment, playback was at this position." Any
    // later reader computes the current position from elapsed real time,
    // so it never depends on reading a live Audio element at a moment
    // that might be mid-teardown. `duration` is filled in once known,
    // purely so a resume can wrap correctly if the song has looped.
    function saveState(startedAt, startPos, duration) {
        try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
                playing: true, startedAt: startedAt, startPos: startPos, duration: duration || null
            }));
        } catch (e) { /* private-mode storage can throw — music still plays, just won't resume later */ }
    }

    function updateStoredDuration(duration) {
        var state = loadState();
        if (!state || !state.playing || state.duration) return;
        state.duration = duration || null;
        try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
    }

    function computePos(state) {
        var pos = (Date.now() - state.startedAt) / 1000 + (state.startPos || 0);
        if (state.duration && state.duration > 0 && pos > state.duration) pos = pos % state.duration;
        return pos < 0 ? 0 : pos;
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

        audio.addEventListener('loadedmetadata', function () {
            updateStoredDuration(audio.duration);
        });

        audio.addEventListener('error', function () {
            try { console.warn('[bg-music] could not load', AUDIO_URL); } catch (e) {}
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

    // Seeking a freshly-created element is a two-stage race, not one:
    //
    //   1. `readyState HAVE_METADATA` (1) only means duration/dimensions are
    //      known — no actual media data has necessarily buffered yet. Seeking
    //      here can be silently ignored (observed empirically: `currentTime`
    //      read back as 0 immediately after being set, no exception thrown).
    //      Waiting for `loadeddata`/`canplay` (readyState >= 2) instead, where
    //      at least one frame of real data is buffered, makes the seek land.
    //   2. Even then, the seek itself is asynchronous — setting `currentTime`
    //      queues it, and the browser confirms completion with a `seeked`
    //      event. Calling `play()` before that fires risks starting from
    //      wherever playback already was. A short timeout is a safety net in
    //      case `seeked` never fires for some edge case (e.g. seeking to the
    //      position it's already at).
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

    // Runs on every single page load. If the last page left the song
    // playing, pick it back up at the wall-clock-correct position.
    function resumeIfPlaying() {
        var state = loadState();
        if (!state || !state.playing) return;
        var a = ensureAudio();
        seekAndPlay(a, function () { return computePos(state); });
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
        var startedAt = Date.now();
        saveState(startedAt, 0, a.duration || null);
        seekAndPlay(a, function () { return 0; });
    }

    window.BGMusic = {
        arm: arm,
        start: start,
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
    // cache. Resume it, and reseek — real time kept moving while frozen.
    window.addEventListener('pageshow', function (e) {
        if (!e.persisted || !audio) return;
        var state = loadState();
        if (state && state.playing) seekAndPlay(audio, function () { return computePos(state); });
    });

    resumeIfPlaying();
})();
