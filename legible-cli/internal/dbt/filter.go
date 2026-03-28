package dbt

import "regexp"

// ModelFilter applies include/exclude regex patterns to filter model names.
// A model passes if it matches ANY include pattern (or there are none)
// and does NOT match ANY exclude pattern.
type ModelFilter struct {
	Includes []string
	Excludes []string
}

// NewFilter creates a ModelFilter from include/exclude pattern slices.
func NewFilter(includes, excludes []string) *ModelFilter {
	return &ModelFilter{Includes: includes, Excludes: excludes}
}

// NewFilterSingle creates a ModelFilter from single include/exclude patterns.
// Empty strings are ignored.
func NewFilterSingle(include, exclude string) *ModelFilter {
	var includes, excludes []string
	if include != "" {
		includes = []string{include}
	}
	if exclude != "" {
		excludes = []string{exclude}
	}
	return &ModelFilter{Includes: includes, Excludes: excludes}
}

// IsEmpty returns true if no patterns are configured.
func (f *ModelFilter) IsEmpty() bool {
	return len(f.Includes) == 0 && len(f.Excludes) == 0
}

// Match returns true if the given name passes the include/exclude patterns.
func (f *ModelFilter) Match(name string) bool {
	if len(f.Includes) > 0 {
		matched := false
		for _, pattern := range f.Includes {
			if ok, err := regexp.MatchString(pattern, name); err == nil && ok {
				matched = true
				break
			}
		}
		if !matched {
			return false
		}
	}
	for _, pattern := range f.Excludes {
		if ok, err := regexp.MatchString(pattern, name); err == nil && ok {
			return false
		}
	}
	return true
}

// FilterNames filters a slice of names, returning only those that match.
func (f *ModelFilter) FilterNames(names []string) []string {
	if f.IsEmpty() {
		return names
	}
	var result []string
	for _, n := range names {
		if f.Match(n) {
			result = append(result, n)
		}
	}
	return result
}
