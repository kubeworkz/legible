package cmd

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"text/tabwriter"

	"github.com/Kubeworkz/legible/legible-cli/internal/agent"
	"github.com/spf13/cobra"
)

var blueprintCmd = &cobra.Command{
	Use:   "blueprint",
	Short: "Manage agent blueprints",
	Long: `Manage NemoClaw-compatible agent blueprints. Blueprints define the
sandbox image, inference profiles, network policies, and agent configuration
used when creating sandboxed agents.

Legible ships two built-in blueprints:
  legible-default   Full-featured agent with MCP + package manager access
  legible-analyst   Restricted read-only SQL query agent`,
}

var blueprintListCmd = &cobra.Command{
	Use:   "list",
	Short: "List available blueprints",
	RunE:  runBlueprintList,
}

var blueprintShowCmd = &cobra.Command{
	Use:   "show [name]",
	Short: "Show blueprint details",
	Long: `Display the full configuration of a blueprint.

Examples:
  legible blueprint show legible-default
  legible blueprint show legible-analyst
  legible blueprint show ./path/to/custom-blueprint`,
	Args: cobra.ExactArgs(1),
	RunE: runBlueprintShow,
}

var blueprintValidateCmd = &cobra.Command{
	Use:   "validate [path]",
	Short: "Validate a blueprint YAML file",
	Long: `Parse and validate a blueprint.yaml file.

Examples:
  legible blueprint validate ./my-blueprint/blueprint.yaml
  legible blueprint validate ./my-blueprint/`,
	Args: cobra.ExactArgs(1),
	RunE: runBlueprintValidate,
}

var blueprintInstallCmd = &cobra.Command{
	Use:   "install [path] [name]",
	Short: "Install a custom blueprint locally",
	Long: `Copy a blueprint directory to ~/.legible/blueprints/ so it can be
used with 'legible agent create --blueprint <name>'.

Examples:
  legible blueprint install ./my-blueprint my-custom
  legible blueprint install /path/to/blueprint custom-analyst`,
	Args: cobra.ExactArgs(2),
	RunE: runBlueprintInstall,
}

var blueprintRecommendCmd = &cobra.Command{
	Use:   "recommend [connector-type]",
	Short: "Recommend a blueprint for a data source",
	Long: `Show the recommended blueprint for a given data source connector type.

Supported connector types:
  POSTGRES, BIG_QUERY, SNOWFLAKE, MYSQL, CLICK_HOUSE, DUCKDB,
  MSSQL, ORACLE, TRINO, REDSHIFT, DATABRICKS, ATHENA

Examples:
  legible blueprint recommend POSTGRES
  legible blueprint recommend SNOWFLAKE`,
	Args: cobra.ExactArgs(1),
	RunE: runBlueprintRecommend,
}

var blueprintForConnectorCmd = &cobra.Command{
	Use:   "for-connector [connector-type]",
	Short: "List blueprints compatible with a connector",
	Long: `List all available blueprints that support the given connector type.

Examples:
  legible blueprint for-connector POSTGRES
  legible blueprint for-connector BIG_QUERY`,
	Args: cobra.ExactArgs(1),
	RunE: runBlueprintForConnector,
}

func init() {
	blueprintCmd.AddCommand(blueprintListCmd)
	blueprintCmd.AddCommand(blueprintShowCmd)
	blueprintCmd.AddCommand(blueprintValidateCmd)
	blueprintCmd.AddCommand(blueprintInstallCmd)
	blueprintCmd.AddCommand(blueprintRecommendCmd)
	blueprintCmd.AddCommand(blueprintForConnectorCmd)
	rootCmd.AddCommand(blueprintCmd)
}

func runBlueprintList(cmd *cobra.Command, args []string) error {
	names, err := agent.ListBundledBlueprints()
	if err != nil {
		return err
	}

	if len(names) == 0 {
		fmt.Println("No blueprints found.")
		fmt.Println("Install one with: legible blueprint install <path> <name>")
		return nil
	}

	w := tabwriter.NewWriter(os.Stdout, 0, 4, 2, ' ', 0)
	fmt.Fprintln(w, "NAME\tVERSION\tCONNECTORS\tDESCRIPTION")
	for _, name := range names {
		dir, err := agent.BundledBlueprintDir(name)
		if err != nil {
			continue
		}
		bp, err := agent.LoadBlueprintFromDir(dir)
		if err != nil {
			fmt.Fprintf(w, "%s\t%s\t%s\t%s\n", name, "?", "?", "(error loading)")
			continue
		}
		desc := strings.TrimSpace(bp.Description)
		// Truncate to first line
		if idx := strings.Index(desc, "\n"); idx > 0 {
			desc = desc[:idx]
		}
		if len(desc) > 60 {
			desc = desc[:57] + "..."
		}
		connectors := "all"
		if len(bp.SupportedConnectors) > 0 {
			connectors = strings.Join(bp.SupportedConnectors, ",")
			if len(connectors) > 30 {
				connectors = fmt.Sprintf("%d types", len(bp.SupportedConnectors))
			}
		}
		fmt.Fprintf(w, "%s\t%s\t%s\t%s\n", name, bp.Version, connectors, desc)
	}
	w.Flush()
	return nil
}

