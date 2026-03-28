package legibleconfig

import (
	"os"
	"path/filepath"
	"testing"
	"time"
)

func TestLoad_Valid(t *testing.T) {
	dir := t.TempDir()
	content := `wren_project:
  id: "proj-123"
  last_synced: "2025-01-01T00:00:00Z"
filter:
  include:
    - "marts_.*"
  exclude:
    - "staging_.*"
`
	if err := os.WriteFile(filepath.Join(dir, FileName), []byte(content), 0600); err != nil {
		t.Fatal(err)
	}

	cfg, err := Load(dir)
	if err != nil {
		t.Fatalf("Load() error: %v", err)
	}
	if cfg.WrenProject.ID != "proj-123" {
		t.Errorf("ID = %q, want %q", cfg.WrenProject.ID, "proj-123")
	}
	if cfg.WrenProject.LastSynced != "2025-01-01T00:00:00Z" {
		t.Errorf("LastSynced = %q, want %q", cfg.WrenProject.LastSynced, "2025-01-01T00:00:00Z")
	}
	if len(cfg.Filter.Include) != 1 || cfg.Filter.Include[0] != "marts_.*" {
		t.Errorf("Include = %v, want [marts_.*]", cfg.Filter.Include)
	}
	if len(cfg.Filter.Exclude) != 1 || cfg.Filter.Exclude[0] != "staging_.*" {
		t.Errorf("Exclude = %v, want [staging_.*]", cfg.Filter.Exclude)
	}
}

func TestLoad_NotFound(t *testing.T) {
	dir := t.TempDir()
	_, err := Load(dir)
	if err == nil {
		t.Fatal("expected error for missing .legibleconfig")
	}
}

func TestLoad_Malformed(t *testing.T) {
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, FileName), []byte("{{bad yaml"), 0600); err != nil {
		t.Fatal(err)
	}
	_, err := Load(dir)
	if err == nil {
		t.Fatal("expected error for malformed YAML")
	}
}

func TestSaveAndLoad_Roundtrip(t *testing.T) {
	dir := t.TempDir()
	cfg := &Config{
		WrenProject: WrenProject{
			ID:         "proj-456",
			LastSynced: "2025-06-15T12:00:00Z",
		},
		Filter: Filter{
			Include: []string{"a_.*", "b_.*"},
			Exclude: []string{"tmp_.*"},
		},
	}

	if err := Save(dir, cfg); err != nil {
		t.Fatalf("Save() error: %v", err)
	}

	loaded, err := Load(dir)
	if err != nil {
		t.Fatalf("Load() error: %v", err)
	}
	if loaded.WrenProject.ID != cfg.WrenProject.ID {
		t.Errorf("ID = %q, want %q", loaded.WrenProject.ID, cfg.WrenProject.ID)
	}
	if loaded.WrenProject.LastSynced != cfg.WrenProject.LastSynced {
		t.Errorf("LastSynced = %q, want %q", loaded.WrenProject.LastSynced, cfg.WrenProject.LastSynced)
	}
	if len(loaded.Filter.Include) != 2 {
		t.Errorf("Include len = %d, want 2", len(loaded.Filter.Include))
	}
	if len(loaded.Filter.Exclude) != 1 {
		t.Errorf("Exclude len = %d, want 1", len(loaded.Filter.Exclude))
	}
}

func TestSave_FilePermissions(t *testing.T) {
	dir := t.TempDir()
	cfg := NewConfig("proj-789", nil, nil)
	if err := Save(dir, cfg); err != nil {
		t.Fatalf("Save() error: %v", err)
	}
	info, err := os.Stat(filepath.Join(dir, FileName))
	if err != nil {
		t.Fatal(err)
	}
	// File should be user read/write only (0600)
	perm := info.Mode().Perm()
	if perm != 0600 {
		t.Errorf("file permissions = %o, want 0600", perm)
	}
}

func TestExists(t *testing.T) {
	dir := t.TempDir()
	if Exists(dir) {
		t.Error("Exists() = true before creating file")
	}

	cfg := NewConfig("proj-1", nil, nil)
	if err := Save(dir, cfg); err != nil {
		t.Fatal(err)
	}
	if !Exists(dir) {
		t.Error("Exists() = false after creating file")
	}
}

func TestNewConfig(t *testing.T) {
	before := time.Now().UTC().Truncate(time.Second)
	cfg := NewConfig("proj-42", []string{"inc"}, []string{"exc"})
	after := time.Now().UTC().Truncate(time.Second).Add(time.Second)

	if cfg.WrenProject.ID != "proj-42" {
		t.Errorf("ID = %q, want %q", cfg.WrenProject.ID, "proj-42")
	}
	ts, err := time.Parse(time.RFC3339, cfg.WrenProject.LastSynced)
	if err != nil {
		t.Fatalf("LastSynced parse error: %v", err)
	}
	if ts.Before(before) || ts.After(after) {
		t.Errorf("LastSynced = %v, not in [%v, %v]", ts, before, after)
	}
	if len(cfg.Filter.Include) != 1 || cfg.Filter.Include[0] != "inc" {
		t.Errorf("Include = %v, want [inc]", cfg.Filter.Include)
	}
	if len(cfg.Filter.Exclude) != 1 || cfg.Filter.Exclude[0] != "exc" {
		t.Errorf("Exclude = %v, want [exc]", cfg.Filter.Exclude)
	}
}

func TestNewConfig_NilFilters(t *testing.T) {
	cfg := NewConfig("proj-0", nil, nil)
	if cfg.Filter.Include != nil {
		t.Errorf("Include = %v, want nil", cfg.Filter.Include)
	}
	if cfg.Filter.Exclude != nil {
		t.Errorf("Exclude = %v, want nil", cfg.Filter.Exclude)
	}
}

func TestTouchSynced(t *testing.T) {
	cfg := &Config{
		WrenProject: WrenProject{ID: "proj-1", LastSynced: "2020-01-01T00:00:00Z"},
	}
	before := time.Now().UTC().Truncate(time.Second)
	cfg.TouchSynced()
	after := time.Now().UTC().Truncate(time.Second).Add(time.Second)

	ts, err := time.Parse(time.RFC3339, cfg.WrenProject.LastSynced)
	if err != nil {
		t.Fatalf("parse error: %v", err)
	}
	if ts.Before(before) || ts.After(after) {
		t.Errorf("TouchSynced timestamp %v not in [%v, %v]", ts, before, after)
	}
}
