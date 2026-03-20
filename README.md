# X (Twitter) Auto Ad Blocker

A lightweight, purely client-side Chrome extension that automatically detects and permanently blocks sponsored ad accounts on X (formerly Twitter) in real-time — with a built-in media downloader for videos, GIFs, and images, and a fully integrated control popup.

Unlike traditional ad blockers that rely on network filters or CSS hiding, this extension **mimics real user interaction by systematically BLOCKING the advertiser's account entirely** in the background. Because the account itself is blocked, you'll never see another ad from that specific advertiser again — not just on your current device, but across all platforms where you use your X account.

> Part of the **Paracci Browser Tools** collection — privacy-first, zero telemetry, built for power users.

⚠️ **Important Note:** This extension doesn't just "hide" the ad visually; it permanently adds the advertiser to your X (Twitter) Blocked Accounts list. This ensures a cleaner feed long-term and saves your browser resources.

---

## ✨ Features

### 🚫 Ad Blocking
- **Real-Time Detection:** Uses a debounced `MutationObserver` to scan for new tweets as you scroll. Detects ad labels including `"Ad"`, `"Promoted"`, and `"Reklam"`. Mutations are batched into 120ms windows to keep CPU usage minimal on X's heavily dynamic DOM.
- **Smart Startup:** Waits for the first tweet to appear in the DOM before initialising — no hardcoded delays, no race conditions on slow connections.
- **Smart Retries & Hydration Handling:** Waits intelligently for X's React hydration cycles instead of failing when a dropdown menu or confirmation modal is slow to appear.
- **Invisible Blocking Engine:** Injects a custom CSS stylesheet that visually hides the "More Options" dropdown and the "Are you sure?" confirmation modal **only during the active blocking process**, so your normal tweet interactions are never interrupted.
- **Interaction Shield:** Creates a temporary, invisible full-screen overlay (`z-index: 2147483647`) during blocking to prevent stray clicks from accidentally dismissing background menus.
- **Flawless Scrolling:** Properly restores `document.body.style.overflow`, ensuring no double-scrollbars or screen freezing.
- **Re-enable Rescan:** When the ad blocker is toggled back on, tweets that arrived while it was paused are immediately rescanned — nothing slips through.

### 📥 Media Downloader
- **Download Button:** A native-looking download button is injected into every tweet's action bar, perfectly matching X's icon size, spacing, and hover ripple effect across all page types (Home, Post, Comment, Quote-Reply).
- **Video Downloads:** Fetches the highest-bitrate MP4 variant using X's Syndication API — no blob URL hacks, no network interception required.
- **GIF Downloads:** Detects X's GIF format (looping MP4 files stored under `/tweet_video/`) and saves them with the `.gif` extension so file managers and chat apps treat them correctly.
- **Image Downloads:** Downloads full-resolution images (`?name=orig`) from tweets, including multi-photo posts.
- **Clean Filenames:** Strips any pre-existing extension from the URL basename before appending the target extension, preventing double-extension bugs like `video.mp4.mp4`.

### 🌍 Multi-Language Support
- **11 Languages:** English, Türkçe, Deutsch, Français, Español, Português, Italiano, Русский, 日本語, 한국어, 中文 — every UI element, toast notification, and status message is fully translated.
- **Automatic Detection:** On first run the extension reads the browser's UI language (`chrome.i18n.getUILanguage()`) and selects the closest supported language automatically.
- **Manual Override:** A language selector in the **Settings** page lets you switch languages instantly. The choice persists across sessions via `chrome.storage.local`. Setting it back to *Auto (Browser)* re-enables automatic detection.
- **Zero Flash:** `i18n.init()` is awaited before any DOM text is rendered, so the popup never shows English text before switching — the correct language appears on the very first paint.
- **Consistent Architecture:** The same shared `translations.js` engine is used by the popup and the content script, keeping all 160+ string keys in one place and ensuring content-script toasts match the popup language.

