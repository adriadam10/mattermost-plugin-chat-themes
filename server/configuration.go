package main

import (
	"fmt"
	"strconv"
	"sync/atomic"
)

const (
	defaultMaxUploadMB = 15
	maxUploadMBCap     = 50
)

// configuration mirrors settings_schema in plugin.json. The System Console can
// store a number setting as a JSON number or as a string, so it is decoded loosely.
type configuration struct {
	MaxUploadMB       any
	AllowExternalURLs *bool
}

func (c configuration) maxUploadMB() (int, error) {
	var n int
	switch v := c.MaxUploadMB.(type) {
	case nil:
		return defaultMaxUploadMB, nil
	case float64:
		n = int(v)
	case string:
		parsed, err := strconv.Atoi(v)
		if err != nil {
			return 0, fmt.Errorf("MaxUploadMB must be a whole number, got %q", v)
		}
		n = parsed
	default:
		return 0, fmt.Errorf("MaxUploadMB has an unexpected type %T", v)
	}
	if n < 1 || n > maxUploadMBCap {
		return 0, fmt.Errorf("MaxUploadMB must be between 1 and %d, got %d", maxUploadMBCap, n)
	}
	return n, nil
}

type settings struct {
	maxUploadBytes    atomic.Int64
	allowExternalURLs atomic.Bool
}

func (p *Plugin) OnConfigurationChange() error {
	var c configuration
	if err := p.API.LoadPluginConfiguration(&c); err != nil {
		return fmt.Errorf("load configuration: %w", err)
	}
	mb, err := c.maxUploadMB()
	if err != nil {
		return err
	}
	p.settings.maxUploadBytes.Store(int64(mb) << 20)
	p.settings.allowExternalURLs.Store(c.AllowExternalURLs == nil || *c.AllowExternalURLs)
	return nil
}

func (p *Plugin) validator() validator {
	return validator{allowExternalURLs: p.settings.allowExternalURLs.Load()}
}
