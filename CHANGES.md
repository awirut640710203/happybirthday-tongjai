# Changelog

Running log of fixes and changes. Not verified automatically after each entry — run tests when asked.

## 2026-08-09

- **Lock screen — hint text emoji invisible**: `.lock-msg.hint`'s gradient-clip
  text styling (`background-clip: text` + `-webkit-text-fill-color:
  transparent`) flattened emoji into a solid color blob. Fixed by wrapping
  emoji in `.msg-emoji` spans that reset the fill/clip (`js/lock.js` `setMsg`,
  `css/lock.css`).
- **Lock screen — title text could shrink to near-invisible**: `fitTitle()`'s
  JS shrink-to-fit loop had a hard floor of 10px, well below the CSS clamp's
  own 15.2px minimum, and only re-ran on `window resize` / one-shot
  `fonts.ready`. Raised the floor to the CSS clamp minimum, added a guard
  against shrinking from a bad (too-narrow) transient measurement, and added
  a width-filtered `ResizeObserver` on `#lock-panel` so any genuine width
  change self-corrects (`js/lock.js` `fitTitle`).
- **Lock screen — title/hint text flickering (WebKit-only)**: confirmed via
  real WebKit engine (not reproducible in Chromium) that `.lock-title` and
  `.lock-msg.hint`, both using `background-clip: text`, sat directly inside
  `.lock-panel` which has `backdrop-filter: blur()`. The animating
  `#lock-bokeh` canvas behind the panel forced WebKit to re-blend the
  gradient text against the live blur every frame, producing continuous
  flicker even with a fully static DOM. Fixed by moving the panel's
  `backdrop-filter` + background onto a `.lock-panel::before` pseudo-element
  (`z-index: -1`, `isolation: isolate` on the panel) so the text is a sibling
  of the blur layer, not a descendant of the element creating it
  (`css/lock.css`).
- **Envelope section — wax seal pulse animation moved the tap target**: the
  💖 seal's `sealPulse` animation scaled the button itself (92px–101px),
  so the same tap point resolved to the seal on some frames and the envelope
  behind it on others (measured: 51/60 seal, 9/60 envelope for one fixed
  point). Fixed by moving the pulse to a `::before` decorative layer while
  the actual button keeps a fixed 80px hit box (`css/style.css`
  `.wax-seal-btn`).
- **Envelope section — letter modal removed**: per request, the envelope no
  longer opens a parchment letter; only the wax seal (💖) is a control, and
  it navigates to `galaxy-gallery`. Removed `#letter-modal` and its JS/CSS
  entirely; envelope card lost `role`/`tabindex`/hover affordance
  (`index.html`, `js/script.js`, `css/style.css`).
- **Lock screen — title/hint gradient text replaced with solid color**: the
  `::before` fix above reduced but didn't fully eliminate flicker on a real
  iPad (confirmed by user recording). Removed `background-clip: text` from
  `.lock-title` and `.lock-msg.hint` entirely, replaced with solid
  `var(--g-pink)` — no gradient-clip left to re-blend against the backdrop,
  so the whole bug class is gone rather than mitigated (`css/lock.css`).
- **Main page (`index.html`) allowed pinch/double-tap zoom — real cause of
  the reported "flicker"**: analyzed the user's screen recording frame by
  frame; the *entire panel* (gift box, dots, keypad numbers, title) was
  scaling up and down together, not just the title text — that's Safari's
  double-tap-to-zoom, not a rendering bug. `index.html`'s viewport meta was
  missing `maximum-scale=1.0, user-scalable=no`, which every other page in
  the project (`balloon-pop`, `flowers-for-you`, `galaxy-gallery`) already
  has. Added it to `index.html` to match. **This was almost certainly the
  actual cause of the whole "flickering" report** — the earlier WebKit
  gradient-text fixes were real improvements but were not the root cause.
