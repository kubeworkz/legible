package cmd

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/Canner/WrenAI/wren-cli/internal/config"
	"github.com/spf13/cobra"
)

var configCmd = &cobra.Command{
	Use:   "config",
	Short: "View and manage CLI configuration",
}

var configGetCmd = &cobra.Command{
	Use:   "get [key]",
	Short: "Display configuration values",
	Long: `Show all config values, or a specific key.

Keys: endpoint, api-key, project-id

Examples:
  wren config get              Show all values
  wren config get endpoint     Show endpoint only`,
	Args: cobra.MaximumNArgs(1),
	RunE: runConfigGet,
}

var configSetCmd = &cobra.Command{
	Use:   "set <key> <value>",
	Short: "Set a configuration value",
	Long: `Set a configuration key to the given value.

Keys: endpoint, api-key, project-id

Examples:
  wren config set endpoint https://wren.example.com
  wren config set api-key osk-abc123...
  wren config set project-id 1`,
	Args: cobra.ExactArgs(2),
	RunE: runConfigSet,
}

func init() {
	configCmd.AddCommand(configGetCmd)
	configCmd.AddCommand(configSetCmd)
	rootCmd.AddCommand(configCmd)
}

func runConfigGet(cmd *cobra.Command, args []string) error {
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("loading config: %w", err)
	}

	if len(args) == 1 {
		val, err := cfg.Get(args[0])
		if err != nil {
			return err
		}
		if jsonOutput {
			out := map[string]string{args[0]: val}
			enc := json.NewEncoder(os.Stdout)
			enc.SetIndent("", "  ")
			return enc.Encode(out)
		}
		fmt.Println(val)
		return nil
	}

	// Show all
	display := cfg.Display()
	if jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(display)
	}

	fmt.Println("Current configuration (~/.wren/config.yaml):")
	fmt.Println()
	for _, key := range []string{"endpoint", "api_key", "project_id"} {
		val := display[key]
		if val == "" {
			val = "(not set)"
		}
		fmt.Printf("  %-12s %s\n", key+":", val)
	}
	return nil
}

func runConfigSet(cmd *cobra.Command, args []string) error {
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("loading config: %w", err)
	}

	key, value := args[0], args[1]
	if err := cfg.Set(key, value); err != nil {
		return err
	}

	if err := cfg.Save(); err != nil {
		return fmt.Errorf("saving config: %w", err)
	}

	if jsonOutput {
		out := map[string]string{"status": "saved", key: value}
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(out)
	}

	fmt.Printf("Set %s = %s\n", key, value)
	return nil
}
