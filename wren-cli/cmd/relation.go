package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"strconv"
	"text/tabwriter"

	"github.com/spf13/cobra"
)

var relationCmd = &cobra.Command{
	Use:     "relation",
	Aliases: []string{"relations", "rel"},
	Short:   "Manage model relationships",
	Long: `Relationships define how models are connected through foreign key
associations. They enable the AI to generate JOINs when answering
questions that span multiple models.

Relationship types:
  ONE_TO_ONE   — Each row in model A relates to at most one row in model B
  ONE_TO_MANY  — Each row in model A relates to many rows in model B
  MANY_TO_ONE  — Many rows in model A relate to one row in model B`,
}

var relationListCmd = &cobra.Command{
	Use:     "list",
	Aliases: []string{"ls"},
	Short:   "List all relationships",
	RunE:    runRelationList,
}

var relationCreateCmd = &cobra.Command{
	Use:   "create",
	Short: "Create a new relationship between models",
	Long: `Create a relationship between two model columns.

Use 'wren model list' to find model IDs and 'wren model fields <id>'
to find column/field IDs.

Examples:
  wren relation create --from-model 3 --from-column 12 --to-model 1 --to-column 1 --type ONE_TO_MANY`,
	RunE: runRelationCreate,
}

var relationUpdateCmd = &cobra.Command{
	Use:   "update <relation-id>",
	Short: "Update a relationship's type",
	Long: `Change the type of an existing relationship.

Examples:
  wren relation update 5 --type MANY_TO_ONE`,
	Args: cobra.ExactArgs(1),
	RunE: runRelationUpdate,
}

var relationDeleteCmd = &cobra.Command{
	Use:   "delete <relation-id>",
	Short: "Delete a relationship",
	Long: `Delete a relationship by ID. Use 'wren relation list' to find IDs.

Examples:
  wren relation delete 5`,
	Args: cobra.ExactArgs(1),
	RunE: runRelationDelete,
}

var (
	relFromModel  int
	relFromColumn int
	relToModel    int
	relToColumn   int
	relType       string
)

func init() {
	relationCreateCmd.Flags().IntVar(&relFromModel, "from-model", 0, "Source model ID (required)")
	relationCreateCmd.Flags().IntVar(&relFromColumn, "from-column", 0, "Source column/field ID (required)")
	relationCreateCmd.Flags().IntVar(&relToModel, "to-model", 0, "Target model ID (required)")
	relationCreateCmd.Flags().IntVar(&relToColumn, "to-column", 0, "Target column/field ID (required)")
	relationCreateCmd.Flags().StringVar(&relType, "type", "", "Relationship type: ONE_TO_ONE, ONE_TO_MANY, MANY_TO_ONE (required)")
	relationCreateCmd.MarkFlagRequired("from-model")
	relationCreateCmd.MarkFlagRequired("from-column")
	relationCreateCmd.MarkFlagRequired("to-model")
	relationCreateCmd.MarkFlagRequired("to-column")
	relationCreateCmd.MarkFlagRequired("type")

	relationUpdateCmd.Flags().StringVar(&relType, "type", "", "New relationship type (required)")
	relationUpdateCmd.MarkFlagRequired("type")

	relationCmd.AddCommand(relationListCmd)
	relationCmd.AddCommand(relationCreateCmd)
	relationCmd.AddCommand(relationUpdateCmd)
	relationCmd.AddCommand(relationDeleteCmd)
	rootCmd.AddCommand(relationCmd)
}

func runRelationList(cmd *cobra.Command, args []string) error {
	c, cfg, err := newClientFromConfig()
	if err != nil {
		return err
	}
	if cfg.ProjectID == "" {
		return fmt.Errorf("no project selected — run: wren project use <id>")
	}

	relations, err := c.ListRelations()
	if err != nil {
		return err
	}

	if jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(relations)
	}

	if len(relations) == 0 {
		fmt.Println("No relationships found.")
		return nil
	}

	w := tabwriter.NewWriter(os.Stdout, 0, 4, 2, ' ', 0)
	fmt.Fprintln(w, "ID\tTYPE\tFROM\tTO")
	for _, r := range relations {
		from := fmt.Sprintf("%s.%s", r.FromModelDisplayName, r.FromColumnDisplayName)
		to := fmt.Sprintf("%s.%s", r.ToModelDisplayName, r.ToColumnDisplayName)
		fmt.Fprintf(w, "%d\t%s\t%s\t%s\n", r.RelationID, r.Type, from, to)
	}
	w.Flush()

	return nil
}

func runRelationCreate(cmd *cobra.Command, args []string) error {
	c, cfg, err := newClientFromConfig()
	if err != nil {
		return err
	}
	if cfg.ProjectID == "" {
		return fmt.Errorf("no project selected — run: wren project use <id>")
	}

	// Validate type
	if !isValidRelationType(relType) {
		return fmt.Errorf("invalid type %q — must be ONE_TO_ONE, ONE_TO_MANY, or MANY_TO_ONE", relType)
	}

	if err := c.CreateRelation(relFromModel, relFromColumn, relToModel, relToColumn, relType); err != nil {
		return err
	}

	if !jsonOutput {
		fmt.Println("Relationship created successfully.")
	}
	return nil
}

func runRelationUpdate(cmd *cobra.Command, args []string) error {
	c, cfg, err := newClientFromConfig()
	if err != nil {
		return err
	}
	if cfg.ProjectID == "" {
		return fmt.Errorf("no project selected — run: wren project use <id>")
	}

	id, err := strconv.Atoi(args[0])
	if err != nil {
		return fmt.Errorf("invalid relation ID: %s", args[0])
	}

	if !isValidRelationType(relType) {
		return fmt.Errorf("invalid type %q — must be ONE_TO_ONE, ONE_TO_MANY, or MANY_TO_ONE", relType)
	}

	if err := c.UpdateRelation(id, relType); err != nil {
		return err
	}

	if !jsonOutput {
		fmt.Printf("Updated relation %d to %s\n", id, relType)
	}
	return nil
}

func runRelationDelete(cmd *cobra.Command, args []string) error {
	c, cfg, err := newClientFromConfig()
	if err != nil {
		return err
	}
	if cfg.ProjectID == "" {
		return fmt.Errorf("no project selected — run: wren project use <id>")
	}

	id, err := strconv.Atoi(args[0])
	if err != nil {
		return fmt.Errorf("invalid relation ID: %s", args[0])
	}

	if err := c.DeleteRelation(id); err != nil {
		return err
	}

	if !jsonOutput {
		fmt.Printf("Deleted relation %d\n", id)
	}
	return nil
}

func isValidRelationType(t string) bool {
	return t == "ONE_TO_ONE" || t == "ONE_TO_MANY" || t == "MANY_TO_ONE"
}
