package main

import "testing"

func TestMaxUploadMB(t *testing.T) {
	cases := []struct {
		value any
		want  int
		ok    bool
	}{
		{nil, defaultMaxUploadMB, true},
		{float64(5), 5, true},
		{"20", 20, true},
		{"abc", 0, false},
		{float64(0), 0, false},
		{float64(maxUploadMBCap + 1), 0, false},
	}
	for _, c := range cases {
		got, err := configuration{MaxUploadMB: c.value}.maxUploadMB()
		if (err == nil) != c.ok || (c.ok && got != c.want) {
			t.Errorf("%v: got %d, %v", c.value, got, err)
		}
	}
}