### 🎛️ Control Popup
- **Master Toggle:** Enable or disable the entire extension instantly from the popup. All features — ad blocking and the download button — respond in real-time without requiring a page refresh.
- **Granular Settings:** Independently toggle the ad blocker, the media downloader, and toast notifications from the Settings page.
- **Live Statistics:** The Home page displays a running count of unique advertisers blocked and media files downloaded, updated in real-time via `chrome.storage.onChanged` even while the popup is open.
- **Blocked Advertisers Tab:** Browse the full list of blocked advertiser handles. Each entry includes a **View on X** button that opens the advertiser's profile. A direct link to [X → Settings → Blocked accounts](https://x.com/settings/blocked/all) is also provided for reference.
- **Reset Stats:** Clear all counters and the blocked advertiser history from the Settings page — protected by a custom in-extension confirmation modal (no browser `alert()`).
- **X-Themed UI:** A clean, dark popup styled to match X's native design language — pure black background, X's exact blue accent (`#1d9bf0`), pill buttons, and animated status indicators.

### 🎨 UI & Notifications
- **Adaptive Action Bar Integration:** The download button dynamically reads SVG icon and wrapper classes from sibling buttons, automatically matching size and spacing on every page type with no hardcoded layout logic.
- **Stacked Toast Notifications:** Multiple toasts can appear simultaneously without overwriting each other — each slides in from the bottom-right and dismisses itself after 3.5 seconds. Can be disabled from the popup.

---

## 🛠️ How It Works

### Ad Blocking
1. The script waits for the first `article[data-testid="tweet"]` to appear, then starts a debounced `MutationObserver` on `document.body`.
2. It scans `<span>` text. If it detects `"Ad"`, `"Promoted"`, or `"Reklam"` outside of the tweet body, it flags the tweet as an ad.
3. It clicks the 3-dot caret (`[data-testid="caret"]`).
4. It waits for the dropdown and clicks "Block" (`[data-testid="block"]`).
5. It waits for the confirmation modal and clicks "Block" again (`[data-testid="confirmationSheetConfirm"]`).
6. It hides the tweet from the DOM, records the advertiser's `@handle` in `chrome.storage.local`, and resets.

### Deduplication
The blocked counter reflects **unique advertisers**, not total block events. Each advertiser's `@handle` is stored in a persistent `blockedHandles` array. If the same advertiser appears again, the block action still fires (so the ad is removed) but the counter does not increment again.

### Media Downloader
1. On button click, the extension extracts the tweet's **Status ID** from the timestamp anchor link.
2. It sends the Status ID to the **background service worker**, which fetches `https://cdn.syndication.twimg.com/tweet-result?id={STATUS_ID}` — a public endpoint used by X's own embed widgets. The service worker is used because content scripts cannot fetch this cross-origin URL directly due to CORS restrictions.
3. Specific HTTP errors are surfaced clearly: 404 (deleted/private), 429 (rate limited), 403 (token change).
4. The response contains all video variants with bitrates. The extension picks the **highest-bitrate MP4**.
5. The file is fetched as a blob and downloaded via a temporary `<a download>` element. The download counter in `chrome.storage.local` is then incremented.

### Multi-Language System
- `translations.js` is loaded as the **first content script** (before `content.js`) and as the **first `<script>` tag** in `popup.html`, making the `i18n` global available everywhere.
- Language resolution order: `chrome.storage.local → userLang` (manual override) → `chrome.i18n.getUILanguage()` (browser locale) → `'en'` (fallback).
- `i18n.applyToDOM()` walks the DOM and replaces the `textContent` of every element carrying a `data-i18n="key"` attribute — no template engine required.
- Chrome's native `_locales/` system (`__MSG_extensionName__` in `manifest.json`) localises the extension's name and description in `chrome://extensions/` independently of the UI engine.

