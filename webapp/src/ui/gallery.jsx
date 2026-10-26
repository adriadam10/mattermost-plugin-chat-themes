import React from 'react';

import ThemeBox from './theme_box.jsx';

function ThemeCard({theme, selected, meta, onSelect}) {
    return (
        <button
            type='button'
            className='ct-card'
            aria-pressed={selected}
            onClick={onSelect}
        >
            <ThemeBox
                theme={theme}
                still={true}
                className='ct-thumb'
            />
            <span className='ct-card-name'>{theme.name}</span>
            {meta && <span className='ct-card-meta'>{meta}</span>}
        </button>
    );
}

function NewCard({t, onNew}) {
    return (
        <button
            type='button'
            className='ct-card'
            onClick={onNew}
        >
            <span
                className='ct-thumb'
                style={{display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, border: '2px dashed rgba(var(--center-channel-color-rgb), .24)'}}
            >{'+'}</span>
            <span className='ct-card-name'>{t('newTheme')}</span>
        </button>
    );
}

// Gallery: built-in themes and the ones the team saved. Picking one only
// previews it; the footer buttons apply it.
export default function Gallery({themes, selectedId, currentUserId, users, t, onSelect, onNew, onEdit, onEditCopy, onDelete}) {
    const builtins = themes.filter((th) => th.builtin);
    const custom = themes.filter((th) => !th.builtin);
    const selected = themes.find((th) => th.id === selectedId);
    const author = (th) => {
        if (th.author_id === currentUserId) {
            return t('yours');
        }
        const user = users[th.author_id];
        return user ? t('by', `@${user.username}`) : '';
    };

    return (
        <div>
            {selected && (
                <div
                    className='ct-row'
                    style={{marginBottom: 8}}
                >
                    <b style={{flex: 1}}>{selected.name}</b>
                    {selected.can_edit && (
                        <>
                            <button
                                className='ct-btn ct-small'
                                onClick={() => onEdit(selected)}
                            >{t('edit')}</button>
                            <button
                                className='ct-btn ct-small ct-danger'
                                onClick={() => onDelete(selected)}
                            >{t('delete')}</button>
                        </>
                    )}
                    <button
                        className='ct-btn ct-small'
                        onClick={() => onEditCopy(selected)}
                    >{t('editCopy')}</button>
                </div>
            )}
            <div className='ct-section-title'>{t('builtin')}</div>
            <div className='ct-grid'>
                <NewCard
                    t={t}
                    onNew={onNew}
                />
                {builtins.map((th) => (
                    <ThemeCard
                        key={th.id}
                        theme={th}
                        selected={th.id === selectedId}
                        onSelect={() => onSelect(th)}
                    />
                ))}
            </div>
            {custom.length > 0 && <div className='ct-section-title'>{t('community')}</div>}
            <div className='ct-grid'>
                {custom.map((th) => (
                    <ThemeCard
                        key={th.id}
                        theme={th}
                        meta={author(th)}
                        selected={th.id === selectedId}
                        onSelect={() => onSelect(th)}
                    />
                ))}
            </div>
        </div>
    );
}
