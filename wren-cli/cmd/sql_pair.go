package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"strconv"
	"strings"
	"text/tabwriter"

	"github.com/Canner/WrenAI/wren-cli/internal/client"
	"github.com/spf13/cobra"
)

var sqlPairCmd = &cobra.Command{
	Use:     "sql-pair",
	Aliases: []string{"sql-pairs"},
	Short:   "Manage knowledge SQL pairs",
	Long: `SQL pairs teach the AI known question-to-SQL mappings.
When a user asks a question similar to one in a SQL pair, the AI
can use the paired SQL as a reference for generating the answer.`,
}

var sqlPairListCmd = &cobra.Command{
	Use:     "list",
	Aliases: []string{"ls"},
	Short:   "List all SQL pairs",
	RunE:    runSqlPairList,
}

var sqlPairCreateCmd = &cobra.Command{
	Use:   "create",
	Short: "Create a new SQL pair",
	Long: `Create a new question-SQL pair. The SQL is validated against
the deployed manifest before saving.

Examples:
  wren sql-pair create --question "Total revenue" --sql 'SELECT sum(revenue) FROM "orders"'
  wren sql-pair create -q "Count customers" -s 'SELECT count(*) FROM "olist_customers_dataset"'`,
	RunE: runSqlPairCreate,
}

var sqlPairShowCmd = &cobra.Command{
	Use:   "show <id>",
	Short: "Show details of a SQL pair",
	Args:  cobra.ExactArgs(1),
	RunE:  runSqlPairShow,
}

var sqlPairUpdateCmd = &cobra.Command{
	Use:   "update <id>",
	Short: "Update an existing SQL pair",
	Long: `Update a SQL pair's question and/or SQL. If SQL is updated, it
is re-validated against the deployed manifest.

Examples:
  wren sql-pair update 1 --question "Updated question"
  wren sql-pair update 1 --sql 'SELECT new_query FROM "table"'`,
	Args: cobra.ExactArgs(1),
	RunE: runSqlPairUpdate,
}

var sqlPairDeleteCmd = &cobra.Command{
	Use:   "delete <id>",
	Short: "Delete a SQL pair",
	Long: `Delete a SQL pair by ID.

Examples:
  wren sql-pair delete 1`,
	Args: cobra.ExactArgs(1),
	RunE: runSqlPairDelete,
}

var (
	spQuestion string
	spSQL      string
)

func init() {
	sqlPairCreateCmd.Flags().StringVarP(&spQuestion, "question", "q", "", "Natural language question (required)")
	sqlPairCreateCmd.Flags().StringVarP(&spSQL, "sql", "s", "", "SQL query (required)")
	sqlPairCreateCmd.MarkFlagRequired("question")
	sqlPairCreateCmd.MarkFlagRequired("sql")

	sqlPairUpdateCmd.Flags().StringVarP(&spQuestion, "question", "q", "", "Updated question")
	sqlPairUpdateCmd.Flags().StringVarP(&spSQL, "sql", "s", "", "Updated SQL query")

	sqlPairCmd.AddCommand(sqlPairListCmd)
	sqlPairCmd.AddCommand(sqlPairCreateCmd)
	sqlPairCmd.AddCommand(sqlPairShowCmd)
	sqlPairCmd.AddCommand(sqlPairUpdateCmd)
	sqlPairCmd.AddCommand(sqlPairDeleteCmd)
	rootCmd.AddCommand(sqlPairCmd)
}

func runSqlPairList(cmd *cobra.Command, args []string) error {
	c, cfg, err := newClientFromConfig()
	if err != nil {
		return err
	}
	if cfg.ProjectID == "" {
		return fmt.Errorf("no project selected — run: wren project use <id>")
	}

	pairs, err := c.ListSqlPairs()
	if err != nil {
		return err
	}

	if jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(pairs)
	}

	if len(pairs) == 0 {
		fmt.Println("No SQL pairs found.")
		return nil
	}

	w := tabwriter.NewWriter(os.Stdout, 0, 4, 2, ' ', 0)
	fmt.Fprintln(w, "ID\tQUESTION\tSQL")
	for _, p := range pairs {
		question := truncate(p.Question, 45)
		sql := truncate(strings.ReplaceAll(p.SQL, "\n", " "), 50)
		fmt.Fprintf(w, "%d\t%s\t%s\n", p.ID, question, sql)
	}
	w.Flush()

	return nil
}

