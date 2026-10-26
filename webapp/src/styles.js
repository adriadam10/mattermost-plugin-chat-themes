// Global CSS of the plugin: the theme layers and animations, the conversation
// background and the editor. Colors of the UI come from Mattermost's variables.

const LAYERS = `
.ct-root, .ct-layer, .ct-scrim { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
.ct-fill { position: absolute; inset: 0; width: 100%; height: 100%; }
.ct-scrim { background: rgb(var(--center-channel-bg-rgb)); transition: opacity .4s; }
.ct-paused .ct-fill { animation-play-state: paused !important; }

.ct-anim-shift { background-size: 400% 400% !important; animation: ct-shift var(--ct-dur) ease-in-out infinite alternate; }
.ct-anim-rotate { inset: -60%; width: 220%; height: 220%; animation: ct-rotate var(--ct-dur) linear infinite; }
.ct-anim-hue { animation: ct-hue var(--ct-dur) linear infinite; }
.ct-anim-pulse { animation: ct-pulse var(--ct-dur) ease-in-out infinite alternate; }
.ct-anim-kenburns { animation: ct-kenburns var(--ct-dur) ease-in-out infinite alternate; }
.ct-anim-pan { inset: 0 -15%; width: 130%; animation: ct-pan var(--ct-dur) ease-in-out infinite alternate; }
.ct-anim-drift { animation: ct-drift var(--ct-dur) linear infinite; }
@keyframes ct-shift { from { background-position: 0% 50%; } to { background-position: 100% 50%; } }
@keyframes ct-rotate { to { transform: rotate(360deg); } }
@keyframes ct-hue { to { filter: hue-rotate(360deg); } }
@keyframes ct-pulse { from { opacity: .65; transform: scale(1); } to { opacity: 1; transform: scale(1.04); } }
@keyframes ct-kenburns { from { transform: scale(1) translate(0, 0); } to { transform: scale(1.2) translate(-3%, -2%); } }
@keyframes ct-pan { from { transform: translateX(-10%); } to { transform: translateX(10%); } }
@keyframes ct-drift { to { background-position: var(--ct-tile) var(--ct-tile); } }
@media (prefers-reduced-motion: reduce) {
    .ct-fill { animation: none !important; }
}
`;

// The background sits under the post list; the header and the message box keep
// Mattermost's own colors so they stay usable.
const CONVERSATION = `
#app-content.ct-themed { position: relative; isolation: isolate; }
#app-content > .ct-background { position: absolute; inset: 0; z-index: -1; overflow: hidden; pointer-events: none; }
#app-content.ct-themed .post-list-holder-by-time,
#app-content.ct-themed .post-list__table,
#app-content.ct-themed .post-list__content,
#app-content.ct-themed #post-list,
#app-content.ct-themed .post-list__dynamic,
#app-content.ct-themed .post,
#app-content.ct-themed .post-list__arrows { background: transparent !important; }
#app-content.ct-themed .post:hover,
#app-content.ct-themed .post.a11y--active { background: rgba(var(--center-channel-color-rgb), .06) !important; }
#app-content.ct-themed .separator__text,
#app-content.ct-themed .Separator .separator__text { background: rgba(var(--center-channel-bg-rgb), .85) !important; border-radius: 12px; padding: 2px 10px; }
#app-content.ct-themed .post .post__content { border-radius: 8px; background: rgba(var(--center-channel-bg-rgb), var(--ct-card-alpha, 0)); }
#app-content.ct-themed .post-create__container { background: rgba(var(--center-channel-bg-rgb), .92); }
`;

