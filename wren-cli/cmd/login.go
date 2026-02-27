package cmd

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"github.com/Canner/WrenAI/wren-cli/internal/client"
	"github.com/Canner/WrenAI/wren-cli/internal/config"
	"github.com/spf13/cobra"
)

var loginCmd = &cobra.Command{
	Use:   "login",
	Short: "Authenticate with a WrenAI server",
	Long: `Interactively configure your WrenAI server endpoint and API key.
The credentials are validated against the server before saving.

You can also set values non-interactively:
  wren config set endpoint https://my-wren.example.com
  wren config set api-key osk-abc123...`,
	RunE: runLogin,
}

func init() {
	loginCmd.Flags().String("endpoint", "", "Server endpoint URL (non-interactive)")
	loginCmd.Flags().String("api-key", "", "API key (non-interactive)")
	rootCmd.AddCommand(loginCmd)
}

func runLogin(cmd *cobra.Command, args []string) error {
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("loading config: %w", err)
	}

	endpoint, _ := cmd.Flags().GetString("endpoint")
	apiKey, _ := cmd.Flags().GetString("api-key")

	reader := bufio.NewReader(os.Stdin)

	// Get endpoint
	if endpoint == "" {
		defaultEndpoint := cfg.Endpoint
		if defaultEndpoint == "" {
			defaultEndpoint = "https://localhost:3000"
		}
		fmt.Printf("WrenAI endpoint [%s]: ", defaultEndpoint)
		input, _ := reader.ReadString('\n')
		input = strings.TrimSpace(input)
		if input == "" {
			endpoint = defaultEndpoint
		} else {
			endpoint = input
		}
	}

	// Get API key
	if apiKey == "" {
		fmt.Print("API key (osk-...): ")
		input, _ := reader.ReadString('\n')
		apiKey = strings.TrimSpace(input)
		if apiKey == "" {
			return fmt.Errorf("API key is required")
		}
	}

	// Validate
	fmt.Print("Validating credentials... ")
	c := client.NewWithOverrides(endpoint, apiKey)
	info, err := c.ValidateConnection()
	if err != nil {
		fmt.Println("FAILED")
		return fmt.Errorf("validation failed: %w", err)
	}
	fmt.Println("OK")

	// Save
	cfg.Endpoint = endpoint
	cfg.APIKey = apiKey
	if err := cfg.Save(); err != nil {
		return fmt.Errorf("saving config: %w", err)
	}

	if jsonOutput {
		out := map[string]interface{}{
			"status":   "authenticated",
			"endpoint": endpoint,
			"user":     info.UserEmail,
			"org":      info.OrgName,
		}
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(out)
	}

	fmt.Println()
	fmt.Printf("  Logged in as: %s\n", info.UserEmail)
	if info.OrgName != "" {
		fmt.Printf("  Organization: %s\n", info.OrgName)
	}
	fmt.Printf("  Config saved to: ~/.wren/config.yaml\n")
	return nil
}
