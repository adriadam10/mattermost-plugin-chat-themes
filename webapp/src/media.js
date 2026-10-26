// Prepares a file picked as background: still images are shrunk to what a
// screen needs and re-encoded as WebP; GIFs, animated WebP and videos go as
// they are, since re-encoding would drop the animation.

import {uploadMedia} from './api.js';

const MAX_SIDE = 2560;
const STILL_TYPES = ['image/png', 'image/jpeg'];

export function mediaKind(file) {
    return file.type.startsWith('video/') ? 'video' : 'image';
}

async function shrink(file) {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.85));
    // Browsers without WebP encoding fall back to PNG, which can end up bigger.
    return blob && blob.type === 'image/webp' && blob.size < file.size ? blob : file;
}

export async function uploadBackground(channelId, file, maxBytes) {
    const blob = STILL_TYPES.includes(file.type) ? await shrink(file) : file;
    if (maxBytes && blob.size > maxBytes) {
        const error = new Error('too big');
        error.tooBig = true;
        throw error;
    }
    return uploadMedia(channelId, blob);
}
