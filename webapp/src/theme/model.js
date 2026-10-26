// Theme data shared by the background, the previews and the editor. The server
// validates the same rules (server/theme.go); here they keep the editor honest
// and stop a bad shared code before it reaches the server.

export const LAYER_TYPES = ['color', 'gradient', 'image', 'video', 'pattern', 'particles'];
export const BLEND_MODES = ['normal', 'multiply', 'screen', 'overlay', 'soft-light', 'hard-light', 'color-dodge', 'color-burn', 'difference', 'luminosity', 'color', 'hue', 'saturation'];
export const GRADIENT_KINDS = ['linear', 'radial', 'conic'];
export const FITS = ['cover', 'contain', 'tile'];
export const PATTERNS = ['dots', 'grid', 'stripes', 'waves', 'checks', 'zigzag', 'hearts', 'stars', 'plus'];
export const PARTICLES = ['snow', 'hearts', 'confetti', 'stars', 'bubbles', 'fireflies', 'emoji'];
export const READABILITY_MODES = ['auto', 'scrim', 'cards', 'none'];
export const MAX_LAYERS = 8;

// Which animations make sense for each layer type.
export const ANIMATIONS = {
    color: ['none', 'pulse'],
    gradient: ['none', 'shift', 'rotate', 'hue', 'pulse'],
    image: ['none', 'kenburns', 'pan', 'drift', 'hue', 'pulse'],
    video: ['none', 'hue', 'pulse'],
    pattern: ['none', 'drift', 'rotate', 'hue', 'pulse'],
    particles: ['none'],
};

const COLOR_RE = /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/;
const MEDIA_RE = /^media:[a-z0-9]{26}$/;
const UNSAFE_URL_CHARS = /["'()\\<>\s]/;

const BASE = {opacity: 1, blend: 'normal', animation: 'none', speed: 1, blur: 0, brightness: 1, saturate: 1, hue: 0};

export function newLayer(type) {
    const extra = {
        color: {color: '#6c5ce7'},
        gradient: {gradient: 'linear', angle: 135, colors: ['#ff7e5f', '#feb47b']},
        image: {media: 'image', src: '', fit: 'cover', size: 200},
        video: {media: 'video', src: '', fit: 'cover'},
        pattern: {pattern: 'dots', color: '#ffffff', size: 32, opacity: 0.5},
        particles: {particles: 'snow', color: '#ffffff', density: 60, size: 8, emoji: '✨'},
    }[type];
    return {...BASE, type, ...extra};
}

export function newTheme(name) {
    return {
        name,
        light: {layers: [newLayer('gradient')]},
        readability: {mode: 'auto', strength: 0.5},
    };
}

// The parts of a theme that travel: no id, author or dates.
export function themeBody(theme) {
    const body = {
        name: theme.name,
        light: theme.light,
        readability: theme.readability,
    };
    if (theme.dark) {
        body.dark = theme.dark;
    }
    return body;
}

// Dark Mattermost themes get the dark variant when the theme has one.
export function pickVariant(theme, dark) {
    return (dark && theme.dark) || theme.light;
}

export function isSafeColor(value) {
    return COLOR_RE.test(value || '');
}

export function isSafeSource(src, allowExternal = true) {
    if (MEDIA_RE.test(src || '')) {
        return true;
    }
    if (!allowExternal || !src || src.length > 2048 || UNSAFE_URL_CHARS.test(src)) {
        return false;
    }
    try {
        return new URL(src).protocol === 'https:';
    } catch {
        return false;
    }
}

// mediaUrl turns a stored source into what the browser loads; files uploaded
// through the plugin are served by it.
export function mediaUrl(src, pluginId) {
    const id = /^media:([a-z0-9]{26})$/.exec(src)?.[1];
    if (id) {
        return `${window.basename || ''}/plugins/${pluginId}/api/v1/media/${id}`;
    }
    return isSafeSource(src) ? src : '';
}

// Share codes: "ct1:" + base64url(JSON). They carry uploaded files by reference,
// so they only work on the same Mattermost server.
const CODE_PREFIX = 'ct1:';

export function encodeShareCode(theme) {
    const bytes = new TextEncoder().encode(JSON.stringify(themeBody(theme)));
    let binary = '';
    bytes.forEach((b) => {
        binary += String.fromCharCode(b);
    });
    return CODE_PREFIX + btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeShareCode(code) {
    const text = (code || '').trim();
    if (!text.startsWith(CODE_PREFIX)) {
        throw new Error('not a theme code');
    }
    const b64 = text.slice(CODE_PREFIX.length).replace(/-/g, '+').replace(/_/g, '/');
    const binary = atob(b64);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    const theme = JSON.parse(new TextDecoder().decode(bytes));
    if (!theme?.name || !Array.isArray(theme?.light?.layers) || !theme.readability) {
        throw new Error('incomplete theme');
    }
    return themeBody(theme);
}

export function clone(value) {
    return JSON.parse(JSON.stringify(value));
}
