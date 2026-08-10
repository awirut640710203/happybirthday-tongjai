# Production Release Checklist

เอกสารนี้เป็นขั้นตอนบังคับสำหรับทุก release ของโปรเจกต์ ห้ามนำไฟล์จาก working tree ขึ้น production โดยตรงจนกว่าจะ commit และ push โค้ดเวอร์ชันล่าสุดเรียบร้อยแล้ว

## 1. ตรวจการเปลี่ยนแปลงก่อน release

- [ ] อ่าน `docs/IPAD_DESIGN_REQUIREMENTS.md` และตรวจว่าการแก้ไขยังตรงตามข้อกำหนด
- [ ] ตรวจสถานะ Git และอ่าน diff ทั้งหมด

  ```powershell
  git status --short
  git diff --stat
  git diff
  ```

- [ ] ไม่ปล่อยไฟล์ชั่วคราว, ไฟล์ทดลอง, `.vscode/`, secret หรือไฟล์ที่ไม่ได้ตั้งใจขึ้น production
- [ ] ถ้าแก้ JavaScript หรือ CSS ให้เปลี่ยน asset version ใน HTML ทุกหน้าที่อ้างถึงไฟล์นั้น เพื่อป้องกัน cache รุ่นเก่า
- [ ] ตรวจว่าเนื้อหา, รูปภาพ, ฟอนต์, ปุ่ม และเส้นทางของทุกหน้าที่แก้ไขอยู่ครบ

## 2. ตรวจคุณภาพและ responsive

- [ ] ตรวจ syntax ของ JavaScript ทุกไฟล์

  ```powershell
  Get-ChildItem -Recurse -Filter *.js | ForEach-Object {
    node --check $_.FullName
  }
  ```

- [ ] ตรวจ whitespace และ conflict markers

  ```powershell
  git diff --check
  rg -n "<<<<<<<|=======|>>>>>>>" --glob '!archive/**' .
  ```

- [ ] ทดสอบ flow ตั้งแต่หน้า lock screen จนถึงทุกหน้าปลายทาง
- [ ] ทดสอบ iPad portrait ที่กว้าง `820px - 834px`
- [ ] ทดสอบ iPad landscape ที่กว้าง `1180px - 1194px`
- [ ] ทดสอบมือถือและ desktop อย่างน้อยหนึ่งขนาด
- [ ] ตรวจว่าไม่มี horizontal overflow, ข้อความหรือรูปภาพล้น, การ์ดซ้อนทับ และปุ่มสัมผัสได้ไม่น้อยกว่า `44px`
- [ ] ตรวจ reduced-motion และฟังก์ชันเสียง/ไมโครโฟนในกรณีที่เกี่ยวข้อง

## 3. บันทึกโค้ดเวอร์ชันล่าสุด

ต้อง commit การแก้ไขจริงทั้งหมดก่อน deploy ห้ามข้ามขั้นตอนนี้

```powershell
git status --short
  git add -A
  git status --short
  git commit -m "Describe the release changes"
  git push origin main
  ```

  ใช้ `git add -A` หลังตรวจ `git status` แล้วเท่านั้น และต้องแน่ใจว่าไฟล์ local-only ถูก ignore หรือไม่อยู่ในรายการก่อน commit

ตรวจว่า local และ remote ชี้ commit เดียวกัน:

```powershell
git rev-parse HEAD
git rev-parse origin/main
```

ค่าทั้งสองต้องตรงกัน หากไม่ตรงกันให้หยุด release และแก้ให้เรียบร้อยก่อน

## 4. Deploy จาก commit ที่บันทึกแล้วเท่านั้น

โปรเจกต์ `happybirthday-tongjai` ใช้ Cloudflare Pages project ที่ไม่ได้เชื่อม Git provider อัตโนมัติ ดังนั้นต้อง deploy ด้วย Wrangler หลัง push ทุกครั้ง

ตรวจสิทธิ์ก่อน:

```powershell
npx wrangler whoami
```

แนะนำให้สร้าง deployment snapshot จาก `HEAD` เพื่อไม่ให้ไฟล์ untracked หรือไฟล์ทดลองติดขึ้น production:

```powershell
$commit = git rev-parse HEAD
$short = $commit.Substring(0, 7)
$stage = Join-Path $env:TEMP "happybirthday-pages-$short"
$archive = "$stage.tar"

New-Item -ItemType Directory -Force -Path $stage | Out-Null
git archive --format=tar --output=$archive HEAD
tar -xf $archive -C $stage

$message = git log -1 --format=%s
npx wrangler pages deploy $stage `
  --project-name happybirthday-tongjai `
  --commit-hash $commit `
  --commit-message $message
```

ต้องรอให้ Wrangler แสดง `Deployment complete!` และเก็บ deployment URL ไว้สำหรับตรวจสอบ

## 5. ตรวจ production หลัง deploy

ตรวจโดเมนหลัก ไม่ใช่เฉพาะ deployment preview URL:

```powershell
$base = "https://happybirthday-tongjai.pages.dev"
$paths = @("/", "/flowers-for-you/", "/balloon-pop/", "/galaxy-gallery/")

foreach ($path in $paths) {
  curl.exe -L -sS -o NUL -w "$path -> %{http_code}`n" "$base$path"
}
```

- [ ] ทุกเส้นทางหลักตอบ `200`
- [ ] HTML production มี asset version ล่าสุด
- [ ] JavaScript และ CSS production มีการแก้ไขล่าสุดจริง
- [ ] รูปภาพและข้อความใหม่แสดงครบ
- [ ] เปิด flow จริงบนมือถือและ iPad อีกครั้งหลัง deploy
- [ ] ตรวจ browser cache ด้วย hard refresh หากผลไม่ตรงกับการตรวจผ่าน `curl`

ตัวอย่างตรวจ asset version และคำเก่าที่ไม่ควรเหลือ:

```powershell
$html = curl.exe -L -sS "$base/"
$js = curl.exe -L -sS "$base/js/script.js?v=LATEST_VERSION"
$css = curl.exe -L -sS "$base/css/style.css?v=LATEST_VERSION"

if ($html -notmatch "LATEST_VERSION") { throw "Production HTML is stale" }
if ($js -match "OLD_SELECTOR_OR_TEXT") { throw "Old JavaScript is still deployed" }
if ($css -match "OLD_SELECTOR_OR_TEXT") { throw "Old CSS is still deployed" }
```

## 6. ปิด release

- [ ] บันทึก commit hash, deployment URL และผลตรวจ production ไว้ใน release note หรือ `CHANGES.md`
- [ ] ตรวจ `git status --short` อีกครั้ง
- [ ] ห้ามรายงานว่าเสร็จจนกว่าจะยืนยันได้ว่า `HEAD`, `origin/main` และ production เป็นเวอร์ชันเดียวกัน

หาก production ยังเป็นรุ่นเก่า ให้หยุดการรายงานผลและตรวจตามลำดับนี้: Cloudflare project, deployment URL, production domain, asset version และ browser cache
