package main

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/mattermost/mattermost/server/public/model"
)

func (p *Plugin) newRouter() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/v1/config", p.handleConfig)
	mux.HandleFunc("GET /api/v1/channels/{channel_id}/theme", p.handleGetChannelTheme)
	mux.HandleFunc("PUT /api/v1/channels/{channel_id}/theme", p.handleSetChannelTheme)
	mux.HandleFunc("DELETE /api/v1/channels/{channel_id}/theme", p.handleClearChannelTheme)
	mux.HandleFunc("GET /api/v1/themes", p.handleListThemes)
	mux.HandleFunc("POST /api/v1/themes", p.handleCreateTheme)
	mux.HandleFunc("PUT /api/v1/themes/{id}", p.handleUpdateTheme)
	mux.HandleFunc("DELETE /api/v1/themes/{id}", p.handleDeleteTheme)
	mux.HandleFunc("POST /api/v1/media", p.handleUploadMedia)
	mux.HandleFunc("GET /api/v1/media/{id}", p.handleGetMedia)
	return requireUser(mux)
}

func requireUser(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Mattermost-User-Id") == "" {
			http.Error(w, "not authorized", http.StatusUnauthorized)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func userID(r *http.Request) string {
	return r.Header.Get("Mattermost-User-Id")
}

func writeJSON(w http.ResponseWriter, v any) {
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(v)
}

func marshalString(v any) (string, error) {
	raw, err := json.Marshal(v)
	return string(raw), err
}

// toJSONValue turns a struct into the maps and slices json.Unmarshal makes.
func toJSONValue(v any) (any, error) {
	raw, err := json.Marshal(v)
	if err != nil {
		return nil, err
	}
	var out any
	err = json.Unmarshal(raw, &out)
	return out, err
}

// writeError maps the store and permission errors to a status; anything else
// is logged and reported as a server error without details.
func (p *Plugin) writeError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, errNotFound):
		http.Error(w, "not found", http.StatusNotFound)
	case errors.Is(err, errForbidden):
		http.Error(w, "forbidden", http.StatusForbidden)
	default:
		p.API.LogError("Request failed", "err", err.Error())
		http.Error(w, "internal error", http.StatusInternalServerError)
	}
}

// decodeTheme reads and validates a theme sent by a client.
func (p *Plugin) decodeTheme(w http.ResponseWriter, r *http.Request) (*Theme, bool) {
	var t Theme
	if err := json.NewDecoder(http.MaxBytesReader(w, r.Body, maxThemeLength)).Decode(&t); err != nil {
		http.Error(w, "invalid theme", http.StatusBadRequest)
		return nil, false
	}
	if err := p.validator().theme(&t); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return nil, false
	}
	return &t, true
}

func (p *Plugin) handleConfig(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, map[string]any{
		"max_upload_bytes":    p.settings.maxUploadBytes.Load(),
		"allow_external_urls": p.settings.allowExternalURLs.Load(),
	})
}

func (p *Plugin) handleGetChannelTheme(w http.ResponseWriter, r *http.Request) {
	channelID := r.PathValue("channel_id")
	if _, err := p.themedChannel(channelID, userID(r)); err != nil {
		p.writeError(w, err)
		return
	}
	ct, err := p.channelTheme(channelID)
	if errors.Is(err, errNotFound) {
		writeJSON(w, map[string]any{"channel_theme": nil})
		return
	}
	if err != nil {
		p.writeError(w, err)
		return
	}
	writeJSON(w, map[string]any{"channel_theme": ct})
}

func (p *Plugin) handleSetChannelTheme(w http.ResponseWriter, r *http.Request) {
	t, ok := p.decodeTheme(w, r)
	if !ok {
		return
	}
	if err := p.setChannelTheme(r.PathValue("channel_id"), userID(r), t); err != nil {
		p.writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (p *Plugin) handleClearChannelTheme(w http.ResponseWriter, r *http.Request) {
	if err := p.setChannelTheme(r.PathValue("channel_id"), userID(r), nil); err != nil {
		p.writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// themeView adds what the requester may do with each gallery theme.
type themeView struct {
	Theme
	CanEdit bool `json:"can_edit"`
}

func (p *Plugin) handleListThemes(w http.ResponseWriter, r *http.Request) {
	themes, err := p.gallery()
	if err != nil {
		p.writeError(w, err)
		return
	}
	views := make([]themeView, 0, len(themes))
	for _, t := range themes {
		views = append(views, themeView{Theme: t, CanEdit: p.canEdit(userID(r), &t)})
	}
	writeJSON(w, map[string]any{"themes": views})
}

func (p *Plugin) handleCreateTheme(w http.ResponseWriter, r *http.Request) {
	t, ok := p.decodeTheme(w, r)
	if !ok {
		return
	}
	now := model.GetMillis()
	t.ID, t.Builtin, t.AuthorID, t.CreatedAt, t.UpdatedAt = newThemeID(), false, userID(r), now, now
	if err := p.saveTheme(t); err != nil {
		p.writeError(w, err)
		return
	}
	writeJSON(w, themeView{Theme: *t, CanEdit: true})
}

func (p *Plugin) handleUpdateTheme(w http.ResponseWriter, r *http.Request) {
	old, err := p.theme(r.PathValue("id"))
	if err != nil {
		p.writeError(w, err)
		return
	}
	if !p.canEdit(userID(r), old) {
		p.writeError(w, errForbidden)
		return
	}
	t, ok := p.decodeTheme(w, r)
	if !ok {
		return
	}
	t.ID, t.Builtin, t.AuthorID, t.CreatedAt, t.UpdatedAt = old.ID, false, old.AuthorID, old.CreatedAt, model.GetMillis()
	if err := p.saveTheme(t); err != nil {
		p.writeError(w, err)
		return
	}
	writeJSON(w, themeView{Theme: *t, CanEdit: true})
}

// handleDeleteTheme only removes it from the gallery: conversations using it
// keep their own copy.
func (p *Plugin) handleDeleteTheme(w http.ResponseWriter, r *http.Request) {
	t, err := p.theme(r.PathValue("id"))
	if err != nil {
		p.writeError(w, err)
		return
	}
	if !p.canEdit(userID(r), t) {
		p.writeError(w, errForbidden)
		return
	}
	if err := p.deleteTheme(t.ID); err != nil {
		p.writeError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
