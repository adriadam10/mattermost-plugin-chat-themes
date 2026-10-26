// Repeating patterns drawn as one SVG tile, so no file is needed and they stay
// sharp at any size. Colors come validated (#rrggbb[aa]) from the theme.

const TILES = {
    dots: (s, c) => `<circle cx="${s / 2}" cy="${s / 2}" r="${s * 0.12}" fill="${c}"/>`,
    grid: (s, c) => `<path d="M0 0.5H${s}M0.5 0V${s}" stroke="${c}" stroke-width="1"/>`,
    stripes: (s, c) => `<path d="M${-s / 4} ${s / 4}L${s / 4} ${-s / 4}M0 ${s}L${s} 0M${s * 0.75} ${s * 1.25}L${s * 1.25} ${s * 0.75}" stroke="${c}" stroke-width="${s * 0.12}"/>`,
    waves: (s, c) => `<path d="M0 ${s / 2}Q${s / 4} ${s / 4} ${s / 2} ${s / 2}T${s} ${s / 2}" fill="none" stroke="${c}" stroke-width="${Math.max(1, s * 0.05)}"/>`,
    checks: (s, c) => `<rect width="${s / 2}" height="${s / 2}" fill="${c}"/><rect x="${s / 2}" y="${s / 2}" width="${s / 2}" height="${s / 2}" fill="${c}"/>`,
    zigzag: (s, c) => `<path d="M0 ${s * 0.6}L${s / 4} ${s * 0.4}L${s / 2} ${s * 0.6}L${s * 0.75} ${s * 0.4}L${s} ${s * 0.6}" fill="none" stroke="${c}" stroke-width="${Math.max(1, s * 0.06)}"/>`,
    hearts: (s, c) => {
        const k = s / 32;
        return `<path transform="translate(${s / 2 - 8 * k} ${s / 2 - 7 * k}) scale(${k})" d="M8 14S0 9 0 4.5A4 4 0 0 1 8 2.5 4 4 0 0 1 16 4.5C16 9 8 14 8 14Z" fill="${c}"/>`;
    },
    stars: (s, c) => {
        const r = s * 0.18;
        const points = Array.from({length: 10}, (_, i) => {
            const radius = i % 2 ? r * 0.45 : r;
            const angle = (Math.PI / 5) * i - Math.PI / 2;
            return `${(s / 2 + radius * Math.cos(angle)).toFixed(2)},${(s / 2 + radius * Math.sin(angle)).toFixed(2)}`;
        });
        return `<polygon points="${points.join(' ')}" fill="${c}"/>`;
    },
    plus: (s, c) => `<path d="M${s / 2} ${s * 0.35}V${s * 0.65}M${s * 0.35} ${s / 2}H${s * 0.65}" stroke="${c}" stroke-width="${Math.max(1, s * 0.06)}" stroke-linecap="round"/>`,
};

export function patternUrl(pattern, color, size) {
    const draw = TILES[pattern] || TILES.dots;
    const s = Math.max(8, Math.round(size || 32));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">${draw(s, color)}</svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
