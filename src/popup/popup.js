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
    const togglePromotedBlock = document.getElementById('toggle-promoted-block');
    const blockMode = document.getElementById('block-mode');
    const toggleToasts = document.getElementById('toggle-toasts');
    const toggleDownloader = document.getElementById('toggle-downloader');
    const toggleMediaOnly = document.getElementById('toggle-media-only');
    const langSelect = document.getElementById('lang-select');
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');
    const statBlocked = document.getElementById('stat-blocked');
    const statAdBlocked = document.getElementById('stat-ad-blocked');
    const statPromotedBlocked = document.getElementById('stat-promoted-blocked');
    const statFiltered = document.getElementById('stat-filtered');
    const statHidden = document.getElementById('stat-hidden');
    const statDownloads = document.getElementById('stat-downloads');
    const aboutVersion = document.getElementById('about-version');
    const btnReset = document.getElementById('btn-reset');
    const filterRules = document.getElementById('filter-rules');
    const saveFilters = document.getElementById('save-filters');
    const filterStatus = document.getElementById('filter-status');
    const btnExport = document.getElementById('btn-export');
    const btnImport = document.getElementById('btn-import');
    const importFile = document.getElementById('import-file');
    const dataStatus = document.getElementById('data-status');
    const downloaderBadge = document.querySelector('.badge');

    const STORAGE_KEYS = [
        'extensionEnabled', 'adBlockEnabled', 'promotedBlockEnabled', 'blockMode',
        'toastsEnabled', 'downloaderEnabled', 'mediaOnlyDownloader', 'filterRules',
        'userLang', 'blockedCount', 'adMatchCount', 'promotedMatchCount',
        'adBlockedCount', 'promotedBlockedCount',
        'filteredCount', 'hiddenCount', 'downloadCount', 'blockedHandles',
        'adBlockedHandles', 'promotedBlockedHandles', 'blockedHistory'
    ];
    let renderedBlockedHandles = [];
    let renderedBlockedHistory = [];

    // ── Version ──────────────────────────────────────────────────────────────
    if (aboutVersion) {
        const { version } = chrome.runtime.getManifest();
        aboutVersion.textContent = `Version ${version}`;
    }

    // ── Load settings & stats ────────────────────────────────────────────────
    function applyStorageState(res, animateFromCurrent = false) {
        const handles = Array.isArray(res.blockedHandles) ? res.blockedHandles : [];
        const history = Array.isArray(res.blockedHistory) ? res.blockedHistory : [];
        const isEnabled = res.extensionEnabled !== false;
        const adBlock = res.adBlockEnabled !== false;
        const promotedBlock = res.promotedBlockEnabled === true;
        const selectedBlockMode = res.blockMode === 'hide' ? 'hide' : 'account';
        const toasts = res.toastsEnabled !== false;
        const downloader = res.downloaderEnabled !== false;
        const mediaOnly = res.mediaOnlyDownloader !== false;

        mainToggle.checked = isEnabled;
        toggleAdBlock.checked = adBlock;
        togglePromotedBlock.checked = promotedBlock;
        if (blockMode) blockMode.value = selectedBlockMode;
        toggleToasts.checked = toasts;
        toggleDownloader.checked = downloader;
        if (toggleMediaOnly) toggleMediaOnly.checked = mediaOnly;
        if (filterRules) filterRules.value = normalizeFilterRules(res.filterRules).join('\n');

        // Set language selector to stored value (or 'auto')
        if (langSelect) langSelect.value = res.userLang || 'auto';

        renderedBlockedHandles = handles;
        renderedBlockedHistory = history;
        updateStatusUI(isEnabled);
        updateDownloaderBadge(downloader && isEnabled);
        syncBlockModeLabels();

        const statValues = [
            [statBlocked, Math.max(toCount(res.blockedCount), handles.length)],
            [statAdBlocked, Math.max(toCount(res.adMatchCount), toCount(res.adBlockedCount))],
            [statPromotedBlocked, Math.max(toCount(res.promotedMatchCount), toCount(res.promotedBlockedCount))],
            [statFiltered, toCount(res.filteredCount)],
            [statHidden, toCount(res.hiddenCount)],
            [statDownloads, toCount(res.downloadCount)]
        ];
        statValues.forEach(([element, value]) => {
            const start = animateFromCurrent ? toCount(element?.textContent) : 0;
            animateValue(element, start, value, animateFromCurrent ? 500 : 900);
        });

        renderBlockedList(handles, history);
    }

    chrome.storage.local.get(STORAGE_KEYS, (res) => applyStorageState(res));

    // ── Language switcher ────────────────────────────────────────────────────
    if (langSelect) {
        langSelect.addEventListener('change', async (e) => {
            await i18n.setLang(e.target.value);  // persists to storage + re-inits
            i18n.applyToDOM();                    // re-render all data-i18n elements

            // Re-render dynamic parts that popup.js builds at runtime
            updateStatusUI(mainToggle.checked);
            updateDownloaderBadge(toggleDownloader.checked && mainToggle.checked);

            // Re-render dynamic labels and the blocked list in the new language.
            chrome.storage.local.get(['blockedHandles', 'blockedHistory'], (r) => {
                renderedBlockedHandles = Array.isArray(r.blockedHandles) ? r.blockedHandles : [];
                renderedBlockedHistory = Array.isArray(r.blockedHistory) ? r.blockedHistory : [];
                renderBlockedList(renderedBlockedHandles, renderedBlockedHistory);
            });

            // Keep the select's own option labels in sync
            syncLangSelectLabels();
            syncBlockModeLabels();
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

    // ── Promoted post toggle ─────────────────────────────────────────────────
    togglePromotedBlock.addEventListener('change', (e) => {
        chrome.storage.local.set({ promotedBlockEnabled: e.target.checked });
        broadcastToX({ action: 'toggle_promoted_block', enabled: e.target.checked });
    });

    // ── Automatic action mode ───────────────────────────────────────────────
    if (blockMode) {
        blockMode.addEventListener('change', (e) => {
            const mode = e.target.value === 'hide' ? 'hide' : 'account';
            e.target.value = mode;
            chrome.storage.local.set({ blockMode: mode });
            broadcastToX({ action: 'set_block_mode', mode });
        });
    }

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

    // ── Media-only downloader ────────────────────────────────────────────────
    if (toggleMediaOnly) {
        toggleMediaOnly.addEventListener('change', (e) => {
            const enabled = e.target.checked;
            chrome.storage.local.set({ mediaOnlyDownloader: enabled });
            broadcastToX({ action: 'toggle_media_only', enabled });
        });
    }

    // ── Personal filters ────────────────────────────────────────────────────
    if (saveFilters) {
        saveFilters.addEventListener('click', () => {
            const rules = normalizeFilterRules(filterRules?.value || '');
            if (filterRules) filterRules.value = rules.join('\n');
            chrome.storage.local.set({ filterRules: rules }, () => {
                setInlineStatus(filterStatus, i18n.t('filtersSaved'), 'success');
                broadcastToX({ action: 'update_filter_rules', rules });
            });
        });
    }

    // ── Backup & restore ────────────────────────────────────────────────────
    if (btnExport) btnExport.addEventListener('click', exportData);
    if (btnImport && importFile) btnImport.addEventListener('click', () => importFile.click());
    if (importFile) importFile.addEventListener('change', handleImportFile);

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
        chrome.storage.local.set({
            blockedCount: 0,
            adMatchCount: 0,
            promotedMatchCount: 0,
            adBlockedCount: 0,
            promotedBlockedCount: 0,
            filteredCount: 0,
            hiddenCount: 0,
            downloadCount: 0,
            blockedHandles: [],
            adBlockedHandles: [],
            promotedBlockedHandles: [],
            blockedHistory: []
        }, () => {
            [statBlocked, statAdBlocked, statPromotedBlocked, statFiltered, statHidden, statDownloads]
                .forEach(element => { if (element) element.textContent = '0'; });
            renderedBlockedHandles = [];
            renderedBlockedHistory = [];
            renderBlockedList([], []);
        });
        confirmModal.style.display = 'none';
    });

    // ── Render blocked advertiser list ───────────────────────────────────────
    function renderBlockedList(handles, history = []) {
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

        const historyByKey = new Map();
        history.filter(item => item && typeof item === 'object').forEach(item => {
            if (item.handle) historyByKey.set(item.handle, item);
        });

        [...handles].reverse().forEach(handle => {
            const entry = historyByKey.get(handle);
            const row = document.createElement('div');
            row.className = 'card-row';
            row.style.cssText = 'padding:8px 0;';

            const info = document.createElement('div');
            info.style.cssText = 'overflow:hidden;min-width:0;flex:1;';
            const handleLabel = document.createElement('div');
            handleLabel.className = 'row-label';
            handleLabel.style.cssText = 'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
            handleLabel.textContent = handle;
            info.appendChild(handleLabel);

            const reasonLabel = document.createElement('span');
            reasonLabel.className = 'history-reason';
            reasonLabel.textContent = getReasonLabel(entry?.reason || 'legacy');
            info.appendChild(reasonLabel);

            const viewButton = document.createElement('button');
            viewButton.className = 'action-btn ghost';
            viewButton.style.cssText = 'height:28px;padding:0 10px;font-size:11px;flex-shrink:0;margin-left:8px;';
            viewButton.textContent = i18n.t('viewOnX');
            viewButton.title = i18n.t('unblockHint');
            viewButton.addEventListener('click', () => {
                const h = String(handle).startsWith('@') ? String(handle).slice(1) : String(handle);
                chrome.tabs.create({ url: `https://x.com/${encodeURIComponent(h)}` });
            });

            row.appendChild(info);
            row.appendChild(viewButton);

            container.appendChild(row);
        });
    }

    // ── Live stat updates (while popup is open) ──────────────────────────────
    chrome.storage.onChanged.addListener((changes, ns) => {
        if (ns !== 'local') return;

        if (changes.blockedHandles || changes.blockedHistory) {
            renderedBlockedHandles = changes.blockedHandles
                ? (Array.isArray(changes.blockedHandles.newValue) ? changes.blockedHandles.newValue : [])
                : renderedBlockedHandles;
            renderedBlockedHistory = changes.blockedHistory
                ? (Array.isArray(changes.blockedHistory.newValue) ? changes.blockedHistory.newValue : [])
                : renderedBlockedHistory;
            renderBlockedList(renderedBlockedHandles, renderedBlockedHistory);
        }

        const statChanges = [
            ['blockedCount', statBlocked],
            ['adMatchCount', statAdBlocked],
            ['promotedMatchCount', statPromotedBlocked],
            ['filteredCount', statFiltered],
            ['hiddenCount', statHidden],
            ['downloadCount', statDownloads]
        ];
        statChanges.forEach(([key, element]) => {
            if (!changes[key]) return;
            animateValue(element, toCount(changes[key].oldValue), toCount(changes[key].newValue), 700);
        });
        if (!changes.blockedCount && changes.blockedHandles) {
            animateValue(
                statBlocked,
                Array.isArray(changes.blockedHandles.oldValue) ? changes.blockedHandles.oldValue.length : 0,
                Array.isArray(changes.blockedHandles.newValue) ? changes.blockedHandles.newValue.length : 0,
                700
            );
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

    function toCount(value) {
        const number = Number(value);
        return Number.isFinite(number) && number >= 0 ? Math.floor(number) : 0;
    }

    function normalizeFilterRules(rules) {
        const values = Array.isArray(rules) ? rules : String(rules || '').split(/\r?\n/);
        return [...new Set(values
            .map(rule => String(rule || '').replace(/\s+/g, ' ').trim())
            .filter(Boolean)
            .map(rule => rule.slice(0, 200)))]
            .slice(0, 100);
    }

    function getReasonLabel(reason) {
        const keys = {
            ad: 'reasonAd',
            promoted: 'reasonPromoted',
            filter: 'reasonFilter',
            legacy: 'reasonLegacy'
        };
        return i18n.t(keys[reason] || keys.legacy);
    }

    function setInlineStatus(element, message, type = '') {
        if (!element) return;
        element.className = `inline-status${type ? ` ${type}` : ''}`;
        element.textContent = message || '';
        if (element._clearStatusTimer) clearTimeout(element._clearStatusTimer);
        if (message) {
            element._clearStatusTimer = setTimeout(() => {
                element.textContent = '';
                element.className = 'inline-status';
            }, 4500);
        }
    }

    function syncBlockModeLabels() {
        if (!blockMode) return;
        const keys = { account: 'blockModeAccount', hide: 'blockModeHide' };
        Array.from(blockMode.options).forEach(option => {
            const key = keys[option.value];
            if (key) option.textContent = i18n.t(key);
        });
    }

    function normalizeStringArray(value, limit = 5000) {
        if (!Array.isArray(value)) return [];
        return [...new Set(value
            .filter(item => typeof item === 'string')
            .map(item => item.trim())
            .filter(Boolean))]
            .slice(0, limit);
    }

    function sanitizeImportedData(raw) {
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
            throw new Error('Invalid backup format');
        }

        const payload = {};
        const booleanKeys = [
            'extensionEnabled', 'adBlockEnabled', 'promotedBlockEnabled',
            'toastsEnabled', 'downloaderEnabled', 'mediaOnlyDownloader'
        ];
        booleanKeys.forEach(key => {
            if (typeof raw[key] === 'boolean') payload[key] = raw[key];
        });

        if (raw.blockMode === 'hide' || raw.blockMode === 'account') payload.blockMode = raw.blockMode;
        if (Array.isArray(raw.filterRules)) payload.filterRules = normalizeFilterRules(raw.filterRules);
        if (Array.isArray(raw.blockedHandles)) payload.blockedHandles = normalizeStringArray(raw.blockedHandles);
        if (Array.isArray(raw.adBlockedHandles)) payload.adBlockedHandles = normalizeStringArray(raw.adBlockedHandles);
        if (Array.isArray(raw.promotedBlockedHandles)) payload.promotedBlockedHandles = normalizeStringArray(raw.promotedBlockedHandles);
        if (Array.isArray(raw.blockedHistory)) {
            payload.blockedHistory = raw.blockedHistory
                .filter(item => item && typeof item === 'object' && typeof item.handle === 'string')
                .map(item => ({
                    handle: item.handle.trim().slice(0, 200),
                    displayName: typeof item.displayName === 'string' ? item.displayName.trim().slice(0, 200) : item.handle.trim().slice(0, 200),
                    reason: ['ad', 'promoted'].includes(item.reason) ? item.reason : 'legacy',
                    timestamp: toCount(item.timestamp) || Date.now()
                }))
                .filter(item => item.handle)
                .slice(-500);
        }

        [
            'blockedCount', 'adMatchCount', 'promotedMatchCount',
            'adBlockedCount', 'promotedBlockedCount',
            'filteredCount', 'hiddenCount', 'downloadCount'
        ].forEach(key => {
            if (raw[key] !== undefined) payload[key] = toCount(raw[key]);
        });

        if (typeof raw.userLang === 'string'
            && (raw.userLang === 'auto' || i18n.SUPPORTED_LANGS.includes(raw.userLang))) {
            payload.userLang = raw.userLang;
        }

        if (!Object.keys(payload).length) throw new Error('No supported settings found');
        return payload;
    }

    function broadcastSettingsToX(state) {
        broadcastToX({ action: 'toggle_extension', enabled: state.extensionEnabled !== false });
        broadcastToX({ action: 'toggle_ad_block', enabled: state.adBlockEnabled !== false });
        broadcastToX({ action: 'toggle_promoted_block', enabled: state.promotedBlockEnabled === true });
        broadcastToX({ action: 'set_block_mode', mode: state.blockMode === 'hide' ? 'hide' : 'account' });
        broadcastToX({ action: 'toggle_downloader', enabled: state.downloaderEnabled !== false });
        broadcastToX({ action: 'toggle_media_only', enabled: state.mediaOnlyDownloader !== false });
        broadcastToX({ action: 'update_filter_rules', rules: normalizeFilterRules(state.filterRules) });
    }

    function exportData() {
        chrome.storage.local.get(STORAGE_KEYS, state => {
            const payload = {
                schemaVersion: 1,
                exportedAt: new Date().toISOString(),
                ...state
            };
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const anchor = document.createElement('a');
            anchor.href = url;
            anchor.download = `x-ad-blocker-settings-${new Date().toISOString().slice(0, 10)}.json`;
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            setInlineStatus(dataStatus, i18n.t('exportSuccess'), 'success');
        });
    }

    async function handleImportFile(event) {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) return;

        try {
            const payload = sanitizeImportedData(JSON.parse(await file.text()));
            chrome.storage.local.set(payload, async () => {
                if (chrome.runtime.lastError) {
                    setInlineStatus(dataStatus, i18n.t('importFailed'), 'error');
                    return;
                }

                if (payload.userLang !== undefined) {
                    await i18n.setLang(payload.userLang);
                    i18n.applyToDOM();
                    syncLangSelectLabels();
                    syncBlockModeLabels();
                }

                chrome.storage.local.get(STORAGE_KEYS, state => {
                    applyStorageState(state, true);
                    broadcastSettingsToX(state);
                    setInlineStatus(dataStatus, i18n.t('importSuccess'), 'success');
                });
            });
        } catch (_) {
            setInlineStatus(dataStatus, i18n.t('importFailed'), 'error');
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
