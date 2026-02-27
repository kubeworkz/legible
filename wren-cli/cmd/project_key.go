package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"strconv"
	"text/tabwriter"

	"github.com/Canner/WrenAI/wren-cli/internal/config"
	"github.com/spf13/cobra"
)

var projectKeyCmd = &cobra.Command{
	Use:     "project-key",
	Aliases: []string{"pkey", "project-api-key"},
	Short:   "Manage project-scoped API keys",
	Long: `Create, list, revoke, and delete API keys scoped to a specific project.
Project API keys (prefixed with psk-) provide access limited to a single project,
unlike organization API keys (osk-) which grant access across the entire organization.

The full secret key is only shown once when created — save it securely.

Note: Project API key management requires session-based (user) authentication.
These commands may not work when authenticating with an API key.`,
}

var projectKeyListCmd = &cobra.Command{
	Use:     "list",
	Aliases: []string{"ls"},
	Short:   "List all API keys for a project",
	Long: `List all API keys for the current project (from config) or a specified project.

Examples:
  wren project-key list
  wren project-key list --project-id 2`,
	RunE: runProjectKeyList,
}

var projectKeyCreateCmd = &cobra.Command{
	Use:   "create <name>",
	Short: "Create a new project API key",
	Long: `Create a new API key scoped to the current project. The full secret key
is displayed only once — save it immediately.

Examples:
  wren project-key create "CI/CD Key"
  wren project-key create "Read-Only" --project-id 2`,
	Args: cobra.ExactArgs(1),
	RunE: runProjectKeyCreate,
}

var projectKeyRevokeCmd = &cobra.Command{
	Use:   "revoke <key-id>",
	Short: "Revoke a project API key (disable without deleting)",
	Args:  cobra.ExactArgs(1),
	RunE:  runProjectKeyRevoke,
}

var projectKeyDeleteCmd = &cobra.Command{
	Use:   "delete <key-id>",
	Short: "Permanently delete a project API key",
	Args:  cobra.ExactArgs(1),
	RunE:  runProjectKeyDelete,
}

var projectKeyProjectID int

func init() {
	// Add --project-id flag to all subcommands, defaulting to 0 (use config)
	projectKeyListCmd.Flags().IntVar(&projectKeyProjectID, "project-id", 0, "Project ID (defaults to current project from config)")
	projectKeyCreateCmd.Flags().IntVar(&projectKeyProjectID, "project-id", 0, "Project ID (defaults to current project from config)")
	projectKeyRevokeCmd.Flags().IntVar(&projectKeyProjectID, "project-id", 0, "Project ID (defaults to current project from config)")
	projectKeyDeleteCmd.Flags().IntVar(&projectKeyProjectID, "project-id", 0, "Project ID (defaults to current project from config)")

	projectKeyCmd.AddCommand(projectKeyListCmd)
	projectKeyCmd.AddCommand(projectKeyCreateCmd)
	projectKeyCmd.AddCommand(projectKeyRevokeCmd)
	projectKeyCmd.AddCommand(projectKeyDeleteCmd)
	rootCmd.AddCommand(projectKeyCmd)
}

func resolveProjectKeyPID(cfg *config.Config) (int, error) {
	if projectKeyProjectID > 0 {
		return projectKeyProjectID, nil
	}
	if cfg.ProjectID == "" {
		return 0, fmt.Errorf("no project ID specified; use --project-id or set via 'wren project use <id>'")
	}
	pid, err := strconv.Atoi(cfg.ProjectID)
	if err != nil {
		return 0, fmt.Errorf("invalid project ID in config: %q", cfg.ProjectID)
	}
	return pid, nil
}

func runProjectKeyList(cmd *cobra.Command, args []string) error {
	c, cfg, err := newClientFromConfig()
	if err != nil {
		return err
	}

	pid, err := resolveProjectKeyPID(cfg)
	if err != nil {
		return err
	}

	keys, err := c.ListProjectApiKeys(pid)
	if err != nil {
		return err
	}

	if jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(keys)
	}

	if len(keys) == 0 {
		fmt.Printf("No project API keys found for project %d.\n", pid)
		return nil
	}

	w := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
	fmt.Fprintln(w, "ID\tNAME\tKEY PREFIX\tPROJECT\tCREATED\tLAST USED\tSTATUS")
	for _, k := range keys {
		lastUsed := "-"
		if k.LastUsedAt != "" {
			lu := k.LastUsedAt
			if len(lu) > 10 {
				lu = lu[:10]
			}
			lastUsed = lu
		}
		status := "active"
		if k.RevokedAt != "" {
			status = "revoked"
		}
		created := k.CreatedAt
		if len(created) > 10 {
			created = created[:10]
		}
		fmt.Fprintf(w, "%d\t%s\t%s\t%d\t%s\t%s\t%s\n",
			k.ID, k.Name, k.SecretKeyMasked, k.ProjectID, created, lastUsed, status)
	}
	w.Flush()

	return nil
}

func runProjectKeyCreate(cmd *cobra.Command, args []string) error {
	c, cfg, err := newClientFromConfig()
	if err != nil {
		return err
	}

	pid, err := resolveProjectKeyPID(cfg)
	if err != nil {
		return err
	}

	result, err := c.CreateProjectApiKey(pid, args[0])
	if err != nil {
		return err
	}

	if jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(result)
	}

	fmt.Printf("Created project API key %q (ID: %d, Project: %d)\n",
		result.Key.Name, result.Key.ID, result.Key.ProjectID)
	fmt.Printf("\n  Secret Key: %s\n", result.SecretKey)
	fmt.Printf("\n  ⚠ Save this key now — it will not be shown again.\n")
	return nil
}

func runProjectKeyRevoke(cmd *cobra.Command, args []string) error {
	keyID, err := strconv.Atoi(args[0])
	if err != nil {
		return fmt.Errorf("key ID must be a number, got %q", args[0])
	}

	c, cfg, err := newClientFromConfig()
	if err != nil {
		return err
	}

	pid, err := resolveProjectKeyPID(cfg)
	if err != nil {
		return err
	}

	if err := c.RevokeProjectApiKey(keyID, pid); err != nil {
		return err
	}

	if jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(map[string]interface{}{"revoked": true, "id": keyID, "projectId": pid})
	}

	fmt.Printf("Revoked project API key %d.\n", keyID)
	return nil
}

func runProjectKeyDelete(cmd *cobra.Command, args []string) error {
	keyID, err := strconv.Atoi(args[0])
	if err != nil {
		return fmt.Errorf("key ID must be a number, got %q", args[0])
	}

	c, cfg, err := newClientFromConfig()
	if err != nil {
		return err
	}

	pid, err := resolveProjectKeyPID(cfg)
	if err != nil {
		return err
	}

	if err := c.DeleteProjectApiKey(keyID, pid); err != nil {
		return err
	}

	if jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(map[string]interface{}{"deleted": true, "id": keyID, "projectId": pid})
	}

	fmt.Printf("Deleted project API key %d.\n", keyID)
	return nil
}
