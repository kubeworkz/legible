package cmd

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/Canner/WrenAI/wren-cli/internal/client"
	"github.com/Canner/WrenAI/wren-cli/internal/config"
	"github.com/spf13/cobra"
)

var deployCmd = &cobra.Command{
	Use:   "deploy",
	Short: "Deploy the current project's MDL to the engine",
	Long: `Triggers a deployment of the current project's semantic model (MDL)
to the WrenAI engine. This makes any model changes available for querying.

Examples:
  wren deploy
  wren deploy --force`,
	RunE: runDeploy,
}

var deployStatusCmd = &cobra.Command{
	Use:   "status",
	Short: "Show the current deployment status",
	Long: `Shows the currently deployed MDL hash and model/view counts.
Uses the REST API to fetch the deployed models.`,
	RunE: runDeployStatus,
}

func init() {
	deployCmd.Flags().Bool("force", false, "Force redeployment even if nothing changed")
	deployCmd.AddCommand(deployStatusCmd)
	rootCmd.AddCommand(deployCmd)
}

func runDeploy(cmd *cobra.Command, args []string) error {
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("loading config: %w", err)
	}

	if cfg.ProjectID == "" {
		return fmt.Errorf("no project selected — run: wren project use <id>")
	}

	c, err := client.New(cfg)
	if err != nil {
		return err
	}

	force, _ := cmd.Flags().GetBool("force")

	fmt.Print("Deploying... ")
	result, err := c.Deploy(force)
	if err != nil {
		fmt.Println("FAILED")
		return err
	}
	fmt.Println("OK")

	if jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(result)
	}

	fmt.Printf("Status: %s\n", result.Status)
	return nil
}

func runDeployStatus(cmd *cobra.Command, args []string) error {
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("loading config: %w", err)
	}

	c, err := client.New(cfg)
	if err != nil {
		return err
	}

	mdl, err := c.GetDeployedModels()
	if err != nil {
		return err
	}

	if jsonOutput {
		out := map[string]interface{}{
			"hash":          mdl.Hash,
			"modelCount":    len(mdl.Models),
			"viewCount":     len(mdl.Views),
			"relationCount": len(mdl.Relationships),
		}
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(out)
	}

	fmt.Printf("Deploy Hash:    %s\n", mdl.Hash)
	fmt.Printf("Models:         %d\n", len(mdl.Models))
	fmt.Printf("Views:          %d\n", len(mdl.Views))
	fmt.Printf("Relationships:  %d\n", len(mdl.Relationships))
	return nil
}
