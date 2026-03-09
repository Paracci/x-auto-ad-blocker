// background.js — Service Worker
// Content scripts can't fetch cross-origin URLs even with host_permissions
// due to CORS. Background service workers are exempt from CORS restrictions.

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'FETCH_TWEET_DATA') {
        const { statusId } = message;
        const url = `https://cdn.syndication.twimg.com/tweet-result?id=${statusId}&lang=en&token=x`;

        fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; TwitterEmbedWidget/1.0)'
            }
        })
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                return res.json();
            })
            .then(data => sendResponse({ ok: true, data }))
            .catch(err => sendResponse({ ok: false, error: err.message }));

        return true; // keep message channel open for async sendResponse
    }
});