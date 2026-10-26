// Keeps messages readable over any background: estimates how bright the
// background is and how much of Mattermost's own background color has to go on
// top for the user's text color to reach a contrast target.

const imageCache = new Map();

function channelToLinear(c) {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

function luminanceRgb(r, g, b) {
    return (0.2126 * channelToLinear(r)) + (0.7152 * channelToLinear(g)) + (0.0722 * channelToLinear(b));
}

// hexLuminance also returns the alpha of #rrggbbaa colors.
export function hexLuminance(hex) {
    const n = (i) => parseInt(hex.slice(i, i + 2), 16);
    return {lum: luminanceRgb(n(1), n(3), n(5)), alpha: hex.length === 9 ? n(7) / 255 : 1};
}

export function rgbVarLuminance(value) {
    const [r, g, b] = (value || '').split(',').map((x) => parseFloat(x));
    return [r, g, b].some(Number.isNaN) ? null : luminanceRgb(r, g, b);
}

function contrast(a, b) {
    const [hi, lo] = a > b ? [a, b] : [b, a];
    return (hi + 0.05) / (lo + 0.05);
}

// Average luminance of an image, from a 16x16 copy. Pictures from other sites
// without CORS cannot be read, so they count as mid grey.
function imageLuminance(url) {
    if (!imageCache.has(url)) {
        imageCache.set(url, new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = 16;
                    canvas.height = 16;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, 16, 16);
                    const {data} = ctx.getImageData(0, 0, 16, 16);
                    let sum = 0;
                    for (let i = 0; i < data.length; i += 4) {
                        sum += luminanceRgb(data[i], data[i + 1], data[i + 2]);
                    }
                    resolve(sum / (data.length / 4));
                } catch {
                    resolve(0.5);
                }
            };
            img.onerror = () => resolve(0.5);
            img.src = url;
        }));
    }
    return imageCache.get(url);
}

async function layerLuminance(layer, resolveUrl) {
    switch (layer.type) {
    case 'color':
        return hexLuminance(layer.color);
    case 'gradient': {
        const parts = layer.colors.map(hexLuminance);
        return {lum: parts.reduce((s, p) => s + p.lum, 0) / parts.length, alpha: parts.reduce((s, p) => s + p.alpha, 0) / parts.length};
    }
    case 'pattern':
        // A pattern covers only a small part of the tile.
        return {...hexLuminance(layer.color), alpha: 0.2};
    case 'image':
        return {lum: await imageLuminance(resolveUrl(layer.src)), alpha: 1};
    case 'video':
        return {lum: 0.5, alpha: 1};
    default:
        return null;
    }
}

// estimateLuminance stacks the layers bottom to top, ignoring blend modes.
export async function estimateLuminance(variant, resolveUrl, base) {
    let lum = base;
    for (const layer of variant.layers) {
        const part = await layerLuminance(layer, resolveUrl);
        if (!part) {
            continue;
        }
        const brightness = layer.brightness ?? 1;
        const weight = layer.opacity * part.alpha;
        lum = (lum * (1 - weight)) + (Math.min(1, part.lum * brightness) * weight);
    }
    return lum;
}

// scrimAlpha: how opaque the layer of Mattermost's background color over the
// theme has to be. strength 0-1 moves the target from 3:1 to 7:1 (WCAG AA/AAA).
export function scrimAlpha(readability, backgroundLum, chatBgLum, textLum) {
    const {mode, strength} = readability;
    if (mode === 'none') {
        return 0;
    }
    if (mode === 'scrim') {
        return 0.2 + (strength * 0.7);
    }
    if (mode === 'cards') {
        return 0.1 * strength;
    }
    const target = 3 + (strength * 4);
    for (let alpha = 0; alpha <= 1; alpha += 0.05) {
        const mixed = (backgroundLum * (1 - alpha)) + (chatBgLum * alpha);
        if (contrast(mixed, textLum) >= target) {
            return Math.min(1, alpha);
        }
    }
    return 1;
}

// cardAlpha is the opacity of the panel behind each message in "cards" mode.
export function cardAlpha(readability) {
    return readability.mode === 'cards' ? 0.55 + (0.4 * readability.strength) : 0;
}
