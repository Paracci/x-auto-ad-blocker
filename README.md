# X (Twitter) Auto Ad Blocker 🚀

A lightweight, purely client-side Google Chrome extension designed to automatically detect and block sponsored ad accounts on X (formerly Twitter) in real-time. 

Unlike traditional ad blockers that rely on network filters or just hide elements with CSS, this extension **mimics real user interaction by systematically BLOCKING the advertiser's account entirely** in the background. Because the account itself is blocked, you'll never see another ad from that specific advertiser again—not just on your current device, but across all platforms where you use your X account!

⚠️ **Important Note for Users:** This extension doesn't just "hide" the ad visually; it permanently adds the advertiser to your X (Twitter) Blocked Accounts list. This ensures a cleaner feed long-term and saves your browser resources.

## ✨ Features

- **Real-Time Detection**: Utilizes `MutationObserver` to constantly scan for new tweets as you scroll down your timeline.
- **Smart Retries & Hydration Handling**: Waits intelligently for X's React hydration cycles (up to 2 seconds) instead of blindly failing if a dropdown menu or confirmation modal is slow to load.
- **Invisible Blocking Engine**: Injects a custom CSS stylesheet that visually hides the "More Options" dropdown menu and the "Are you sure?" confirmation modals. They trigger, they get clicked, but you never see them.
- **Interaction Shield**: Creates a temporary, invisible full-screen layer (`z-index: 2147483647`) during the 1-second blocking process to prevent stray clicks from accidentally closing the background menus.
- **Clean UI Feedback**: Submits a subtle, Twitter-style "Toast" notification in the bottom right corner (e.g., "Blocked @AdvertiserName") that fades out smoothly after 3 seconds.
- **Flawless Scrolling**: Properly restores `document.body.style.overflow` native CSS, ensuring no double-scrollbars or screen freezing ever occurs.

## 🛠️ How It Works

1. The script observes `document.body` for newly injected `article[data-testid="tweet"]` nodes.
2. It loops through the `<span>` tags text. If it detects advertising labels like "Ad", "Promoted", or "Reklam", it tags the element.
3. It clicks the 3 dots caret (`[data-testid="caret"]`).
4. It waits for the dropdown menu and clicks "Block" (`[data-testid="block"]`).
5. It waits for the confirmation modal and clicks "Block" again (`[data-testid="confirmationSheetConfirm"]`).
6. It hides the specific tweet element from the DOM entirely and resets.

## 📥 Installation

Since this extension automates clicks on your behalf, it is not available on the Chrome Web Store. You can install it locally in Developer Mode:

1. Clone or download this repository to your local machine (`Code -> Download ZIP`).
2. Unzip the file into a folder.
3. Open Google Chrome and type `chrome://extensions/` in the URL bar.
4. In the top right corner, toggle **Developer mode** on.
5. Click the **Load unpacked** button in the top left.
6. Select the folder where you extracted the project.
7. Go to `x.com`, refresh the page, and enjoy an ad-free timeline!

## 📜 Files Included

- `manifest.json`: Configuration mapping for Chrome Extensions V3.
- `content.js`: The powerhouse script that handles the DOM observation, smart retries, interaction shielding, and aesthetic notifications.

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details. Happy scrolling!