func runBlueprintShow(cmd *cobra.Command, args []string) error {
	nameOrPath := args[0]

	bp, err := loadBlueprintByNameOrPath(nameOrPath)
	if err != nil {
		return err
	}

	fmt.Printf("Blueprint: %s\n", nameOrPath)
	fmt.Printf("  Version:     %s\n", bp.Version)
	if bp.MinOpenshellVersion != "" {
		fmt.Printf("  Min OpenShell: %s\n", bp.MinOpenshellVersion)
	}
	fmt.Printf("  Description: %s\n", strings.TrimSpace(bp.Description))
	if len(bp.SupportedConnectors) > 0 {
		fmt.Printf("  Connectors:  %s\n", strings.Join(bp.SupportedConnectors, ", "))
	}
	fmt.Println()

	fmt.Println("  Sandbox:")
	fmt.Printf("    Image: %s\n", bp.Components.Sandbox.Image)
	fmt.Printf("    Name:  %s\n", bp.Components.Sandbox.Name)
	if len(bp.Components.Sandbox.ForwardPorts) > 0 {
		fmt.Printf("    Ports: %v\n", bp.Components.Sandbox.ForwardPorts)
	}
	fmt.Println()

	fmt.Println("  Inference Profiles:")
	for name, profile := range bp.Components.Inference.Profiles {
		fmt.Printf("    %s: %s (%s via %s)\n", name, profile.Model, profile.ProviderType, profile.Endpoint)
	}
	fmt.Println()

	fmt.Println("  Agent:")
	fmt.Printf("    Type: %s\n", bp.Agent.Type)
	if len(bp.Agent.AllowedTypes) > 0 {
		fmt.Printf("    Allowed: %s\n", strings.Join(bp.Agent.AllowedTypes, ", "))
	}
	fmt.Println()

	fmt.Println("  Policies:")
	fmt.Printf("    Network: %s\n", bp.Policies.Network)
	if bp.Policies.Process != nil {
		fmt.Printf("    Privilege escalation: deny=%v\n", bp.Policies.Process.DenyPrivilegeEscalation)
	}

	return nil
}

func runBlueprintValidate(cmd *cobra.Command, args []string) error {
	path := args[0]

	// If path is a directory, look for blueprint.yaml inside it
	info, err := os.Stat(path)
	if err != nil {
		return fmt.Errorf("path not found: %s", path)
	}
	if info.IsDir() {
		path = filepath.Join(path, "blueprint.yaml")
	}

	bp, err := agent.LoadBlueprint(path)
	if err != nil {
		return fmt.Errorf("invalid blueprint: %w", err)
	}

	var errors []string
	if bp.Version == "" {
		errors = append(errors, "missing 'version'")
	}
	if bp.Components.Sandbox.Image == "" {
		errors = append(errors, "missing 'components.sandbox.image'")
	}
	if bp.Components.Sandbox.Name == "" {
		errors = append(errors, "missing 'components.sandbox.name'")
	}
	if len(bp.Components.Inference.Profiles) == 0 {
		errors = append(errors, "no inference profiles defined")
	}
	if bp.Agent.Type == "" {
		errors = append(errors, "missing 'agent.type'")
	}
	if bp.Policies.Network == "" {
		errors = append(errors, "missing 'policies.network'")
	}

	if len(errors) > 0 {
		fmt.Println("Blueprint validation FAILED:")
		for _, e := range errors {
			fmt.Printf("  - %s\n", e)
		}
		return fmt.Errorf("blueprint has %d validation error(s)", len(errors))
	}

	fmt.Printf("Blueprint %q is valid (v%s)\n", filepath.Base(filepath.Dir(path)), bp.Version)
	return nil
}

