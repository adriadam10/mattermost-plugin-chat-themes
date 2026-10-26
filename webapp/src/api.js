import manifest from '../../plugin.json';

// Mattermost rejects cookie-authenticated writes without its CSRF header.
function csrfToken() {
    return document.cookie.match(/(?:^|;\s*)MMCSRF=([^;]+)/)?.[1] ?? '';
}

const base = () => `${window.basename || ''}/plugins/${manifest.id}/api/v1`;

async function request(method, path, body, contentType = 'application/json') {
    const response = await fetch(`${base()}/${path}`, {
        method,
        credentials: 'include',
        headers: {
            'Content-Type': contentType,
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRF-Token': csrfToken(),
        },
        body: body && contentType === 'application/json' ? JSON.stringify(body) : body,
    });
    if (!response.ok) {
        // The server explains validation errors in plain text.
        const detail = (await response.text()).trim();
        throw new Error(detail || `${method} ${path} -> ${response.status}`);
    }
    return response.status === 204 ? null : response.json();
}

export const fetchConfig = () => request('GET', 'config');
export const fetchChannelTheme = (channelId) => request('GET', `channels/${channelId}/theme`).then((r) => r.channel_theme);
export const setChannelTheme = (channelId, theme) => request('PUT', `channels/${channelId}/theme`, theme);
export const clearChannelTheme = (channelId) => request('DELETE', `channels/${channelId}/theme`);
export const fetchThemes = () => request('GET', 'themes').then((r) => r.themes);
export const createTheme = (theme) => request('POST', 'themes', theme);
export const updateTheme = (id, theme) => request('PUT', `themes/${id}`, theme);
export const deleteTheme = (id) => request('DELETE', `themes/${id}`);
export const uploadMedia = (channelId, blob) => request('POST', `media?channel_id=${encodeURIComponent(channelId)}`, blob, blob.type || 'application/octet-stream');
