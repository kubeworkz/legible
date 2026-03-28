package legibleconfig

import (
	"fmt"
	"os"
	"path/filepath"
	"time"

	"gopkg.in/yaml.v3"
)

const FileName = ".legibleconfig"

// Config represents the .legibleconfig file stored in a dbt project directory.
type Config struct {
	WrenProject WrenProject `yaml:"wren_project"`
	Filter      Filter      `yaml:"filter,omitempty"`
}

// WrenProject identifies the linked Legible/Wren AI project.
type WrenProject struct {
	ID         string `yaml:"id"`
	LastSynced string `yaml:"last_synced,omitempty"`
}

// Filter defines include/exclude regex patterns for model selection.
type Filter struct {
	Include []string `yaml:"include,omitempty"`
	Exclude []string `yaml:"exclude,omitempty"`
}

// Load reads .legibleconfig from the given directory.
func Load(dir string) (*Config, error) {
	path := filepath.Join(dir, FileName)
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil, fmt.Errorf(".legibleconfig not found in %s — is this a linked dbt project?", dir)
		}
		return nil, fmt.Errorf("reading %s: %w", path, err)
	}

	var cfg Config
	if err := yaml.Unmarshal(data, &cfg); err != nil {
		return nil, fmt.Errorf("parsing %s: %w", path, err)
	}
	return &cfg, nil
}

// Save writes .legibleconfig to the given directory.
func Save(dir string, cfg *Config) error {
	path := filepath.Join(dir, FileName)
	data, err := yaml.Marshal(cfg)
	if err != nil {
		return fmt.Errorf("marshaling .legibleconfig: %w", err)
	}

	if err := os.WriteFile(path, data, 0600); err != nil {
		return fmt.Errorf("writing %s: %w", path, err)
	}
	return nil
}

// Exists returns true if .legibleconfig exists in the given directory.
func Exists(dir string) bool {
	path := filepath.Join(dir, FileName)
	_, err := os.Stat(path)
	return err == nil
}

// NewConfig creates a Config with the project ID and optional filters,
// setting last_synced to the current time.
func NewConfig(projectID string, include, exclude []string) *Config {
	return &Config{
		WrenProject: WrenProject{
			ID:         projectID,
			LastSynced: time.Now().UTC().Format(time.RFC3339),
		},
		Filter: Filter{
			Include: include,
			Exclude: exclude,
		},
	}
}

// TouchSynced updates the last_synced timestamp to now.
func (c *Config) TouchSynced() {
	c.WrenProject.LastSynced = time.Now().UTC().Format(time.RFC3339)
}