func runSqlPairCreate(cmd *cobra.Command, args []string) error {
	c, cfg, err := newClientFromConfig()
	if err != nil {
		return err
	}
	if cfg.ProjectID == "" {
		return fmt.Errorf("no project selected — run: wren project use <id>")
	}

	req := &client.CreateSqlPairRequest{
		SQL:      spSQL,
		Question: spQuestion,
	}

	result, err := c.CreateSqlPair(req)
	if err != nil {
		return err
	}

	if jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(result)
	}

	fmt.Printf("Created SQL pair %d\n", result.ID)
	return nil
}

func runSqlPairShow(cmd *cobra.Command, args []string) error {
	c, cfg, err := newClientFromConfig()
	if err != nil {
		return err
	}
	if cfg.ProjectID == "" {
		return fmt.Errorf("no project selected — run: wren project use <id>")
	}

	// List all and find by ID (no individual get endpoint)
	pairs, err := c.ListSqlPairs()
	if err != nil {
		return err
	}

	id, err := strconv.Atoi(args[0])
	if err != nil {
		return fmt.Errorf("invalid SQL pair ID: %s", args[0])
	}

	var found *client.SqlPair
	for i, p := range pairs {
		if p.ID == id {
			found = &pairs[i]
			break
		}
	}
	if found == nil {
		return fmt.Errorf("SQL pair %d not found", id)
	}

	if jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(found)
	}

	fmt.Printf("ID:       %d\n", found.ID)
	fmt.Printf("Question: %s\n", found.Question)
	fmt.Printf("SQL:\n%s\n", found.SQL)
	if found.CreatedAt != "" {
		fmt.Printf("Created:  %s\n", found.CreatedAt)
	}
	if found.UpdatedAt != "" {
		fmt.Printf("Updated:  %s\n", found.UpdatedAt)
	}
	return nil
}

func runSqlPairUpdate(cmd *cobra.Command, args []string) error {
	c, cfg, err := newClientFromConfig()
	if err != nil {
		return err
	}
	if cfg.ProjectID == "" {
		return fmt.Errorf("no project selected — run: wren project use <id>")
	}

	id, err := strconv.Atoi(args[0])
	if err != nil {
		return fmt.Errorf("invalid SQL pair ID: %s", args[0])
	}

	req := &client.UpdateSqlPairRequest{}
	hasChange := false

	if cmd.Flags().Changed("question") {
		req.Question = spQuestion
		hasChange = true
	}
	if cmd.Flags().Changed("sql") {
		req.SQL = spSQL
		hasChange = true
	}

	if !hasChange {
		return fmt.Errorf("no changes specified — use --question or --sql")
	}

	result, err := c.UpdateSqlPair(id, req)
	if err != nil {
		return err
	}

	if jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(result)
	}

	fmt.Printf("Updated SQL pair %d\n", result.ID)
	return nil
}

func runSqlPairDelete(cmd *cobra.Command, args []string) error {
	c, cfg, err := newClientFromConfig()
	if err != nil {
		return err
	}
	if cfg.ProjectID == "" {
		return fmt.Errorf("no project selected — run: wren project use <id>")
	}

	id, err := strconv.Atoi(args[0])
	if err != nil {
		return fmt.Errorf("invalid SQL pair ID: %s", args[0])
	}

	if err := c.DeleteSqlPair(id); err != nil {
		return err
	}

	if !jsonOutput {
		fmt.Printf("Deleted SQL pair %d\n", id)
	}
	return nil
}
