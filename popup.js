document.addEventListener('DOMContentLoaded', () => {

    // ── Navigation ──────────────────────────────────────────────────────
    const navItems = document.querySelectorAll('.nav-item');
    const pages    = document.querySelectorAll('.page');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(n => n.classList.remove('active'));
            pages.forEach(p => p.classList.remove('active'));
            item.classList.add('active');
            const target = document.getElementById(item.getAttribute('data-target'));
            if (target) target.classList.add('active');
        });
    });

    // ── Element refs ─────────────────────────────────────────────────────
    const mainToggle       = document.getElementById('main-toggle');
    const toggleAdBlock    = document.getElementById('toggle-ad-block');
    const toggleToasts     = document.getElementById('toggle-toasts');
    const toggleDownloader = document.getElementById('toggle-downloader');
    const statusDot        = document.getElementById('status-dot');
    const statusText       = document.getElementById('status-text');
    const statBlocked      = document.getElementById('stat-blocked');
    const statDownloads    = document.getElementById('stat-downloads');
    const aboutVersion     = document.getElementById('about-version');
    const btnReset         = document.getElementById('btn-reset');
    const downloaderBadge  = document.querySelector('.badge');

    // ── Version ──────────────────────────────────────────────────────────
    if (aboutVersion) {
        const { version } = chrome.runtime.getManifest();
        aboutVersion.textContent = `Version ${version}`;
    }

    // ── Load settings & stats ────────────────────────────────────────────
    chrome.storage.local.get([
        'extensionEnabled',
        'adBlockEnabled',
        'toastsEnabled',
        'downloaderEnabled',
        'blockedCount',
        'downloadCount'
    ], (res) => {
        const isEnabled    = res.extensionEnabled    !== false;
        const adBlock      = res.adBlockEnabled      !== false;
        const toasts       = res.toastsEnabled       !== false;
        const downloader   = res.downloaderEnabled   !== false;
        const blocked      = res.blockedCount  || 0;
        const downloaded   = res.downloadCount || 0;

        mainToggle.checked       = isEnabled;
        toggleAdBlock.checked    = adBlock;
        toggleToasts.checked     = toasts;
        toggleDownloader.checked = downloader;

        updateStatusUI(isEnabled);
        updateDownloaderBadge(downloader && isEnabled);
        animateValue(statBlocked,   0, blocked,    900);
        animateValue(statDownloads, 0, downloaded, 900);
    });

    // ── Main toggle ──────────────────────────────────────────────────────
    mainToggle.addEventListener('change', (e) => {
        const enabled = e.target.checked;
        chrome.storage.local.set({ extensionEnabled: enabled });
        updateStatusUI(enabled);
        updateDownloaderBadge(enabled && toggleDownloader.checked);
        broadcastToX({ action: 'toggle_extension', enabled });
    });

    // ── Ad block toggle ──────────────────────────────────────────────────
    toggleAdBlock.addEventListener('change', (e) => {
        chrome.storage.local.set({ adBlockEnabled: e.target.checked });
        broadcastToX({ action: 'toggle_ad_block', enabled: e.target.checked });
    });

    // ── Toasts toggle ────────────────────────────────────────────────────
    toggleToasts.addEventListener('change', (e) => {
        chrome.storage.local.set({ toastsEnabled: e.target.checked });
    });

    // ── Downloader toggle ────────────────────────────────────────────────
    toggleDownloader.addEventListener('change', (e) => {
        chrome.storage.local.set({ downloaderEnabled: e.target.checked });
        updateDownloaderBadge(e.target.checked && mainToggle.checked);
        broadcastToX({ action: 'toggle_downloader', enabled: e.target.checked });
    });

    // ── Reset stats ──────────────────────────────────────────────────────
    btnReset.addEventListener('click', () => {
        chrome.storage.local.set({ blockedCount: 0, downloadCount: 0 }, () => {
            statBlocked.textContent   = '0';
            statDownloads.textContent = '0';
        });
    });

    // ── Live stat updates (while popup is open) ──────────────────────────
    chrome.storage.onChanged.addListener((changes, ns) => {
        if (ns !== 'local') return;
        if (changes.blockedCount) {
            const old = changes.blockedCount.oldValue || 0;
            const nw  = changes.blockedCount.newValue || 0;
            animateValue(statBlocked, old, nw, 700);
        }
        if (changes.downloadCount) {
            const old = changes.downloadCount.oldValue || 0;
            const nw  = changes.downloadCount.newValue || 0;
            animateValue(statDownloads, old, nw, 700);
        }
    });

    // ── Helpers ──────────────────────────────────────────────────────────
    function updateStatusUI(enabled) {
        if (enabled) {
            statusDot.classList.remove('inactive');
            statusText.classList.remove('inactive');
            statusText.textContent = 'Active';
        } else {
            statusDot.classList.add('inactive');
            statusText.classList.add('inactive');
            statusText.textContent = 'Paused';
        }
    }

    function updateDownloaderBadge(active) {
        if (!downloaderBadge) return;
        if (active) {
            downloaderBadge.textContent = 'Active';
            downloaderBadge.style.background = 'var(--x-blue-glow)';
            downloaderBadge.style.color = 'var(--x-blue)';
        } else {
            downloaderBadge.textContent = 'Paused';
            downloaderBadge.style.background = 'rgba(255,255,255,0.06)';
            downloaderBadge.style.color = 'var(--x-text-secondary)';
        }
    }

    function broadcastToX(message) {
        chrome.tabs.query({ url: ['*://x.com/*', '*://twitter.com/*'] }, (tabs) => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, message).catch(() => {});
            });
        });
    }

    function animateValue(el, start, end, duration) {
        if (!el) return;
        let startTs = null;
        const step = (ts) => {
            if (!startTs) startTs = ts;
            const p    = Math.min((ts - startTs) / duration, 1);
            const ease = 1 - Math.pow(1 - p, 4);
            el.textContent = Math.floor(ease * (end - start) + start);
            if (p < 1) requestAnimationFrame(step);
            else el.textContent = end;
        };
        requestAnimationFrame(step);
    }
});