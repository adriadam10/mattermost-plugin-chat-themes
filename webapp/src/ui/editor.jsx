import React, {useState} from 'react';

import {LAYER_TYPES, MAX_LAYERS, READABILITY_MODES, clone, newLayer} from '../theme/model.js';

import {Field, Select, Slider, percent} from './controls.jsx';
import LayerFields from './layer_editor.jsx';

function LayerCard({layer, index, count, open, onToggle, onChange, onMove, onDuplicate, onRemove, t, channelId, config}) {
    const stop = (fn) => (e) => {
        e.stopPropagation();
        fn();
    };
    return (
        <div className='ct-layer-card'>
            <div
                className='ct-layer-head'
                onClick={onToggle}
            >
                <span>{`${index + 1}. ${t(`type_${layer.type}`)}`}</span>
                <button
                    className='ct-icon-btn'
                    title={t('up')}
                    disabled={index === count - 1}
                    onClick={stop(() => onMove(1))}
                >{'↑'}</button>
                <button
                    className='ct-icon-btn'
                    title={t('down')}
                    disabled={index === 0}
                    onClick={stop(() => onMove(-1))}
                >{'↓'}</button>
                <button
                    className='ct-icon-btn'
                    title={t('duplicate')}
                    disabled={count >= MAX_LAYERS}
                    onClick={stop(onDuplicate)}
                >{'⧉'}</button>
                <button
                    className='ct-icon-btn'
                    title={t('remove')}
                    disabled={count <= 1}
                    onClick={stop(onRemove)}
                >{'✕'}</button>
            </div>
            {open && (
                <div className='ct-layer-body'>
                    <LayerFields
                        layer={layer}
                        set={(patch) => onChange({...layer, ...patch})}
                        t={t}
                        channelId={channelId}
                        config={config}
                    />
                </div>
            )}
        </div>
    );
}

// Editor: name, light/dark variants, layers and readability of a draft theme.
// variant/onVariant are lifted so the preview shows the variant being edited.
export default function Editor({draft, onChange, variant, onVariant, t, channelId, config}) {
    const [openLayer, setOpenLayer] = useState(draft.light.layers.length - 1);
    const key = variant === 'dark' && draft.dark ? 'dark' : 'light';
    const layers = draft[key].layers;

    const setLayers = (next) => onChange({...draft, [key]: {...draft[key], layers: next}});
    const replace = (i, layer) => setLayers(layers.map((l, j) => (i === j ? layer : l)));
    const move = (i, delta) => {
        const next = [...layers];
        [next[i], next[i + delta]] = [next[i + delta], next[i]];
        setLayers(next);
        setOpenLayer(i + delta);
    };
    const add = (type) => {
        setLayers([...layers, newLayer(type)]);
        setOpenLayer(layers.length);
    };
    const toggleDark = (on) => {
        onChange({...draft, dark: on ? clone(draft.light) : undefined});
        onVariant(on ? 'dark' : 'light');
    };

    return (
        <div>
            <Field label={t('name')}>
                <input
                    type='text'
                    value={draft.name}
                    maxLength={40}
                    onChange={(e) => onChange({...draft, name: e.target.value})}
                />
            </Field>
            <label
                className='ct-row'
                style={{margin: '8px 0', fontSize: 13}}
            >
                <input
                    type='checkbox'
                    checked={Boolean(draft.dark)}
                    onChange={(e) => toggleDark(e.target.checked)}
                />
                {t('ownDark')}
            </label>
            {draft.dark && (
                <div className='ct-tabs'>
                    {['light', 'dark'].map((v) => (
                        <button
                            key={v}
                            className='ct-tab'
                            aria-selected={key === v}
                            onClick={() => onVariant(v)}
                        >{t(v)}</button>
                    ))}
                </div>
            )}

            <div className='ct-section-title'>{t('layers')}</div>
            {layers.map((layer, i) => (
                <LayerCard
                    key={`${key}-${i}`}
                    {...{layer, t, channelId, config}}
                    index={i}
                    count={layers.length}
                    open={openLayer === i}
                    onToggle={() => setOpenLayer(openLayer === i ? -1 : i)}
                    onChange={(l) => replace(i, l)}
                    onMove={(delta) => move(i, delta)}
                    onDuplicate={() => setLayers([...layers.slice(0, i + 1), clone(layer), ...layers.slice(i + 1)])}
                    onRemove={() => setLayers(layers.filter((_, j) => j !== i))}
                />
            )).reverse()}
            <div className='ct-row'>
                <span className='ct-hint'>{t('addLayer')}</span>
                {LAYER_TYPES.map((type) => (
                    <button
                        key={type}
                        className='ct-btn ct-small'
                        disabled={layers.length >= MAX_LAYERS}
                        onClick={() => add(type)}
                    >{t(`type_${type}`)}</button>
                ))}
            </div>

            <div className='ct-section-title'>{t('readability')}</div>
            <Select
                label={t('readabilityMode')}
                value={draft.readability.mode}
                options={READABILITY_MODES.map((m) => [m, t(`mode_${m}`)])}
                onChange={(mode) => onChange({...draft, readability: {...draft.readability, mode}})}
            />
            {draft.readability.mode !== 'none' && (
                <Slider
                    label={t('strength')}
                    value={draft.readability.strength}
                    min={0}
                    max={1}
                    step={0.05}
                    onChange={(strength) => onChange({...draft, readability: {...draft.readability, strength}})}
                    format={percent}
                />
            )}
            <div className='ct-hint'>{t('readabilityHelp')}</div>
        </div>
    );
}
