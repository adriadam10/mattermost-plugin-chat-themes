import React from 'react';

// A div, not a <label>: Mattermost's global "label span {pointer-events: none}"
// would make the sliders and color pickers inside ignore the mouse.
export function Field({label, children}) {
    return (
        <div
            className='ct-field'
            role='group'
            aria-label={label}
        >
            <span>{label}</span>
            {children}
        </div>
    );
}

export function Slider({label, value, min, max, step = 1, onChange, format = (v) => v}) {
    return (
        <Field label={label}>
            <span className='ct-row'>
                <input
                    type='range'
                    min={min}
                    max={max}
                    step={step}
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                    style={{flex: 1}}
                />
                <span className='ct-hint' style={{width: 40, textAlign: 'right'}}>{format(value)}</span>
            </span>
        </Field>
    );
}

export function Select({label, value, options, onChange}) {
    return (
        <Field label={label}>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
            >
                {options.map(([v, text]) => (
                    <option
                        key={v}
                        value={v}
                    >{text}</option>
                ))}
            </select>
        </Field>
    );
}

// <input type="color"> only knows #rrggbb; transparency is the layer's opacity.
export function ColorInput({value, onChange, title}) {
    return (
        <input
            type='color'
            title={title}
            value={(value || '#000000').slice(0, 7)}
            onChange={(e) => onChange(e.target.value)}
        />
    );
}

export const percent = (v) => `${Math.round(v * 100)}%`;