- **Lock screen title + heart icon rebuilt from scratch**: per request, removed
  the old "Enter the code to unlock your gift" title and its heart icon
  entirely and redesigned both, since the flicker/sizing issues kept
  resurfacing there even after several targeted fixes. New version:
  - Text and heart are now separate flex children (`.lock-title-text` /
    `.lock-title-heart`) instead of an inline SVG sized in `em` units tied to
    the text's own font-size — the heart is a fixed 20px regardless of
    anything else.
  - Font switched from Playfair Display (italic serif, loaded late — the
    original source of the width-recalculation races) to Quicksand, which
    the rest of the page already uses and has loaded by the time this
    renders.
  - No gradient fill (solid `var(--g-ink)`), so there's nothing for
    backdrop-filter to re-blend against.
  - Text is allowed to wrap onto a second (or third, at very narrow widths)
    line instead of being forced onto one via JS — removed `fitTitle()`,
    its `ResizeObserver`, and the `document.fonts.ready` hook entirely
    (`js/lock.js`). This removes the whole class of bug those were built to
    patch, rather than patching it again.
  - Checked wrapping at 320/375/834px — 1–3 lines depending on width, heart
    stays 20px, no overflow, no console errors.
- **Added a soft "unlock bloom" effect for a correct code**: a quiet, natural
  complement to the existing confetti/emoji burst — a short ring of light
  plus ~10 small petals (pink/lavender/gold, matching the theme palette)
  drift up from the dots and fade over ~1.3–2.1s. Pure CSS animation
  (`translate`/`rotate`/`scale` as standalone properties, `forwards` fill),
  triggered from `bloomPetals()` in `unlock()`; DOM nodes remove themselves
  after their animation ends. Lives on its own `.bloom-layer`, a sibling of
  `.lock-panel` (not a child), so it keeps drifting through the panel's own
  fade-and-step-aside instead of fading with it. Skipped entirely under
  `prefers-reduced-motion`, same convention as the rest of the file
  (`index.html`, `css/lock.css`, `js/lock.js`).
- **Reduced-motion unlock was an abrupt 400ms cut with no fade**: the site
  correctly suppresses the gift-box/confetti/petal celebration under
  `prefers-reduced-motion` (that part is right — this is a Windows/DevTools
  setting the user's test browser had on, not a bug), but the exit itself
  jumped straight to the main site in 400ms with the screen's own opacity
  transition collapsed to 0.01ms — so "That is it!! 🔓" never had time to be
  read. Extended the pause to 900ms and gave `.lock-screen` its own 0.35s
  opacity-only fade under reduced motion (opacity is not "movement", so this
  stays within the intent of the preference — no scale/translate/particles
  anywhere). Verified with `reducedMotion: 'reduce'` emulation: opacity
  holds at 1 for ~1s then fades over 0.35s instead of popping instantly
  (`css/lock.css`, `js/lock.js`).
- **Upgraded the gift-box opening effect**: the lid and bow used to travel a
  straight line to their end position (fly-and-fade). Both now follow a
  short curved path — a lift-and-tilt beat before heading away — so it reads
  as a lid swinging open rather than being flicked off. Added a small
  five-point sparkle layer (`.gift-sparkles`/`.spark`, plain CSS diamonds,
  no images) that scatters from the opening alongside the existing glow/
  burst/confetti. Removed the now-redundant `transition` rules on
  `.gift-lid`/`.gift-bow` (the open sequence is keyframe-driven now) and
  fixed a real gap in the reduced-motion block: `.gift-lid`/`.gift-bow`
  previously only had their *transition* killed, not the new *animation*,
  which would have left the box looking permanently closed under reduced
  motion — added an explicit end-state override so it still reads as opened
  there, just without the flight. Verified visually via captured frames at
  80/280/500/750ms after unlock (`index.html`, `css/lock.css`).
- **Translated remaining Thai UI strings to English**: lock screen (title,
  hint lines, keypad aria-labels, cat bubble lines), balloon-pop (HUD
  labels, card copy, end-of-round text), flowers-for-you (hint + HUD
  aria-labels), main site image alt text. Also fixed leftover Spanish in
  `galaxy-gallery` ("Volver a la carta" → "Back to the letter", "Iniciar" →
  "Start"). Set `lang="en"` on affected pages.
