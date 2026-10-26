package main

import (
	"strings"
	"testing"
)

func validTheme() Theme {
	return Theme{
		Name:        "Test",
		Light:       Variant{Layers: []Layer{{Type: "color", Opacity: 1, Color: "#112233"}}},
		Readability: Readability{Mode: "auto", Strength: 0.5},
	}
}

func TestPresetsAreValid(t *testing.T) {
	presets, err := loadPresets()
	if err != nil {
		t.Fatal(err)
	}
	for _, p := range presets {
		if !strings.HasPrefix(p.ID, builtinPrefix) || !p.Builtin {
			t.Errorf("preset %q must be builtin with prefix %s", p.ID, builtinPrefix)
		}
	}
}

func TestValidatorRejectsUnsafeValues(t *testing.T) {
	cases := map[string]func(*Theme){
		"empty name":      func(th *Theme) { th.Name = "  " },
		"css in color":    func(th *Theme) { th.Light.Layers[0].Color = "red;background:url(x)" },
		"unknown type":    func(th *Theme) { th.Light.Layers[0].Type = "html" },
		"opacity range":   func(th *Theme) { th.Light.Layers[0].Opacity = 2 },
		"no layers":       func(th *Theme) { th.Light.Layers = nil },
		"bad readability": func(th *Theme) { th.Readability.Mode = "x" },
		"http url": func(th *Theme) {
			th.Light.Layers[0] = Layer{Type: "image", Opacity: 1, Media: "image", Fit: "cover", Src: "http://example.com/a.png"}
		},
		"quote in url": func(th *Theme) {
			th.Light.Layers[0] = Layer{Type: "image", Opacity: 1, Media: "image", Fit: "cover", Src: `https://example.com/a".png`}
		},
		"media kind mismatch": func(th *Theme) {
			th.Light.Layers[0] = Layer{Type: "image", Opacity: 1, Media: "video", Fit: "cover", Src: "https://example.com/a.mp4"}
		},
	}
	for name, mutate := range cases {
		th := validTheme()
		mutate(&th)
		if err := (validator{allowExternalURLs: true}).theme(&th); err == nil {
			t.Errorf("%s: accepted", name)
		}
	}
}

func TestValidatorSources(t *testing.T) {
	image := func(src string) Theme {
		th := validTheme()
		th.Light.Layers[0] = Layer{Type: "image", Opacity: 1, Media: "image", Fit: "tile", Src: src}
		return th
	}
	uploaded := image("media:" + strings.Repeat("a", 26))
	if err := (validator{}).theme(&uploaded); err != nil {
		t.Errorf("uploaded file rejected: %v", err)
	}
	external := image("https://example.com/bg.webp")
	if err := (validator{}).theme(&external); err == nil {
		t.Error("external URL accepted with AllowExternalURLs off")
	}
	if err := (validator{allowExternalURLs: true}).theme(&external); err != nil {
		t.Errorf("external URL rejected: %v", err)
	}
}

func TestSniffType(t *testing.T) {
	if _, ok := sniffType([]byte("<svg xmlns='http://www.w3.org/2000/svg'></svg>")); ok {
		t.Error("SVG accepted")
	}
	if mime, ok := sniffType([]byte("GIF89a......")); !ok || mime != "image/gif" {
		t.Errorf("GIF: %s %v", mime, ok)
	}
}