const UI = `
.ct-backdrop { position: fixed; inset: 0; z-index: 1050; background: rgba(0, 0, 0, .5); display: flex; align-items: center; justify-content: center; padding: 16px; }
.ct-modal label span, .ct-notice label span { pointer-events: auto; }
.ct-modal { background: var(--center-channel-bg); color: var(--center-channel-color); border-radius: 12px; width: min(980px, 100%); max-height: min(92vh, 860px); display: flex; flex-direction: column; box-shadow: 0 20px 32px rgba(0,0,0,.25); overflow: hidden; }
.ct-modal header { display: flex; align-items: center; gap: 12px; padding: 14px 20px; border-bottom: 1px solid rgba(var(--center-channel-color-rgb), .12); }
.ct-modal header h2 { font-size: 20px; font-weight: 600; margin: 0; flex: 1; }
.ct-tabs { display: flex; gap: 4px; }
.ct-tab { border: 0; background: none; color: rgba(var(--center-channel-color-rgb), .72); padding: 6px 12px; border-radius: 4px; font-weight: 600; cursor: pointer; }
.ct-tab[aria-selected="true"] { background: rgba(var(--button-bg-rgb), .08); color: var(--button-bg); }
.ct-body { display: grid; grid-template-columns: 300px 1fr; min-height: 0; flex: 1; }
.ct-side { padding: 16px; border-right: 1px solid rgba(var(--center-channel-color-rgb), .12); display: flex; flex-direction: column; gap: 12px; }
.ct-main { overflow: auto; padding: 16px 20px; }
.ct-modal footer { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; padding: 12px 20px; border-top: 1px solid rgba(var(--center-channel-color-rgb), .12); }
.ct-btn { border: 0; border-radius: 4px; padding: 8px 14px; font-weight: 600; cursor: pointer; background: rgba(var(--button-bg-rgb), .08); color: var(--button-bg); }
.ct-btn:disabled { opacity: .5; cursor: default; }
.ct-btn.ct-primary { background: var(--button-bg); color: var(--button-color); }
.ct-btn.ct-danger { background: rgba(var(--error-text-color-rgb), .08); color: var(--error-text); }
.ct-btn.ct-small { padding: 4px 8px; font-size: 12px; }
.ct-icon-btn { border: 0; background: none; color: rgba(var(--center-channel-color-rgb), .64); cursor: pointer; padding: 4px 6px; border-radius: 4px; font-size: 16px; line-height: 1; }
.ct-icon-btn:hover { background: rgba(var(--center-channel-color-rgb), .08); }
.ct-preview { position: relative; height: 340px; border-radius: 10px; overflow: hidden; border: 1px solid rgba(var(--center-channel-color-rgb), .12); background: var(--center-channel-bg); isolation: isolate; }
.ct-preview-posts { position: absolute; inset: 0; z-index: 1; padding: 14px; display: flex; flex-direction: column; justify-content: flex-end; gap: 10px; font-size: 13px; }
.ct-preview-post { display: flex; gap: 8px; align-items: flex-start; }
.ct-preview-post > div { border-radius: 8px; padding: 2px 6px; background: rgba(var(--center-channel-bg-rgb), var(--ct-card-alpha, 0)); }
.ct-preview-avatar { width: 28px; height: 28px; border-radius: 50%; flex: none; }
.ct-preview-post b { display: block; }
.ct-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
.ct-card { border: 2px solid transparent; border-radius: 10px; padding: 0; background: none; cursor: pointer; text-align: left; color: inherit; }
.ct-card[aria-pressed="true"] { border-color: var(--button-bg); }
.ct-thumb { position: relative; height: 96px; border-radius: 8px; overflow: hidden; background: var(--center-channel-bg); isolation: isolate; }
.ct-card-name { display: block; padding: 6px 4px 2px; font-weight: 600; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ct-card-meta { display: block; padding: 0 4px 4px; font-size: 11px; opacity: .64; }
.ct-section-title { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: .02em; opacity: .64; margin: 16px 0 8px; }
.ct-field { display: grid; grid-template-columns: 110px 1fr; align-items: center; gap: 8px; margin: 6px 0; font-size: 13px; }
.ct-field input[type="range"] { width: 100%; }
.ct-field input[type="text"], .ct-field select, .ct-input { width: 100%; font-size: 13px; height: 30px; border: 1px solid rgba(var(--center-channel-color-rgb), .16); border-radius: 4px; padding: 5px 8px; background: var(--center-channel-bg); color: var(--center-channel-color); }
.ct-colors { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.ct-colors input[type="color"] { width: 32px; height: 28px; border: 1px solid rgba(var(--center-channel-color-rgb), .16); border-radius: 4px; padding: 1px; background: none; }
.ct-layer-card { border: 1px solid rgba(var(--center-channel-color-rgb), .12); border-radius: 8px; margin-bottom: 8px; }
.ct-layer-head { display: flex; align-items: center; gap: 6px; padding: 6px 8px; cursor: pointer; }
.ct-layer-head span { flex: 1; font-weight: 600; font-size: 13px; }
.ct-layer-body { padding: 4px 12px 10px; border-top: 1px solid rgba(var(--center-channel-color-rgb), .08); }
.ct-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.ct-error { color: var(--error-text); font-size: 13px; }
.ct-hint { font-size: 12px; opacity: .64; }
.ct-notice { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 6px 10px; border-radius: 10px; background: rgba(var(--center-channel-color-rgb), .04); border: 1px solid rgba(var(--center-channel-color-rgb), .08); }
.ct-notice-swatch { position: relative; width: 44px; height: 44px; border-radius: 8px; overflow: hidden; flex: none; isolation: isolate; }
.ct-notice-text { flex: 1; min-width: 160px; font-size: 13px; opacity: .8; }
@media (max-width: 720px) {
    .ct-body { grid-template-columns: 1fr; overflow: auto; }
    .ct-side { border-right: 0; border-bottom: 1px solid rgba(var(--center-channel-color-rgb), .12); }
    .ct-preview { height: 220px; }
    .ct-field { grid-template-columns: 90px 1fr; }
}
`;

export const STYLES = LAYERS + CONVERSATION + UI;
