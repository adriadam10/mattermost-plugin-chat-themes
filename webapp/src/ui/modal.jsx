import React, {useEffect, useState} from 'react';
import {useSelector} from 'react-redux';

import * as api from '../api.js';
import {clone, decodeShareCode, encodeShareCode, newTheme, themeBody} from '../theme/model.js';
import {mattermostColors} from '../theme/stage.js';

import Editor from './editor.jsx';
import Gallery from './gallery.jsx';
import Preview from './preview.jsx';

// ThemeModal: gallery and editor of the chat theme. It opens through
// subscribe(listener) with {channelId, draft?}: the header button, /tema and
// the "View" button of a theme notice.
export default function ThemeModal({subscribe, background, t}) {
    const [state, setState] = useState(null);
    const [themes, setThemes] = useState([]);
    const [config, setConfig] = useState({max_upload_bytes: 0, allow_external_urls: false});
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);
    const currentUserId = useSelector((s) => s.entities.users.currentUserId);
    const users = useSelector((s) => s.entities.users.profiles);

    const reload = () => api.fetchThemes().then(setThemes).catch((err) => setMessage(t('failed', err.message)));

    useEffect(() => subscribe(({channelId, draft}) => {
        const current = background.current(channelId)?.theme;
        setState({
            channelId,
            tab: draft ? 'editor' : 'gallery',
            draft: clone(draft || current || newTheme(t('newThemeName'))),
            selectedId: draft ? '' : current?.id || '',
            editingId: '',
            variant: mattermostColors().dark ? 'dark' : 'light',
            hasTheme: Boolean(current),
        });
        setMessage('');
        reload();
        api.fetchConfig().then(setConfig).catch(() => {});
    }), []);

    useEffect(() => {
        if (!state) {
            return undefined;
        }
        const onKey = (e) => e.key === 'Escape' && setState(null);
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [Boolean(state)]);

    if (!state) {
        return null;
    }
    const update = (patch) => setState({...state, ...patch});
    const run = async (action, done) => {
        setBusy(true);
        setMessage('');
        try {
            await action();
            setMessage(done);
        } catch (err) {
            setMessage(t('failed', err.message));
        } finally {
            setBusy(false);
        }
    };

    const apply = () => run(async () => {
        await api.setChannelTheme(state.channelId, {...themeBody(state.draft), id: state.selectedId || state.editingId || undefined});
        update({hasTheme: true});
    }, t('applied'));
    const remove = () => run(async () => {
        await api.clearChannelTheme(state.channelId);
        update({hasTheme: false});
    }, t('removed'));
    const save = () => run(async () => {
        const body = themeBody(state.draft);
        const saved = state.editingId ? await api.updateTheme(state.editingId, body) : await api.createTheme(body);
        update({editingId: saved.id, selectedId: saved.id});
        await reload();
    }, t('saved'));
    const copyCode = () => run(() => navigator.clipboard.writeText(encodeShareCode(state.draft)), t('codeCopied'));
    const importCode = () => {
        // eslint-disable-next-line no-alert
        const code = window.prompt(t('importPrompt'));
        if (!code) {
            return;
        }
        try {
            update({draft: decodeShareCode(code), tab: 'editor', editingId: '', selectedId: ''});
        } catch {
            setMessage(t('badCode'));
        }
    };
    const removeFromGallery = (theme) => {
        // eslint-disable-next-line no-alert
        if (window.confirm(t('confirmDelete', theme.name))) {
            run(async () => {
                await api.deleteTheme(theme.id);
                await reload();
                update({selectedId: '', editingId: state.editingId === theme.id ? '' : state.editingId});
            }, '');
        }
    };

    return (
        <div
            className='ct-backdrop'
            onMouseDown={(e) => e.target === e.currentTarget && setState(null)}
        >
            <div
                className='ct-modal'
                role='dialog'
                aria-label={t('title')}
            >
                <header>
                    <h2>{t('title')}</h2>
                    <div className='ct-tabs'>
                        {['gallery', 'editor'].map((tab) => (
                            <button
                                key={tab}
                                className='ct-tab'
                                aria-selected={state.tab === tab}
                                onClick={() => update({tab})}
                            >{t(tab)}</button>
                        ))}
                    </div>
                    <button
                        className='ct-btn ct-small'
                        onClick={importCode}
                    >{t('importCode')}</button>
                    <button
                        className='ct-icon-btn'
                        aria-label={t('close')}
                        onClick={() => setState(null)}
                    >{'✕'}</button>
                </header>
                <div className='ct-body'>
                    <div className='ct-side'>
                        <Preview
                            theme={state.draft}
                            variant={state.tab === 'editor' && state.draft.dark ? state.variant : undefined}
                            t={t}
                        />
                        <b>{state.draft.name}</b>
                        {message && <div className='ct-hint'>{message}</div>}
                    </div>
                    <div className='ct-main'>
                        {state.tab === 'gallery' ? (
                            <Gallery
                                {...{themes, currentUserId, users, t}}
                                selectedId={state.selectedId}
                                onSelect={(th) => update({draft: clone(th), selectedId: th.id, editingId: ''})}
                                onNew={() => update({draft: newTheme(t('newThemeName')), tab: 'editor', selectedId: '', editingId: ''})}
                                onEdit={(th) => update({draft: clone(th), tab: 'editor', editingId: th.id, selectedId: th.id})}
                                onEditCopy={(th) => update({draft: {...clone(th), name: `${th.name} ${t('copySuffix')}`.slice(0, 40)}, tab: 'editor', editingId: '', selectedId: ''})}
                                onDelete={removeFromGallery}
                            />
                        ) : (
                            <Editor
                                draft={state.draft}
                                onChange={(draft) => update({draft, selectedId: ''})}
                                variant={state.variant}
                                onVariant={(variant) => update({variant})}
                                t={t}
                                channelId={state.channelId}
                                config={config}
                            />
                        )}
                    </div>
                </div>
                <footer>
                    {state.hasTheme && (
                        <button
                            className='ct-btn ct-danger'
                            disabled={busy}
                            onClick={remove}
                            style={{marginRight: 'auto'}}
                        >{t('removeTheme')}</button>
                    )}
                    <button
                        className='ct-btn'
                        disabled={busy}
                        onClick={copyCode}
                    >{t('copyCode')}</button>
                    {state.tab === 'editor' && (
                        <button
                            className='ct-btn'
                            disabled={busy}
                            onClick={save}
                        >{state.editingId ? t('updateGallery') : t('saveGallery')}</button>
                    )}
                    <button
                        className='ct-btn ct-primary'
                        disabled={busy}
                        onClick={apply}
                    >{t('apply')}</button>
                </footer>
            </div>
        </div>
    );
}
