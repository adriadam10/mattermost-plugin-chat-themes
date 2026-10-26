import React, {useState} from 'react';

import {uploadBackground} from '../media.js';
import {FITS, isSafeSource} from '../theme/model.js';

import {Field, Select, Slider, percent} from './controls.jsx';

const options = (values, t, prefix) => values.map((v) => [v, t(prefix + v)]);

// SourceFields: an uploaded or linked image/video and its filters.
export default function SourceFields({layer, set, t, channelId, config}) {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');
    const [url, setUrl] = useState(layer.src.startsWith('https://') ? layer.src : '');
    const accept = layer.type === 'video' ? 'video/mp4,video/webm' : 'image/png,image/jpeg,image/gif,image/webp';

    const onFile = async (e) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) {
            return;
        }
        setBusy(true);
        setError('');
        try {
            const {src} = await uploadBackground(channelId, file, config.max_upload_bytes);
            set({src});
        } catch (err) {
            setError(err.tooBig ? t('tooBig', Math.round(config.max_upload_bytes / 1048576)) : t('failed', err.message));
        } finally {
            setBusy(false);
        }
    };
    const onUrl = (value) => {
        setUrl(value);
        if (!value) {
            return;
        }
        if (isSafeSource(value)) {
            setError('');
            set({src: value});
        } else {
            setError(t('badUrl'));
        }
    };

    return (
        <>
            <Field label={layer.type === 'video' ? t('type_video') : t('type_image')}>
                <span className='ct-row'>
                    <label className='ct-btn ct-small'>
                        {busy ? t('uploading') : t('upload')}
                        <input
                            type='file'
                            accept={accept}
                            style={{display: 'none'}}
                            disabled={busy}
                            onChange={onFile}
                        />
                    </label>
                    {layer.src.startsWith('media:') && <span className='ct-hint'>{'✓'}</span>}
                </span>
            </Field>
            {config.allow_external_urls && (
                <Field label={t('url')}>
                    <input
                        type='text'
                        value={url}
                        placeholder={t('urlPlaceholder')}
                        onChange={(e) => onUrl(e.target.value.trim())}
                    />
                </Field>
            )}
            {error && <div className='ct-error'>{error}</div>}
            <Select
                label={t('fit')}
                value={layer.fit}
                options={options(layer.type === 'video' ? ['cover', 'contain'] : FITS, t, 'fit_')}
                onChange={(fit) => set({fit})}
            />
            {layer.fit === 'tile' && (
                <Slider
                    label={t('tileSize')}
                    value={layer.size}
                    min={16}
                    max={400}
                    onChange={(size) => set({size})}
                />
            )}
            <FilterFields
                layer={layer}
                set={set}
                t={t}
            />
        </>
    );
}

function FilterFields({layer, set, t}) {
    return (
        <>
            <Slider
                label={t('blur')}
                value={layer.blur}
                min={0}
                max={40}
                onChange={(blur) => set({blur})}
                format={(v) => `${v}px`}
            />
            <Slider
                label={t('brightness')}
                value={layer.brightness}
                min={0}
                max={2}
                step={0.05}
                onChange={(brightness) => set({brightness})}
                format={percent}
            />
            <Slider
                label={t('saturate')}
                value={layer.saturate}
                min={0}
                max={3}
                step={0.05}
                onChange={(saturate) => set({saturate})}
                format={percent}
            />
            <Slider
                label={t('hue')}
                value={layer.hue}
                min={-180}
                max={180}
                onChange={(hue) => set({hue})}
                format={(v) => `${v}°`}
            />
        </>
    );
}
