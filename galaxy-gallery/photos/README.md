# Photo slots

Drop your artwork here, named by slot number:

```
01.png  02.png  03.png  04.png  05.png  06.png
07.png  08.png  09.png  10.png  11.png  12.png
```

- `.png`, `.jpg`, `.webp` and `.gif` all work — the first one found for a
  number wins (that order is `CONFIG.photos.exts` in `main.js`).
- Any slot with no file shows a numbered placeholder heart instead, so the
  ring always stays complete while you fill it in.
- The frame is a **heart**, which is very close to square. Roughly **1:1**
  artwork fits best (e.g. 1200 × 1100); other ratios get centre-cropped.
  Keep faces in the upper middle — the shape tapers to a point at the bottom.
- Want a caption under the number? Add it in `main.js`:

  ```js
  captions: { 1: 'Her smile', 7: 'Our trip' }
  ```

- More or fewer than 12? Change `CONFIG.photos.count` and the `rings` array.
