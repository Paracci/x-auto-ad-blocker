# X (Twitter) Auto Ad Blocker 🚀

A lightweight, purely client-side Google Chrome extension designed to automatically detect and block sponsored ad accounts on X (formerly Twitter) in real-time — with a built-in media downloader for videos, GIFs, and images.

Unlike traditional ad blockers that rely on network filters or just hide elements with CSS, this extension **mimics real user interaction by systematically BLOCKING the advertiser's account entirely** in the background. Because the account itself is blocked, you'll never see another ad from that specific advertiser again — not just on your current device, but across all platforms where you use your X account!

⚠️ **Important Note for Users:** This extension doesn't just "hide" the ad visually; it permanently adds the advertiser to your X (Twitter) Blocked Accounts list. This ensures a cleaner feed long-term and saves your browser resources.

---

## ✨ Features

### 🚫 Ad Blocking
- **Real-Time Detection**: Utilizes `MutationObserver` to constantly scan for new tweets as you scroll down your timeline. Detects ad labels including `"Ad"`, `"Promoted"`, and `"Reklam"`.
- **Smart Retries & Hydration Handling**: Waits intelligently for X's React hydration cycles (up to 2 seconds) instead of blindly failing if a dropdown menu or confirmation modal is slow to load.
- **Invisible Blocking Engine**: Injects a custom CSS stylesheet that visually hides the "More Options" dropdown menu and the "Are you sure?" confirmation modals **only during the active blocking process**. This ensures you can still manually interact with tweets without interference while the automation works in the background.
- **Interaction Shield**: Creates a temporary, invisible full-screen layer (`z-index: 2147483647`) during the blocking process to prevent stray clicks from accidentally closing background menus.
- **Flawless Scrolling**: Properly restores `document.body.style.overflow` native CSS, ensuring no double-scrollbars or screen freezing ever occurs.

### 📥 Media Downloader
- **Download Button**: A native-looking download button is injected into every tweet's action bar, perfectly matching X's icon size, spacing, and hover ripple effect across all page types (Home, Post, Comment, Quote-Reply).
- **Video Downloads**: Fetches the highest-bitrate MP4 variant for each video using X's Syndication API — no blob URL hacks, no network interception required.
- **GIF Downloads**: Detects X's GIF format (which are silently stored as looping MP4 files under `/tweet_video/`) and saves them with the correct `.mp4` extension to prevent file corruption.
- **Image Downloads**: Downloads full-resolution images (`?name=orig`) from tweets, including multi-photo posts.
- **Clean Filenames**: Strips any pre-existing file extension from the URL basename before appending the target extension, preventing double-extension issues like `video.mp4.mp4`.

### 🎨 UI & Notifications
- **Adaptive Action Bar Integration**: The download button dynamically reads the SVG icon class and wrapper class from sibling buttons, automatically matching the correct size and spacing on every page type without any hardcoded layout logic.
- **Clean UI Feedback**: Shows a subtle, Twitter-style toast notification in the bottom right corner (e.g., "Blocked: @AdvertiserName", "Media downloaded ✓") that fades out smoothly after 3.5 seconds.

---

## 🛠️ How It Works

### Ad Blocking
1. The script observes `document.body` for newly injected `article[data-testid="tweet"]` nodes.
2. It loops through `<span>` tag text. If it detects advertising labels like `"Ad"`, `"Promoted"`, or `"Reklam"`, it tags the element.
3. It clicks the 3-dot caret (`[data-testid="caret"]`).
4. It waits for the dropdown and clicks "Block" (`[data-testid="block"]`).
5. It waits for the confirmation modal and clicks "Block" again (`[data-testid="confirmationSheetConfirm"]`).
6. It hides the tweet from the DOM entirely and resets.

### Media Downloader
1. On button click, the extension extracts the tweet's **Status ID** from the timestamp anchor link.
2. It sends the Status ID to the **background service worker**, which fetches `https://cdn.syndication.twimg.com/tweet-result?id={STATUS_ID}` — a public endpoint used by X's own embed widgets. The background service worker is used because content scripts cannot fetch this cross-origin URL directly due to CORS restrictions.
3. The API response contains all video variants with bitrates. The extension picks the **highest-bitrate MP4**.
4. The file is fetched as a blob and downloaded via a temporary `<a download>` element.

---

## 📁 Files Included

| File | Description |
|------|-------------|
| `manifest.json` | Chrome Extension Manifest V3 configuration. Declares host permissions for `cdn.syndication.twimg.com`, `video.twimg.com`, and `pbs.twimg.com`. |
| `content.js` | Main content script. Handles DOM observation, ad blocking, download button injection, action bar adaptation, and toast notifications. |
| `background.js` | Service worker. Proxies Syndication API requests from the content script to bypass CORS restrictions. |

---

## 📥 Installation

Since this extension automates clicks on your behalf, it is not available on the Chrome Web Store. You can install it locally in Developer Mode:

1. Clone or download this repository to your local machine (`Code → Download ZIP`).
2. Unzip the file into a folder.
3. Open Google Chrome and navigate to `chrome://extensions/`.
4. Toggle **Developer mode** on (top right corner).
5. Click **Load unpacked** (top left).
6. Select the folder where you extracted the project.
7. Go to `x.com`, refresh the page, and enjoy an ad-free timeline with media downloads!

---

## 🔒 Privacy

- No data is collected, stored, or transmitted to any third party.
- The only external request made is to `cdn.syndication.twimg.com` — X's own public embed API — and only when you click the download button.
- All processing happens entirely on your device.

---

## 📜 License

This project is licensed under the MIT License — see the LICENSE file for details. Happy scrolling!