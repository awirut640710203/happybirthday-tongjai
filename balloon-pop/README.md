# 🎈 Birthday Balloons

A small tap game — the "play" chapter of the birthday site.

The other chapters each do something different: the main site *tells* the
story, `galaxy-gallery` lets you *look* at the memories, and
`flowers-for-you` lets you *make* something. This one is the only place
with a goal, a score and something to beat, so it deliberately carries **no
story, no photos and no message of its own** — nothing here repeats what
another chapter already says.

## Run it

Served over HTTP from the project root (the Home button links to
`../index.html`):

```bash
python -m http.server 8080     # from HappyBirthdayGF-main/
```

then open <http://localhost:8080/balloon-pop/>.

## How it plays

A 3-2-1 countdown gives you a beat to settle, then balloons rise from
below. Tap one before it drifts past the line at the top.

| | |
|---|---|
| **Miss three** | balloons that escape cost a life; three and the round ends |
| **Combo** | every 4 pops in a row raises the multiplier, up to ×5 |
| **Smaller = worth more** | small balloons rise faster and score up to 30 before the multiplier |
| **A missed tap** | breaks the combo, but never costs a life |
| **Difficulty** | every 9s balloons rise faster and arrive closer together |

While you play, the score sits in the **top-left** and your three lives — drawn
as little balloons that deflate — in the **top-right**. The centre stays empty
on purpose: that is the lane a balloon climbs on its way out, and a bar across
it would hide the one balloon you most need to see. A balloon entering the top
band gets a pulsing halo, the line above it tints pink, and every pop throws
the points you just earned up from where you earned them.

The best score is kept in `localStorage` under `bp_best`.

## Built for a finger, not a mouse

The visitor plays on an iPad, so:

- balloons are **60–104px across**, well past Apple's 44px touch minimum,
  plus 12px of invisible padding around each one — they're moving targets,
  so they get extra forgiveness
- taps fire on `pointerdown`, not `click`, so a pop lands the instant the
  finger touches rather than a frame later
- when two balloons overlap under one tap, the **higher** one wins — it's
  the one about to escape
- nothing depends on `:hover`; hover styling is sealed behind
  `@media (hover: hover) and (pointer: fine)` so no control can latch into a
  stuck hover state after a tap
- page scroll, pinch-zoom, text selection and the iPadOS gesture layer are
  all disabled, so a fast drag across the screen can never move the page
- centring uses the standalone `translate` property, never `transform`, so a
  `transform` animation can't strip it (a bug that did exactly that lives in
  `flowers-for-you`'s history)

## Performance notes

- canvas is capped at **DPR 2** — 3x costs a lot on a Retina iPad for no
  visible gain
- at most **14 balloons** and **140 burst pieces** on screen
- balloons are drawn as plain arcs and gradients, so a full screen is a few
  dozen draw calls, not thousands
- `dt` is clamped to 48ms, so a stall can never teleport a balloon past your
  finger — the round slows down instead of skipping ahead

## Files

```
balloon-pop/
├── index.html    canvas, HUD, start / game-over card
├── style.css     theme, layout, iPad breakpoints
├── main.js       game loop, balloons, scoring, input
└── README.md
```

Everything tunable lives in the `CONFIG` block at the top of `main.js`.
