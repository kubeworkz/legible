package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"text/tabwriter"

	"github.com/Canner/WrenAI/wren-cli/internal/client"
	"github.com/Canner/WrenAI/wren-cli/internal/config"
	"github.com/spf13/cobra"
)

var viewCmd = &cobra.Command{
	Use:     "view",
	Aliases: []string{"views"},
	Short:   "Manage and inspect views",
}

var viewListCmd = &cobra.Command{
	Use:     "list",
	Aliases: []string{"ls"},
	Short:   "List all views in the current project",
	RunE:    runViewList,
}

func init() {
	viewCmd.AddCommand(viewListCmd)
	rootCmd.AddCommand(viewCmd)
}

func runViewList(cmd *cobra.Command, args []string) error {
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

	views, err := c.ListViews()
	if err != nil {
		return err
	}

	if jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(views)
	}

	if len(views) == 0 {
		fmt.Println("No views found in this project.")
		return nil
	}

	w := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
	fmt.Fprintln(w, "ID\tNAME\tDISPLAY NAME\tSTATEMENT")
	for _, v := range views {
		stmt := v.Statement
		if len(stmt) > 60 {
			stmt = stmt[:57] + "..."
		}
		fmt.Fprintf(w, "%d\t%s\t%s\t%s\n", v.ID, v.Name, v.DisplayName, stmt)
	}
	w.Flush()

	return nil
}
