import React from 'react';

import ThemeBox from './theme_box.jsx';

function SamplePost({name, text, color}) {
    return (
        <div className='ct-preview-post'>
            <span
                className='ct-preview-avatar'
                style={{background: color}}
            />
            <div>
                <b>{name}</b>
                {text}
            </div>
        </div>
    );
}

// Preview: the theme as the conversation will look, with two sample messages.
export default function Preview({theme, variant, t}) {
    return (
        <ThemeBox
            theme={theme}
            variant={variant}
            className='ct-preview'
        >
            <div className='ct-preview-posts'>
                <SamplePost
                    name={t('previewOther')}
                    text={t('previewMsg1')}
                    color='#f5a623'
                />
                <SamplePost
                    name={t('previewYou')}
                    text={t('previewMsg2')}
                    color='#1c58d9'
                />
            </div>
        </ThemeBox>
    );
}
