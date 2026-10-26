import React, {useState} from 'react';

import {createTheme} from '../api.js';
import {encodeShareCode, themeBody} from '../theme/model.js';

import ThemeBox from './theme_box.jsx';

// NoticePost renders the "X changed the chat theme" post, Instagram style, with
// ways to take the theme elsewhere: open it in the editor, copy its code or
// save it in the gallery.
export default function NoticePost({post, t, openEditor}) {
    const theme = post.props?.theme;
    const [message, setMessage] = useState('');
    if (!theme) {
        return <div className='ct-notice'><span className='ct-notice-text'>{t('noticeCleared')}</span></div>;
    }
    const act = (action, done) => action().then(() => setMessage(done), (err) => setMessage(t('failed', err.message)));

    return (
        <div className='ct-notice'>
            <ThemeBox
                theme={theme}
                still={true}
                className='ct-notice-swatch'
            />
            <span className='ct-notice-text'>
                {t('noticeSet', theme.name)}
                {message && <span className='ct-hint'>{` · ${message}`}</span>}
            </span>
            <span className='ct-row'>
                <button
                    className='ct-btn ct-small'
                    onClick={() => openEditor({channelId: post.channel_id, draft: themeBody(theme)})}
                >{t('view')}</button>
                <button
                    className='ct-btn ct-small'
                    onClick={() => act(() => navigator.clipboard.writeText(encodeShareCode(theme)), t('codeCopied'))}
                >{t('copyCode')}</button>
                <button
                    className='ct-btn ct-small'
                    onClick={() => act(() => createTheme(themeBody(theme)), t('saved'))}
                >{t('saveGallery')}</button>
            </span>
        </div>
    );
}
