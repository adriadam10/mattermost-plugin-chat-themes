package main

import (
	"errors"
	"fmt"
	"strings"

	"github.com/mattermost/mattermost/server/public/model"
	"github.com/mattermost/mattermost/server/public/plugin"
)

// /tema without arguments opens the editor; the webapp catches it before it
// reaches the server. What gets here is the mobile apps, which run no webapp
// plugins, and the subcommands.
const commandTrigger = "tema"

func (p *Plugin) registerCommand() error {
	auto := model.NewAutocompleteData(commandTrigger, "[poner|quitar|lista]", "Tema del chat / Chat theme")
	set := model.NewAutocompleteData("poner", "<nombre>", "Pone un tema de la galería / Use a gallery theme")
	set.AddTextArgument("Nombre del tema / Theme name", "<nombre>", "")
	auto.AddCommand(set)
	auto.AddCommand(model.NewAutocompleteData("quitar", "", "Quita el tema del chat / Remove the chat theme"))
	auto.AddCommand(model.NewAutocompleteData("lista", "", "Temas de la galería / Gallery themes"))
	return p.API.RegisterCommand(&model.Command{
		Trigger:          commandTrigger,
		DisplayName:      "Chat themes",
		Description:      "Tema del chat / Chat theme",
		AutoComplete:     true,
		AutoCompleteDesc: "Tema del chat / Chat theme",
		AutoCompleteHint: "[poner|quitar|lista]",
		AutocompleteData: auto,
	})
}

func (p *Plugin) ExecuteCommand(_ *plugin.Context, args *model.CommandArgs) (*model.CommandResponse, *model.AppError) {
	t := p.userTranslator(args.UserId)
	fields := strings.Fields(args.Command)
	sub := ""
	if len(fields) > 1 {
		sub = strings.ToLower(fields[1])
	}
	var text string
	switch sub {
	case "":
		text = p.describeChannelTheme(args.ChannelId, t)
	case "quitar", "clear":
		text = p.commandResult(p.setChannelTheme(args.ChannelId, args.UserId, nil), t, t("cleared"))
	case "lista", "list":
		text = p.listForCommand(t)
	case "poner", "set":
		text = p.applyByName(args, strings.TrimSpace(strings.Join(fields[2:], " ")), t)
	default:
		text = t("usage")
	}
	return &model.CommandResponse{ResponseType: model.CommandResponseTypeEphemeral, Text: text}, nil
}

func (p *Plugin) describeChannelTheme(channelID string, t translator) string {
	ct, err := p.channelTheme(channelID)
	if errors.Is(err, errNotFound) {
		return t("noTheme") + "\n" + t("usage")
	}
	if err != nil {
		return t("failed")
	}
	return fmt.Sprintf(t("current"), ct.Theme.Name) + "\n" + t("usage")
}

func (p *Plugin) listForCommand(t translator) string {
	themes, err := p.gallery()
	if err != nil {
		return t("failed")
	}
	var b strings.Builder
	b.WriteString(t("galleryTitle"))
	for _, theme := range themes {
		fmt.Fprintf(&b, "\n- %s", theme.Name)
	}
	return b.String()
}

func (p *Plugin) applyByName(args *model.CommandArgs, name string, t translator) string {
	if name == "" {
		return t("usage")
	}
	theme, err := p.findThemeByName(name)
	if errors.Is(err, errNotFound) {
		return fmt.Sprintf(t("unknownTheme"), name)
	}
	if err != nil {
		return t("failed")
	}
	return p.commandResult(p.setChannelTheme(args.ChannelId, args.UserId, theme), t, fmt.Sprintf(t("applied"), theme.Name))
}

func (p *Plugin) commandResult(err error, t translator, ok string) string {
	switch {
	case err == nil:
		return ok
	case errors.Is(err, errForbidden):
		return t("forbidden")
	default:
		p.API.LogError("Command failed", "err", err.Error())
		return t("failed")
	}
}
