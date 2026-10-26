import React from 'react';

import {ANIMATIONS, BLEND_MODES, GRADIENT_KINDS, PARTICLES, PATTERNS} from '../theme/model.js';

import {ColorInput, Field, Select, Slider, percent} from './controls.jsx';
import SourceFields from './source_fields.jsx';

const options = (values, t, prefix) => values.map((v) => [v, prefix ? t(prefix + v) : v]);

function GradientFields({layer, set, t}) {
    const setColor = (i, c) => set({colors: layer.colors.map((old, j) => (i === j ? c : old))});
    return (
        <>
            <Select
                label={t('kind')}
                value={layer.gradient}
                options={options(GRADIENT_KINDS, t, 'gradient_')}
                onChange={(gradient) => set({gradient})}
            />
            {layer.gradient !== 'radial' && (
                <Slider
                    label={t('angle')}
                    value={layer.angle}
                    min={0}
                    max={360}
                    onChange={(angle) => set({angle})}
                    format={(v) => `${v}°`}
                />
            )}
            <Field label={t('colors')}>
                <span className='ct-colors'>
                    {layer.colors.map((c, i) => (
                        <ColorInput
                            key={i}
                            value={c}
                            onChange={(value) => setColor(i, value)}
                        />
                    ))}
                    {layer.colors.length < 8 && (
                        <button
                            type='button'
                            className='ct-icon-btn'
                            onClick={() => set({colors: [...layer.colors, layer.colors[layer.colors.length - 1]]})}
                        >{'+'}</button>
                    )}
                    {layer.colors.length > 2 && (
                        <button
                            type='button'
                            className='ct-icon-btn'
                            onClick={() => set({colors: layer.colors.slice(0, -1)})}
                        >{'−'}</button>
                    )}
                </span>
            </Field>
        </>
    );
}

function PatternFields({layer, set, t}) {
    return (
        <>
            <Select
                label={t('pattern')}
                value={layer.pattern}
                options={options(PATTERNS, t, 'pattern_')}
                onChange={(pattern) => set({pattern})}
            />
            <Field label={t('color')}>
                <ColorInput
                    value={layer.color}
                    onChange={(color) => set({color})}
                />
            </Field>
            <Slider
                label={t('size')}
                value={layer.size}
                min={8}
                max={200}
                onChange={(size) => set({size})}
            />
        </>
    );
}

function ParticleFields({layer, set, t}) {
    return (
        <>
            <Select
                label={t('kind')}
                value={layer.particles}
                options={options(PARTICLES, t, 'particles_')}
                onChange={(particles) => set({particles})}
            />
            {layer.particles === 'emoji' && (
                <Field label={t('emoji')}>
                    <input
                        type='text'
                        value={layer.emoji || ''}
                        maxLength={8}
                        onChange={(e) => set({emoji: e.target.value})}
                    />
                </Field>
            )}
            {!['confetti', 'emoji'].includes(layer.particles) && (
                <Field label={t('color')}>
                    <ColorInput
                        value={layer.color}
                        onChange={(color) => set({color})}
                    />
                </Field>
            )}
            <Slider
                label={t('density')}
                value={layer.density}
                min={1}
                max={200}
                onChange={(density) => set({density})}
            />
            <Slider
                label={t('size')}
                value={layer.size}
                min={2}
                max={60}
                onChange={(size) => set({size})}
            />
        </>
    );
}

// LayerFields: the controls of one layer; set(patch) merges into it.
export default function LayerFields({layer, set, t, channelId, config}) {
    const animations = ANIMATIONS[layer.type];
    const moving = layer.type === 'particles' || (layer.animation && layer.animation !== 'none');
    return (
        <>
            {layer.type === 'color' && (
                <Field label={t('color')}>
                    <ColorInput
                        value={layer.color}
                        onChange={(color) => set({color})}
                    />
                </Field>
            )}
            {layer.type === 'gradient' && <GradientFields {...{layer, set, t}}/>}
            {(layer.type === 'image' || layer.type === 'video') && <SourceFields {...{layer, set, t, channelId, config}}/>}
            {layer.type === 'pattern' && <PatternFields {...{layer, set, t}}/>}
            {layer.type === 'particles' && <ParticleFields {...{layer, set, t}}/>}
            <Slider
                label={t('opacity')}
                value={layer.opacity}
                min={0}
                max={1}
                step={0.05}
                onChange={(opacity) => set({opacity})}
                format={percent}
            />
            <Select
                label={t('blend')}
                value={layer.blend || 'normal'}
                options={options(BLEND_MODES)}
                onChange={(blend) => set({blend})}
            />
            {animations.length > 1 && (
                <Select
                    label={t('animation')}
                    value={layer.animation || 'none'}
                    options={options(animations, t, 'anim_')}
                    onChange={(animation) => set({animation})}
                />
            )}
            {moving && (
                <Slider
                    label={t('speed')}
                    value={layer.speed}
                    min={0.1}
                    max={3}
                    step={0.1}
                    onChange={(speed) => set({speed})}
                    format={(v) => `${v}×`}
                />
            )}
        </>
    );
}
