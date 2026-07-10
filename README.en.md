# 🎴 SillyTavern Multitools

[Tiếng Việt](README.md) | **English** | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md)

> **A suite of 5 tools to translate & build SillyTavern character cards — runs entirely on your own machine.**
> Made by **Guillichan × Sky**.

Built for **translators** and card makers: translate cards with AI **without breaking code, regex, lorebooks, or macros** like `{{char}}` `{{user}}`.

Everything runs locally — your **API key is never sent anywhere**, no middleman server.

> 🌏 **Note:** The **Dịch Card** (Translate Card) tool has an **EN ↔ VI** language toggle. The other four tools currently have a Vietnamese-only interface — this README explains what each button does.

---

## 📦 What's inside?

Once the app is open, the left rail switches between the 5 tools. **Switch freely — anything running keeps running.**

| | Tool | What it's for |
|---|---|---|
| 🌐 | **Dịch Card** *(Translate Card)* | Translate character cards. *This is the main tool.* |
| 🃏 | **Tạo Card** *(Create Card)* | Build new cards from a story, plus Lorebook, Regex, MVU/ZOD variables, game UI. |
| 🎛️ | **Tạo Preset** *(Create Preset)* | Build / edit SillyTavern Presets & Regex Scripts by chatting with an AI. |
| 🛠️ | **Mod Card** | Modify / expand an existing card to your instructions (rewrite, deepen…). |
| 🔍 | **Trích Card** *(Extract Card)* | Read a story → automatically extract characters & Lorebook entries. |

---

## 🚀 First-time setup (once only)

