// offscreen.js

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'CONVERT_MP4_TO_GIF') {
        (async () => {
            try {
                const { url, filename } = message;
                const gifData = await transcode(url);
                sendResponse({ ok: true, gifData });
            } catch (err) {
                console.error('Transcode error:', err);
                sendResponse({ ok: false, error: err.message });
            }
        })();
        return true;
    }
});

async function transcode(url) {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.src = url;
        video.muted = true;
        video.playsInline = true;

        video.onloadedmetadata = async () => {
            const width = video.videoWidth;
            const height = video.videoHeight;
            const duration = video.duration;
            
            // X GIFs are usually short. We'll capture at ~20fps.
            const fps = 20;
            const frameDelay = 1000 / fps; // ms
            const totalFrames = Math.floor(duration * fps);
            
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });

            // Estimate buffer size. GIF is roughly width * height * frames + header.
            const buf = new Uint8Array(width * height * totalFrames + 1024 * 1024);
            const gif = new GifWriter(buf, width, height, { loop: 0 });

            try {
                for (let i = 0; i < totalFrames; i++) {
                    video.currentTime = (i / fps);
                    await new Promise(r => {
                        const onSeeked = () => {
                            video.removeEventListener('seeked', onSeeked);
                            r();
                        };
                        video.addEventListener('seeked', onSeeked);
                    });

                    ctx.drawImage(video, 0, 0, width, height);
                    const imageData = ctx.getImageData(0, 0, width, height);
                    
                    // Simple Quantization & Palette Generation per frame
                    // To keep it simple and compatible with omggif, we'll use a 256 color palette.
                    const { pixels, palette } = quantize(imageData.data);
                    
                    gif.addFrame(0, 0, width, height, pixels, {
                        palette: palette,
                        delay: Math.round(frameDelay / 10) // GIF delay is in 1/100ths of a second
                    });
                }

                gif.end();
                const finalSize = gif.getOutputBufferPosition();
                const output = buf.slice(0, finalSize);
                
                // Convert to base64 for message passing
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(new Blob([output], { type: 'image/gif' }));

            } catch (e) {
                reject(e);
            }
        };

        video.onerror = () => reject(new Error('Failed to load video'));
        video.play().catch(e => { /* Ignore autoplay errors as we only need frames */ });
    });
}

/**
 * Improved color quantization using a popularity-based palette.
 * Samples the image to find the most frequent colors, then maps pixels.
 */
function quantize(rgba) {
    const pixels = new Uint8Array(rgba.length / 4);
    
    // 1. Build a histogram to find the most popular colors.
    // To speed up and group similar colors, we'll reduce the color space to 5 bits per channel (15-bit color).
    const histogram = new Map();
    for (let i = 0; i < rgba.length; i += 4) {
        const r = rgba[i] >> 3;
        const g = rgba[i+1] >> 3;
        const b = rgba[i+2] >> 3;
        const key = (r << 10) | (g << 5) | b;
        histogram.set(key, (histogram.get(key) || 0) + 1);
    }

    // 2. Sort colors by frequency and pick the top 256.
    const sortedColors = Array.from(histogram.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 256);

    const palette = new Int32Array(256);
    const colorTable = [];
    for (let i = 0; i < sortedColors.length; i++) {
        const key = sortedColors[i][0];
        const r = (key >> 10) << 3;
        const g = ((key >> 5) & 0x1f) << 3;
        const b = (key & 0x1f) << 3;
        const rgb = (r << 16) | (g << 8) | b;
        palette[i] = rgb;
        colorTable.push({ r, g, b, index: i });
    }

    // 3. Map each pixel to the nearest color in our new palette.
    // We cache mappings of the reduced 15-bit keys to save time.
    const mappingCache = new Map();

    for (let i = 0; i < rgba.length; i += 4) {
        const r = rgba[i];
        const g = rgba[i+1];
        const b = rgba[i+2];
        const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);

        let index = mappingCache.get(key);
        if (index === undefined) {
            index = getNearestIndex(r, g, b, colorTable);
            mappingCache.set(key, index);
        }
        pixels[i / 4] = index;
    }

    // Palette MUST be a power of 2 for omggif
    let paletteSize = 2;
    while (paletteSize < sortedColors.length) paletteSize *= 2;
    const finalPalette = new Int32Array(paletteSize);
    finalPalette.set(palette.subarray(0, sortedColors.length));
    
    return { pixels, palette: finalPalette };
}

function getNearestIndex(r, g, b, colorTable) {
    let minDist = Infinity;
    let nearestIndex = 0;
    for (const entry of colorTable) {
        const dr = r - entry.r;
        const dg = g - entry.g;
        const db = b - entry.b;
        const dist = dr*dr + dg*dg + db*db;
        if (dist < minDist) {
            minDist = dist;
            nearestIndex = entry.index;
            if (dist === 0) break;
        }
    }
    return nearestIndex;
}

