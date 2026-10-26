import React, {useEffect, useRef} from 'react';

import manifest from '../../../plugin.json';
import Stage, {mattermostColors} from '../theme/stage.js';

// Mattermost's default light (Denim) and dark (Onyx) center colors, used when
// a preview shows the variant the viewer is not using.
const FORCED = {
    light: {bg: '255,255,255', text: '63,67,80'},
    dark: {bg: '25,27,31', text: '227,228,232'},
};

function forcedColors(variant) {
    if (!variant || (variant === 'dark') === mattermostColors().dark) {
        return undefined;
    }
    const {bg, text} = FORCED[variant];
    return {
        '--center-channel-bg-rgb': bg,
        '--center-channel-color-rgb': text,
        '--center-channel-bg': `rgb(${bg})`,
        '--center-channel-color': `rgb(${text})`,
        color: `rgb(${text})`,
        background: `rgb(${bg})`,
    };
}

// ThemeBox draws a theme inside a box; children (sample messages) go on top.
// variant: 'light' or 'dark' to force one, otherwise the viewer's.
export default function ThemeBox({theme, still = false, variant, className, children}) {
    const ref = useRef(null);
    const stage = useRef(null);

    useEffect(() => {
        stage.current = new Stage(ref.current, {pluginId: manifest.id, still});
        return () => stage.current.destroy();
    }, [still]);

    useEffect(() => {
        stage.current.show(theme ? JSON.parse(JSON.stringify(theme)) : null);
    }, [theme, variant]);

    return (
        <div
            ref={ref}
            className={className}
            style={forcedColors(variant)}
        >
            {children}
        </div>
    );
}
