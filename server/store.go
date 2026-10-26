package main

import (
	"cmp"
	_ "embed"
	"encoding/json"
	"errors"
	"fmt"
	"slices"
	"strings"

	"github.com/mattermost/mattermost/server/public/model"
)

// KV layout: "t_<id>" gallery themes, "c_<channel id>" the theme of a
// conversation (a copy, so editing or deleting the gallery theme does not change
// it) and "m_<file id>" the files uploaded as backgrounds.
const (
	themePrefix   = "t_"
	channelPrefix = "c_"
	mediaPrefix   = "m_"
	kvPageSize    = 200
	builtinPrefix = "builtin-"
)

//go:embed presets.json
var presetsJSON []byte

var errNotFound = errors.New("not found")

type ChannelTheme struct {
	Theme Theme  `json:"theme"`
	SetBy string `json:"set_by"`
	SetAt int64  `json:"set_at"`
}

type Media struct {
	FileID    string `json:"file_id"`
	MimeType  string `json:"mime_type"`
	Size      int64  `json:"size"`
	OwnerID   string `json:"owner_id"`
	CreatedAt int64  `json:"created_at"`
}

func loadPresets() ([]Theme, error) {
	var presets []Theme
	if err := json.Unmarshal(presetsJSON, &presets); err != nil {
		return nil, fmt.Errorf("decode presets: %w", err)
	}
	check := validator{}
	for i := range presets {
		if err := check.theme(&presets[i]); err != nil {
			return nil, fmt.Errorf("preset %s: %w", presets[i].ID, err)
		}
		presets[i].Builtin = true
	}
	return presets, nil
}

func (p *Plugin) kvGetJSON(key string, v any) error {
	raw, appErr := p.API.KVGet(key)
	if appErr != nil {
		return appErr
	}
	if raw == nil {
		return errNotFound
	}
	return json.Unmarshal(raw, v)
}

func (p *Plugin) kvSetJSON(key string, v any) error {
	raw, err := json.Marshal(v)
	if err != nil {
		return err
	}
	if appErr := p.API.KVSet(key, raw); appErr != nil {
		return appErr
	}
	return nil
}

func (p *Plugin) kvDelete(key string) error {
	if appErr := p.API.KVDelete(key); appErr != nil {
		return appErr
	}
	return nil
}

func (p *Plugin) channelTheme(channelID string) (*ChannelTheme, error) {
	var ct ChannelTheme
	if err := p.kvGetJSON(channelPrefix+channelID, &ct); err != nil {
		return nil, err
	}
	return &ct, nil
}

func (p *Plugin) theme(id string) (*Theme, error) {
	if strings.HasPrefix(id, builtinPrefix) {
		i := slices.IndexFunc(p.presets, func(t Theme) bool { return t.ID == id })
		if i < 0 {
			return nil, errNotFound
		}
		t := p.presets[i]
		return &t, nil
	}
	var t Theme
	if err := p.kvGetJSON(themePrefix+id, &t); err != nil {
		return nil, err
	}
	return &t, nil
}

// gallery is the built-in themes followed by the ones users made, newest first.
func (p *Plugin) gallery() ([]Theme, error) {
	var custom []Theme
	for page := 0; ; page++ {
		keys, appErr := p.API.KVList(page, kvPageSize)
		if appErr != nil {
			return nil, appErr
		}
		for _, key := range keys {
			if !strings.HasPrefix(key, themePrefix) {
				continue
			}
			var t Theme
			if err := p.kvGetJSON(key, &t); err != nil {
				p.API.LogWarn("Skipping unreadable theme", "key", key, "err", err.Error())
				continue
			}
			custom = append(custom, t)
		}
		if len(keys) < kvPageSize {
			break
		}
	}
	slices.SortFunc(custom, func(a, b Theme) int { return cmp.Compare(b.UpdatedAt, a.UpdatedAt) })
	return append(slices.Clone(p.presets), custom...), nil
}

func (p *Plugin) findThemeByName(name string) (*Theme, error) {
	themes, err := p.gallery()
	if err != nil {
		return nil, err
	}
	for _, t := range themes {
		if strings.EqualFold(t.Name, name) {
			return &t, nil
		}
	}
	return nil, errNotFound
}

func (p *Plugin) saveTheme(t *Theme) error {
	return p.kvSetJSON(themePrefix+t.ID, t)
}

func (p *Plugin) deleteTheme(id string) error {
	return p.kvDelete(themePrefix + id)
}

func (p *Plugin) media(fileID string) (*Media, error) {
	var m Media
	if err := p.kvGetJSON(mediaPrefix+fileID, &m); err != nil {
		return nil, err
	}
	return &m, nil
}

func (p *Plugin) saveMedia(m *Media) error {
	return p.kvSetJSON(mediaPrefix+m.FileID, m)
}

// canEdit: gallery themes belong to their author; system admins can edit any.
func (p *Plugin) canEdit(userID string, t *Theme) bool {
	if t.Builtin {
		return false
	}
	return t.AuthorID == userID || p.API.HasPermissionTo(userID, model.PermissionManageSystem)
}

func newThemeID() string {
	return model.NewId()
}
