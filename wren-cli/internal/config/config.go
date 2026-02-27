package config

import (
	"fmt"
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"
)

const (
	configDir  = ".wren"
	configFile = "config.yaml"
)

// Config holds the CLI configuration persisted to ~/.wren/config.yaml.
type Config struct {
	Endpoint  string `yaml:"endpoint,omitempty"`
	APIKey    string `yaml:"api_key,omitempty"`
	ProjectID string `yaml:"project_id,omitempty"`
}

// configPath returns the full path to the config file.
func configPath() (string, error) {
	home, err := os.UserHomeDir()
	if err != nil {
		return "", fmt.Errorf("cannot determine home directory: %w", err)
	}
	return filepath.Join(home, configDir, configFile), nil
}

// Load reads the config from ~/.wren/config.yaml.
// Returns a zero-value Config (no error) if the file does not exist.
func Load() (*Config, error) {
	path, err := configPath()
	if err != nil {
		return nil, err
	}

	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return &Config{}, nil
		}
		return nil, fmt.Errorf("reading config: %w", err)
	}

	cfg := &Config{}
	if err := yaml.Unmarshal(data, cfg); err != nil {
		return nil, fmt.Errorf("parsing config: %w", err)
	}
	return cfg, nil
}

// Save writes the config to ~/.wren/config.yaml, creating the directory if needed.
func (c *Config) Save() error {
	path, err := configPath()
	if err != nil {
		return err
	}

	dir := filepath.Dir(path)
	if err := os.MkdirAll(dir, 0o700); err != nil {
		return fmt.Errorf("creating config directory: %w", err)
	}

	data, err := yaml.Marshal(c)
	if err != nil {
		return fmt.Errorf("serializing config: %w", err)
	}

	if err := os.WriteFile(path, data, 0o600); err != nil {
		return fmt.Errorf("writing config: %w", err)
	}
	return nil
}

// Set updates a single config field by name.
func (c *Config) Set(key, value string) error {
	switch key {
	case "endpoint":
		c.Endpoint = value
	case "api-key", "api_key":
		c.APIKey = value
	case "project-id", "project_id":
		c.ProjectID = value
	default:
		return fmt.Errorf("unknown config key: %q (valid keys: endpoint, api-key, project-id)", key)
	}
	return nil
}

// Get returns the value of a config field by name.
func (c *Config) Get(key string) (string, error) {
	switch key {
	case "endpoint":
		return c.Endpoint, nil
	case "api-key", "api_key":
		return c.APIKey, nil
	case "project-id", "project_id":
		return c.ProjectID, nil
	default:
		return "", fmt.Errorf("unknown config key: %q (valid keys: endpoint, api-key, project-id)", key)
	}
}

// Display returns a map of all config fields for display purposes.
// API key is masked for security.
func (c *Config) Display() map[string]string {
	apiKey := c.APIKey
	if len(apiKey) > 12 {
		apiKey = apiKey[:12] + "..." + apiKey[len(apiKey)-4:]
	}
	return map[string]string{
		"endpoint":   c.Endpoint,
		"api_key":    apiKey,
		"project_id": c.ProjectID,
	}
}
