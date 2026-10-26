package main

import "strings"

// Server texts: the slash command replies and the fallback text of the theme
// notice, which the mobile apps show as it is.
var serverStrings = map[string]map[string]string{
	"en": {
		"noticeSet":     "changed the chat theme to «%s»",
		"noticeCleared": "removed the chat theme",
		"noTheme":       "This chat has no theme.",
		"current":       "This chat's theme is «%s».",
		"usage":         "Open the editor with the palette button in the channel header or with `/tema` (web and desktop). `/tema poner <name>` uses a gallery theme, `/tema quitar` removes it, `/tema lista` lists the gallery.",
		"cleared":       "Theme removed.",
		"applied":       "Theme «%s» set.",
		"galleryTitle":  "Gallery themes:",
		"unknownTheme":  "There is no theme called «%s». See `/tema lista`.",
		"forbidden":     "You cannot change the theme of this chat.",
		"failed":        "Something went wrong; try again.",
	},
	"es": {
		"noticeSet":     "ha cambiado el tema del chat a «%s»",
		"noticeCleared": "ha quitado el tema del chat",
		"noTheme":       "Este chat no tiene tema.",
		"current":       "El tema de este chat es «%s».",
		"usage":         "Abre el editor con el botón de la paleta en la cabecera del canal o con `/tema` (web y escritorio). `/tema poner <nombre>` pone un tema de la galería, `/tema quitar` lo quita, `/tema lista` muestra la galería.",
		"cleared":       "Tema quitado.",
		"applied":       "Tema «%s» puesto.",
		"galleryTitle":  "Temas de la galería:",
		"unknownTheme":  "No hay ningún tema llamado «%s». Mira `/tema lista`.",
		"forbidden":     "No puedes cambiar el tema de este chat.",
		"failed":        "Algo ha fallado; vuelve a intentarlo.",
	},
}

type translator func(key string) string

func translatorFor(locale string) translator {
	lang, _, _ := strings.Cut(locale, "-")
	strs, ok := serverStrings[lang]
	if !ok {
		strs = serverStrings["en"]
	}
	return func(key string) string { return strs[key] }
}

func (p *Plugin) userTranslator(userID string) translator {
	locale := ""
	if user, appErr := p.API.GetUser(userID); appErr == nil {
		locale = user.Locale
	}
	return translatorFor(locale)
}
