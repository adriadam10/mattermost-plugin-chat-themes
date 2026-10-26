package main

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/mattermost/mattermost/server/public/model"
)

// Backgrounds people upload. They go to Mattermost's file store attached to the
// conversation where the editor was opened, but are served by the plugin to any
// logged-in user, since a gallery theme can be used in any conversation.

var mediaTypes = map[string]string{
	"image/png":  ".png",
	"image/jpeg": ".jpg",
	"image/gif":  ".gif",
	"image/webp": ".webp",
	"video/mp4":  ".mp4",
	"video/webm": ".webm",
}

// sniffType trusts the content, not the name or header the browser sent.
func sniffType(data []byte) (string, bool) {
	mime := http.DetectContentType(data)
	_, ok := mediaTypes[mime]
	return mime, ok
}

func (p *Plugin) handleUploadMedia(w http.ResponseWriter, r *http.Request) {
	uid := userID(r)
	channelID := r.URL.Query().Get("channel_id")
	if _, err := p.themedChannel(channelID, uid); err != nil {
		p.writeError(w, err)
		return
	}
	limit := p.settings.maxUploadBytes.Load()
	data, err := io.ReadAll(io.LimitReader(r.Body, limit+1))
	if err != nil {
		http.Error(w, "upload failed", http.StatusBadRequest)
		return
	}
	if int64(len(data)) > limit {
		http.Error(w, fmt.Sprintf("the file is larger than %d MB", limit>>20), http.StatusRequestEntityTooLarge)
		return
	}
	mime, ok := sniffType(data)
	if !ok {
		http.Error(w, "only PNG, JPEG, GIF, WebP, MP4 and WebM files", http.StatusUnsupportedMediaType)
		return
	}
	info, appErr := p.API.UploadFile(data, channelID, "chat-theme"+mediaTypes[mime])
	if appErr != nil {
		p.writeError(w, appErr)
		return
	}
	m := &Media{FileID: info.Id, MimeType: mime, Size: int64(len(data)), OwnerID: uid, CreatedAt: model.GetMillis()}
	if err := p.saveMedia(m); err != nil {
		p.writeError(w, err)
		return
	}
	writeJSON(w, map[string]any{"src": "media:" + m.FileID, "mime_type": mime})
}

// handleGetMedia serves only files uploaded through the plugin, never any other
// file of the store. ServeContent answers the range requests video needs.
func (p *Plugin) handleGetMedia(w http.ResponseWriter, r *http.Request) {
	m, err := p.media(r.PathValue("id"))
	if err != nil {
		p.writeError(w, err)
		return
	}
	data, appErr := p.API.GetFile(m.FileID)
	if appErr != nil {
		p.writeError(w, appErr)
		return
	}
	// A file id never changes content, so browsers can keep it.
	w.Header().Set("Cache-Control", "private, max-age=31536000, immutable")
	w.Header().Set("Content-Type", m.MimeType)
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.Header().Set("Content-Security-Policy", "default-src 'none'; sandbox")
	http.ServeContent(w, r, "", time.UnixMilli(m.CreatedAt), bytes.NewReader(data))
}
