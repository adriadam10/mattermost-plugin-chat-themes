// Animated particles (snow, hearts, confetti...) on a canvas. One engine per
// layer; it only draws while running, so a paused background costs nothing.

const CONFETTI = ['#ff5e5b', '#ffd166', '#06d6a0', '#118ab2', '#ef476f', '#8338ec'];
// Particles per million square pixels at density 100; capped so a huge screen
// does not melt.
const PER_MEGAPIXEL = 100;
const MAX_PARTICLES = 400;

const rand = (min, max) => min + Math.random() * (max - min);

// Each kind: how a particle starts and how it moves and looks.
const KINDS = {
    snow: {
        spawn: (w, h, s) => ({x: rand(0, w), y: rand(-h, h), r: rand(0.3, 1) * s / 2, vy: rand(20, 50), phase: rand(0, 6.3)}),
        step: (p, dt, t) => {
            p.y += p.vy * dt;
            p.x += Math.sin(t + p.phase) * 15 * dt;
        },
        falls: true,
        draw: (ctx, p) => circle(ctx, p.x, p.y, p.r),
    },
    hearts: {
        spawn: (w, h, s) => ({x: rand(0, w), y: rand(0, h * 2), r: rand(0.5, 1) * s, vy: -rand(20, 45), phase: rand(0, 6.3)}),
        step: (p, dt, t) => {
            p.y += p.vy * dt;
            p.x += Math.sin(t * 1.5 + p.phase) * 20 * dt;
        },
        rises: true,
        draw: (ctx, p) => heart(ctx, p.x, p.y, p.r),
    },
    confetti: {
        spawn: (w, h, s) => ({x: rand(0, w), y: rand(-h, h), r: rand(0.6, 1) * s, vy: rand(40, 90), spin: rand(-4, 4), a: rand(0, 6.3), c: CONFETTI[Math.floor(rand(0, CONFETTI.length))]}),
        step: (p, dt, t) => {
            p.y += p.vy * dt;
            p.a += p.spin * dt;
            p.x += Math.sin(t * 2 + p.a) * 25 * dt;
        },
        falls: true,
        draw: (ctx, p) => {
            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(p.a);
            ctx.scale(1, Math.cos(p.a * 1.7));
            ctx.fillStyle = p.c;
            ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2);
            ctx.restore();
        },
    },
    stars: {
        spawn: (w, h, s) => ({x: rand(0, w), y: rand(0, h), r: rand(0.3, 1) * s / 2, phase: rand(0, 6.3), rate: rand(0.5, 2)}),
        step: (p, dt, t) => {
            p.alpha = 0.35 + 0.65 * Math.abs(Math.sin(t * p.rate + p.phase));
        },
        draw: (ctx, p) => circle(ctx, p.x, p.y, p.r),
    },
    bubbles: {
        spawn: (w, h, s) => ({x: rand(0, w), y: rand(0, h * 2), r: rand(0.3, 1) * s, vy: -rand(15, 40), phase: rand(0, 6.3)}),
        step: (p, dt, t) => {
            p.y += p.vy * dt;
            p.x += Math.sin(t + p.phase) * 10 * dt;
        },
        rises: true,
        draw: (ctx, p) => {
            ctx.globalAlpha *= 0.25;
            circle(ctx, p.x, p.y, p.r);
            ctx.globalAlpha *= 3;
            ctx.lineWidth = Math.max(1, p.r / 8);
            ctx.stroke();
        },
    },
    fireflies: {
        spawn: (w, h, s) => ({x: rand(0, w), y: rand(0, h), r: rand(0.5, 1) * s / 2, vx: rand(-15, 15), vy: rand(-15, 15), phase: rand(0, 6.3)}),
        step: (p, dt, t, w, h) => {
            p.vx += rand(-20, 20) * dt;
            p.vy += rand(-20, 20) * dt;
            p.x = (p.x + p.vx * dt + w) % w;
            p.y = (p.y + p.vy * dt + h) % h;
            p.alpha = 0.3 + 0.7 * Math.abs(Math.sin(t * 0.8 + p.phase));
        },
        glow: true,
        draw: (ctx, p) => circle(ctx, p.x, p.y, p.r),
    },
};
KINDS.emoji = {
    ...KINDS.snow,
    spawn: (w, h, s) => ({...KINDS.snow.spawn(w, h, s), r: rand(0.6, 1) * s * 2}),
    draw: (ctx, p, layer) => {
        ctx.font = `${p.r}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
        ctx.fillText(layer.emoji || '✨', p.x, p.y);
    },
};

function circle(ctx, x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
}

function heart(ctx, x, y, r) {
    ctx.beginPath();
    ctx.moveTo(x, y + r * 0.35);
    ctx.bezierCurveTo(x - r * 1.1, y - r * 0.35, x - r * 0.45, y - r * 1.05, x, y - r * 0.45);
    ctx.bezierCurveTo(x + r * 0.45, y - r * 1.05, x + r * 1.1, y - r * 0.35, x, y + r * 0.35);
    ctx.fill();
}

export default class Particles {
    constructor(canvas, layer) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.layer = layer;
        this.kind = KINDS[layer.particles] || KINDS.snow;
        this.particles = [];
        this.running = false;
        this.time = 0;
        this.resize = this.resize.bind(this);
        this.frame = this.frame.bind(this);
        this.observer = new ResizeObserver(this.resize);
        this.observer.observe(canvas);
        this.resize();
    }

    resize() {
        const {clientWidth: w, clientHeight: h} = this.canvas;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.canvas.width = Math.max(1, Math.round(w * dpr));
        this.canvas.height = Math.max(1, Math.round(h * dpr));
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.w = w;
        this.h = h;
        // Small boxes (thumbnails, previews) still get enough to recognise the effect.
        const byArea = (this.layer.density / 100) * PER_MEGAPIXEL * (w * h) / 1e6;
        const count = Math.min(MAX_PARTICLES, Math.round(Math.max(byArea, this.layer.density / 4)));
        const size = this.layer.size || 8;
        this.particles = Array.from({length: count}, () => this.kind.spawn(w, h, size));
        this.draw();
    }

    start() {
        if (!this.running) {
            this.running = true;
            this.last = performance.now();
            this.raf = requestAnimationFrame(this.frame);
        }
    }

    stop() {
        this.running = false;
        cancelAnimationFrame(this.raf);
    }

    destroy() {
        this.stop();
        this.observer.disconnect();
    }

    frame(now) {
        if (!this.running) {
            return;
        }
        // A long pause (hidden tab) must not teleport every particle.
        const dt = Math.min(0.05, (now - this.last) / 1000) * (this.layer.speed || 1);
        this.last = now;
        this.time += dt;
        this.update(dt);
        this.draw();
        this.raf = requestAnimationFrame(this.frame);
    }

    update(dt) {
        const {w, h, kind} = this;
        const size = this.layer.size || 8;
        for (const p of this.particles) {
            kind.step(p, dt, this.time, w, h);
            const margin = (p.r || 0) * 2;
            if (kind.falls && p.y > h + margin) {
                Object.assign(p, kind.spawn(w, h, size), {y: -margin});
            } else if (kind.rises && p.y < -margin) {
                Object.assign(p, kind.spawn(w, h, size), {y: h + margin});
            }
        }
    }

    draw() {
        const {ctx, kind, layer} = this;
        ctx.clearRect(0, 0, this.w, this.h);
        ctx.fillStyle = layer.color || '#ffffff';
        ctx.strokeStyle = layer.color || '#ffffff';
        ctx.shadowBlur = kind.glow ? (layer.size || 8) * 1.5 : 0;
        ctx.shadowColor = layer.color || '#ffffff';
        ctx.textAlign = 'center';
        for (const p of this.particles) {
            ctx.globalAlpha = p.alpha ?? 1;
            kind.draw(ctx, p, layer);
        }
        ctx.globalAlpha = 1;
    }
}
