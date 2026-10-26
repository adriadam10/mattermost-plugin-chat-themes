package main

import (
	"errors"
	"fmt"
	"net/url"
	"regexp"
	"strings"
	"unicode/utf8"
)

// A theme is drawn by every member's browser, so everything in it is checked
// here: colors and URLs end up inside CSS, and only known values are allowed.

const (
	maxLayers      = 8
	maxColors      = 8
	maxNameRunes   = 40
	maxURLLength   = 2048
	maxEmojiRunes  = 8
	maxThemeLength = 32 * 1024
)

type Layer struct {
	Type       string   `json:"type"`
	Opacity    float64  `json:"opacity"`
	Blend      string   `json:"blend,omitempty"`
	Color      string   `json:"color,omitempty"`
	Colors     []string `json:"colors,omitempty"`
	Gradient   string   `json:"gradient,omitempty"`
	Angle      float64  `json:"angle,omitempty"`
	Src        string   `json:"src,omitempty"`
	Media      string   `json:"media,omitempty"`
	Fit        string   `json:"fit,omitempty"`
	Size       float64  `json:"size,omitempty"`
	Blur       float64  `json:"blur,omitempty"`
	Brightness float64  `json:"brightness,omitempty"`
	Saturate   float64  `json:"saturate,omitempty"`
	Hue        float64  `json:"hue,omitempty"`
	Pattern    string   `json:"pattern,omitempty"`
	Particles  string   `json:"particles,omitempty"`
	Emoji      string   `json:"emoji,omitempty"`
	Density    float64  `json:"density,omitempty"`
	Animation  string   `json:"animation,omitempty"`
	Speed      float64  `json:"speed,omitempty"`
}

type Variant struct {
	Layers []Layer `json:"layers"`
}

type Readability struct {
	Mode     string  `json:"mode"`
	Strength float64 `json:"strength"`
}

type Theme struct {
	ID          string      `json:"id,omitempty"`
	Name        string      `json:"name"`
	Light       Variant     `json:"light"`
	Dark        *Variant    `json:"dark,omitempty"`
	Readability Readability `json:"readability"`
	Builtin     bool        `json:"builtin,omitempty"`
	AuthorID    string      `json:"author_id,omitempty"`
	CreatedAt   int64       `json:"created_at,omitempty"`
	UpdatedAt   int64       `json:"updated_at,omitempty"`
}

var (
	layerTypes       = set("color", "gradient", "image", "video", "pattern", "particles")
	blendModes       = set("", "normal", "multiply", "screen", "overlay", "soft-light", "hard-light", "color-dodge", "color-burn", "difference", "luminosity", "color", "hue", "saturation")
	gradientKinds    = set("linear", "radial", "conic")
	mediaKinds       = set("image", "video")
	fits             = set("cover", "contain", "tile")
	patterns         = set("dots", "grid", "stripes", "waves", "checks", "zigzag", "hearts", "stars", "plus")
	particleKinds    = set("snow", "hearts", "confetti", "stars", "bubbles", "fireflies", "emoji")
	animations       = set("", "none", "shift", "rotate", "hue", "pulse", "kenburns", "pan", "drift")
	readabilityModes = set("auto", "scrim", "cards", "none")

	colorRe   = regexp.MustCompile(`^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$`)
	mediaIDRe = regexp.MustCompile(`^media:[a-z0-9]{26}$`)
)

func set(values ...string) map[string]bool {
	m := make(map[string]bool, len(values))
	for _, v := range values {
		m[v] = true
	}
	return m
}

type validator struct {
	allowExternalURLs bool
}

func (v validator) theme(t *Theme) error {
	t.Name = strings.TrimSpace(t.Name)
	if t.Name == "" || utf8.RuneCountInString(t.Name) > maxNameRunes {
		return fmt.Errorf("the name must have 1 to %d characters", maxNameRunes)
	}
	if err := v.variant(&t.Light); err != nil {
		return fmt.Errorf("light: %w", err)
	}
	if t.Dark != nil {
		if err := v.variant(t.Dark); err != nil {
			return fmt.Errorf("dark: %w", err)
		}
	}
	if !readabilityModes[t.Readability.Mode] {
		return fmt.Errorf("unknown readability mode %q", t.Readability.Mode)
	}
	return inRange("readability strength", t.Readability.Strength, 0, 1)
}

