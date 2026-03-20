document.addEventListener('DOMContentLoaded', async () => {

    // ── i18n — initialise FIRST, before touching any DOM text ────────────────
    await i18n.init();
    i18n.applyToDOM();

    // ── Navigation ──────────────────────────────────────────────────────────
    const navItems = document.querySelectorAll('.nav-item');
    const pages = document.querySelectorAll('.page');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(n => n.classList.remove('active'));
            pages.forEach(p => p.classList.remove('active'));
            item.classList.add('active');
            const target = document.getElementById(item.getAttribute('data-target'));
            if (target) target.classList.add('active');
        });
    });

    // ── Element refs ─────────────────────────────────────────────────────────
    const mainToggle = document.getElementById('main-toggle');
    const toggleAdBlock = document.getElementById('toggle-ad-block');
    const toggleToasts = document.getElementById('toggle-toasts');
    const toggleDownloader = document.getElementById('toggle-downloader');
    const langSelect = document.getElementById('lang-select');
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    const statBlocked = document.getElementById('stat-blocked');
    const statDownloads = document.getElementById('stat-downloads');
    const aboutVersion = document.getElementById('about-version');
    const btnReset = document.getElementById('btn-reset');
    const downloaderBadge = document.querySelector('.badge');

    // ── Version ──────────────────────────────────────────────────────────────
    if (aboutVersion) {
        const { version } = chrome.runtime.getManifest();
        aboutVersion.textContent = `Version ${version}`;
    }

    // ── Load settings & stats ────────────────────────────────────────────────
    chrome.storage.local.get([
        'extensionEnabled',
        'adBlockEnabled',
        'toastsEnabled',
        'downloaderEnabled',
        'userLang',
        'blockedCount',
        'downloadCount',
        'blockedHandles'
    ], (res) => {
        const isEnabled = res.extensionEnabled !== false;
        const adBlock = res.adBlockEnabled !== false;
        const toasts = res.toastsEnabled !== false;
        const downloader = res.downloaderEnabled !== false;
        const blocked = (res.blockedHandles || []).length || res.blockedCount || 0;
        const downloaded = res.downloadCount || 0;

        mainToggle.checked = isEnabled;
        toggleAdBlock.checked = adBlock;
        toggleToasts.checked = toasts;
        toggleDownloader.checked = downloader;

        // Set language selector to stored value (or 'auto')
        if (langSelect) {
            langSelect.value = res.userLang || 'auto';
        }

        updateStatusUI(isEnabled);
        updateDownloaderBadge(downloader && isEnabled);
        animateValue(statBlocked, 0, blocked, 900);
        animateValue(statDownloads, 0, downloaded, 900);

        renderBlockedList(res.blockedHandles || []);
    });

    // ── Language switcher ────────────────────────────────────────────────────
    if (langSelect) {
        langSelect.addEventListener('change', async (e) => {
            await i18n.setLang(e.target.value);  // persists to storage + re-inits
            i18n.applyToDOM();                    // re-render all data-i18n elements

            // Re-render dynamic parts that popup.js builds at runtime
            updateStatusUI(mainToggle.checked);
            updateDownloaderBadge(toggleDownloader.checked && mainToggle.checked);

            // Re-render the blocked list so "View on X" button label updates
            chrome.storage.local.get('blockedHandles', (r) => {
                renderBlockedList(r.blockedHandles || []);
            });

            // Keep the select's own option labels in sync
            syncLangSelectLabels();
        });
    }

    // ── Main toggle ──────────────────────────────────────────────────────────
    mainToggle.addEventListener('change', (e) => {
        const enabled = e.target.checked;
        chrome.storage.local.set({ extensionEnabled: enabled });
        updateStatusUI(enabled);
        updateDownloaderBadge(enabled && toggleDownloader.checked);
        broadcastToX({ action: 'toggle_extension', enabled });
    });

    // ── Ad block toggle ──────────────────────────────────────────────────────
    toggleAdBlock.addEventListener('change', (e) => {
        chrome.storage.local.set({ adBlockEnabled: e.target.checked });
        broadcastToX({ action: 'toggle_ad_block', enabled: e.target.checked });
    });

    // ── Toasts toggle ────────────────────────────────────────────────────────
    toggleToasts.addEventListener('change', (e) => {
        chrome.storage.local.set({ toastsEnabled: e.target.checked });
    });

    // ── Downloader toggle ────────────────────────────────────────────────────
    toggleDownloader.addEventListener('change', (e) => {
        chrome.storage.local.set({ downloaderEnabled: e.target.checked });
        updateDownloaderBadge(e.target.checked && mainToggle.checked);
        broadcastToX({ action: 'toggle_downloader', enabled: e.target.checked });
    });

    // ── Reset stats — custom modal ───────────────────────────────────────────
    const confirmModal = document.getElementById('confirm-modal');
    const modalCancel = document.getElementById('modal-cancel');
    const modalConfirm = document.getElementById('modal-confirm');

    btnReset.addEventListener('click', () => {
        confirmModal.style.display = 'flex';
    });
    modalCancel.addEventListener('click', () => {
        confirmModal.style.display = 'none';
    });
    confirmModal.addEventListener('click', (e) => {
        if (e.target === confirmModal) confirmModal.style.display = 'none';
    });
    modalConfirm.addEventListener('click', () => {
        chrome.storage.local.set({ blockedCount: 0, downloadCount: 0, blockedHandles: [] }, () => {
            statBlocked.textContent = '0';
            statDownloads.textContent = '0';
            renderBlockedList([]);
        });
        confirmModal.style.display = 'none';
    });

    // ── Render blocked advertiser list ───────────────────────────────────────
    function renderBlockedList(handles) {
        const container = document.getElementById('blocked-container');
        const empty = document.getElementById('blocked-empty');
        if (!container) return;

        container.innerHTML = '';

        if (!handles || handles.length === 0) {
            if (empty) {
                empty.style.display = 'block';
                empty.textContent = i18n.t('blockedEmpty');
            }
            return;
        }
        if (empty) empty.style.display = 'none';

        [...handles].reverse().forEach(handle => {
            const row = document.createElement('div');
            row.className = 'card-row';
            row.style.cssText = 'padding:8px 0;';
            row.innerHTML = `
                <div style="overflow:hidden;min-width:0;flex:1;">
                    <div class="row-label" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHtml(handle)}</div>
                </div>
                <button class="action-btn ghost" data-handle="${escHtml(handle)}"
                    style="height:28px;padding:0 10px;font-size:11px;flex-shrink:0;margin-left:8px;">
                    ${escHtml(i18n.t('viewOnX'))}
                </button>`;

            row.querySelector('button').addEventListener('click', () => {
                const h = handle.startsWith('@') ? handle.slice(1) : handle;
                chrome.tabs.create({ url: `https://x.com/${h}` });
            });

            container.appendChild(row);
        });
    }

    function escHtml(str) {
        return String(str || '').replace(/[&<>"']/g, c =>
            ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    // ── Live stat updates (while popup is open) ──────────────────────────────
    chrome.storage.onChanged.addListener((changes, ns) => {
        if (ns !== 'local') return;
        if (changes.blockedHandles) {
            const list = changes.blockedHandles.newValue || [];
            animateValue(statBlocked,
                (changes.blockedHandles.oldValue || []).length,
                list.length, 700);
            renderBlockedList(list);
        }
        if (changes.downloadCount) {
            const old = changes.downloadCount.oldValue || 0;
            const nw = changes.downloadCount.newValue || 0;
            animateValue(statDownloads, old, nw, 700);
        }
    });

    // ── Helpers ──────────────────────────────────────────────────────────────

    function updateStatusUI(enabled) {
        if (enabled) {
            statusDot.classList.remove('inactive');
            statusText.classList.remove('inactive');
            statusText.textContent = i18n.t('statusActive');
        } else {
            statusDot.classList.add('inactive');
            statusText.classList.add('inactive');
            statusText.textContent = i18n.t('statusPaused');
        }
    }

    function updateDownloaderBadge(active) {
        if (!downloaderBadge) return;
        if (active) {
            downloaderBadge.textContent = i18n.t('statusActive');
            downloaderBadge.style.background = 'var(--x-blue-glow)';
            downloaderBadge.style.color = 'var(--x-blue)';
        } else {
            downloaderBadge.textContent = i18n.t('statusPaused');
            downloaderBadge.style.background = 'rgba(255,255,255,0.06)';
            downloaderBadge.style.color = 'var(--x-text-secondary)';
        }
    }

    // Sync the <option> labels inside the lang <select> after a language change
    function syncLangSelectLabels() {
        if (!langSelect) return;
        const map = {
            auto: 'langAuto',
            en: 'langEn',
            tr: 'langTr',
            de: 'langDe',
            fr: 'langFr',
            es: 'langEs',
            pt: 'langPt',
            it: 'langIt',
            ru: 'langRu',
            ja: 'langJa',
            ko: 'langKo',
            zh: 'langZh',
        };
        for (const opt of langSelect.options) {
            const key = map[opt.value];
            if (key) opt.textContent = i18n.t(key);
        }
    }

    function broadcastToX(message) {
        chrome.tabs.query({ url: ['*://x.com/*', '*://twitter.com/*'] }, (tabs) => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, message).catch(() => { });
            });
        });
    }

    function animateValue(el, start, end, duration) {
        if (!el) return;
        let startTs = null;
        const step = (ts) => {
            if (!startTs) startTs = ts;
            const p = Math.min((ts - startTs) / duration, 1);
            const ease = 1 - Math.pow(1 - p, 4);
            el.textContent = Math.floor(ease * (end - start) + start);
            if (p < 1) requestAnimationFrame(step);
            else el.textContent = end;
        };
        requestAnimationFrame(step);
    }
});