# 🌸 Flowers For You

A paper-cut flower trail — drag a finger (or the mouse) and layered blooms
grow along the path, cast a soft shadow on whatever is underneath, hold for a
few seconds, then come apart petal by petal and fall away.

Rebuilt from scratch as our own project, using `../ref.flower.mp4` as the
reference, and re-themed from the clip's periwinkle blue to the site's pink
(`--rose-gold` / `--deep-rose` / `--soft-pink` from `css/style.css`).

## Run it

No build step, no dependencies, no network needed (the Google Fonts link is
the only remote asset and the page falls back gracefully without it). Open
`index.html` directly, or serve the folder:

```bash
npx http-server -p 8080 -c-1
```

then open <http://localhost:8080/flowers-for-you/>

To reach it from the main site, link to `flowers-for-you/`.

## What's on screen

| Element | What it is |
|---|---|
| **Trail** | Flowers spawn by **distance travelled**, not per pointer event, so a slow drag and a fast flick leave the same density |
| **Flower** | An outer ring of 5–11 petals, an interleaved inner ring half a step offset, a small floret in the middle and a seed core — 3 stacked sheets of paper |
| **Shadow** | Every petal casts its own blurred silhouette, offset down-right in **screen space** so the light direction never rotates with the flower |
| **Bloom** | Petals unfold one after another with an elastic overshoot while the whole flower rotates into place |
| **Wither** | After a few seconds each petal detaches on its own schedule and falls with gravity and a sideways flutter |
| **Auto-draw** | Stop for ~4s and the garden draws for you — heart, ribbon, lemniscate, spiral, always centred on the screen's vertical axis |
| **Ambience** | A dozen petals always drifting down, plus sparkle dust when a large flower opens |

## Controls

- **Drag** (touch) or **just move the mouse** — plant flowers
- **♡** — draw a heart of flowers now
- **✿** — drop a posy in the middle
- **🗑** — let everything fall

## Customising

Everything lives in the `CONFIG` block at the top of `main.js`:

```js
maxFlowers, trailGap, life, witherMs   // the garden
sizes                                  // [weight, minRadius, maxRadius] buckets
palette, cores, shadow, shadowOffset   // the paper stock
ambientPetals, maxSparkles             // ambience
idleMs, autoDrawMs, autoScale          // the auto-draw
```

The wording is plain HTML — edit `.plate-title` / `.plate-sub` / `.hint` in
`index.html`.

## How it stays fast

Petals are **sprites, not paths**. Each shape × colour is drawn once into an
offscreen canvas (`petalSprite()`), then stamped with `drawImage()`, so a full
screen costs a few hundred blits instead of a few thousand path fills.

Once a flower finishes blooming it is **baked** into a single sprite
(`bakeFlower()`) and its whole quiet life costs one `drawImage`. It is unbaked
only when the petals start to fall. Flowers too large to bake cheaply (roughly
`r > 58`) keep drawing live — there are only ever a handful of them.

The blur on the shadow sprites is made with `shadowBlur` + a large
`shadowOffsetX` (the shape is drawn far off-canvas and only its shadow lands),
rather than `ctx.filter`, so it renders identically on Safari/iPadOS.

## 📱 iPad Gen 11

Built against `docs/IPAD_DESIGN_REQUIREMENTS.md`:

- **Portrait 820–834px** and **landscape 1180–1194px** each get their own
  media query with fixed type sizes and `padding: clamp(75px, 8vh, 100px) 32px`
- The title plate, the hint and the HUD are all **centred on the same vertical
  axis**, and the auto-drawn shapes are generated around `W / 2` — so the heart
  is symmetric about that same axis
- HUD buttons are `clamp(48px, 6.2vmin, 60px)` with `min-width/height: 44px`,
  never below the Apple touch target
- Every type size and every gap is a `clamp()`, and the hint's `bottom` is
  computed from the HUD height, so the three stacked layers can never collide
  at any viewport
- `touch-action: none`, `overscroll-behavior: none` and a `gesturestart`
  guard keep a drawing finger from scrolling or pinch-zooming the page

## Files

```
flowers-for-you/
├── index.html   markup: background orbs, centre plate, canvas, hint, HUD
├── style.css    theme, layout, iPad breakpoints
├── main.js      sprites, flowers, trail, auto-draw, loop
└── README.md
```
