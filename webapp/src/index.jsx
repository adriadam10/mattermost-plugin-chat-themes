import React from 'react';

import manifest from '../../plugin.json';

import Background from './background.js';
import {translator} from './i18n.js';
import {STYLES} from './styles.js';
import ThemeModal from './ui/modal.jsx';
import NoticePost from './ui/notice_post.jsx';

function currentLocale(state) {
    const {currentUserId, profiles} = state.entities.users;
    return profiles[currentUserId]?.locale || document.documentElement.lang || 'en';
}

function PaletteIcon() {
    return (
        <svg
            width='18'
            height='18'
            viewBox='0 0 24 24'
            fill='currentColor'
            aria-hidden='true'
        >
            <path d='M12 3a9 9 0 0 0 0 18c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3-4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm3 4a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z'/>
        </svg>
    );
}

class Plugin {
    initialize(registry, store) {
        const t = translator(currentLocale(store.getState()));

        this.style = document.createElement('style');
        this.style.textContent = STYLES;
        document.head.appendChild(this.style);

        this.background = new Background(store, manifest.id);

        // The header button, /tema and theme notices open the modal through this listener.
        let open = () => {};
        const subscribe = (listener) => {
            open = listener;
            return () => {
                open = () => {};
            };
        };
        const openEditor = (request) => open(request);
        const currentChannelId = () => store.getState().entities.channels.currentChannelId;

        registry.registerRootComponent(() => (
            <ThemeModal
                subscribe={subscribe}
                background={this.background}
                t={t}
            />
        ));
        registry.registerChannelHeaderButtonAction(
            <PaletteIcon/>,
            (channel) => openEditor({channelId: channel.id}),
            t('headerButton'),
            t('headerButton'),
        );
        registry.registerPostTypeComponent('custom_chat_theme', (props) => (
            <NoticePost
                post={props.post}
                t={t}
                openEditor={openEditor}
            />
        ));
        // "/tema" alone opens the editor here; subcommands go on to the server.
        registry.registerSlashCommandWillBePostedHook((message, args) => {
            if (message.trim().toLowerCase() === '/tema') {
                openEditor({channelId: args?.channel_id || currentChannelId()});
                return {};
            }
            return {message, args};
        });
        registry.registerWebSocketEventHandler(`custom_${manifest.id}_channel_theme`, this.background.onThemeChanged);
        registry.registerReconnectHandler(this.background.onReconnect);

        this.background.start();
    }

    uninitialize() {
        this.background?.stop();
        this.style?.remove();
    }
}

window.registerPlugin(manifest.id, new Plugin());