### Popup ↔ Content Script Communication
- The popup saves settings to `chrome.storage.local` and broadcasts messages via `chrome.tabs.sendMessage` to all open X tabs.
- The content script listens for `toggle_extension`, `toggle_ad_block`, and `toggle_downloader` messages and applies changes immediately — hiding or showing the download button and enabling or pausing ad scanning in real-time.
- `blockedHandles` (unique advertisers) and `downloadCount` are persisted in `chrome.storage.local` and reflected live in the popup via `chrome.storage.onChanged`.

---

## 📁 Files

| File | Description |
|------|-------------|
| `manifest.json` | Manifest V3 configuration. Declares `storage` and `tabs` permissions alongside host permissions for `x.com`, `twitter.com`, `cdn.syndication.twimg.com`, `video.twimg.com`, and `pbs.twimg.com`. Sets `default_locale` to `en`. |
| `_locales/en/messages.json` | Chrome-native English locale — extension name & description shown in `chrome://extensions/`. |
| `_locales/tr/messages.json` | Turkish locale. |
| `_locales/de/messages.json` | German locale. |
| `_locales/fr/messages.json` | French locale. |
| `_locales/es/messages.json` | Spanish locale. |
| `_locales/pt/messages.json` | Portuguese locale. |
| `_locales/it/messages.json` | Italian locale. |
| `_locales/ru/messages.json` | Russian locale. |
| `_locales/ja/messages.json` | Japanese locale. |
| `_locales/ko/messages.json` | Korean locale. |
| `_locales/zh_CN/messages.json` | Simplified Chinese locale. |
| `src/i18n/translations.js` | Shared i18n engine. Contains all 160+ UI strings for 11 languages, the `i18n.init()` / `i18n.t()` / `i18n.applyToDOM()` / `i18n.setLang()` API, and language resolution logic. Loaded before every other script. |
| `src/content/content.js` | Main content script. Handles DOM observation, settings state, ad blocking, download button injection, popup message listening, and stacked toast notifications. All user-facing strings use `i18n.t()`. |
| `src/background/background.js` | Service worker. Proxies Syndication API requests from the content script to bypass CORS restrictions. Validates status IDs and surfaces specific HTTP error messages. |
| `src/popup/popup.html` | Popup markup. Four-page layout: Home (status + stats), Settings (toggles + language selector + reset), Blocked (advertiser history), About. All static text carries `data-i18n` attributes. |
| `src/popup/popup.css` | Popup styles. X-native dark theme using DM Sans, pure black background, X's blue accent, modal animations, and i18n-aware layout rules. |
| `src/popup/popup.js` | Popup logic. Reads/writes `chrome.storage.local`, initialises i18n, broadcasts messages to content scripts, animates counters, renders the blocked advertiser list, manages the language switcher, and manages the custom reset modal. |

---

## 📥 Installation

Since this extension automates clicks on your behalf, it is not listed on the Chrome Web Store. Install it locally in Developer Mode:

1. Clone or download this repository (`Code → Download ZIP`).
2. Unzip into a folder.
3. Open Chrome and go to `chrome://extensions/`.
4. Toggle **Developer mode** on (top-right corner).
5. Click **Load unpacked** (top-left).
6. Select the folder you extracted.
7. Visit `x.com`, refresh the page, and enjoy an ad-free timeline with media downloads.

---

## 🔒 Privacy

- No data is collected, stored, or transmitted to any third party.
- The only external network request is to `cdn.syndication.twimg.com` — X's own public embed API — and only when you click the download button on a tweet that contains a video.
- All counters, settings, language preference, and the blocked advertiser list are stored locally in your browser via `chrome.storage.local`.
- All processing happens entirely on your device.

---

## 📜 License

This project is licensed under the MIT License — see the `LICENSE` file for details.

---

## 🤝 Contact & Credit

Crafted with ❤️ by **Paracci**.

Part of the **Paracci Browser Tools** collection — also check out [YouTube Shorts Blocker](https://github.com/paracci/youtube-shorts-blocker).