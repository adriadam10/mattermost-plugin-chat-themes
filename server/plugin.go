package main

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin"
)

const (
	// The plugin id; the webapp gets websocket events as custom_<id>_<event>.
	manifestID = "com.github.adriadam10.chat-themes"

	themeEvent = "channel_theme"
	// Instagram-like "X changed the theme" notice, drawn by the webapp.
	themePostType = "custom_chat_theme"
)

type Plugin struct {
	plugin.MattermostPlugin
	router   http.Handler
	settings settings
	presets  []Theme
}

func (p *Plugin) OnActivate() error {
	presets, err := loadPresets()
	if err != nil {
		return err
	}
	p.presets = presets
	p.router = p.newRouter()
	return p.registerCommand()
}

func (p *Plugin) ServeHTTP(_ *plugin.Context, w http.ResponseWriter, r *http.Request) {
	p.router.ServeHTTP(w, r)
}

var errForbidden = errors.New("forbidden")

// themedChannel returns a conversation the user is in and can theme: direct and
// group messages and public or private channels, but not archived ones.
func (p *Plugin) themedChannel(channelID, userID string) (*model.Channel, error) {
	if _, appErr := p.API.GetChannelMember(channelID, userID); appErr != nil {
		return nil, errForbidden
	}
	channel, appErr := p.API.GetChannel(channelID)
	if appErr != nil {
		return nil, appErr
	}
	if channel.DeleteAt != 0 {
		return nil, errForbidden
	}
	return channel, nil
}

// setChannelTheme stores theme as the conversation's background (nil removes
// it), repaints it for everybody and leaves the notice in the conversation.
func (p *Plugin) setChannelTheme(channelID, userID string, theme *Theme) error {
	if _, err := p.themedChannel(channelID, userID); err != nil {
		return err
	}
	var payload string
	if theme == nil {
		if err := p.kvDelete(channelPrefix + channelID); err != nil {
			return err
		}
	} else {
		ct := ChannelTheme{Theme: *theme, SetBy: userID, SetAt: model.GetMillis()}
		if err := p.kvSetJSON(channelPrefix+channelID, ct); err != nil {
			return err
		}
		raw, err := marshalString(ct)
		if err != nil {
			return err
		}
		payload = raw
	}
	p.API.PublishWebSocketEvent(themeEvent, map[string]any{"channel_id": channelID, "channel_theme": payload},
		&model.WebsocketBroadcast{ChannelId: channelID})
	p.postNotice(channelID, userID, theme)
	return nil
}

// postNotice failing must not undo the change, which already happened.
func (p *Plugin) postNotice(channelID, userID string, theme *Theme) {
	t := p.userTranslator(userID)
	post := &model.Post{
		UserId:    userID,
		ChannelId: channelID,
		Type:      themePostType,
		Message:   t("noticeCleared"),
	}
	if theme != nil {
		post.Message = fmt.Sprintf(t("noticeSet"), theme.Name)
		// Props cross the plugin RPC, which only carries plain JSON values.
		prop, err := toJSONValue(theme)
		if err != nil {
			p.API.LogWarn("Failed to encode the theme notice", "err", err.Error())
			return
		}
		post.AddProp("theme", prop)
	}
	if _, appErr := p.API.CreatePost(post); appErr != nil {
		p.API.LogWarn("Failed to post the theme notice", "channel_id", channelID, "err", appErr.Error())
	}
}

func main() {
	plugin.ClientMain(&Plugin{})
}