### Step 1 — Install two prerequisites
- **[Node.js](https://nodejs.org/)** — get version **20 or newer** (install it like any normal program).
- **[Git](https://git-scm.com/downloads)** — default options are fine.

> Restart your computer once afterwards, just to be safe.

### Step 2 — Download the source
Open **Command Prompt** (Windows key → type `cmd` → Enter), then paste each line:

```bash
cd C:\
git clone https://github.com/kubi2811/ST-Card-Translation-Sky.git
```

### Step 3 — Run it
Go into the folder you just downloaded and **double-click `start.bat`**.

- The first run **installs libraries automatically** (takes a few minutes — leave it alone, don't close it).
- When done it opens your browser at **http://localhost:5173**.
- A few **small black console windows** will appear — those are the 3 helper tools. **Do not close them.**

> From then on, just double-click **`start.bat`**.

---

## 🔄 Updating

**Easiest:** in the app, click **"Cập nhật"** (Update) in the left rail → wait → then **fully close the app and run `start.bat` again** (a browser refresh is not enough).

**Alternative:** double-click **`update.bat`**.

<details>
<summary>⚠️ If Update fails or gets stuck — click here</summary>

<br>

Open **Command Prompt** inside the install folder and run:

```bash
git fetch origin main
git reset --hard origin/main
npm install
```

Then run `start.bat` again. This **always works**, and it **will not delete** the card you're translating, your progress, or files in `dev_data`.

</details>

---

## 📖 Translating a card — 5 steps

### 1️⃣ Enter your API key
Left column, **API Configuration**:
- Pick a provider: **Gemini / OpenAI / Claude / DeepSeek / Qwen**, or your own proxy.
- Paste your **API Key**. You can paste **multiple keys** (one per line) → much faster.
- Choose a **Model** → click **Test Connection** → a green message means you're good.

> 💡 More keys + more providers = more parallel lanes = faster translation. The app **respects your RPM limits automatically**, so you won't get rate-limited.

### 2️⃣ Load the card
Under **Character Card**: **drag & drop** a `.json` or `.png` file, or **paste a link** and click **Tải** (Load).

### 3️⃣ Choose what to translate
Tick the groups: Core, Greetings, Lorebook, Keys, Regex, Scripts… (leaving them all on is fine).

### 4️⃣ Click **Dịch** (Translate)
- Watch progress live. **Pause** or **Stop** at any time.
- Progress **auto-saves** — close the tab by accident and it's still there.

### 5️⃣ Check & export
- Click **Kiểm Tra Lỗi Dịch** (Check Translation Errors) → the app scans for untranslated text, broken HTML/JSON, missing macros, mismatched MVU variables, and more. There's a **Sửa nhanh** (Quick Fix — instant, no API cost) button and an **AI Sửa** (AI Fix) button for the hard ones.
- Click **Xuất** (Export) → download a `.json` or a `.png` (re-embedded into the original card image) → drop it straight into SillyTavern.

---

## ✨ What makes this good for translators

### 🔪 "Surgical" translation — your card doesn't break
The app **only translates the prose**, leaving HTML/CSS/JS, regex, URLs, variables and macros like `{{char}}` `{{user}}` completely untouched. That's exactly what usually breaks cards when translating by hand or with a plain AI.

### ⚡ Many lanes at once — several times faster
Multiple keys × multiple providers = many requests in parallel. The moment a lane finishes, it **immediately picks up the next entry** instead of waiting on a slow one. Still within your **RPM limits** — no 429 errors.

### 🔀 Compare Cards + Smart Merge ⭐ *(the big one)*

**The situation:** you finished translating a card, then **the author updated the original**. Previously you'd have to re-translate the whole thing.

Now click **"🔀 So Sánh Card"** (Compare Cards — the button right above *Character Card*) and load 3 files:

| Slot | What it is |
|---|---|
| **Card Raw** | The **old** original |
| **Card Đã Dịch** | Your **previous translation** |
| **Card Final** | The **new** original (the author's update) |

Click **"Gộp thông minh"** (Smart Merge) and the app compares every entry:
- Entry **unchanged** → **reuse your old translation** (regex/code stays byte-identical → **nothing breaks**).
- Entry **new or edited** → left untranslated, ready to translate.

You get a live preview (♻ green = reused, ✏️ amber = needs translating) plus a counter: **"Reused 100 · To translate 10"**. Then click **"Đưa sang Dịch Card"** (Send to Translate Card) → only those 10 new entries get translated. **A huge time saver.**

> The Compare screen also lets you view all 3 versions side by side per entry, **edit and save in place**, and filter to **"only show differences"**.

### 🧠 Consistency
- **Glossary** — force names and terms to be translated exactly how you want.
- **Translation memory** — identical sentences get identical translations.
- **MVU / EJS sync** — variable names in code and in the lorebook always stay in sync.

---

## 🧰 The other 4 tools

<details>
<summary><b>🃏 Tạo Card (Create Card)</b> — build a card from scratch</summary>

<br>

Turn a story into a card, mass-generate Lorebook entries, a Regex lab, an EJS Studio, and the **MVUZOD Studio** (design variables, initial values, update rules, and **Game UI** — chat with an AI that writes your game interface and *proves the regex actually matches* before handing it over).

</details>

<details>
<summary><b>🎛️ Tạo Preset (Create Preset)</b> — Presets & Regex</summary>

<br>

Chat with an AI to design **Preset JSON** and **Regex Script JSON** for SillyTavern, preview, then download.

</details>

<details>
<summary><b>🛠️ Mod Card</b> — modify / expand an existing card</summary>

<br>

Load a card, write your instructions (e.g. *"change the setting"*, *"add 3 more sections"*), and the AI analyses then rewrites section by section. Includes an **Expand / deep-dive mode**, a **before–after diff table**, and oversized entries are **split into parts automatically** so nothing gets truncated.

</details>

<details>
<summary><b>🔍 Trích Card (Extract Card)</b> — mine a story for characters</summary>

<br>

Paste in a long story; the app chunks and scans it, extracts **characters + Lorebook entries**, and exports a ready-to-use file.

</details>

---

## ❓ Common problems

**The Update button errors out / gets stuck**
→ See [Updating](#-updating) above and use the three manual commands.

**The app says `Failed to resolve import ...`**
→ A new version added a library. Fully close the app and run **`start.bat`** again (it installs automatically). Still stuck? Run `npm install` in the install folder.

**The app freezes for a few seconds after loading a card**
→ That card has very heavy Regex Scripts (hundreds of KB). It's normal — just wait. If you don't need to translate the scripts, untick the **Regex** group in step 3.

**Can't connect to the API / CORS error**
→ Double-check the Base URL and Key, try enabling **CORS Proxy**, or hit **Test Connection** to see the exact error.

**Gemini returns 524 / times out when expanding a huge entry**
→ One request ran too long and the proxy timed out. Use **Expand mode** on the whole section (the app splits it into parts), or pick a smaller block to deep-dive.

**What are those little black windows from `start.bat`?**
→ The 3 helper tools (Create Card / Create Preset / Mod Card). **Don't close them** or those tools won't load.

---

## 🔒 Privacy

- Runs **100% on your machine**. Your API key lives in your browser and is **never sent to any server of ours**.
- Your cards and translations stay on your machine too.

---

## 🛠 For developers

Vite + React + TypeScript · Zustand · Next.js (Mod Card) · Vitest.

```bash
npm install        # install dependencies
npm run dev        # run the Hub (port 5173)
npm run test:run   # run tests
npm run build      # production build
```

Ports: Hub/Translate `5173` · Create Card `5174` · Create Preset `5175` · Mod Card `5176` · Extract Card (static file, no port).

Changelog: see [CHANGELOG.md](CHANGELOG.md).

---

## 📝 License

MIT
