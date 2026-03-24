// background.js — Service Worker
// Content scripts can't fetch cross-origin URLs even with host_permissions
// due to CORS. Background service workers are exempt from CORS restrictions.

// The token value X's embed widget uses. If X starts validating tokens more
// strictly this will be the first thing to change — update it here.
const SYNDICATION_TOKEN = 'x';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'FETCH_TWEET_DATA') {
        const { statusId } = message;

        if (!statusId || !/^\d+$/.test(statusId)) {
            sendResponse({ ok: false, error: 'Invalid status ID' });
            return false;
        }

        const url = `https://cdn.syndication.twimg.com/tweet-result?id=${statusId}&lang=en&token=${SYNDICATION_TOKEN}`;

        fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; TwitterEmbedWidget/1.0)'
            }
        })
            .then(res => {
                if (res.status === 404) throw new Error('Tweet not found (deleted or private)');
                if (res.status === 429) throw new Error('Rate limited by X — please wait a moment');
                if (res.status === 403) throw new Error('Access denied — the syndication token may have changed');
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then(data => sendResponse({ ok: true, data }))
            .catch(err => sendResponse({ ok: false, error: err.message }));

        return true; // keep message channel open for async sendResponse
    }

    if (message.type === 'CONVERT_TO_GIF') {
        handleGifConversion(message.url, message.filename, sendResponse);
        return true;
    }
});

async function handleGifConversion(url, filename, sendResponse) {
    try {
        await setupOffscreenDocument('src/offscreen/offscreen.html');
        const response = await chrome.runtime.sendMessage({
            type: 'CONVERT_MP4_TO_GIF',
            url,
            filename
        });
        sendResponse(response);
    } catch (err) {
        sendResponse({ ok: false, error: err.message });
    }
}

async function setupOffscreenDocument(path) {
    // Check if offscreen document already exists
    const existingContexts = await chrome.runtime.getContexts({
        contextTypes: ['OFFSCREEN_DOCUMENT'],
        documentUrls: [chrome.runtime.getURL(path)]
    });

    if (existingContexts.length > 0) return;

    // create offscreen document
    await chrome.offscreen.createDocument({
        url: path,
        reasons: ['BLOBS'],
        justification: 'Transcoding MP4 transition videos into GIF format for user downloads.'
    });
}