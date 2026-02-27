package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"strconv"
	"text/tabwriter"

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

var viewShowCmd = &cobra.Command{
	Use:   "show <view-id>",
	Short: "Show details of a specific view",
	Args:  cobra.ExactArgs(1),
	RunE:  runViewShow,
}

var viewCreateCmd = &cobra.Command{
	Use:   "create",
	Short: "Create a view from a thread response",
	Long: `Create a new view by saving a SQL query from a thread response.
Requires the --name and --response-id flags.

Examples:
  wren view create --name "top_customers" --response-id 42`,
	RunE: runViewCreate,
}

var viewDeleteCmd = &cobra.Command{
	Use:   "delete <view-id>",
	Short: "Delete a view",
	Args:  cobra.ExactArgs(1),
	RunE:  runViewDelete,
}

func init() {
	viewCreateCmd.Flags().String("name", "", "Name for the new view (required)")
	viewCreateCmd.Flags().Int("response-id", 0, "Thread response ID to create view from (required)")
	viewCreateCmd.MarkFlagRequired("name")
	viewCreateCmd.MarkFlagRequired("response-id")

	viewCmd.AddCommand(viewListCmd)
	viewCmd.AddCommand(viewShowCmd)
	viewCmd.AddCommand(viewCreateCmd)
	viewCmd.AddCommand(viewDeleteCmd)
	rootCmd.AddCommand(viewCmd)
}

func runViewList(cmd *cobra.Command, args []string) error {
	c, _, err := newClientFromConfig()
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

func runViewShow(cmd *cobra.Command, args []string) error {
	viewID, err := strconv.Atoi(args[0])
	if err != nil {
		return fmt.Errorf("view ID must be a number, got %q", args[0])
	}

	c, _, err := newClientFromConfig()
	if err != nil {
		return err
	}

	view, err := c.GetView(viewID)
	if err != nil {
		return err
	}

	if jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(view)
	}

	fmt.Printf("ID:           %d\n", view.ID)
	fmt.Printf("Name:         %s\n", view.Name)
	if view.DisplayName != "" {
		fmt.Printf("Display Name: %s\n", view.DisplayName)
	}
	fmt.Printf("Statement:\n  %s\n", view.Statement)
	return nil
}

func runViewCreate(cmd *cobra.Command, args []string) error {
	name, _ := cmd.Flags().GetString("name")
	responseID, _ := cmd.Flags().GetInt("response-id")

	c, _, err := newClientFromConfig()
	if err != nil {
		return err
	}

	view, err := c.CreateView(name, responseID)
	if err != nil {
		return err
	}

	if jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(view)
	}

	fmt.Printf("Created view %q (ID: %d)\n", view.Name, view.ID)
	return nil
}

func runViewDelete(cmd *cobra.Command, args []string) error {
	viewID, err := strconv.Atoi(args[0])
	if err != nil {
		return fmt.Errorf("view ID must be a number, got %q", args[0])
	}

	c, _, err := newClientFromConfig()
	if err != nil {
		return err
	}

	if err := c.DeleteView(viewID); err != nil {
		return err
	}

	if jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(map[string]interface{}{"deleted": true, "id": viewID})
	}

	fmt.Printf("Deleted view %d.\n", viewID)
	return nil
}
