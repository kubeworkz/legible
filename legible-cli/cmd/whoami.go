package cmd

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/Canner/WrenAI/wren-cli/internal/client"
	"github.com/Canner/WrenAI/wren-cli/internal/config"
	"github.com/spf13/cobra"
)

var whoamiCmd = &cobra.Command{
	Use:   "whoami",
	Short: "Display the current authenticated user and organization",
	Long: `Validates the configured API key against the server and displays
the authenticated user, organization, and role information.`,
	RunE: runWhoami,
}

func init() {
	rootCmd.AddCommand(whoamiCmd)
}

func runWhoami(cmd *cobra.Command, args []string) error {
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("loading config: %w", err)
	}

	c, err := client.New(cfg)
	if err != nil {
		return err
	}

	info, err := c.ValidateConnection()
	if err != nil {
		return err
	}

	if jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(info)
	}

	fmt.Printf("Endpoint:     %s\n", cfg.Endpoint)
	fmt.Printf("User:         %s\n", info.UserEmail)
	if info.UserName != "" {
		fmt.Printf("Display Name: %s\n", info.UserName)
	}
	if info.OrgName != "" {
		fmt.Printf("Organization: %s (ID: %d)\n", info.OrgName, info.OrgID)
	}
	if info.Role != "" {
		fmt.Printf("Role:         %s\n", info.Role)
	}
	fmt.Printf("Projects:     %d\n", info.ProjectCount)
	if len(info.ProjectNames) > 0 {
		for _, name := range info.ProjectNames {
			fmt.Printf("              - %s\n", name)
		}
	}
	return nil
}
