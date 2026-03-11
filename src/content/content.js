(function () {
    'use strict';

    // =========================================================================
    // STYLES
    // =========================================================================

    function injectStyles() {
        const style = document.createElement('style');
        style.innerHTML = `
            body.x-ad-blocking-active div[data-testid="Dropdown"],
            body.x-ad-blocking-active div[data-testid="confirmationSheetDialog"],
            body.x-ad-blocking-active div[data-testid="mask"] {
                opacity:0!important; visibility:hidden!important;
                pointer-events:none!important; transition:none!important;
            }
            [data-testid="download-media"]:hover > div { color:rgb(29,155,240)!important; }
            [data-testid="download-media"]:hover .r-1p0dtai { background-color:rgba(29,155,240,0.1)!important; }
            [data-testid="download-media"]:hover svg path { fill:rgb(29,155,240)!important; }
            [data-testid="download-media"] { background:none; border:none; padding:0; cursor:pointer; }
            [data-testid="download-media"][data-loading="true"] {
                opacity:0.35!important; pointer-events:none!important;
            }
        `;
        (document.head || document.documentElement).appendChild(style);
    }
    injectStyles();

    // =========================================================================
    // SETTINGS STATE  (synced from chrome.storage + popup messages)
    // =========================================================================

    const settings = {
        extensionEnabled:  true,
        adBlockEnabled:    true,
        toastsEnabled:     true,
        downloaderEnabled: true,
    };

    // Load persisted settings once on startup
    chrome.storage.local.get(
        ['extensionEnabled', 'adBlockEnabled', 'toastsEnabled', 'downloaderEnabled'],
        (res) => {
            if (res.extensionEnabled  !== undefined) settings.extensionEnabled  = res.extensionEnabled;
            if (res.adBlockEnabled    !== undefined) settings.adBlockEnabled    = res.adBlockEnabled;
            if (res.toastsEnabled     !== undefined) settings.toastsEnabled     = res.toastsEnabled;
            if (res.downloaderEnabled !== undefined) settings.downloaderEnabled = res.downloaderEnabled;
        }
    );

    // Listen for real-time toggle messages from the popup
    chrome.runtime.onMessage.addListener((message) => {
        switch (message.action) {
            case 'toggle_extension':
                settings.extensionEnabled = message.enabled;
                if (!message.enabled) {
                    // Hide all injected download buttons immediately
                    document.querySelectorAll('[data-x-dl-wrapper]').forEach(w => {
                        w.style.display = 'none';
                    });
                } else {
                    // Restore download buttons if downloader is also enabled
                    if (settings.downloaderEnabled) {
                        document.querySelectorAll('[data-x-dl-wrapper]').forEach(w => {
                            w.style.display = '';
                        });
                    }
                    processTweets();
                }
                break;

            case 'toggle_ad_block':
                settings.adBlockEnabled = message.enabled;
                break;

            case 'toggle_downloader':
                settings.downloaderEnabled = message.enabled;
                if (!message.enabled) {
                    document.querySelectorAll('[data-x-dl-wrapper]').forEach(w => {
                        w.style.display = 'none';
                    });
                } else {
                    document.querySelectorAll('[data-x-dl-wrapper]').forEach(w => {
                        w.style.display = '';
                    });
                    processTweets();
                }
                break;
        }
    });

    // =========================================================================
    // HELPERS
    // =========================================================================

    const sleep = ms => new Promise(r => setTimeout(r, ms));

    function releaseBodyScroll() {
        document.body.style.overflow = '';
        document.body.style.overscrollBehaviorY = '';
        document.body.style.paddingRight = '';
        document.body.style.marginRight = '';
    }

    // =========================================================================
    // TOAST
    // =========================================================================

    function showToast(htmlMsg, iconType = 'block', bgColor = '#1da1f2') {
        if (!settings.toastsEnabled) return;   // ← popup "Show toast notifications" toggle
        const old = document.getElementById('x-adb-toast');
        if (old) old.remove();
        const icons = {
            block: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
            download: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 16.59l-5.7-5.7 1.41-1.42L11 12.76V3h2v9.76l3.3-3.3 1.41 1.42L12 16.59zM3 21v-3.5h2V19h14v-1.5h2V21H3z"/></svg>`,
            warning: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
        };
        const toast = document.createElement('div');
        toast.id = 'x-adb-toast';
        toast.innerHTML = `<div style="display:flex;align-items:center;gap:8px;">${icons[iconType] || ''}<span>${htmlMsg}</span></div>`;
        Object.assign(toast.style, {
            position: 'fixed', bottom: '24px', right: '24px',
            backgroundColor: bgColor, color: '#fff',
            padding: '12px 16px', borderRadius: '50px',
            fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
            fontSize: '14px', fontWeight: '500',
            boxShadow: '0 4px 14px rgba(0,0,0,.15)',
            zIndex: '999999', opacity: '0', transform: 'translateY(20px)',
            transition: 'all .3s cubic-bezier(.25,.8,.25,1)', pointerEvents: 'none'
        });
        document.body.appendChild(toast);
        requestAnimationFrame(() => { toast.style.opacity = '1'; toast.style.transform = 'translateY(0)'; });
        setTimeout(() => {
            toast.style.opacity = '0'; toast.style.transform = 'translateY(20px)';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }

    // =========================================================================
    // TWEET STATUS ID EXTRACTION
    // =========================================================================

    function getTweetStatusId(tweetElement) {
        const timeLink = tweetElement.querySelector('time')?.closest('a[href*="/status/"]');
        if (timeLink) {
            const m = timeLink.getAttribute('href').match(/\/status\/(\d+)/);
            if (m) return m[1];
        }
        for (const a of tweetElement.querySelectorAll('a[href*="/status/"]')) {
            const m = a.getAttribute('href').match(/\/status\/(\d+)/);
            if (m) return m[1];
        }
        return null;
    }

    // =========================================================================
    // FILE NAMING
    //
    // FIX 1 - Double extension:
    //   URL path ends in "HC7GTvMXwAEdBZA.mp4" - we must NOT add ".mp4" again.
    //   Solution: strip any existing extension from the basename before appending.
    //
    // FIX 2 - GIF detection:
    //   X stores GIFs as MP4 under the /tweet_video/ path.
    //   We save them as .gif so the user's file manager treats them correctly.
    //   (The file content is valid MP4/H.264, but browsers & most viewers open
    //   them fine. If you prefer keeping .mp4 just remove the gif branch.)
    // =========================================================================

    /**
     * Returns true if the URL points to a Twitter GIF (tweet_video path).
     * GIFs on X are looping, silent MP4 files stored at:
     *   https://video.twimg.com/tweet_video/FILENAME.mp4
     */
    function isGifUrl(url) {
        return url.includes('video.twimg.com/tweet_video/');
    }

    /**
     * Builds a clean filename from a media URL.
     * Strips any existing extension from the basename, then appends the
     * desired extension - preventing double-extension bugs like "foo.mp4.mp4".
     */
    function buildFilename(url, idx, ext) {
        try {
            const parts = new URL(url).pathname.split('/');
            const base = (parts[parts.length - 1] || `media_${idx}`).split('?')[0];
            // Strip existing extension (e.g. ".mp4", ".jpg") from the base
            const noExt = base.replace(/\.[^.]+$/, '');
            return `${noExt}.${ext}`;
        } catch (_) {
            return `twitter_media_${idx}.${ext}`;
        }
    }

    function getBestImageUrl(src) {
        try {
            const u = new URL(src);
            if (u.hostname === 'pbs.twimg.com') {
                u.searchParams.set('format', 'jpg');
                u.searchParams.set('name', 'orig');
                return u.toString();
            }
        } catch (_) { }
        return src;
    }

    // =========================================================================
    // SYNDICATION API - via background service worker (CORS-free)
    // =========================================================================

    function fetchTweetDataViaBackground(statusId) {
        return new Promise((resolve, reject) => {
            // Guard: chrome.runtime can become undefined if the extension context
            // is invalidated (e.g. extension reloaded/updated while page was open).
            if (!chrome?.runtime?.sendMessage) {
                reject(new Error('Extension context invalidated — please refresh the page.'));
                return;
            }
            try {
                chrome.runtime.sendMessage(
                    { type: 'FETCH_TWEET_DATA', statusId },
                    (response) => {
                        // Re-check after async callback — context may have gone away
                        if (chrome?.runtime?.lastError) { reject(new Error(chrome.runtime.lastError.message)); return; }
                        if (!response) { reject(new Error('No response from background')); return; }
                        if (!response.ok) { reject(new Error(response.error || 'Background fetch failed')); return; }
                        resolve(response.data);
                    }
                );
            } catch (err) {
                // Catch synchronous throws (e.g. "Extension context invalidated")
                reject(new Error(`sendMessage failed: ${err.message}`));
            }
        });
    }

    async function getVideoUrlFromSyndication(statusId) {
        const data = await fetchTweetDataViaBackground(statusId);
        console.log('X Ad Blocker: Syndication data keys:', Object.keys(data));

        let variants = null;

        // PRIORITY: mediaDetails[].video_info.variants includes bitrate per variant.
        // data.video.variants does NOT include bitrate, so sorting by quality is impossible.
        // Always prefer mediaDetails when available; fall back to video.variants for GIFs
        // (tweet_video path) which only ever have one variant and no bitrate anyway.
        if (data?.mediaDetails?.length) {
            for (const media of data.mediaDetails) {
                if (media?.video_info?.variants?.length) {
                    variants = media.video_info.variants.map(v => ({
                        type: v.content_type,
                        src: v.url,
                        bitrate: v.bitrate
                    }));
                    console.log('X Ad Blocker: Using mediaDetails variants (with bitrate)');
                    break;
                }
            }
        }

        // Fallback: data.video.variants (no bitrate info - GIFs / edge cases)
        if (!variants?.length && data?.video?.variants?.length) {
            variants = data.video.variants;
            console.log('X Ad Blocker: Fallback to data.video.variants (no bitrate info)');
        }

        if (!variants?.length) {
            console.log('X Ad Blocker: No video variants. Response:', JSON.stringify(data).slice(0, 500));
            return null;
        }

        // Keep only MP4s (skip HLS m3u8)
        const mp4s = variants.filter(v =>
            (v.type === 'video/mp4' || v.content_type === 'video/mp4') &&
            v.src?.includes('video.twimg.com')
        );

        if (!mp4s.length) {
            console.log('X Ad Blocker: No MP4 variants. All:', JSON.stringify(variants));
            return null;
        }

        // Sort by bitrate descending (GIFs have no bitrate - only one variant anyway)
        mp4s.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
        const best = mp4s[0];
        console.log(`X Ad Blocker: ${mp4s.length} MP4(s). Best (${best.bitrate || 'GIF'}bps):`, best.src);
        return best.src;
    }

    // =========================================================================
    // FILE DOWNLOAD
    // =========================================================================

    async function downloadFile(url, filename) {
        try {
            const res = await fetch(url, { mode: 'cors' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const blob = await res.blob();
            const sizeKB = (blob.size / 1024).toFixed(1);
            console.log(`X Ad Blocker: Blob ${sizeKB} KB | ${blob.type}`);

            if (blob.size < 10_000) {
                const preview = await blob.text();
                console.warn('X Ad Blocker: Suspiciously small:', preview.slice(0, 200));
                throw new Error(`Too small (${sizeKB} KB)`);
            }

            const blobUrl = URL.createObjectURL(blob);
            const a = Object.assign(document.createElement('a'), {
                href: blobUrl, download: filename, style: 'display:none'
            });
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 8000);
            return true;
        } catch (err) {
            console.warn('X Ad Blocker: Download failed, opening new tab:', err);
            window.open(url, '_blank');
            return false;
        }
    }

    // =========================================================================
    // DOWNLOAD HANDLER
    // =========================================================================

    async function downloadTweetMedia(tweet, button) {
        console.log('X Ad Blocker: 📥 Download initiated.');
        button.setAttribute('data-loading', 'true');

        const mediaItems = [];

        // Images
        const photos = tweet.querySelectorAll('[data-testid="tweetPhoto"]');
        photos.forEach((c, i) => {
            const img = c.querySelector('img');
            if (img?.src && !img.src.startsWith('data:')) {
                const url = getBestImageUrl(img.src);
                mediaItems.push({ type: 'image', url, filename: buildFilename(url, i, 'jpg') });
            }
        });
        if (!photos.length) {
            tweet.querySelectorAll('[data-testid$=".media"] img').forEach((img, i) => {
                if (img?.src?.includes('pbs.twimg.com')) {
                    const url = getBestImageUrl(img.src);
                    mediaItems.push({ type: 'image', url, filename: buildFilename(url, i, 'jpg') });
                }
            });
        }

        // Video / GIF
        if (tweet.querySelector('video')) {
            const statusId = getTweetStatusId(tweet);
            console.log('X Ad Blocker: Status ID:', statusId);

            if (!statusId) {
                showToast('Could not find tweet ID.', 'warning', '#e0245e');
                button.removeAttribute('data-loading');
                return;
            }

            try {
                const videoUrl = await getVideoUrlFromSyndication(statusId);
                if (videoUrl) {
                    // X GIFs are MP4 files internally - always save as .mp4
                    const type = isGifUrl(videoUrl) ? 'gif' : 'video';
                    mediaItems.push({ type, url: videoUrl, filename: buildFilename(videoUrl, 0, 'mp4') });
                } else {
                    showToast('Video not found (may be private or deleted).', 'warning', '#657786');
                    button.removeAttribute('data-loading');
                    return;
                }
            } catch (err) {
                console.error('X Ad Blocker: Syndication error:', err);
                showToast(`Failed to get video: ${err.message}`, 'warning', '#e0245e');
                button.removeAttribute('data-loading');
                return;
            }
        }

        if (!mediaItems.length) {
            showToast('No downloadable media found in this post.', 'warning', '#657786');
        } else {
            let ok = 0;
            for (const item of mediaItems) {
                console.log(`X Ad Blocker: ⬇️ ${item.type}: ${item.filename}`);
                await sleep(150);
                if (await downloadFile(item.url, item.filename)) ok++;
            }
            const msg = mediaItems.length === 1
                ? 'Media downloaded ✓'
                : `${ok}/${mediaItems.length} media downloaded ✓`;
            showToast(msg, 'download', '#1da1f2');
            // Increment persistent counter → updates popup stat in real-time
            chrome.storage.local.get('downloadCount', (r) => {
                chrome.storage.local.set({ downloadCount: (r.downloadCount || 0) + ok });
            });
        }

        button.removeAttribute('data-loading');
    }

    // =========================================================================
    // DOWNLOAD BUTTON - mirrors Action_bar.html structure exactly
    // =========================================================================

    function createDownloadButton(svgClass, wrapperClass) {
        // svgClass is copied from sibling buttons so we blend in on all page types:
        // Home/Comment: "r-1xvli5t r-1hdv0qi"  (small icons)
        // Post/QuoteReply: "r-50lct3 r-1srniue"  (large icons)
        const sc = svgClass || 'r-4qtqp9 r-yyyyoo r-dnmrzs r-bnwqim r-lrvibr r-m6rgpd r-1xvli5t r-1hdv0qi';
        const wrapper = document.createElement('div');
        wrapper.className = wrapperClass || 'css-175oi2r r-18u37iz r-1h0z5md r-1wron08';
        wrapper.innerHTML = `
            <button aria-label="Download media" role="button"
                data-testid="download-media" type="button"
                class="css-175oi2r r-1777fci r-bt1l66 r-bztko3 r-lrvibr r-1loqt21 r-1ny4l3l">
                <div dir="ltr"
                    class="css-146c3p1 r-bcqeeo r-1ttztb7 r-qvutc0 r-37j5jr r-a023e6 r-rjixqe r-16dba41 r-1awozwy r-6koalj r-1h0z5md r-o7ynqc r-clp7b1 r-3s2u2q"
                    style="color:rgb(113,118,123)">
                    <div class="css-175oi2r r-xoduu5">
                        <div class="css-175oi2r r-xoduu5 r-1p0dtai r-1d2f490 r-u8s1d r-zchlnj r-ipm5af r-1niwhzg r-sdzlij r-xf4iuw r-o7ynqc r-6416eg r-1ny4l3l"></div>
                        <svg viewBox="0 0 24 24" aria-hidden="true" class="${sc}">
                            <g><path d="M12 16.59l-5.7-5.7 1.41-1.42L11 12.76V3h2v9.76l3.3-3.3 1.41 1.42L12 16.59zM3 21v-3.5h2V19h14v-1.5h2V21H3z"/></g>
                        </svg>
                    </div>
                </div>
            </button>
        `;
        return wrapper;
    }

    function addDownloadButtonToTweet(tweet) {
        if (tweet.dataset.downloadButtonAdded) return;
        // If downloader or extension is disabled, mark as processed but don't inject
        if (!settings.extensionEnabled || !settings.downloaderEnabled) return;
        const actionBar = tweet.querySelector('[role="group"]');
        if (!actionBar) return;
        // Detect SVG class from an existing sibling button to match page style.
        // Post page uses larger icons (r-50lct3 r-1srniue), home/comment uses smaller (r-1xvli5t r-1hdv0qi).
        const sibSvg = actionBar.querySelector('button svg, a svg');
        const sibClass = sibSvg ? sibSvg.getAttribute('class') : null;
        // Match wrapper class of the bookmark button so spacing is identical
        // Home/Comment: bookmark uses r-1wron08 (no count label)
        // Post/QuoteReply: bookmark uses r-13awgt0 (has count label spacing)
        const bookmarkEl = actionBar.querySelector('[data-testid="bookmark"]');
        const bookmarkWrapperClass = bookmarkEl?.parentElement?.className || 'css-175oi2r r-18u37iz r-1h0z5md r-1wron08';
        const wrapper = createDownloadButton(sibClass, bookmarkWrapperClass);
        wrapper.setAttribute('data-x-dl-wrapper', '');  // marker for toggle visibility
        const btn = wrapper.querySelector('[data-testid="download-media"]');
        btn.addEventListener('click', e => {
            e.preventDefault(); e.stopPropagation();
            downloadTweetMedia(tweet, btn);
        });
        // Insert before bookmark to match X native order:
        // reply | retweet | like | analytics | [download] | bookmark | share
        const bookmarkWrapper = actionBar.querySelector('[data-testid="bookmark"]')?.parentElement;
        if (bookmarkWrapper && bookmarkWrapper.parentElement === actionBar) {
            actionBar.insertBefore(wrapper, bookmarkWrapper);
        } else {
            const shareWrapper = actionBar.querySelector('[style*="inline-grid"]');
            shareWrapper ? actionBar.insertBefore(wrapper, shareWrapper) : actionBar.appendChild(wrapper);
        }
        tweet.dataset.downloadButtonAdded = 'true';
    }

    // =========================================================================
    // AD BLOCKING
    // =========================================================================

    const AD_LABELS = ['Reklam', 'Ad', 'Promoted'];
    let isBlocking = false;

    function blockUserInteractions() {
        let s = document.getElementById('x-adb-shield');
        if (!s) {
            s = document.createElement('div');
            s.id = 'x-adb-shield';
            Object.assign(s.style, {
                position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
                zIndex: '2147483647', background: 'transparent', cursor: 'default'
            });
            document.body.appendChild(s);
        }
        s.style.display = 'block';
        document.body.classList.add('x-ad-blocking-active');
    }

    function allowUserInteractions() {
        const s = document.getElementById('x-adb-shield');
        if (s) s.style.display = 'none';
        document.body.classList.remove('x-ad-blocking-active');
    }

    async function blockAdAccount(tweetElement) {
        if (isBlocking) return;
        isBlocking = true;
        blockUserInteractions();
        console.log('X Ad Blocker: ─── Blocking ad... ───');

        let name = '@Sponsored';
        const un = tweetElement.querySelector('[data-testid="User-Name"]');
        if (un) { const sp = un.querySelectorAll('span'); if (sp.length) name = sp[0].textContent; }

        tweetElement.style.transition = 'opacity .2s ease-out';
        tweetElement.style.opacity = '0';
        tweetElement.style.pointerEvents = 'none';

        try {
            let moreBtn = null;
            for (let i = 0; i < 10 && !moreBtn; i++) {
                moreBtn = tweetElement.querySelector('[data-testid="caret"]')
                    || tweetElement.querySelector('[aria-label="Daha fazla"]')
                    || tweetElement.querySelector('[aria-label="More"]');
                if (!moreBtn) await sleep(200);
            }
            if (moreBtn) {
                moreBtn.click();
                let blockItem = null;
                for (let i = 0; i < 10 && !blockItem; i++) { await sleep(200); blockItem = document.querySelector('[data-testid="block"]'); }
                if (blockItem) {
                    blockItem.click();
                    let confirmBtn = null;
                    for (let i = 0; i < 10 && !confirmBtn; i++) { await sleep(200); confirmBtn = document.querySelector('[data-testid="confirmationSheetConfirm"]'); }
                    if (confirmBtn) {
                        confirmBtn.click();
                        showToast(`Blocked: <b>${name}</b>`, 'block', '#1da1f2');
                        // Increment persistent counter → updates popup stat in real-time
                        chrome.storage.local.get('blockedCount', (r) => {
                            chrome.storage.local.set({ blockedCount: (r.blockedCount || 0) + 1 });
                        });
                    } else {
                        const cancel = document.querySelector('[data-testid="confirmationSheetCancel"]');
                        if (cancel) cancel.click();
                    }
                } else { document.body.click(); }
            }
        } catch (err) { console.error('X Ad Blocker: Error:', err); }
        finally {
            allowUserInteractions();
            tweetElement.style.display = 'none';
            releaseBodyScroll();
            await sleep(200);
            isBlocking = false;
            processTweets();
        }
    }

    // =========================================================================
    // MAIN PROCESSOR & INIT
    // =========================================================================

    function processTweets() {
        if (isBlocking) return;
        for (const tweet of document.querySelectorAll('article[data-testid="tweet"]')) {
            addDownloadButtonToTweet(tweet);
            if (tweet.dataset.adProcessed) continue;
            // Only scan for ads if both master switch and ad-block switch are on
            if (!settings.extensionEnabled || !settings.adBlockEnabled) {
                tweet.dataset.adProcessed = 'true';
                continue;
            }
            let isAd = false;
            for (const span of tweet.querySelectorAll('span')) {
                const t = span.textContent.trim();
                if (AD_LABELS.includes(t)) {
                    if (tweet.querySelector('[data-testid="tweetText"]')?.contains(span)) continue;
                    isAd = true; break;
                }
            }
            tweet.dataset.adProcessed = 'true';
            if (isAd) { blockAdAccount(tweet); return; }
        }
    }

    function init() {
        console.log('X Ad Blocker: 🚀 Running.');
        const observer = new MutationObserver(muts => {
            if (muts.some(m => m.addedNodes.length)) processTweets();
        });
        observer.observe(document.body, { childList: true, subtree: true });
        processTweets();
    }

    setTimeout(init, 1500);

})();