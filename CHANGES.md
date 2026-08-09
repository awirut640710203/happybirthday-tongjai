# Changelog

Running log of fixes and changes. Not verified automatically after each entry — run tests when asked.

## 2026-08-09

- **`#gift-reveal`'s open effect made grander**: per request/feedback — the
  original open sequence (bow + lid fly off, a modest glow/ring/5 sparkles,
  16 small petals) read as thin once the box was actually empty; the moment
  needed more weight. Added, all triggered from a new `#reveal-box-wrap`
  `.is-open` class (siblings of `.reveal-box`, so they can't hang off
  `.reveal-box.is-open` the way the box's own parts do):
  - **`.reveal-rays`** — a one-shot burst of light rays (adapted from
    `css/lock.css`'s `.lock-rays`, but baked as a single rotate+scale+fade
    keyframe rather than an always-spinning background layer, since nothing
    here needs a rotating layer sitting invisibly in an in-page section's
    DOM at rest).
  - **`.reveal-halo`** — a wide, slow golden bloom behind the rays, so the
    burst reads as glowing light rather than a hard-edged shape.
  - **`.reveal-box-burst--2`** — a second, golden, later-timed ring stacked
    on the existing white one, so the shockwave has two waves instead of
    one flat pop.
  - **`.reveal-flash`** — a brief bright wash across the box's stage at the
    peak, the in-page equivalent of `css/lock.css`'s `.lock-flash`, scaled
    to this section rather than the full viewport (that treatment stays
    reserved for the site's single biggest moment, the gate unlock).
  - **Flying emoji burst** (`js/gift-reveal.js`) — 18 emoji (🎀💗✨💖🌸) fired
    outward from the box's live on-screen position using GSAP, which
    `index.html` already loads globally for the fireworks/scroll animations
    — no new dependency. Same technique as `js/lock.js`'s `burstEmoji()`.
  - Petal count 16 → 22 with a wider throw; the chime went from a 3-note
    `blip` sequence to the same 5-note ascending `chord()` the main gate
    unlock uses; the status message now scales in (`0.85 → 1`) instead of
    just fading, landing with a bit of weight. Kept **solid**, not
    gradient-clipped: `#gift-reveal`'s `::before`/`::after` orbs animate
    continuously behind it, which is the exact combination that caused the
    lock screen's own WebKit-only flicker bug (see the "title/hint gradient
    text replaced with solid color" entry below) — not worth reintroducing
    for a status line.
  - Redirect delay extended 2000ms → 2500ms so the bigger sequence has room
    to land before the page leaves; the `prefers-reduced-motion` path is
    untouched (skips straight to the opened end-state, ~1.1s) and was
    re-verified to still fire on its own fast timeline, unaffected by the
    slower full-motion path.
  - Verified: `.is-open` lands correctly on both `#reveal-gift` and
    `#reveal-box-wrap`; emoji nodes are created and clean themselves up;
    the full sequence takes a deliberate ~2.6s end to end and still lands
    on `flowers-for-you/index.html`; no horizontal overflow at the peak of
    the effect on iPad; no console/JS errors through the whole sequence;
    reduced motion still redirects in ~1.3s regardless of the changes above
    (`index.html`, `css/gift-reveal.css`, `js/gift-reveal.js`).
- **New section: `#gift-reveal` — "A Gift For You", inline between the
  letter and the gallery**: per request, a themed gift-box moment that
  branches to `flowers-for-you`, same shape as the envelope above it
  branching to Galaxy Gallery. This went through two shapes before landing
  here, worth recording since the first two were built and verified before
  being superseded:
  1. First built as a standalone page (`gift-box/`, own folder, matching
     `balloon-pop`/`galaxy-gallery`'s pattern) reachable only by its own URL.
  2. Then linked from `#love-letter` as a second "One More Gift 🎁" button
     next to "Continue To Our Memories".
  3. The user clarified they meant neither — they wanted the whole "A Gift
     For You / Tap the box to open it" *page* to appear inline, as its own
     scroll stop between `#love-letter` and `#gallery`, not a click-through.
     Rebuilt as `<section id="gift-reveal">` directly in `index.html`, the
     `gift-box/` folder deleted (nothing referenced it once the button was
     gone, and keeping a second unlinked copy of the same box would only
     drift out of sync with this one), and the journey rewired:
     `#love-letter`'s "Continue To Our Memories" now points to `#gift-reveal`
     instead of `#gallery`, and `#gift-reveal` gets its own "Continue To Our
     Memories" pointing on to `#gallery` — so scrolling past without opening
     the box still works, and the wax seal above is untouched (still goes
     straight to Galaxy Gallery, `aria-label="Open the Galaxy Gallery"`
     unchanged).
  - New files `css/gift-reveal.css` + `js/gift-reveal.js`, not folded into
    `css/style.css`/`js/script.js`: this page already loads `css/lock.css`,
    which owns `.gift`, `.gift-body`, `.spark` and the
    bowOpen/lidOpen/giftGlow/etc. keyframes for the lock screen's own box.
    `@keyframes` names are global regardless of nesting, so reusing them for
    a second box on the same page would silently repoint one animation onto
    the other depending on cascade order. Every class and keyframe here is
    prefixed `reveal-`/`reveal` instead (`.reveal-box`, `.reveal-box-lid`,
    `revealBowOpen`, …) — same reasoning `css/lock.css` is its own file
    rather than living inside `css/style.css`.
  - The box construction itself is otherwise identical to the lock screen's:
    every dimension is `calc(<lock.css value> * var(--u))`, diffable 1:1
    against the original, scaling via one `--u` custom property (1px
    default, 1.3px iPad+) instead of `transform: scale()`, which would need
    separate hit-target math.
  - `#gift-reveal` was added everywhere `#cake-section`/`#love-letter`/
    `#gallery`/`#timeline` share the site's background treatment (base
    gradient, orb `::before`, drifting-bubble `::after`, reduced-motion
    override) with its own orb position and animation delays, so it reads
    as one more screen in the same continuous background rather than a
    visually disconnected insert.
  - Open sequence bursts petals (same DOM-node-per-petal construction as
    `js/lock.js`'s `bloomPetals()`) instead of confetti, foreshadowing the
    garden it leads to. Title/kicker/hint/status all use
    `var(--font-cursive)`/the shared `.section-title`/`.section-subtitle`
    classes, matching the two font changes elsewhere in this log rather than
    introducing a fifth typographic voice. `prefers-reduced-motion` skips to
    the opened end-state and leaves sooner, same convention as every other
    reduced-motion path on the site.
  - Verified end to end: `#love-letter`'s "Continue" now points to
    `#gift-reveal`; the section title/kicker/hint read correctly and the box
    sits on the centre axis at phone and iPad width; clicking (and, under
    reduced motion, the shortened path) both actually redirect to
    `flowers-for-you/index.html`; the wax seal and `#gift-reveal`'s own
    "Continue To Our Memories" (→ `#gallery`) are unaffected; the old
    `gift-box/index.html` now 404s; no console/network errors anywhere in
    the flow (`index.html`, `css/style.css`, `css/gift-reveal.css`,
    `js/gift-reveal.js`).
- **`flowers-for-you` had no way back to the main site**: reachable, until
  now, only by typing the URL directly or via `#gift-reveal` above — and
  once there, a visitor had no exit at all. Added a 4th icon
  (`#btnHome`, the same home glyph used in `galaxy-gallery`'s HUD) to the
  existing heart/bouquet/clear control pill: a plain `<a href="../index.html">`
  rather than a JS-driven button, so it works even if `main.js` never loads.
  `wireHudButton()` only wires elements by explicit id (`btnHeart`,
  `btnBouquet`, `btnClear`), so adding this sibling doesn't risk any
  interference with the existing controls. Verified: no JS errors, 48×48
  touch target, and the click actually lands back on `index.html`
  (`flowers-for-you/index.html`, `flowers-for-you/style.css`).
- **Section titles/subtitle switched to the finale's cursive font**: per
  request, `.section-title` — "Make A Birthday Wish!", "A Special Letter For
  You", "Our Precious Memories", "Moments of Happiness" — and
  `.section-subtitle` ("Tap the heart seal to open your gift") now render in
  `var(--font-cursive)` (Great Vibes), matching `.finale-title` ("Thank You
  For Being You"). Previously Playfair Display serif for the titles, default
  sans for the subtitle.
  - Same reasoning as the lock-screen change above: no font-weight override
    (the single loaded weight already renders correctly under the h2 default
    bold, same as `.landing-title`/`.finale-title`), size bumped up since a
    script face reads smaller than a serif at the same point size
    (`clamp(2.2rem, 5vw, 3.4rem)` → `clamp(2.4rem, 5.8vw, 3.9rem)` for
    titles, `clamp(1rem, 2.5vw, 1.2rem)` → `clamp(1.3rem, 3.4vw, 1.7rem)` for
    the subtitle), line-height raised from 1.2 to 1.5 for descender room.
  - Verified at 320/375/834px: all four section titles and the subtitle
    resolve to Great Vibes, no horizontal overflow, titles stay inside the
    viewport when wrapped to two lines (checked "A Special Letter For You"
    and "Our Precious Memories", the two longest, at 320px specifically) —
    and the existing iPad symmetry/touch-target suite still passes in full,
    since these classes are shared across the cake, letter, gallery and
    timeline sections (`css/style.css`).

- **Lock screen title/messages switched to the finale's cursive font**: per
  request, `.lock-title` ("Enter the code to unlock your gift"), `.lock-msg`
  in every state — default, `.error` ("Not quite — try again 🥺", "So close
  😉"), `.hint` ("Hint: a date that means something to us 😉"), and `.success`
  ("That is it!! 🔓") — now render in `var(--font-cursive)` (Great Vibes),
  the same family as `.finale-title` ("Thank You For Being You") and the hero
  name. Previously Quicksand for the title and default/error/success messages,
  Playfair Display italic for the hint — three different families across one
  small UI. Unified to one.
  - Great Vibes loads in the same Google Fonts request as Quicksand (see
    `index.html`), so this doesn't reintroduce the late-loading font-swap
    race an earlier Playfair Display version of this title had (see the
    "rebuilt from scratch" entry above).
  - It ships a single weight, so `font-weight: 700` on the title and `600` on
    the messages were dropped (a synthetic bold would have distorted the
    connected script letterforms); same reasoning removed `.lock-msg.hint`'s
    `font-style: italic` and `letter-spacing`.
  - Bumped font sizes since a script face needs more room than a sans/serif
    at the same point size to stay legible: title `clamp(1rem, 3.2vw, 1.35rem)`
    → `clamp(1.6rem, 5vw, 2.15rem)`, messages `clamp(0.8rem, 2.2vw, 0.9rem)`
    → `clamp(1.05rem, 3.2vw, 1.3rem)`, with line-height raised to give the
    swashes room (matches how `.landing-title` handles the same font).
  - Verified all five strings at 320/375/834px: no horizontal overflow, the
    panel stays within the viewport, and every state is legible in
    screenshots — including with the angry-cat quartet on screen and the
    confetti/emoji burst on unlock (`css/lock.css`).

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
- **Validated every claim the docs make, and corrected the docs that were
  wrong**: ~230 automated checks across six suites, all measured against the
  running site rather than read off the source. Everything in
  `docs/IPAD_DESIGN_REQUIREMENTS.md` holds at all four documented viewports
  (820 / 834 portrait, 1180 / 1194 landscape, `deviceScaleFactor: 2`):
  2-column polaroid grid with equal column widths and equal row/column gaps;
  cake, envelope, seal, blow button and gift box all on the centre axis to
  within a pixel; timeline spine at 50% with left and right cards both exactly
  32px off it; every interactive target ≥ 44×44; no horizontal overflow and no
  header/content collision anywhere. Same for the sub-pages — flowers' plate,
  hint and HUD share one axis at every viewport and its HUD buttons measure
  56–58px; balloon-pop's canvas is DPR-2 with the centre escape lane clear.
  Behaviour was driven too, not just measured: wrong code → cats + message +
  dot reset, ⌫ and hardware Backspace, hardware-keyboard unlock, the
  typewriter completing the full greeting, sessionStorage skipping the gate on
  refresh but not in a new tab, audio pill toggle, lightbox open/close, all
  four journey anchors, and the seal → gallery → ⌂ → letter round trip.
  - Two apparent failures turned out to be flaws in the tests, not the site,
    and are worth recording so they are not "rediscovered": measuring
    `getBoundingClientRect()` on `.gift` reports the **idle float animation**
    (it sways ±2.25px by design), so symmetry has to be measured with
    animations frozen — with them frozen the gift is 0.00px off centre at all
    four viewports; and the dots after a wrong code clear at ~940ms
    (230ms before `submit()` fires, then a 700ms shake window), so a 900ms
    assertion races it.
  - Real documentation errors found and fixed:
    - `galaxy-gallery/README.md`'s scene table had three wrong particle
      counts — accretion disc 14,000 → **11,000**, beam 2,600 → **5,600**,
      heart 9,000 → **13,000** — and omitted the heart's aura/spark/ember
      counts from the CONFIG listing. It also still described an `INICIAR`
      button (the markup says "Start", and the intro card is skipped
      entirely) and gave the Spanish phrases as the `phrases` example.
    - `galaxy-gallery/photos/README.md` still used Spanish captions in its
      example.
    - The root `README.md` linked the passcode to `lock.js` and described
      "`lock.css` + `lock.js` … `script.js`" — all three are in `css/` and
      `js/`, so the link was dead. Its Live Demo pointed at the upstream
      author's site, its clone command at the upstream repo, and **the file
      ended mid-sentence with an unterminated code fence**. Rewritten with a
      real "Running it" section (including why `galaxy-gallery` needs HTTP),
      this repo's clone URL, working setup steps, and upstream credit kept as
      an attribution line at the bottom.
  - Claims that were checked and are accurate, for the record: the passcode,
    the sessionStorage key, all four cats anchored to the card (`.cat-trio`
    is `position: absolute; inset: 0`, measured box identical to
    `.lock-card-wrap`) and sized by height, reactions on `.gift-inner`, the
    one-shot `.is-entering`, and every single number in
    `balloon-pop/README.md` (radius [30,52] = 60–104px, `tapPadding` 12,
    `maxOnScreen` 14, `maxShreds` 140, dt clamped to 48ms, `bp_best`, 3 lives,
    combo step 4, max ×5, 9s ramp). flowers' iPad media queries are 810–840
    and 1170–1200, which contain the documented 820–834 / 1180–1194 rather
    than matching them exactly — the intent holds.
- **Cleared the Problems panel — and one of the 25 was a real iPad bug**: the
  red badges come from the *Microsoft Edge Tools* extension (webhint), which
  only lints files that are open, so the counts were never a full-project
  audit. Went through all 25 rather than trusting or dismissing them:
  - **`user-select` with no `-webkit-user-select` — real, and it only bites the
    iPad.** Verified against the actual WebKit engine rather than webhint's
    table: `CSS.supports('user-select', 'none')` is **false** in WebKit 26.5,
    so the unprefixed property does nothing there and a long press on the
    audio pill or the blow button would select the label and pop the iOS
    callout menu. Added the prefix at both sites (`css/style.css`).
  - **`backdrop-filter` with no `-webkit-backdrop-filter`** — 4 sites. Modern
    WebKit does accept it unprefixed (checked: `CSS.supports` is true on 26.5,
    Safari has had it since 18), so this is not broken today, but the prefix
    costs nothing and covers older iPadOS. Worth noting *why* this file was
    the odd one out: every other stylesheet in the project already paired its
    prefixes — `lock.css` 1/1, `balloon-pop` 3/3, `flowers-for-you` 1/1,
    `galaxy-gallery` 3/3 — and `css/style.css` was 4/0. It was an oversight,
    not a decision. Now 4/4 across the board.
  - **`-webkit-text-size-adjust` with no standard `text-size-adjust`** — added
    the standard property alongside (`css/style.css`,
    `flowers-for-you/style.css`).
  - **Five `style="stop-color:var(--…)"` on the bow's gradient stops** — moved
    to `stop-color` presentation attributes. Checked the assumption first
    rather than assuming a presentation attribute cannot resolve a custom
    property: it can, in both Chromium and WebKit. Confirmed after the change
    that all five stops still resolve to exactly their variables
    (`#ffb0ce`, `#ff8fbb`, `#d9c4ff`) with none falling back to black
    (`index.html`).
  - **Second pass, after the panel still showed 15.** The first `.hintrc` was
    written from assumption and two things about it were wrong. Rather than
    guess again, real webhint (`hint` v7.1.13, the same engine the extension
    runs) was installed and four candidate configs were run against the
    project's own files, printing exactly which problems survived each:
    - `compat-api/*` reports CSS *values*, not just property names, so the
      ignore entry has to be `"text-wrap: balance"` — plain `"text-wrap"`
      never matched, which is why those two stayed. `"text-size-adjust"` and
      `"meta[name=theme-color]"` were matching all along.
    - Turning the compat hints off wholesale was measured as an option and
      rejected: the comparison included a scratch copy of `style.css` with
      `-webkit-user-select` stripped out again, and the "all hints off" config
      stopped reporting it. The chosen config still catches it — that check
      earns its place, it found the real bug above.
    - Fixed for real rather than silenced, both found by the full-project
      sweep in files that simply were not open in the editor:
      **`css-prefix-order`** — `css/lock.css` (`mask-image`, `backdrop-filter`)
      and `galaxy-gallery/style.css` (three `backdrop-filter`) listed the
      standard property *before* its `-webkit-` prefix, so the legacy
      prefixed value won the cascade wherever both are supported. Reordered;
      confirmed the blur still computes in both Chromium and WebKit.
      **`button-type`** — the lightbox close button and the gallery's Start
      and ⌂ buttons had no `type`, which defaults to `submit`. Set to
      `button`, and gave the close button an `aria-label`.
    - Verified end state with a full sweep of all 9 HTML/CSS files: nothing
      left above Hint severity. The 264 remaining `detect-css-reflows/*` are
      Hints, which VS Code does not count in the Problems badge — and they
      flag animating `transform`/`opacity`, which is the recommended practice
      rather than a problem.
  - The rest are the linter being wrong for this project, so they are silenced
    in `.hintrc` rather than "fixed" — JSON takes no comments, so the
    reasoning lives here:
    - `meta-viewport` (7 hits) flags `maximum-scale`/`user-scalable=no` as an
      accessibility failure. Normally right, but here it is the deliberate fix
      for the iPad double-tap-zoom that caused the whole "flickering" report
      (see the entry further down). Removing it would reintroduce that bug.
    - `text-wrap` "not supported by Chrome < 114" — Chrome is long past 114,
      and it degrades to normal wrapping regardless.
    - `text-size-adjust` "not supported by Firefox, Safari" — a catch-22: the
      linter asks for the standard property when only the prefixed one is
      present, then flags the standard one once added. Shipping both is the
      correct answer.
    - `meta[name=theme-color]` unsupported in Firefox — cosmetic progressive
      enhancement, nothing to degrade.
    Everything else stays on, including the two compat rules that just caught
    the real bug above.
- **"I edit a file and nothing changes" — the `?v=` cache token was pinned**:
  this was the real bug behind the report, and it is worth writing down
  properly because it silently invalidated a lot of earlier testing. Every
  cache (browser disk cache, iOS Safari, a CDN) keys on the *whole* URL
  including the query string. `index.html` asked for `css/style.css?v=1` and
  `js/script.js?v=1` — tokens that had not moved since the first commit — so
  once a browser had those bytes it kept serving them. Editing the CSS
  changed the file on disk but not the URL, so the browser had no reason to
  refetch: reloading did nothing, and only a cleared cache ever showed the
  change.
  - Reproduced it directly rather than guessing: served the project with
    `Cache-Control: max-age=600` (what GitHub Pages sends), recorded the
    computed colour of `.lock-title-text`, appended a rule making it green,
    reloaded — still the old colour, both on plain reload and on fresh
    navigation, while a brand-new browser profile showed green immediately.
  - Confirmed the token was the actual gate, not a coincidence: repeated the
    same edit while also bumping `?v=4` → `?v=5`, and the change appeared on
    the very next reload.
  - Fix: the token is now generated at page load. On a dev host — `file:`,
    `localhost`, `127.*`, `10.*`, `192.168.*`, `169.254.*`, `172.16–31.*`,
    `*.local` — it is `'dev' + Date.now()`, so every reload fetches what is
    on disk. Anywhere else it stays a fixed date string, so a real visitor
    still gets a properly cached, fast page. Applied to all four pages
    (`index.html`, `balloon-pop`, `flowers-for-you`, `galaxy-gallery`).
  - Written with `document.write` deliberately, not by appending nodes from
    script. For the stylesheets that keeps them parser-inserted and
    render-blocking exactly like a literal `<link>`, so there is no flash of
    unstyled content. For the scripts it matters even more: `script.js` hangs
    its entire boot on `DOMContentLoaded`, and a dynamically appended script
    is not parser-inserted, so `DOMContentLoaded` can fire before it runs and
    the listener would never see it — the whole site would come up blank.
  - Verified afterwards on the two cases `127.0.0.1` does not cover: the real
    Wi-Fi LAN address (`192.168.1.134`, what the iPad actually connects to) —
    edit now visible on a plain reload; and a simulated published host —
    still `__DEV_HOST=false`, still a stable token, page still boots.
- **`galaxy-gallery` was a dead black screen when opened via `file://`**:
  `main.js` is an ES module, so it is *fetched* rather than read off disk, and
  a `file://` page's fetch is a cross-origin request the browser blocks
  outright. The only trace was a CORS line in the console — on screen the
  gallery was just black with two floating HUD buttons. This was reachable in
  normal use: the wax seal on the main page navigates straight here, so
  double-clicking `index.html` and tapping the seal landed on a broken page.
  Added a `.needs-server` card that is revealed (and the HUD hidden) when
  `location.protocol === 'file:'`, saying what happened, giving the
  `npx http-server` command, and offering a link back to the letter. Served
  over HTTP nothing changes — the notice stays hidden and the scene boots as
  before (`galaxy-gallery/index.html`, `galaxy-gallery/style.css`).
- **`galaxy-gallery` still had an empty `<title>`, `lang="es"` and Spanish
  copy**: the earlier "translated remaining strings" entry below did not
  actually cover this page. The tab showed the bare URL because `<title>` was
  empty; `<html lang="es">` was still set; and `Para mi princesita`, the
  `Órbita automática` / `Latido del corazón` button tooltips, and the five
  love phrases rendered *into the 3D scene* (`MI CORAZÓN ES TUYO`, `AMOR
  ETERNO ✦`, `INFINITO ∞`, `CONTIGO SIEMPRE`, `TE AMO ♥`) were all still
  Spanish. All now English, `lang="en"`, and the title reads "Galaxy Gallery
  ✦ | Happy Birthday Tongjai" (`galaxy-gallery/index.html`,
  `galaxy-gallery/main.js`).
- **Both lightboxes fetched the page itself as an image on every load**:
  `<img src="">` is not "no image" — an empty `src` resolves against the
  current URL, so the browser requested the entire HTML document as an image
  and logged a failure before the visitor had clicked anything. Removed the
  attribute instead of blanking it in `index.html` (the close handler already
  did the right thing with `removeAttribute`), and gave the galaxy one
  `hidden` until a heart is opened, with `main.js` clearing it alongside the
  `src`. Verified no image request for the document remains, and both
  lightboxes still open a real photo (`index.html`,
  `galaxy-gallery/index.html`, `galaxy-gallery/main.js`).
- **Translated remaining Thai UI strings to English**: lock screen (title,
  hint lines, keypad aria-labels, cat bubble lines), balloon-pop (HUD
  labels, card copy, end-of-round text), flowers-for-you (hint + HUD
  aria-labels), main site image alt text. Also fixed leftover Spanish in
  `galaxy-gallery` ("Volver a la carta" → "Back to the letter", "Iniciar" →
  "Start"). Set `lang="en"` on affected pages.