func (v validator) variant(variant *Variant) error {
	if len(variant.Layers) == 0 || len(variant.Layers) > maxLayers {
		return fmt.Errorf("a background needs 1 to %d layers", maxLayers)
	}
	for i := range variant.Layers {
		if err := v.layer(&variant.Layers[i]); err != nil {
			return fmt.Errorf("layer %d: %w", i+1, err)
		}
	}
	return nil
}

func (v validator) layer(l *Layer) error {
	if !layerTypes[l.Type] {
		return fmt.Errorf("unknown type %q", l.Type)
	}
	if !blendModes[l.Blend] {
		return fmt.Errorf("unknown blend mode %q", l.Blend)
	}
	if !animations[l.Animation] {
		return fmt.Errorf("unknown animation %q", l.Animation)
	}
	if err := checkColors(l); err != nil {
		return err
	}
	if err := checkNumbers(l); err != nil {
		return err
	}
	switch l.Type {
	case "gradient":
		if !gradientKinds[l.Gradient] || len(l.Colors) < 2 {
			return errors.New("a gradient needs a kind and at least 2 colors")
		}
	case "image", "video":
		if !mediaKinds[l.Media] || !fits[l.Fit] {
			return errors.New("an image or video needs a media kind and a fit")
		}
		if l.Media != l.Type {
			return errors.New("the media kind does not match the layer type")
		}
		return v.source(l.Src)
	case "pattern":
		if !patterns[l.Pattern] {
			return fmt.Errorf("unknown pattern %q", l.Pattern)
		}
	case "particles":
		if !particleKinds[l.Particles] {
			return fmt.Errorf("unknown particles %q", l.Particles)
		}
		if l.Particles == "emoji" && (l.Emoji == "" || utf8.RuneCountInString(l.Emoji) > maxEmojiRunes) {
			return errors.New("emoji particles need 1 emoji")
		}
	}
	return nil
}

func checkColors(l *Layer) error {
	if l.Color != "" && !colorRe.MatchString(l.Color) {
		return fmt.Errorf("invalid color %q", l.Color)
	}
	if len(l.Colors) > maxColors {
		return fmt.Errorf("at most %d colors", maxColors)
	}
	for _, c := range l.Colors {
		if !colorRe.MatchString(c) {
			return fmt.Errorf("invalid color %q", c)
		}
	}
	return nil
}

func checkNumbers(l *Layer) error {
	checks := []struct {
		name     string
		value    float64
		min, max float64
	}{
		{"opacity", l.Opacity, 0, 1},
		{"angle", l.Angle, 0, 360},
		{"size", l.Size, 0, 400},
		{"blur", l.Blur, 0, 40},
		{"brightness", l.Brightness, 0, 3},
		{"saturate", l.Saturate, 0, 3},
		{"hue", l.Hue, -180, 180},
		{"density", l.Density, 0, 200},
		{"speed", l.Speed, 0, 5},
	}
	for _, c := range checks {
		if err := inRange(c.name, c.value, c.min, c.max); err != nil {
			return err
		}
	}
	return nil
}

func inRange(name string, value, min, max float64) error {
	if value < min || value > max {
		return fmt.Errorf("%s must be between %g and %g", name, min, max)
	}
	return nil
}

// source is an uploaded file ("media:<file id>") or, if allowed, an https URL
// safe to put inside CSS url("...").
func (v validator) source(src string) error {
	if mediaIDRe.MatchString(src) {
		return nil
	}
	if !v.allowExternalURLs {
		return errors.New("only uploaded images and videos are allowed")
	}
	if len(src) > maxURLLength || strings.ContainsAny(src, "\"'()\\<> \t\r\n") {
		return errors.New("invalid URL")
	}
	u, err := url.Parse(src)
	if err != nil || u.Scheme != "https" || u.Host == "" {
		return errors.New("the URL must start with https://")
	}
	return nil
}
