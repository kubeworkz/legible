package dbt

import (
	"testing"
)

func TestNewFilterSingle(t *testing.T) {
	tests := []struct {
		name            string
		include         string
		exclude         string
		wantEmpty       bool
		wantIncludeLen  int
		wantExcludeLen  int
	}{
		{"both empty", "", "", true, 0, 0},
		{"include only", "marts_.*", "", false, 1, 0},
		{"exclude only", "", "staging_.*", false, 0, 1},
		{"both set", "marts_.*", "staging_.*", false, 1, 1},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := NewFilterSingle(tt.include, tt.exclude)
			if f.IsEmpty() != tt.wantEmpty {
				t.Errorf("IsEmpty() = %v, want %v", f.IsEmpty(), tt.wantEmpty)
			}
			if len(f.Includes) != tt.wantIncludeLen {
				t.Errorf("Includes len = %d, want %d", len(f.Includes), tt.wantIncludeLen)
			}
			if len(f.Excludes) != tt.wantExcludeLen {
				t.Errorf("Excludes len = %d, want %d", len(f.Excludes), tt.wantExcludeLen)
			}
		})
	}
}

func TestModelFilter_Match(t *testing.T) {
	tests := []struct {
		name     string
		includes []string
		excludes []string
		input    string
		want     bool
	}{
		// No filters — everything passes
		{"no filters", nil, nil, "anything", true},

		// Include only
		{"include match", []string{"marts_.*"}, nil, "marts_orders", true},
		{"include no match", []string{"marts_.*"}, nil, "staging_orders", false},
		{"include partial match", []string{"marts_.*"}, nil, "my_marts_orders", true}, // regex is not anchored

		// Exclude only
		{"exclude match", nil, []string{"staging_.*"}, "staging_orders", false},
		{"exclude no match", nil, []string{"staging_.*"}, "marts_orders", true},

		// Both include and exclude
		{"include+exclude pass", []string{"marts_.*"}, []string{".*_test"}, "marts_orders", true},
		{"include+exclude excluded", []string{"marts_.*"}, []string{".*_test"}, "marts_orders_test", false},
		{"include+exclude not included", []string{"marts_.*"}, []string{".*_test"}, "staging_orders", false},

		// Multiple include patterns (any match)
		{"multi include first", []string{"marts_.*", "dim_.*"}, nil, "marts_orders", true},
		{"multi include second", []string{"marts_.*", "dim_.*"}, nil, "dim_customers", true},
		{"multi include none", []string{"marts_.*", "dim_.*"}, nil, "staging_orders", false},

		// Multiple exclude patterns
		{"multi exclude first", nil, []string{"staging_.*", "tmp_.*"}, "staging_x", false},
		{"multi exclude second", nil, []string{"staging_.*", "tmp_.*"}, "tmp_y", false},
		{"multi exclude none", nil, []string{"staging_.*", "tmp_.*"}, "marts_z", true},

		// Invalid regex is treated as non-matching
		{"invalid include regex", []string{"[invalid"}, nil, "anything", false},
		{"invalid exclude regex", nil, []string{"[invalid"}, "anything", true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := NewFilter(tt.includes, tt.excludes)
			if got := f.Match(tt.input); got != tt.want {
				t.Errorf("Match(%q) = %v, want %v", tt.input, got, tt.want)
			}
		})
	}
}

func TestModelFilter_FilterNames(t *testing.T) {
	names := []string{
		"marts_orders",
		"marts_customers",
		"staging_orders",
		"marts_orders_test",
		"dim_products",
	}

	tests := []struct {
		name     string
		includes []string
		excludes []string
		want     []string
	}{
		{
			"no filters returns all",
			nil, nil,
			names,
		},
		{
			"include marts",
			[]string{"marts_.*"}, nil,
			[]string{"marts_orders", "marts_customers", "marts_orders_test"},
		},
		{
			"exclude test",
			nil, []string{".*_test"},
			[]string{"marts_orders", "marts_customers", "staging_orders", "dim_products"},
		},
		{
			"include marts exclude test",
			[]string{"marts_.*"}, []string{".*_test"},
			[]string{"marts_orders", "marts_customers"},
		},
		{
			"no match returns empty",
			[]string{"^nonexistent$"}, nil,
			nil,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := NewFilter(tt.includes, tt.excludes)
			got := f.FilterNames(names)
			if !strSliceEqual(got, tt.want) {
				t.Errorf("FilterNames() = %v, want %v", got, tt.want)
			}
		})
	}
}

func strSliceEqual(a, b []string) bool {
	if len(a) == 0 && len(b) == 0 {
		return true
	}
	if len(a) != len(b) {
		return false
	}
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}
