import assert from 'node:assert/strict';
import {test} from 'node:test';

import {hexLuminance, scrimAlpha} from './readability.js';

const auto = (strength) => ({mode: 'auto', strength});

test('hex luminance and alpha', () => {
    assert.ok(Math.abs(hexLuminance('#ffffff').lum - 1) < 1e-9);
    assert.equal(hexLuminance('#000000').lum, 0);
    assert.ok(Math.abs(hexLuminance('#00000080').alpha - 0.5) < 0.01);
});

test('auto readability covers only what the contrast needs', () => {
    // Dark text on a white chat: a black background needs a strong veil, a white one none.
    assert.equal(scrimAlpha(auto(0.5), 1, 1, 0.05), 0);
    assert.ok(scrimAlpha(auto(0.5), 0, 1, 0.05) >= 0.45);
    // More strength never means less veil.
    assert.ok(scrimAlpha(auto(1), 0.3, 1, 0.05) >= scrimAlpha(auto(0), 0.3, 1, 0.05));
});

test('fixed modes', () => {
    assert.equal(scrimAlpha({mode: 'none', strength: 1}), 0);
    assert.ok(Math.abs(scrimAlpha({mode: 'scrim', strength: 1}) - 0.9) < 1e-9);
});
