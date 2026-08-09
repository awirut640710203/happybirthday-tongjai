# 🎂 Happy Birthday Mini Website 🎉

A beautiful, interactive mini website I built to celebrate my girlfriend’s special day ❤️.
This project is made with **HTML, CSS, and JavaScript** and includes animations, surprises, and heartfelt wishes.

✨ Anyone can use this project to create a unique online birthday greeting for their loved one!

---

## 🚀 Running it

GitHub Pages is **not** enabled on this repo yet, so there is no live URL to
share — run it locally from the project root:

```bash
npx http-server -p 8080 -c-1
```

then open <http://localhost:8080/>.

> [!IMPORTANT]
> Serve it over HTTP rather than double-clicking `index.html`. The main page
> works either way, but `galaxy-gallery` is built with ES modules, which a
> browser refuses to load from a `file://` page — opened that way it can only
> ever be a black screen. (It now says so on screen instead of failing
> silently, but it still won't run.)

---

## 🎁 Features

- 🎁 **Gift Box Unwrap lock screen** — 8-digit passcode gate with a floating gift
  box, pastel mesh background and drifting bubbles & hearts. Enter the right code
  and the bow flies off, the lid lifts, and light bursts out of the box
- 😾😼😹😾 **Angry cat quartet** — four cats perched on all four corners of
  the password card (not the gift box), every time the passcode is wrong,
  each landing with its own little stagger and a shared speech bubble
- 💌 Heartfelt birthday message with typewriter effect
- 🌟 Responsive design (phone, tablet & desktop — tuned for iPad Gen 11)
- ✨ Easy to customize for anyone

---

## 🔑 The Passcode

The gate is configured in [`js/lock.js`](js/lock.js):

```js
const PASSCODE = '11082546';   // change this to your own date
```

Once entered correctly it is remembered for the rest of the browser tab session
(`sessionStorage`), so a refresh won't ask again.

> [!NOTE]
> This is a **decorative** gate, not real security — the code lives in the page
> source and anyone can read it. It's there for the surprise, not to protect data.

Files: `css/lock.css` + `js/lock.js` hold the gate; `js/script.js` exposes
`window.startLandingExperience()`, which the gate calls once it opens so the hero
intro doesn't play behind it.

The gift box is pure CSS (`.gift-body` / `.gift-lid` / `.gift-inside`) with an
inline SVG bow. Reaction animations live on `.gift-inner` rather than `.gift` so
they never restart the idle float — and the card's entrance uses a one-shot
`.is-entering` class for the same reason.

`angry-cat.png` / `angry-cat-2.png` / `angry-cat-3.png` / `angry-cat-4.png`
are background-removed cutouts (`rembg`, `isnet-general-use` + alpha
matting) cropped to portraits, all four shown together in `#cat-trio` in
`index.html`.

`#cat-trio` is `position: absolute; inset: 0` inside `.lock-card-wrap` — the
same positioning root as `.lock-panel` — so each cat is placed relative to
the **password card itself**, not the viewport or the gift box above it.
All four of the card's corners are used: `cat-1` claims top-left, `cat-3`
(its closest match in size) mirrors it at top-right, `cat-2` (the narrowest
of the four) tucks into bottom-right clear of the hint text, and `cat-4`
mirrors it at bottom-left. Because the anchor is the card, this tracks
correctly however tall the card grows and never competes for space with the
gift box sitting above it.

Each cat is sized by **height**, not width (`.cat-img { height: clamp(...);
width: auto; }`) — the source photos have very different aspect ratios, and
matching height keeps the top pair (cat-1/cat-3) and bottom pair (cat-2/
cat-4) each reading as a matched set despite their different source shapes.
The speech bubble is shared (one message for all four, randomized without
back-to-back repeats) and floats centered below the card rather than pinned
to any one cat, which keeps the composition from getting cluttered. See
`showAngryCat()` / `pickLine()` / `hideAngryCat()` in `js/lock.js`.

---

## 🛠️ Tech Stack

- **HTML5**
- **CSS3** (with animations)
- **JavaScript**

---

## 🎉 How to Use

1. Clone the repo:

   ```bash
   git clone https://github.com/awirut640710203/happybirthday-tongjai.git
   cd happybirthday-tongjai
   ```

2. Serve it (see [Running it](#-running-it) above — don't just double-click
   `index.html`, `galaxy-gallery` needs HTTP):

   ```bash
   npx http-server -p 8080 -c-1
   ```

3. Open <http://localhost:8080/> and enter the passcode.

4. Make it yours — the passcode in [`js/lock.js`](js/lock.js), the name,
   greeting, photos and timeline in the `CONFIG` block at the top of
   [`js/script.js`](js/script.js), and your own pictures in `assets/photos/`
   and `galaxy-gallery/photos/`.

---

Originally forked from [nikitayadav19/HappyBirthdayGF](https://github.com/nikitayadav19/HappyBirthdayGF);
the lock screen, galaxy gallery, balloon game and flower garden were rebuilt
for this version.
