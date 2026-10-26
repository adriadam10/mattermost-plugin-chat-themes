// Builds a theme variant as DOM layers inside a container: the live background
// of a conversation, the editor preview and the gallery thumbnails all use it.
// Each layer is a wrapper (opacity, blend mode, static filters) around a fill
// that carries the animation, so an animated filter does not wipe the static one.

import {mediaUrl} from './model.js';
import Particles from './particles.js';
import {patternUrl} from './patterns.js';

// Seconds per animation cycle at speed 1.
const DURATIONS = {shift: 16, rotate: 40, hue: 20, pulse: 8, kenburns: 30, pan: 40, drift: 20};

function gradientCss(layer) {
    const colors = layer.colors.join(', ');
    switch (layer.gradient) {
    case 'radial':
        return `radial-gradient(circle at center, ${colors})`;
    case 'conic':
        return `conic-gradient(from ${layer.angle || 0}deg at center, ${colors})`;
    default:
        return `linear-gradient(${layer.angle || 0}deg, ${colors})`;
    }
}

function staticFilter(layer) {
    const parts = [];
    if (layer.blur) {
        parts.push(`blur(${layer.blur}px)`);
    }
    if (layer.brightness !== undefined && layer.brightness !== 1) {
        parts.push(`brightness(${layer.brightness})`);
    }
    if (layer.saturate !== undefined && layer.saturate !== 1) {
        parts.push(`saturate(${layer.saturate})`);
    }
    if (layer.hue) {
        parts.push(`hue-rotate(${layer.hue}deg)`);
    }
    return parts.join(' ');
}

function tiled(fill, size) {
    fill.style.backgroundRepeat = 'repeat';
    fill.style.backgroundSize = `${size}px auto`;
    fill.style.setProperty('--ct-tile', `${size}px`);
}

function buildFill(layer, pluginId, still) {
    if (layer.type === 'video') {
        const video = document.createElement('video');
        Object.assign(video, {muted: true, loop: true, playsInline: true, autoplay: !still, preload: still ? 'metadata' : 'auto'});
        video.src = mediaUrl(layer.src, pluginId);
        video.style.objectFit = layer.fit === 'contain' ? 'contain' : 'cover';
        return video;
    }
    if (layer.type === 'particles') {
        return document.createElement('canvas');
    }
    const fill = document.createElement('div');
    const s = fill.style;
    switch (layer.type) {
    case 'color':
        s.backgroundColor = layer.color;
        break;
    case 'gradient':
        s.backgroundImage = gradientCss(layer);
        break;
    case 'pattern':
        s.backgroundImage = patternUrl(layer.pattern, layer.color, layer.size);
        tiled(fill, Math.max(8, layer.size || 32));
        break;
    case 'image': {
        const url = mediaUrl(layer.src, pluginId);
        s.backgroundImage = url ? `url("${url}")` : 'none';
        s.backgroundPosition = 'center';
        if (layer.fit === 'tile') {
            tiled(fill, Math.max(16, layer.size || 200));
        } else {
            s.backgroundRepeat = 'no-repeat';
            s.backgroundSize = layer.fit;
        }
        break;
    }
    }
    return fill;
}

function buildLayer(layer, pluginId, still) {
    const wrapper = document.createElement('div');
    wrapper.className = 'ct-layer';
    wrapper.style.opacity = layer.opacity;
    wrapper.style.mixBlendMode = layer.blend || 'normal';
    wrapper.style.filter = staticFilter(layer);

    const fill = buildFill(layer, pluginId, still);
    fill.classList.add('ct-fill');
    const animation = layer.animation && layer.animation !== 'none' && layer.speed > 0 ? layer.animation : '';
    if (animation) {
        fill.classList.add(`ct-anim-${animation}`);
        fill.style.setProperty('--ct-dur', `${DURATIONS[animation] / layer.speed}s`);
    }
    wrapper.appendChild(fill);
    return {wrapper, fill};
}

// mountTheme draws variant in container and returns the controls of what moves.
// still: thumbnails, drawn once with nothing running.
export function mountTheme(container, variant, {pluginId, still = false} = {}) {
    const root = document.createElement('div');
    root.className = 'ct-root';
    const engines = [];
    const videos = [];
    for (const layer of variant.layers) {
        const {wrapper, fill} = buildLayer(layer, pluginId, still);
        root.appendChild(wrapper);
        if (layer.type === 'particles') {
            engines.push(() => new Particles(fill, layer));
        } else if (layer.type === 'video') {
            videos.push(fill);
        }
    }
    container.appendChild(root);
    // Canvases measure themselves, so they start once they are in the page.
    const particles = engines.map((make) => make());

    const handle = {
        pause() {
            root.classList.add('ct-paused');
            particles.forEach((p) => p.stop());
            videos.forEach((v) => v.pause());
        },
        resume() {
            root.classList.remove('ct-paused');
            particles.forEach((p) => p.start());
            videos.forEach((v) => v.play().catch(() => {}));
        },
        destroy() {
            particles.forEach((p) => p.destroy());
            videos.forEach((v) => v.removeAttribute('src'));
            root.remove();
        },
    };
    if (still) {
        handle.pause();
    } else {
        handle.resume();
    }
    return handle;
}
