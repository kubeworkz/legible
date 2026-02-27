package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"strconv"
	"text/tabwriter"

	"github.com/spf13/cobra"
)

var apiKeyCmd = &cobra.Command{
	Use:     "api-key",
	Aliases: []string{"apikey", "key"},
	Short:   "Manage organization API keys",
	Long: `Create, list, revoke, and delete API keys for your organization.
API keys are used to authenticate CLI and programmatic access to WrenAI.

The full secret key is only shown once when created — save it securely.

Note: API key management requires session-based (user) authentication.
These commands may not work when authenticating with an API key.`,
}

var apiKeyListCmd = &cobra.Command{
	Use:     "list",
	Aliases: []string{"ls"},
	Short:   "List all API keys",
	RunE:    runApiKeyList,
}

var apiKeyCreateCmd = &cobra.Command{
	Use:   "create <name>",
	Short: "Create a new API key",
	Long: `Create a new API key with the given name. The full secret key
is displayed only once — save it immediately.

Examples:
  wren api-key create "Production Key"
  wren api-key create "CI/CD" --json`,
	Args: cobra.ExactArgs(1),
	RunE: runApiKeyCreate,
}

var apiKeyRevokeCmd = &cobra.Command{
	Use:   "revoke <key-id>",
	Short: "Revoke an API key (disable without deleting)",
	Args:  cobra.ExactArgs(1),
	RunE:  runApiKeyRevoke,
}

var apiKeyDeleteCmd = &cobra.Command{
	Use:   "delete <key-id>",
	Short: "Permanently delete an API key",
	Args:  cobra.ExactArgs(1),
	RunE:  runApiKeyDelete,
}

func init() {
	apiKeyCmd.AddCommand(apiKeyListCmd)
	apiKeyCmd.AddCommand(apiKeyCreateCmd)
	apiKeyCmd.AddCommand(apiKeyRevokeCmd)
	apiKeyCmd.AddCommand(apiKeyDeleteCmd)
	rootCmd.AddCommand(apiKeyCmd)
}

func runApiKeyList(cmd *cobra.Command, args []string) error {
	c, _, err := newClientFromConfig()
	if err != nil {
		return err
	}

	keys, err := c.ListApiKeys()
	if err != nil {
		return err
	}

	if jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(keys)
	}

	if len(keys) == 0 {
		fmt.Println("No API keys found.")
		return nil
	}

	w := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
	fmt.Fprintln(w, "ID\tNAME\tKEY PREFIX\tCREATED\tLAST USED\tSTATUS")
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
		fmt.Fprintf(w, "%d\t%s\t%s\t%s\t%s\t%s\n",
			k.ID, k.Name, k.SecretKeyMasked, created, lastUsed, status)
	}
	w.Flush()

	return nil
}

func runApiKeyCreate(cmd *cobra.Command, args []string) error {
	c, _, err := newClientFromConfig()
	if err != nil {
		return err
	}

	result, err := c.CreateApiKey(args[0])
	if err != nil {
		return err
	}

	if jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(result)
	}

	fmt.Printf("Created API key %q (ID: %d)\n", result.Key.Name, result.Key.ID)
	fmt.Printf("\n  Secret Key: %s\n", result.SecretKey)
	fmt.Printf("\n  ⚠ Save this key now — it will not be shown again.\n")
	return nil
}

func runApiKeyRevoke(cmd *cobra.Command, args []string) error {
	keyID, err := strconv.Atoi(args[0])
	if err != nil {
		return fmt.Errorf("key ID must be a number, got %q", args[0])
	}

	c, _, err := newClientFromConfig()
	if err != nil {
		return err
	}

	if err := c.RevokeApiKey(keyID); err != nil {
		return err
	}

	if jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(map[string]interface{}{"revoked": true, "id": keyID})
	}

	fmt.Printf("Revoked API key %d.\n", keyID)
	return nil
}

func runApiKeyDelete(cmd *cobra.Command, args []string) error {
	keyID, err := strconv.Atoi(args[0])
	if err != nil {
		return fmt.Errorf("key ID must be a number, got %q", args[0])
	}

	c, _, err := newClientFromConfig()
	if err != nil {
		return err
	}

	if err := c.DeleteApiKey(keyID); err != nil {
		return err
	}

	if jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(map[string]interface{}{"deleted": true, "id": keyID})
	}

	fmt.Printf("Deleted API key %d.\n", keyID)
	return nil
}
