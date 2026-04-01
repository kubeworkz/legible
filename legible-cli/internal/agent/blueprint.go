package agent

import (
	"fmt"
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"
)

// Blueprint represents a Legible agent blueprint (NemoClaw-compatible).
type Blueprint struct {
	Version             string              `yaml:"version" json:"version"`
	MinOpenshellVersion string              `yaml:"min_openshell_version,omitempty" json:"min_openshell_version,omitempty"`
	Description         string              `yaml:"description" json:"description"`
	Components          BlueprintComponents `yaml:"components" json:"components"`
	Policies            BlueprintPolicies   `yaml:"policies" json:"policies"`
	Agent               BlueprintAgent      `yaml:"agent" json:"agent"`
}

// BlueprintComponents defines sandbox, inference, and MCP configuration.
type BlueprintComponents struct {
	Sandbox   SandboxComponent   `yaml:"sandbox" json:"sandbox"`
	Inference InferenceComponent `yaml:"inference" json:"inference"`
	MCP       MCPComponent       `yaml:"mcp,omitempty" json:"mcp,omitempty"`
}

// SandboxComponent defines the sandbox container image and settings.
type SandboxComponent struct {
	Image        string            `yaml:"image" json:"image"`
	Build        *SandboxBuild     `yaml:"build,omitempty" json:"build,omitempty"`
	Name         string            `yaml:"name" json:"name"`
	ForwardPorts []int             `yaml:"forward_ports,omitempty" json:"forward_ports,omitempty"`
	Env          map[string]string `yaml:"env,omitempty" json:"env,omitempty"`
}

// SandboxBuild defines how to build the sandbox image.
type SandboxBuild struct {
	Dockerfile string `yaml:"dockerfile,omitempty" json:"dockerfile,omitempty"`
	Context    string `yaml:"context,omitempty" json:"context,omitempty"`
}

// InferenceComponent defines inference provider profiles.
type InferenceComponent struct {
	Profiles map[string]InferenceProfile `yaml:"profiles" json:"profiles"`
}

// InferenceProfile defines a single inference provider configuration.
type InferenceProfile struct {
	ProviderType string `yaml:"provider_type" json:"provider_type"`
	ProviderName string `yaml:"provider_name" json:"provider_name"`
	Endpoint     string `yaml:"endpoint" json:"endpoint"`
	Model        string `yaml:"model" json:"model"`
}

// MCPComponent defines MCP server connections for the sandbox.
type MCPComponent struct {
	Servers map[string]MCPServer `yaml:"servers,omitempty" json:"servers,omitempty"`
}

// MCPServer defines a single MCP server connection.
type MCPServer struct {
	Transport string `yaml:"transport" json:"transport"`
	URL       string `yaml:"url" json:"url"`
}

// BlueprintPolicies defines security policies for the sandbox.
type BlueprintPolicies struct {
	Network    string          `yaml:"network" json:"network"`
	Filesystem *FilesystemSpec `yaml:"filesystem,omitempty" json:"filesystem,omitempty"`
	Process    *ProcessSpec    `yaml:"process,omitempty" json:"process,omitempty"`
}

// FilesystemSpec defines filesystem access rules.
type FilesystemSpec struct {
	ReadOnly  []string `yaml:"read_only,omitempty" json:"read_only,omitempty"`
	ReadWrite []string `yaml:"read_write,omitempty" json:"read_write,omitempty"`
}

// ProcessSpec defines process isolation rules.
type ProcessSpec struct {
	DenyPrivilegeEscalation bool   `yaml:"deny_privilege_escalation,omitempty" json:"deny_privilege_escalation,omitempty"`
	RunAsUser               string `yaml:"run_as_user,omitempty" json:"run_as_user,omitempty"`
	RunAsGroup              string `yaml:"run_as_group,omitempty" json:"run_as_group,omitempty"`
}

// BlueprintAgent defines the agent type and configuration.
type BlueprintAgent struct {
	Type         string   `yaml:"type" json:"type"`
	AllowedTypes []string `yaml:"allowed_types,omitempty" json:"allowed_types,omitempty"`
	Entrypoint   string   `yaml:"entrypoint,omitempty" json:"entrypoint,omitempty"`
}

// LoadBlueprint reads and parses a blueprint.yaml file.
func LoadBlueprint(path string) (*Blueprint, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("reading blueprint: %w", err)
	}

	var bp Blueprint
	if err := yaml.Unmarshal(data, &bp); err != nil {
		return nil, fmt.Errorf("parsing blueprint: %w", err)
	}
	return &bp, nil
}

// LoadBlueprintFromDir reads a blueprint.yaml from a directory.
func LoadBlueprintFromDir(dir string) (*Blueprint, error) {
	return LoadBlueprint(filepath.Join(dir, "blueprint.yaml"))
}

// BundledBlueprintDir returns the path to a bundled blueprint by name.
// It searches relative to the executable, then well-known locations.
func BundledBlueprintDir(name string) (string, error) {
	// 1. Check relative to the running binary
	exePath, err := os.Executable()
	if err == nil {
		dir := filepath.Join(filepath.Dir(exePath), "..", "openshell", "blueprints", name)
		if _, err := os.Stat(filepath.Join(dir, "blueprint.yaml")); err == nil {
			return dir, nil
		}
	}

	// 2. Check ~/.legible/blueprints/
	home, err := os.UserHomeDir()
	if err == nil {
		dir := filepath.Join(home, ".legible", "blueprints", name)
		if _, err := os.Stat(filepath.Join(dir, "blueprint.yaml")); err == nil {
			return dir, nil
		}
	}

	// 3. Check current working directory
	cwd, err := os.Getwd()
	if err == nil {
		dir := filepath.Join(cwd, "openshell", "blueprints", name)
		if _, err := os.Stat(filepath.Join(dir, "blueprint.yaml")); err == nil {
			return dir, nil
		}
	}

	return "", fmt.Errorf("blueprint %q not found", name)
}

// ListBundledBlueprints returns the names of all available bundled blueprints.
func ListBundledBlueprints() ([]string, error) {
	var names []string

	searchDirs := []string{}

	// Relative to binary
	if exePath, err := os.Executable(); err == nil {
		searchDirs = append(searchDirs, filepath.Join(filepath.Dir(exePath), "..", "openshell", "blueprints"))
	}

	// ~/.legible/blueprints/
	if home, err := os.UserHomeDir(); err == nil {
		searchDirs = append(searchDirs, filepath.Join(home, ".legible", "blueprints"))
	}

	// Current working directory
	if cwd, err := os.Getwd(); err == nil {
		searchDirs = append(searchDirs, filepath.Join(cwd, "openshell", "blueprints"))
	}

	seen := make(map[string]bool)
	for _, dir := range searchDirs {
		entries, err := os.ReadDir(dir)
		if err != nil {
			continue
		}
		for _, entry := range entries {
			if !entry.IsDir() {
				continue
			}
			bpFile := filepath.Join(dir, entry.Name(), "blueprint.yaml")
			if _, err := os.Stat(bpFile); err == nil && !seen[entry.Name()] {
				names = append(names, entry.Name())
				seen[entry.Name()] = true
			}
		}
	}
	return names, nil
}
