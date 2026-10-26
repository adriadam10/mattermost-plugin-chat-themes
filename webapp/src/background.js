// Paints the open conversation's theme behind its messages and keeps it in
// sync: channel switches, changes by other members (websocket), Mattermost
// theme switches, hidden tabs and reduced motion.

import {fetchChannelTheme} from './api.js';
import Stage, {mattermostColors} from './theme/stage.js';

export default class Background {
    constructor(store, pluginId) {
        this.store = store;
        this.pluginId = pluginId;
        // channel id -> channel theme ({theme, set_by, set_at}) or null; a
        // pending fetch is stored as its promise.
        this.cache = new Map();
        this.listeners = new Set();
        this.channelId = '';
        this.layer = document.createElement('div');
        this.layer.className = 'ct-background';
        this.stage = new Stage(this.layer, {pluginId});
        this.motion = window.matchMedia('(prefers-reduced-motion: reduce)');
        this.sync = this.sync.bind(this);
        this.onVisibility = this.onVisibility.bind(this);
        this.onMattermostTheme = this.onMattermostTheme.bind(this);
    }

    start() {
        this.unsubscribe = this.store.subscribe(this.sync);
        // The channel view is rebuilt now and then; put the layer back when it is.
        this.domObserver = new MutationObserver(() => this.scheduleMount());
        this.domObserver.observe(document.body, {childList: true, subtree: true});
        // Mattermost applies its theme by rewriting CSS variables in <head>.
        this.themeObserver = new MutationObserver(this.onMattermostTheme);
        this.themeObserver.observe(document.head, {childList: true, subtree: true, characterData: true});
        this.themeObserver.observe(document.documentElement, {attributes: true, attributeFilter: ['style', 'class']});
        this.colorsKey = JSON.stringify(mattermostColors());
        document.addEventListener('visibilitychange', this.onVisibility);
        this.motion.addEventListener('change', this.onVisibility);
        this.sync();
    }

    stop() {
        this.unsubscribe?.();
        this.domObserver?.disconnect();
        this.themeObserver?.disconnect();
        document.removeEventListener('visibilitychange', this.onVisibility);
        this.motion.removeEventListener('change', this.onVisibility);
        this.stage.destroy();
        this.unmount();
    }

    // subscribe lets the editor know the current conversation's theme.
    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    current(channelId = this.channelId) {
        const value = this.cache.get(channelId);
        return value instanceof Promise ? undefined : value;
    }

    sync() {
        const channelId = this.store.getState().entities.channels.currentChannelId || '';
        if (channelId !== this.channelId) {
            this.channelId = channelId;
            this.render();
        }
    }

    async render() {
        const channelId = this.channelId;
        if (!channelId) {
            this.show(null);
            return;
        }
        if (!this.cache.has(channelId)) {
            const pending = fetchChannelTheme(channelId).catch(() => null);
            this.cache.set(channelId, pending);
            this.cache.set(channelId, await pending);
        }
        const value = this.cache.get(channelId);
        if (channelId === this.channelId && !(value instanceof Promise)) {
            this.show(value);
        }
    }

    show(channelTheme) {
        this.stage.show(channelTheme?.theme || null);
        this.scheduleMount();
        this.onVisibility();
        this.listeners.forEach((l) => l(this.channelId, channelTheme));
    }

    // onThemeChanged: websocket event from the server, for every member.
    onThemeChanged = (msg) => {
        const {channel_id: channelId, channel_theme: raw} = msg.data;
        this.cache.set(channelId, raw ? JSON.parse(raw) : null);
        if (channelId === this.channelId) {
            this.show(this.cache.get(channelId));
        }
    };

    // After a reconnect other members may have changed themes while we were away.
    onReconnect = () => {
        this.cache.clear();
        this.channelId = '';
        this.sync();
    };

    scheduleMount() {
        if (this.mountPending) {
            return;
        }
        this.mountPending = true;
        requestAnimationFrame(() => {
            this.mountPending = false;
            this.mount();
        });
    }

    mount() {
        const content = document.getElementById('app-content');
        const themed = Boolean(this.stage.theme) && Boolean(content);
        if (!themed) {
            this.unmount();
            return;
        }
        if (this.layer.parentElement !== content) {
            this.unmount();
            content.prepend(this.layer);
        }
        content.classList.add('ct-themed');
        // The message cards are inside #app-content, not inside the layer.
        content.style.setProperty('--ct-card-alpha', this.layer.style.getPropertyValue('--ct-card-alpha') || '0');
    }

    unmount() {
        this.layer.parentElement?.style.removeProperty('--ct-card-alpha');
        this.layer.parentElement?.classList.remove('ct-themed');
        this.layer.remove();
    }

    onVisibility() {
        if (document.hidden || this.motion.matches) {
            this.stage.pause();
        } else {
            this.stage.resume();
        }
    }

    // <head> changes all the time (styles injected on navigation); only a real
    // change of colors needs a redraw.
    onMattermostTheme() {
        clearTimeout(this.themeTimer);
        this.themeTimer = setTimeout(() => {
            const key = JSON.stringify(mattermostColors());
            if (key !== this.colorsKey) {
                this.colorsKey = key;
                this.stage.refresh();
            }
        }, 200);
    }
}
