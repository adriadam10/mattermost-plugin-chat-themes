// A stage is a box showing one theme with its readability layer, adapted to the
// viewer's Mattermost theme: the conversation background and the editor preview.

import {mediaUrl, pickVariant} from './model.js';
import {cardAlpha, estimateLuminance, rgbVarLuminance, scrimAlpha} from './readability.js';
import {mountTheme} from './render.js';

// Mattermost publishes its theme colors as "r,g,b" CSS variables; a preview
// can override them on its own element to show the other variant.
export function mattermostColors(element = document.documentElement) {
    const css = getComputedStyle(element.isConnected ? element : document.documentElement);
    const bg = rgbVarLuminance(css.getPropertyValue('--center-channel-bg-rgb')) ?? 1;
    const text = rgbVarLuminance(css.getPropertyValue('--center-channel-color-rgb')) ?? 0;
    return {bg, text, dark: bg < text};
}

export default class Stage {
    constructor(container, {pluginId, still = false}) {
        this.container = container;
        this.pluginId = pluginId;
        this.still = still;
        this.theme = null;
        this.handle = null;
        this.paused = false;
        this.scrim = document.createElement('div');
        this.scrim.className = 'ct-scrim';
        this.generation = 0;
    }

    // show draws theme (null clears it); key avoids redrawing an unchanged theme.
    show(theme) {
        const key = theme ? JSON.stringify([theme, mattermostColors(this.container).dark]) : '';
        if (key === this.key) {
            return;
        }
        this.key = key;
        this.theme = theme;
        this.handle?.destroy();
        this.handle = null;
        this.scrim.remove();
        this.container.style.removeProperty('--ct-card-alpha');
        if (!theme) {
            return;
        }
        const colors = mattermostColors(this.container);
        const variant = pickVariant(theme, colors.dark);
        this.handle = mountTheme(this.container, variant, {pluginId: this.pluginId, still: this.still});
        if (this.paused && !this.still) {
            this.handle.pause();
        }
        // Thumbnails show the theme itself; readability is for messages.
        if (this.still) {
            return;
        }
        this.container.appendChild(this.scrim);
        this.container.style.setProperty('--ct-card-alpha', cardAlpha(theme.readability));
        this.updateScrim(theme, variant, colors);
    }

    // The scrim waits for images to be measured; a newer theme wins the race.
    async updateScrim(theme, variant, colors) {
        const generation = ++this.generation;
        if (theme.readability.mode !== 'auto') {
            this.scrim.style.opacity = scrimAlpha(theme.readability);
            return;
        }
        // Until measured, as opaque as the "scrim" mode at the same strength.
        this.scrim.style.opacity = scrimAlpha({...theme.readability, mode: 'scrim'});
        const lum = await estimateLuminance(variant, (src) => mediaUrl(src, this.pluginId), colors.bg);
        if (generation === this.generation) {
            this.scrim.style.opacity = scrimAlpha(theme.readability, lum, colors.bg, colors.text);
        }
    }

    // refresh redraws after the user switched Mattermost theme (light/dark variant, scrim).
    refresh() {
        const theme = this.theme;
        this.key = undefined;
        this.show(theme);
    }

    pause() {
        this.paused = true;
        this.handle?.pause();
    }

    resume() {
        this.paused = false;
        if (!this.still) {
            this.handle?.resume();
        }
    }

    destroy() {
        this.show(null);
    }
}
