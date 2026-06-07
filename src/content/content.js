(function () {
    'use strict';

    // =========================================================================
    // STYLES
    // =========================================================================

    function updateAdBlockState() {
        const target = document.body || document.documentElement;
        if (target) {
            if (settings.extensionEnabled && settings.adBlockEnabled) {
                target.classList.add('x-ad-blocking-enabled');
            } else {
                target.classList.remove('x-ad-blocking-enabled');
            }
        }
    }

    function injectStyles() {
        const style = document.createElement('style');
        style.innerHTML = `
            body.x-ad-blocking-active div[data-testid="Dropdown"],
            body.x-ad-blocking-active div[data-testid="confirmationSheetDialog"],
            body.x-ad-blocking-active div[data-testid="mask"],
            body.x-ad-blocking-active div[role="menu"],
            body.x-ad-blocking-active #layers > div > div[style*="position: absolute"] {
                display:none!important;
                pointer-events:none!important;
                transition:none!important;
            }
            .x-ad-blocking-enabled div[data-testid="whoToFollowSspAd"],
            .x-ad-blocking-enabled div[data-testid*="SspAd"],
            .x-ad-blocking-enabled div[id^="div-gpt-ad-"] {
                display:none!important;
                pointer-events:none!important;
                transition:none!important;
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
        extensionEnabled: true,
        adBlockEnabled: true,
        toastsEnabled: true,
        downloaderEnabled: true,
    };

    // Initialise i18n engine (translations.js is loaded before this file)
    i18n.init();

    // Load persisted settings once on startup
    safeStorageGet(
        ['extensionEnabled', 'adBlockEnabled', 'toastsEnabled', 'downloaderEnabled'],
        (res) => {
            if (!res) return;
            if (res.extensionEnabled !== undefined) settings.extensionEnabled = res.extensionEnabled;
            if (res.adBlockEnabled !== undefined) settings.adBlockEnabled = res.adBlockEnabled;
            if (res.toastsEnabled !== undefined) settings.toastsEnabled = res.toastsEnabled;
            if (res.downloaderEnabled !== undefined) settings.downloaderEnabled = res.downloaderEnabled;
            updateAdBlockState();
        }
    );

    // Listen for real-time toggle messages from the popup
    try {
        chrome.runtime.onMessage.addListener((message) => {
            if (!isContextValid()) return;
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
                    updateAdBlockState();
                    break;

                case 'toggle_ad_block':
                    settings.adBlockEnabled = message.enabled;
                    if (message.enabled) {
                        document.querySelectorAll('article[data-testid="tweet"]').forEach(t => {
                            delete t.dataset.adProcessed;
                        });
                        processTweets();
                    }
                    updateAdBlockState();
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
    } catch (_) { /* extension context already gone at inject time */ }

    // =========================================================================
    // HELPERS
    // =========================================================================

    const sleep = ms => new Promise(r => setTimeout(r, ms));

    // =========================================================================
    // EXTENSION CONTEXT SAFETY
    // =========================================================================

    /**
     * Returns true only when the extension context is still alive.
     * chrome.runtime.id becomes undefined the moment the extension is
     * reloaded / updated — all chrome.* API calls will throw after that.
     */
    function isContextValid() {
        try {
            return !!(chrome?.runtime?.id && chrome?.storage?.local);
        } catch (_) {
            return false;
        }
    }

    /** Safe wrapper for chrome.storage.local.get — silently no-ops if context is gone. */
    function safeStorageGet(keys, cb) {
        if (!isContextValid()) return;
        try { chrome.storage.local.get(keys, cb); } catch (e) { /* context gone */ }
    }

    /** Safe wrapper for chrome.storage.local.set — silently no-ops if context is gone. */
    function safeStorageSet(obj, cb) {
        if (!isContextValid()) return;
        try { chrome.storage.local.set(obj, cb); } catch (e) { /* context gone */ }
    }

    function releaseBodyScroll() {
        document.body.style.overflow = '';
        document.body.style.overscrollBehaviorY = '';
        document.body.style.paddingRight = '';
        document.body.style.marginRight = '';
    }

    // =========================================================================
    // TOAST
    // =========================================================================

    // =========================================================================
    // TOAST  — stacked, non-overlapping
    // Multiple toasts can be visible at once (e.g. a block fires while a
    // download is in progress). Each toast slides in from the bottom-right
    // and dismisses itself after 3.5 s. A shared container keeps them aligned.
    // =========================================================================

    function _getToastContainer() {
        let c = document.getElementById('x-adb-toast-stack');
        if (!c) {
            c = document.createElement('div');
            c.id = 'x-adb-toast-stack';
            Object.assign(c.style, {
                position: 'fixed', bottom: '24px', right: '24px',
                display: 'flex', flexDirection: 'column-reverse', gap: '8px',
                zIndex: '999999', pointerEvents: 'none'
            });
            document.body.appendChild(c);
        }
        return c;
    }

    function showToast(htmlMsg, iconType = 'block', bgColor = '#1da1f2') {
        if (!settings.toastsEnabled) return;

        const icons = {
            block: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
            download: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 16.59l-5.7-5.7 1.41-1.42L11 12.76V3h2v9.76l3.3-3.3 1.41 1.42L12 16.59zM3 21v-3.5h2V19h14v-1.5h2V21H3z"/></svg>`,
            warning: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
        };

        const toast = document.createElement('div');
        toast.innerHTML = `<div style="display:flex;align-items:center;gap:8px;">${icons[iconType] || ''}<span>${htmlMsg}</span></div>`;
        Object.assign(toast.style, {
            backgroundColor: bgColor, color: '#fff',
            padding: '12px 16px', borderRadius: '50px',
            fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
            fontSize: '14px', fontWeight: '500',
            boxShadow: '0 4px 14px rgba(0,0,0,.15)',
            opacity: '0', transform: 'translateY(12px)',
            transition: 'opacity .3s cubic-bezier(.25,.8,.25,1), transform .3s cubic-bezier(.25,.8,.25,1)',
            pointerEvents: 'none'
        });

        _getToastContainer().appendChild(toast);
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0)';
        });
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(12px)';
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }

    // =========================================================================
    // TWEET STATUS ID EXTRACTION
    // =========================================================================

    function getTweetStatusId(tweetElement) {
        if (tweetElement) {
            const timeLink = tweetElement.querySelector('time')?.closest('a[href*="/status/"]');
            if (timeLink) {
                const m = timeLink.getAttribute('href').match(/\/status\/(\d+)/);
                if (m) return m[1];
            }
            for (const a of tweetElement.querySelectorAll('a[href*="/status/"]')) {
                const m = a.getAttribute('href').match(/\/status\/(\d+)/);
                if (m) return m[1];
            }
        }
        // Fallback: Check current URL for status ID (e.g. in photo modal)
        const urlMatch = window.location.href.match(/\/status\/(\d+)/);
        return urlMatch ? urlMatch[1] : null;
    }

    // =========================================================================
    // FILE NAMING
    //
    // Double-extension fix:
    //   URL path ends in "HC7GTvMXwAEdBZA.mp4" — strip before appending extension.
    //
    // GIF detection:
    //   X stores GIFs as looping silent MP4s under /tweet_video/.
    //   We save them as .mp4 because strictly forcing a .gif extension causes 
    //   "corrupted file" errors in players that validate H.264/GIF89a headers.
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
                if (!u.searchParams.has('format')) {
                    const ext = u.pathname.split('.').pop().toLowerCase();
                    const fmt = ['png', 'webp', 'gif'].includes(ext) ? ext : 'jpg';
                    u.searchParams.set('format', fmt);
                }
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
                    break;
                }
            }
        }

        // Fallback: data.video.variants (no bitrate info - GIFs / edge cases)
        if (!variants?.length && data?.video?.variants?.length) {
            variants = data.video.variants;
        }

        if (!variants?.length) {
            return null;
        }

        // Keep only MP4s (skip HLS m3u8)
        const mp4s = variants.filter(v =>
            (v.type === 'video/mp4' || v.content_type === 'video/mp4') &&
            v.src?.includes('video.twimg.com')
        );

        if (!mp4s.length) {
            return null;
        }

        // Sort by bitrate descending (GIFs have no bitrate - only one variant anyway)
        mp4s.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
        const best = mp4s[0];
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

            if (blob.size < 10_000) {
                const preview = await blob.text();
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
            window.open(url, '_blank');
            return false;
        }
    }

    // =========================================================================
    // DOWNLOAD HANDLER
    // =========================================================================

    async function downloadTweetMedia(tweet, button) {
        button.setAttribute('data-loading', 'true');
        const statusId = getTweetStatusId(tweet);
        const mediaItems = [];

        if (statusId) {
            try {
                const data = await fetchTweetDataViaBackground(statusId);
                
                // 1. Process Media from API (Most Accurate)
                if (data?.mediaDetails?.length) {
                    data.mediaDetails.forEach((m, i) => {
                        if (m.type === 'video' || m.type === 'animated_gif') {
                            const variants = m.video_info?.variants || [];
                            const mp4s = variants.filter(v => (v.content_type === 'video/mp4' || v.type === 'video/mp4') && v.url?.includes('video.twimg.com'));
                            mp4s.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
                            if (mp4s.length) {
                                const url = mp4s[0].url || mp4s[0].src;
                                const isGif = m.type === 'animated_gif' || isGifUrl(url);
                                mediaItems.push({
                                    type: isGif ? 'gif' : 'video',
                                    url,
                                    filename: buildFilename(url, i, isGif ? 'gif' : 'mp4')
                                });
                            }
                        } else if (m.type === 'photo') {
                            const rawUrl = m.media_url_https || m.media_url;
                            const url = getBestImageUrl(rawUrl);
                            const imgExt = (() => {
                                try {
                                    const p = new URL(url).searchParams.get('format');
                                    return p || new URL(rawUrl).pathname.split('.').pop().toLowerCase() || 'jpg';
                                } catch (_) { return 'jpg'; }
                            })();
                            mediaItems.push({ type: 'image', url, filename: buildFilename(url, i, imgExt) });
                        }
                    });
                }
            } catch (err) {
                console.warn('X Ad Blocker: Syndication API failed, falling back to DOM scraping:', err);
            }
        }

        // 2. Fallback to DOM Scraping (if API failed or returned nothing)
        if (mediaItems.length === 0) {
            // Images
            const photos = tweet.querySelectorAll('[data-testid="tweetPhoto"]');
            photos.forEach((c, i) => {
                const img = c.querySelector('img');
                if (img?.src && !img.src.startsWith('data:')) {
                    const url = getBestImageUrl(img.src);
                    const fallbackExt = (() => {
                        try { return new URL(url).searchParams.get('format') || 'jpg'; } catch (_) { return 'jpg'; }
                    })();
                    mediaItems.push({ type: 'image', url, filename: buildFilename(url, i, fallbackExt) });
                }
            });
            if (!photos.length) {
                tweet.querySelectorAll('[data-testid$=".media"] img').forEach((img, i) => {
                    if (img?.src?.includes('pbs.twimg.com')) {
                        const url = getBestImageUrl(img.src);
                        const fallbackExt = (() => {
                            try { return new URL(url).searchParams.get('format') || 'jpg'; } catch (_) { return 'jpg'; }
                        })();
                        mediaItems.push({ type: 'image', url, filename: buildFilename(url, i, fallbackExt) });
                    }
                });
            }
            // Simple Video Fallback (best effort)
            const video = tweet.querySelector('video');
            if (video?.src && video.src.startsWith('http')) {
                const gif = isGifUrl(video.src);
                mediaItems.push({ type: gif ? 'gif' : 'video', url: video.src, filename: buildFilename(video.src, 0, gif ? 'gif' : 'mp4') });
            }
        }

        if (!mediaItems.length) {
            showToast(i18n.t('toastNoMedia'), 'warning', '#657786');
        } else {
            let ok = 0;
            for (const item of mediaItems) {
                await sleep(150);
                if (item.type === 'gif') {
                    showToast(i18n.t('toastConverting'), 'download', '#1da1f2');
                    try {
                        const response = await new Promise((resolve) => {
                            chrome.runtime.sendMessage({
                                type: 'CONVERT_TO_GIF',
                                url: item.url,
                                filename: item.filename
                            }, resolve);
                        });
                        if (response?.ok && response.gifData) {
                            // gifData is a data URL
                            const a = Object.assign(document.createElement('a'), {
                                href: response.gifData, download: item.filename, style: 'display:none'
                            });
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            ok++;
                        } else {
                            throw new Error(response?.error || 'Conversion failed');
                        }
                    } catch (err) {
                        console.error('X Ad Blocker: GIF conversion failed, falling back to MP4:', err);
                        // Fallback to MP4 if conversion fails
                        const mp4Filename = item.filename.replace(/\.gif$/, '.mp4');
                        if (await downloadFile(item.url, mp4Filename)) ok++;
                    }
                } else {
                    if (await downloadFile(item.url, item.filename)) ok++;
                }
            }
            const msg = mediaItems.length === 1
                ? i18n.t('toastMediaDownloaded')
                : `${ok}/${mediaItems.length} ${i18n.t('toastMediaDownloadedMulti')}`;
            showToast(msg, 'download', '#1da1f2');
            // Increment persistent counter → updates popup stat in real-time
            safeStorageGet('downloadCount', (r) => {
                safeStorageSet({ downloadCount: (r?.downloadCount || 0) + ok });
            });
        }

        button.removeAttribute('data-loading');
    }

    // =========================================================================
    // DOWNLOAD BUTTON - mirrors Action_bar.html structure exactly
    // =========================================================================

    function createDownloadButton(svgClass, wrapperClass, hasCountSpacer, iconColor) {
        // svgClass is copied from sibling buttons so we blend in on all page types:
        // Home/Comment: "r-1xvli5t r-1hdv0qi"  (small icons)
        // Post/QuoteReply/Photo view: "r-50lct3 r-1srniue"  (large icons)
        //
        // hasCountSpacer: true when siblings use r-13awgt0 wrapper (post/photo view).
        // In that layout every button has a count-label div (r-xoduu5 r-1udh08x) below
        // the icon that adds vertical spacing. Without it our button sits higher than
        // the rest, breaking alignment. We inject an empty spacer to match exactly.
        const sc = svgClass || 'r-4qtqp9 r-yyyyoo r-dnmrzs r-bnwqim r-lrvibr r-m6rgpd r-1xvli5t r-1hdv0qi';
        // Use sibling icon color if provided, fallback to standard Twitter/X gray
        const color = iconColor || 'rgb(113, 118, 123)';
        
        // The spacer div needs real (but invisible) text content so its height
        // matches sibling buttons that show counts like "8", "102" etc.
        // An empty div collapses to 0px and the icon ends up misaligned.
        const countSpacer = hasCountSpacer
            ? `<div class="css-175oi2r r-xoduu5 r-1udh08x" aria-hidden="true">
                <span style="visibility:hidden;pointer-events:none;" aria-hidden="true">
                    <span class="css-1jxf684 r-1ttztb7 r-qvutc0 r-poiln3 r-n6v787 r-1cwl3u0 r-1k6nrdp r-n7gxbd">
                        <span class="css-1jxf684 r-bcqeeo r-1ttztb7 r-qvutc0 r-poiln3">0</span>
                    </span>
                </span>
               </div>`
            : '';
        const wrapper = document.createElement('div');
        wrapper.className = wrapperClass || 'css-175oi2r r-18u37iz r-1h0z5md r-1wron08';
        wrapper.innerHTML = `
            <button aria-label="${i18n.t('downloaderAriaLabel')}" role="button"
                data-testid="download-media" type="button"
                class="css-175oi2r r-1777fci r-bt1l66 r-bztko3 r-lrvibr r-1loqt21 r-1ny4l3l">
                <div dir="ltr"
                    class="css-146c3p1 r-bcqeeo r-1ttztb7 r-qvutc0 r-37j5jr r-a023e6 r-rjixqe r-16dba41 r-1awozwy r-6koalj r-1h0z5md r-o7ynqc r-clp7b1 r-3s2u2q"
                    style="color:${color}">
                    <div class="css-175oi2r r-xoduu5">
                        <div class="css-175oi2r r-xoduu5 r-1p0dtai r-1d2f490 r-u8s1d r-zchlnj r-ipm5af r-1niwhzg r-sdzlij r-xf4iuw r-o7ynqc r-6416eg r-1ny4l3l"></div>
                        <svg viewBox="0 0 24 24" aria-hidden="true" class="${sc}">
                            <g><path d="M12 16.59l-5.7-5.7 1.41-1.42L11 12.76V3h2v9.76l3.3-3.3 1.41 1.42L12 16.59zM3 21v-3.5h2V19h14v-1.5h2V21H3z"/></g>
                        </svg>
                    </div>
                    ${countSpacer}
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

        // Prevent double injection if multiple triggers find the same action bar
        if (actionBar.querySelector('[data-testid="download-media"]')) {
            tweet.dataset.downloadButtonAdded = 'true';
            return;
        }

        // Detect SVG class and COLOR from an existing sibling button to match page style.
        // Post page uses larger icons, homeUses smaller. Photo view uses white instead of gray.
        const sibSvg = actionBar.querySelector('button svg, a svg');
        const sibClass = sibSvg ? sibSvg.getAttribute('class') : null;
        const sibBtnDiv = sibSvg?.closest('div[dir="ltr"]');
        const iconColor = sibBtnDiv ? window.getComputedStyle(sibBtnDiv).color : null;
        
        // Match wrapper class of the bookmark button so spacing is identical
        const bookmarkEl = actionBar.querySelector('[data-testid="bookmark"]');
        const bookmarkWrapperClass = bookmarkEl?.parentElement?.className || 'css-175oi2r r-18u37iz r-1h0z5md r-1wron08';
        
        // r-13awgt0 = post/photo view: every sibling button has a count-label spacer div.
        const hasCountSpacer = bookmarkWrapperClass.includes('r-13awgt0') || actionBar.className.includes('r-1kbdv8c');
        
        const wrapper = createDownloadButton(sibClass, bookmarkWrapperClass, hasCountSpacer, iconColor);
        wrapper.setAttribute('data-x-dl-wrapper', '');  // marker for toggle visibility
        const btn = wrapper.querySelector('[data-testid="download-media"]');
        
        btn.addEventListener('click', e => {
            e.preventDefault(); e.stopPropagation();
            downloadTweetMedia(tweet, btn);
        });

        // Insert before bookmark or at the end
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

        let displayName = '@Sponsored'; // fallback; overwritten by real name below
        let handle = null;
        const userNameEl = tweetElement.querySelector('[data-testid="User-Name"]');
        if (userNameEl) {
            const spans = userNameEl.querySelectorAll('span');
            if (spans.length) displayName = spans[0].textContent.trim();
            for (const s of spans) {
                const t = s.textContent.trim();
                if (t.startsWith('@') && t.length > 1) { handle = t; break; }
            }
        }

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
                        showToast(`${i18n.t('toastBlocked')} <b>${displayName}</b>`, 'block', '#1da1f2');
                        safeStorageGet(['blockedCount', 'blockedHandles'], (r) => {
                            if (!r) return;
                            const handles = r.blockedHandles || [];
                            const key = handle || displayName;
                            const alreadyCounted = handles.includes(key);
                            if (!alreadyCounted) handles.push(key);
                            safeStorageSet({
                                blockedHandles: handles,
                                blockedCount: alreadyCounted ? (r.blockedCount || 0) : (r.blockedCount || 0) + 1
                            });
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
        
        // 1. Process regular tweets in the feed
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

        // 2. Process expanded photo modal (standalone action bar)
        // We look for any role="group" with specific analytics label.
        const photoModalActionBar = document.querySelector('.r-1kbdv8c[role="group"]');
        if (photoModalActionBar) {
            // Find the most relevant context. 
            // Prefer the nearest article, but fallback to a reasonable local container if missing.
            const modalContext = photoModalActionBar.closest('article[data-testid="tweet"]') 
                              || photoModalActionBar.closest('[data-testid="sheetDialog"]')
                              || photoModalActionBar.parentElement;
            if (modalContext) {
                addDownloadButtonToTweet(modalContext);
            }
        }
    }

    function init() {
        let _debounce = null;
        const observer = new MutationObserver(muts => {
            // Auto-disconnect if the extension context was invalidated
            // (e.g. extension reloaded/updated while page was open)
            if (!isContextValid()) { observer.disconnect(); return; }
            if (!muts.some(m => m.addedNodes.length)) return;
            if (_debounce) clearTimeout(_debounce);
            _debounce = setTimeout(processTweets, 120);
        });
        observer.observe(document.body, { childList: true, subtree: true });
        processTweets();
    }

    function waitForFirstTweet(cb) {
        if (document.querySelector('article[data-testid="tweet"]')) { cb(); return; }
        const o = new MutationObserver(() => {
            if (document.querySelector('article[data-testid="tweet"]')) { o.disconnect(); cb(); }
        });
        o.observe(document.body, { childList: true, subtree: true });
        setTimeout(() => { o.disconnect(); cb(); }, 3000);
    }

    waitForFirstTweet(init);

})();