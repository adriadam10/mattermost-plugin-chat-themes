import assert from 'node:assert/strict';
import {test} from 'node:test';

import {decodeShareCode, encodeShareCode, isSafeSource, newTheme, pickVariant} from './model.js';

test('share codes round-trip, accents and emoji included', () => {
    const theme = {...newTheme('Atardecer ☀️ ñ'), id: 'x', author_id: 'y'};
    const decoded = decodeShareCode(encodeShareCode(theme));
    assert.equal(decoded.name, 'Atardecer ☀️ ñ');
    assert.equal(decoded.id, undefined);
    assert.equal(decoded.author_id, undefined);
    assert.deepEqual(decoded.light, theme.light);
});

test('bad share codes are rejected', () => {
    assert.throws(() => decodeShareCode('hello'));
    assert.throws(() => decodeShareCode('ct1:' + btoa('{"name":"x"}')));
});

test('only uploaded files and clean https URLs are sources', () => {
    assert.ok(isSafeSource('media:' + 'a'.repeat(26)));
    assert.ok(isSafeSource('https://example.com/a.webp'));
    assert.ok(!isSafeSource('http://example.com/a.webp'));
    assert.ok(!isSafeSource('https://example.com/a".webp'));
    assert.ok(!isSafeSource('javascript:alert(1)'));
    assert.ok(!isSafeSource('https://example.com/a.webp', false));
});

test('dark variant only when the theme has one', () => {
    const theme = newTheme('x');
    assert.equal(pickVariant(theme, true), theme.light);
    theme.dark = {layers: []};
    assert.equal(pickVariant(theme, true), theme.dark);
    assert.equal(pickVariant(theme, false), theme.light);
});
