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
	SupportedConnectors []string            `yaml:"supported_connectors,omitempty" json:"supported_connectors,omitempty"`
	Components          BlueprintComponents `yaml:"components" json:"components"`
	Policies            BlueprintPolicies   `yaml:"policies" json:"policies"`
	Agent               BlueprintAgent      `yaml:"agent" json:"agent"`
}

// SupportsConnector checks if the blueprint supports the given connector type.
func (b *Blueprint) SupportsConnector(connectorType string) bool {
	if len(b.SupportedConnectors) == 0 {
		return true // no restriction means all connectors
	}
	for _, c := range b.SupportedConnectors {
		if c == connectorType {
			return true
		}
	}
	return false
}

// BlueprintComponents defines sandbox, inference, MCP, and tools configuration.
type BlueprintComponents struct {
	Sandbox   SandboxComponent   `yaml:"sandbox" json:"sandbox"`
	Inference InferenceComponent `yaml:"inference" json:"inference"`
	MCP       MCPComponent       `yaml:"mcp,omitempty" json:"mcp,omitempty"`
	Tools     *ToolsComponent    `yaml:"tools,omitempty" json:"tools,omitempty"`
}

// ToolsComponent defines additional tools to install in the sandbox.
type ToolsComponent struct {
	Install []string       `yaml:"install,omitempty" json:"install,omitempty"`
	Scripts []ToolScript   `yaml:"scripts,omitempty" json:"scripts,omitempty"`
}

// ToolScript defines a named script available in the sandbox.
type ToolScript struct {
	Name        string `yaml:"name" json:"name"`
	Command     string `yaml:"command" json:"command"`
	Description string `yaml:"description,omitempty" json:"description,omitempty"`
}

// SandboxComponent defines the sandbox container image and settings.
type SandboxComponent struct {
	Image        string            `yaml:"image" json:"image"`
	Build        *SandboxBuild     `yaml:"build,omitempty" json:"build,omitempty"`
	Name         string            `yaml:"name" json:"name"`
	ForwardPorts []int             `yaml:"forward_ports,omitempty" json:"forward_ports,omitempty"`
	Env          map[string]string `yaml:"env,omitempty" json:"env,omitempty"`
	Resources    *ResourceSpec     `yaml:"resources,omitempty" json:"resources,omitempty"`
}

// ResourceSpec defines resource limits for the sandbox and its gateway.
type ResourceSpec struct {
	CPUs         string `yaml:"cpus,omitempty" json:"cpus,omitempty"`
	Memory       string `yaml:"memory,omitempty" json:"memory,omitempty"`
	Disk         string `yaml:"disk,omitempty" json:"disk,omitempty"`
	MaxSandboxes int    `yaml:"max_sandboxes,omitempty" json:"max_sandboxes,omitempty"`
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

// connectorBlueprintMap maps data source types to their recommended blueprint.
var connectorBlueprintMap = map[string]string{
	"POSTGRES":    "legible-postgres",
	"BIG_QUERY":   "legible-bigquery",
	"SNOWFLAKE":   "legible-snowflake",
	"MYSQL":       "legible-mysql",
	"CLICK_HOUSE": "legible-clickhouse",
	"DUCKDB":      "legible-duckdb",
	"MSSQL":       "legible-mssql",
	"ORACLE":      "legible-oracle",
	"TRINO":       "legible-trino",
	"REDSHIFT":    "legible-redshift",
	"DATABRICKS":  "legible-databricks",
	"ATHENA":      "legible-athena",
	"DB2I":        "legible-db2i",
}

// RecommendedBlueprintForConnector returns the recommended blueprint name
// for a given data source connector type. Returns "legible-default" if
// no connector-specific blueprint exists.
func RecommendedBlueprintForConnector(connectorType string) string {
	if name, ok := connectorBlueprintMap[connectorType]; ok {
		return name
	}
	return "legible-default"
}

// ListConnectorBlueprints returns all connector-to-blueprint mappings.
func ListConnectorBlueprints() map[string]string {
	result := make(map[string]string, len(connectorBlueprintMap))
	for k, v := range connectorBlueprintMap {
		result[k] = v
	}
	return result
}

// BlueprintsForConnector returns all blueprints that support the given connector.
func BlueprintsForConnector(connectorType string) ([]*Blueprint, []string, error) {
	names, err := ListBundledBlueprints()
	if err != nil {
		return nil, nil, err
	}
	var matching []*Blueprint
	var matchingNames []string
	for _, name := range names {
		dir, err := BundledBlueprintDir(name)
		if err != nil {
			continue
		}
		bp, err := LoadBlueprintFromDir(dir)
		if err != nil {
			continue
		}
		if bp.SupportsConnector(connectorType) {
			matching = append(matching, bp)
			matchingNames = append(matchingNames, name)
		}
	}
	return matching, matchingNames, nil
}
