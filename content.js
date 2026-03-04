(function () {
    // Inject a CSS style tag to hide the Dropdown Menu and Confirmation Modals from the user 
    // during the ad-blocking process, preserving visual aesthetics.
    // data-testid="Dropdown" -> Menu opened after clicking the 3 dots
    // data-testid="confirmationSheetDialog" -> Main confirmation modal ("Are you sure?")
    // r-11z020y / mask -> Background overlay layer when the modal is open
    const style = document.createElement('style');
    style.innerHTML = `
        div[data-testid="Dropdown"], 
        div[data-testid="confirmationSheetDialog"], 
        div[data-testid="mask"] {
            opacity: 0 !important;
            visibility: hidden !important;
            pointer-events: none !important;
            transition: none !important;
        }
    `;
    document.head.appendChild(style);

    // To prevent scroll issues when up popping widgets close
    // We clear overflow properties from the body so X's native CSS takes over again.
    function releaseBodyScroll() {
        document.body.style.overflow = '';
        document.body.style.overscrollBehaviorY = '';

        // Sometimes the X platform leaves behind injected styles (e.g., width: calc(100% - 15px) etc.)
        // Clearing these padding and margin additions prevents the double scrollbar bug.
        document.body.style.paddingRight = '';
        document.body.style.marginRight = '';
    }

    // Supported ad labels (English and Turkish primarily, can be extended)
    const AD_LABELS = ["Reklam", "Ad", "Promoted"];

    // Lock to prevent concurrent blocking operations
    let isBlocking = false;

    async function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Interaction shield to prevent the user from accidentally clicking elsewhere 
    // and disrupting the Twitter menus during the automated blocking process
    function blockUserInteractions() {
        let shield = document.getElementById("x-ad-blocker-shield");
        if (!shield) {
            shield = document.createElement("div");
            shield.id = "x-ad-blocker-shield";
            Object.assign(shield.style, {
                position: "fixed",
                top: "0",
                left: "0",
                width: "100vw",
                height: "100vh",
                zIndex: "2147483647", // Maximum z-index (on top of everything)
                background: "transparent",
                cursor: "default"
            });
            document.body.appendChild(shield);
        }
        shield.style.display = "block";
    }

    function allowUserInteractions() {
        const shield = document.getElementById("x-ad-blocker-shield");
        if (shield) {
            shield.style.display = "none";
        }
    }

    function showToastNotification(advertiserName) {
        // Clear any existing toast notification
        const existingToast = document.getElementById("x-ad-blocker-toast");
        if (existingToast) existingToast.remove();

        const toast = document.createElement("div");
        toast.id = "x-ad-blocker-toast";
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="15" y1="9" x2="9" y2="15"></line>
                    <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
                <span>Blocked <b>${advertiserName}</b></span>
            </div>
        `;

        // Modern, clean, and unobtrusive aesthetic design
        Object.assign(toast.style, {
            position: "fixed",
            bottom: "24px",
            right: "24px",
            backgroundColor: "#1da1f2", // Twitter Blue
            color: "#ffffff",
            padding: "12px 16px",
            borderRadius: "50px",
            fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
            fontSize: "14px",
            fontWeight: "500",
            boxShadow: "0 4px 14px rgba(0, 0, 0, 0.15)",
            zIndex: "999999",
            opacity: "0",
            transform: "translateY(20px)",
            transition: "all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)",
            pointerEvents: "none"
        });

        document.body.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.style.opacity = "1";
            toast.style.transform = "translateY(0)";
        });

        // Disappear after 3 seconds
        setTimeout(() => {
            toast.style.opacity = "0";
            toast.style.transform = "translateY(20px)";
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    async function blockAdAccount(tweetElement) {
        if (isBlocking) return;
        isBlocking = true;

        // Prevent user from clicking elsewhere and accidentally closing Twitter menus
        blockUserInteractions();

        console.log("X Ad Blocker: ------------------------------------------------");
        console.log("X Ad Blocker: 🔍 Ad detected, initiating blocking process...");

        // Try to get the advertiser's name from the UI
        let advertiserName = "@Sponsored";
        const userNameElem = tweetElement.querySelector('[data-testid="User-Name"]');
        if (userNameElem) {
            const spans = userNameElem.querySelectorAll('span');
            if (spans.length > 0) advertiserName = spans[0].textContent;
        }

        // Softly fade out the ad so as not to distract the user
        tweetElement.style.transition = 'opacity 0.2s ease-out';
        tweetElement.style.opacity = '0';
        tweetElement.style.pointerEvents = 'none';

        try {
            // 1. Find and click the "More" (3 dots) button inside the tweet
            let moreBtn = null;
            let retryCount = 0;
            const maxRetries = 10; // Will search for up to 2 seconds (10 x 200ms)

            while (!moreBtn && retryCount < maxRetries) {
                // X sometimes uses 'caret' data-testid, and sometimes aria-label.
                moreBtn = tweetElement.querySelector('[data-testid="caret"]')
                    || tweetElement.querySelector('[aria-label="Daha fazla"]')
                    || tweetElement.querySelector('[aria-label="More"]');

                if (!moreBtn) {
                    retryCount++;
                    console.log(`X Ad Blocker: ⚠️ Button not fully loaded into DOM yet. Waiting... (Attempt ${retryCount}/${maxRetries})`);
                    await sleep(200); // Wait 200 milliseconds
                }
            }

            if (moreBtn) {
                console.log("X Ad Blocker: ✅ Step 1 - Found 3 dots (More) button and clicking it.");
                moreBtn.click();

                // 2. Find and click the "Block" button from the opened menu
                let blockMenuItem = null;
                let blockRetryCount = 0;
                const maxBlockRetries = 10;

                // The data-testid="block" element only becomes visible in the DOM when the menu is opened
                while (!blockMenuItem && blockRetryCount < maxBlockRetries) {
                    blockRetryCount++;
                    console.log(`X Ad Blocker: Waiting for menu to open (Attempt ${blockRetryCount}/${maxBlockRetries})...`);
                    await sleep(200);
                    blockMenuItem = document.querySelector('[data-testid="block"]');
                }

                if (blockMenuItem) {
                    console.log("X Ad Blocker: ✅ Step 2 - Found Block menu item and clicking it.");
                    blockMenuItem.click();

                    // 3. Click the "Block" button on the "Are you sure?" confirmation modal
                    let confirmBtn = null;
                    let confirmRetryCount = 0;
                    const maxConfirmRetries = 10;

                    // Wait for the confirmation modal to open
                    while (!confirmBtn && confirmRetryCount < maxConfirmRetries) {
                        confirmRetryCount++;
                        console.log(`X Ad Blocker: Waiting for confirmation modal to open (Attempt ${confirmRetryCount}/${maxConfirmRetries})...`);
                        await sleep(200);
                        confirmBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]');
                    }

                    if (confirmBtn) {
                        console.log("X Ad Blocker: ✅ Step 3 - Found confirmation modal, clicking '#Block' button.");
                        confirmBtn.click();
                        console.log("X Ad Blocker: 🎉 SUCCESS: Advertiser blocked!");

                        // Show aesthetic notification to the user
                        showToastNotification(advertiserName);

                    } else {
                        console.log("X Ad Blocker: ❌ ERROR (Step 3) - Confirm button (confirmationSheetConfirm) not found in DOM.");
                        // Log the modal HTML for debugging purposes
                        const modal = document.querySelector('[data-testid="confirmationSheetDialog"]');
                        if (modal) console.log("X Ad Blocker: Current Modal HTML state:", modal.outerHTML);
                        else console.log("X Ad Blocker: Modal (confirmationSheetDialog) might not have opened at all.");

                        const cancelBtn = document.querySelector('[data-testid="confirmationSheetCancel"]');
                        if (cancelBtn) cancelBtn.click();
                    }
                } else {
                    console.log("X Ad Blocker: ❌ ERROR (Step 2) - Block menu item (data-testid='block') not found in DOM.");
                    // Log the document
                    const dropdown = document.querySelector('[data-testid="Dropdown"]');
                    if (dropdown) console.log("X Ad Blocker: Current opened Dropdown Menu HTML state:", dropdown.outerHTML);

                    document.body.click(); // Close the menu
                }
            } else {
                console.log("X Ad Blocker: ⚠️ INFO (Step 1) - 3 dots menu button was not found in the ad despite waiting 2 seconds.");
                console.log("X Ad Blocker: This is likely a special X ad format with no block button. We couldn't block the advertiser, but we are completely hiding this post from your screen! 🗑️👀");
            }
        } catch (err) {
            console.error("X Ad Blocker: 🚨 UNEXPECTED ERROR:", err);
        } finally {
            // Remove the user interaction shield once the job is done or an error occurs!
            allowUserInteractions();

            // completely hide the tweet from the DOM just in case
            tweetElement.style.display = 'none';
            releaseBodyScroll(); // X sometimes leaves body overflow:hidden due to modals, clear this.

            await sleep(200);
            isBlocking = false;
            console.log("X Ad Blocker: Blocking process finished, lock released. Scanning for upcoming ads...");
            console.log("X Ad Blocker: ------------------------------------------------");

            // Re-trigger scanning in case we missed other tweets
            processTweets();
        }
    }

    function processTweets() {
        if (isBlocking) return;

        const tweets = document.querySelectorAll('article[data-testid="tweet"]');
        for (const tweet of Array.from(tweets)) {
            if (tweet.dataset.adProcessed) continue;

            let isAd = false;
            let detectedLabel = "";

            const spans = tweet.querySelectorAll('span');
            for (const span of Array.from(spans)) {
                const text = span.textContent.trim();
                // If the text in the span is an ad label
                if (AD_LABELS.includes(text)) {
                    // However, if the user's own tweet body contains words like "Promoted" or "Ad", do not block it.
                    const tweetTextContainer = tweet.querySelector('[data-testid="tweetText"]');
                    if (tweetTextContainer && tweetTextContainer.contains(span)) {
                        continue; // This area is the actual tweet content, not the metadata label.
                    }
                    isAd = true;
                    detectedLabel = text;
                    break;
                }
            }

            if (isAd) {
                console.log(`X Ad Blocker: New ad detected on screen (Label: ${detectedLabel}).`);
                tweet.dataset.adProcessed = "true";
                blockAdAccount(tweet);
                return; // Break the loop to block only one account at a time
            } else {
                tweet.dataset.adProcessed = "true";
            }
        }
    }

    // Scan once when the page initially loads (Timeout provided for React/NextJS hydration)
    window.addEventListener('load', () => {
        setTimeout(() => {
            console.log("X Ad Blocker: 🚀 Page loaded, starting to listen to X (Twitter)...");

            // Catch new tweets as they are added to the page (upon scrolling) using MutationObserver
            const observer = new MutationObserver((mutations) => {
                let shouldProcess = false;
                for (const mutation of mutations) {
                    if (mutation.addedNodes.length > 0) {
                        shouldProcess = true;
                        break;
                    }
                }
                if (shouldProcess) {
                    processTweets();
                }
            });

            // The Twitter (X) app typically renders dynamic DOM elements under <main> or the body
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            // Start the initial scan
            processTweets();
        }, 1500); // Start 1.5 seconds after page load
    });

})();