func runBlueprintInstall(cmd *cobra.Command, args []string) error {
	srcPath := args[0]
	name := args[1]

	// Validate the source blueprint first
	info, err := os.Stat(srcPath)
	if err != nil {
		return fmt.Errorf("source path not found: %s", srcPath)
	}
	if !info.IsDir() {
		return fmt.Errorf("source must be a directory containing blueprint.yaml")
	}

	bpPath := filepath.Join(srcPath, "blueprint.yaml")
	if _, err := os.Stat(bpPath); err != nil {
		return fmt.Errorf("no blueprint.yaml found in %s", srcPath)
	}

	// Validate it parses
	if _, err := agent.LoadBlueprint(bpPath); err != nil {
		return fmt.Errorf("invalid blueprint: %w", err)
	}

	// Install to ~/.legible/blueprints/<name>/
	home, err := os.UserHomeDir()
	if err != nil {
		return fmt.Errorf("cannot determine home directory: %w", err)
	}
	destDir := filepath.Join(home, ".legible", "blueprints", name)

	if _, err := os.Stat(destDir); err == nil {
		return fmt.Errorf("blueprint %q already installed at %s — remove it first", name, destDir)
	}

	if err := copyDir(srcPath, destDir); err != nil {
		return fmt.Errorf("installing blueprint: %w", err)
	}

	fmt.Printf("Blueprint %q installed to %s\n", name, destDir)
	fmt.Printf("Use it with: legible agent create <name> --blueprint %s\n", name)
	return nil
}

func runBlueprintRecommend(cmd *cobra.Command, args []string) error {
	connectorType := strings.ToUpper(args[0])
	recommended := agent.RecommendedBlueprintForConnector(connectorType)

	fmt.Printf("Recommended blueprint for %s: %s\n", connectorType, recommended)

	dir, err := agent.BundledBlueprintDir(recommended)
	if err != nil {
		fmt.Printf("\nNote: Blueprint %q is not installed locally.\n", recommended)
		return nil
	}

	bp, err := agent.LoadBlueprintFromDir(dir)
	if err != nil {
		return nil
	}

	fmt.Printf("  Version:     %s\n", bp.Version)
	fmt.Printf("  Description: %s\n", strings.TrimSpace(bp.Description))
	if bp.Components.Tools != nil && len(bp.Components.Tools.Install) > 0 {
		fmt.Printf("  Tools:       %s\n", strings.Join(bp.Components.Tools.Install, ", "))
	}
	fmt.Println()
	fmt.Printf("Create an agent with:\n  legible agent create my-%s-agent --blueprint %s\n",
		strings.ToLower(strings.ReplaceAll(connectorType, "_", "-")), recommended)
	return nil
}

func runBlueprintForConnector(cmd *cobra.Command, args []string) error {
	connectorType := strings.ToUpper(args[0])

	_, matchingNames, err := agent.BlueprintsForConnector(connectorType)
	if err != nil {
		return err
	}

	if len(matchingNames) == 0 {
		fmt.Printf("No blueprints found for connector %s.\n", connectorType)
		fmt.Printf("The default blueprint (legible-default) supports all connectors.\n")
		return nil
	}

	recommended := agent.RecommendedBlueprintForConnector(connectorType)

	w := tabwriter.NewWriter(os.Stdout, 0, 4, 2, ' ', 0)
	fmt.Fprintf(w, "Blueprints supporting %s:\n\n", connectorType)
	fmt.Fprintln(w, "NAME\tVERSION\tRECOMMENDED\tDESCRIPTION")

	for _, name := range matchingNames {
		dir, err := agent.BundledBlueprintDir(name)
		if err != nil {
			continue
		}
		bp, err := agent.LoadBlueprintFromDir(dir)
		if err != nil {
			continue
		}
		desc := strings.TrimSpace(bp.Description)
		if idx := strings.Index(desc, "\n"); idx > 0 {
			desc = desc[:idx]
		}
		if len(desc) > 50 {
			desc = desc[:47] + "..."
		}
		rec := ""
		if name == recommended {
			rec = "★"
		}
		fmt.Fprintf(w, "%s\t%s\t%s\t%s\n", name, bp.Version, rec, desc)
	}
	w.Flush()
	return nil
}

// loadBlueprintByNameOrPath loads a blueprint from either a bundled name or a filesystem path.
func loadBlueprintByNameOrPath(nameOrPath string) (*agent.Blueprint, error) {
	// Try as a bundled blueprint name first
	dir, err := agent.BundledBlueprintDir(nameOrPath)
	if err == nil {
		return agent.LoadBlueprintFromDir(dir)
	}

	// Try as a path
	info, statErr := os.Stat(nameOrPath)
	if statErr != nil {
		return nil, fmt.Errorf("blueprint %q not found (not a bundled name or valid path)", nameOrPath)
	}

	if info.IsDir() {
		return agent.LoadBlueprintFromDir(nameOrPath)
	}
	return agent.LoadBlueprint(nameOrPath)
}

// copyDir recursively copies a directory.
func copyDir(src, dst string) error {
	return filepath.Walk(src, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		relPath, err := filepath.Rel(src, path)
		if err != nil {
			return err
		}
		destPath := filepath.Join(dst, relPath)

		if info.IsDir() {
			return os.MkdirAll(destPath, 0755)
		}

		data, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		return os.WriteFile(destPath, data, info.Mode())
	})
}
