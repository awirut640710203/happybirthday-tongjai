# ✦ Galaxy Gallery

A 3D "love galaxy" built with Three.js — a faithful recreation of the reference
clip (`refgalaxyV2.mp4`), rebuilt from scratch as our own project.

## Run it

The page uses ES modules and loads images from the parent folder, so it must be
served over HTTP (opening `index.html` directly with `file://` will not work).

From the **project root** (`HappyBirthdayGF-main`):

```bash
npx http-server -p 8080 -c-1
```

then open <http://localhost:8080/galaxy-gallery/>

Any static server works (`python -m http.server`, Live Server, etc.) as long as
it is rooted at the project folder so `../d1.jpg` resolves.

## Scene anatomy

| Element | What it is |
|---|---|
| **Intro card** | Glass panel, `Galaxy Gallery` title, animated sticker, `INICIAR` button |
| **Stardust burst** | 2D canvas transition — additive motes in the disc palette (cream, amber, rose, magenta, violet), curling outward with a few 4-point sparkles |
| **Starfield** | 2,600 points on a large sphere shell, subtle twinkle |
| **Galaxy disc** | 120,000 GPU particles in concentric elliptical rings + inter-ring dust, gold core → rose → periwinkle rim |
| **Accretion disc** | 14,000 golden particles orbiting a black-hole sphere, plus warm halo sprite |
| **Beam** | 2,600 magenta particles streaming upward from the core, recycling in a loop |
| **Heart** | 9,000 particles on a parametric heart, spaced by **arc length** so they never clump at the tip or lobes — slim rim band + light inner veil, billboarded, with a heartbeat pulse |
| **Phrases** | Love phrases as glowing canvas textures lying flat on the disc plane, in two counter-rotating rings |
| **Memory hearts** | 12 hearts ringing the disc rim — the same parametric curve as the centrepiece — each rimmed in a filament of rose light and hued from a different part of the galaxy palette, with its slot number written beneath |

## Controls

- **Drag** — orbit the camera (with inertia)
- **Pinch / scroll** — zoom
- **Tap a heart** — opens it full-size in a lightbox
- **⟳** — toggle the cinematic auto-orbit
- **♥** — toggle the heartbeat pulse
- **⌂** — reset to the opening view

## Customising

Everything lives in the `CONFIG` block at the top of `main.js`:

```js
phrases: ['MI CORAZÓN ES TUYO', 'AMOR ETERNO ✦', ...]
photos:  { count: 12, dir: 'photos/', exts, cardW, cardH, rings, captions }
galaxy:  { count, radius, ringCount, ringInner, ringWidth, ringFraction,
           bulgeFraction, bulgeRadius, thickness,
           coreColor, innerColor, midColor, outerColor }
heart:   { count, scale, height, color, rimColor }
```

### Filling the frames

Put your images in `photos/` named **`01.png` … `12.png`** (`.jpg`, `.webp`
and `.gif` also work). A number with no file keeps its numbered placeholder
heart, so you can fill the ring in one image at a time. The heart outline is
nearly square — roughly **1:1** artwork fits best. See `photos/README.md`.

## Files

```
galaxy-gallery/
├── index.html          markup: canvas layers, intro card, HUD, lightbox
├── style.css           intro card, HUD, lightbox styling
├── main.js             the whole 3D scene
├── lib/three.module.js Three.js r160, vendored so it works offline
└── README.md
```

## Performance

Particle counts are tuned for a modern phone. On a low-end device, lower
`CONFIG.galaxy.count` (try `40000`) and `CONFIG.heart.count` (try `4500`).
