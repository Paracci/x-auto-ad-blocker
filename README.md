# X (Twitter) Auto Ad Blocker 🚀

A lightweight, purely client-side Google Chrome extension that automatically detects and permanently blocks sponsored ad accounts on X (formerly Twitter) in real-time — with a built-in media downloader for videos, GIFs, and images, and a fully integrated control popup.

Unlike traditional ad blockers that rely on network filters or CSS hiding, this extension **mimics real user interaction by systematically BLOCKING the advertiser's account entirely** in the background. Because the account itself is blocked, you'll never see another ad from that specific advertiser again — not just on your current device, but across all platforms where you use your X account!

⚠️ **Important Note:** This extension doesn't just "hide" the ad visually; it permanently adds the advertiser to your X (Twitter) Blocked Accounts list. This ensures a cleaner feed long-term and saves your browser resources.

---

## ✨ Features

### 🚫 Ad Blocking
- **Real-Time Detection**: Uses `MutationObserver` to continuously scan for new tweets as you scroll. Detects ad labels including `"Ad"`, `"Promoted"`, and `"Reklam"`.
- **Smart Retries & Hydration Handling**: Waits intelligently for X's React hydration cycles (up to 2 seconds) instead of failing when a dropdown menu or confirmation modal is slow to appear.
- **Invisible Blocking Engine**: Injects a custom CSS stylesheet that visually hides the "More Options" dropdown and the "Are you sure?" confirmation modal **only during the active blocking process**, so your normal tweet interactions are never interrupted.
- **Interaction Shield**: Creates a temporary, invisible full-screen overlay (`z-index: 2147483647`) during blocking to prevent stray clicks from accidentally dismissing background menus.
- **Flawless Scrolling**: Properly restores `document.body.style.overflow`, ensuring no double-scrollbars or screen freezing.

### 📥 Media Downloader
- **Download Button**: A native-looking download button is injected into every tweet's action bar, perfectly matching X's icon size, spacing, and hover ripple effect across all page types (Home, Post, Comment, Quote-Reply).
- **Video Downloads**: Fetches the highest-bitrate MP4 variant using X's Syndication API — no blob URL hacks, no network interception required.
- **GIF Downloads**: Detects X's GIF format (looping MP4 files stored under `/tweet_video/`) and saves them with the correct `.mp4` extension to prevent file corruption.
- **Image Downloads**: Downloads full-resolution images (`?name=orig`) from tweets, including multi-photo posts.
- **Clean Filenames**: Strips any pre-existing extension from the URL basename before appending the target extension, preventing double-extension bugs like `video.mp4.mp4`.

### 🎛️ Control Popup
- **Master Toggle**: Enable or disable the entire extension instantly from the popup. All features — ad blocking and the download button — respond in real-time without requiring a page refresh.
- **Granular Settings**: Independently toggle the ad blocker, the media downloader, and toast notifications from the Settings page.
- **Live Statistics**: The Home page displays a running count of ads blocked and media files downloaded, updated in real-time via `chrome.storage.onChanged` even while the popup is open.
- **Reset Stats**: Clear both counters at any time from the Settings page.
- **X-Themed UI**: A clean, dark popup styled to match X's native design language — pure black background, X's exact blue accent (`#1d9bf0`), pill buttons, and animated status indicators.

### 🎨 UI & Notifications
- **Adaptive Action Bar Integration**: The download button dynamically reads SVG icon and wrapper classes from sibling buttons, automatically matching size and spacing on every page type with no hardcoded layout logic.
- **Toast Notifications**: Subtle, X-style toast in the bottom-right corner (e.g., `"Blocked: @AdvertiserName"`, `"Media downloaded ✓"`) that fades out after 3.5 seconds. Can be disabled from the popup.

---

## 🛠️ How It Works

### Ad Blocking
1. The script observes `document.body` for newly injected `article[data-testid="tweet"]` nodes.
2. It scans `<span>` text. If it detects `"Ad"`, `"Promoted"`, or `"Reklam"` outside of the tweet body, it flags the tweet as an ad.
3. It clicks the 3-dot caret (`[data-testid="caret"]`).
4. It waits for the dropdown and clicks "Block" (`[data-testid="block"]`).
5. It waits for the confirmation modal and clicks "Block" again (`[data-testid="confirmationSheetConfirm"]`).
6. It hides the tweet from the DOM, increments the blocked counter in `chrome.storage.local`, and resets.

### Media Downloader
1. On button click, the extension extracts the tweet's **Status ID** from the timestamp anchor link.
2. It sends the Status ID to the **background service worker**, which fetches `https://cdn.syndication.twimg.com/tweet-result?id={STATUS_ID}` — a public endpoint used by X's own embed widgets. The service worker is used because content scripts cannot fetch this cross-origin URL directly due to CORS restrictions.
3. The response contains all video variants with bitrates. The extension picks the **highest-bitrate MP4**.
4. The file is fetched as a blob and downloaded via a temporary `<a download>` element. The download counter in `chrome.storage.local` is then incremented.

### Popup ↔ Content Script Communication
- The popup saves settings to `chrome.storage.local` and broadcasts messages via `chrome.tabs.sendMessage` to all open X tabs.
- The content script listens for `toggle_extension`, `toggle_ad_block`, and `toggle_downloader` messages and applies changes immediately — hiding or showing the download button and enabling or pausing ad scanning in real-time.
- Both `blockedCount` and `downloadCount` are persisted in `chrome.storage.local` and reflected live in the popup via `chrome.storage.onChanged`.

---

## 📁 Files

| File | Description |
|------|-------------|
| `manifest.json` | Manifest V3 configuration. Declares `storage` and `tabs` permissions alongside host permissions for `x.com`, `twitter.com`, `cdn.syndication.twimg.com`, `video.twimg.com`, and `pbs.twimg.com`. |
| `content.js` | Main content script. Handles DOM observation, settings state, ad blocking, download button injection, popup message listening, and toast notifications. |
| `background.js` | Service worker. Proxies Syndication API requests from the content script to bypass CORS restrictions. |
| `popup.html` | Popup markup. Three-page layout: Home (status + stats), Settings (toggles), About. |
| `popup.css` | Popup styles. X-native dark theme using DM Sans, pure black background, and X's blue accent. |
| `popup.js` | Popup logic. Reads/writes `chrome.storage.local`, broadcasts messages to content scripts, animates counters, and manages page navigation. |

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
- All counters and settings are stored locally in your browser via `chrome.storage.local`.
- All processing happens entirely on your device.

---

## 📜 License

This project is licensed under the MIT License — see the `LICENSE` file for details. Happy scrolling!