package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/Canner/WrenAI/wren-cli/internal/client"
	"github.com/spf13/cobra"
)

var sqlCmd = &cobra.Command{
	Use:   "sql <question>",
	Short: "Generate SQL from a natural language question",
	Long: `Convert a natural language question into SQL using the WrenAI AI pipeline.
Returns only the generated SQL without executing it.

This may take up to 3 minutes depending on query complexity.

Examples:
  wren sql "What are the top 10 customers by revenue?"
  wren sql "How many orders per month?" --dialect
  wren sql "Revenue by region" --json`,
	Args: cobra.ExactArgs(1),
	RunE: runSQL,
}

var (
	sqlDialect  bool
	sqlLanguage string
	sqlThreadID string
)

func init() {
	sqlCmd.Flags().BoolVar(&sqlDialect, "dialect", false, "Return SQL in native database dialect")
	sqlCmd.Flags().StringVar(&sqlLanguage, "language", "", "Language for AI responses")
	sqlCmd.Flags().StringVar(&sqlThreadID, "thread-id", "", "Thread ID for conversation context")
	rootCmd.AddCommand(sqlCmd)
}

func runSQL(cmd *cobra.Command, args []string) error {
	c, cfg, err := newClientFromConfig()
	if err != nil {
		return err
	}
	if cfg.ProjectID == "" {
		return fmt.Errorf("no project selected — run: wren project use <id>")
	}

	// Generate SQL can take up to 3 minutes
	c.SetTimeout(4 * time.Minute)

	question := args[0]
	req := &client.GenerateSQLRequest{
		Question:         question,
		ThreadID:         sqlThreadID,
		Language:         sqlLanguage,
		ReturnSQLDialect: sqlDialect,
	}

	if !jsonOutput {
		fmt.Fprintf(os.Stderr, "Generating SQL...\n")
	}

	result, err := c.GenerateSQL(req)
	if err != nil {
		return err
	}

	// Non-SQL query or error
	if result.Code != "" {
		if jsonOutput {
			enc := json.NewEncoder(os.Stdout)
			enc.SetIndent("", "  ")
			return enc.Encode(result)
		}
		if result.Error != "" {
			return fmt.Errorf("[%s] %s", result.Code, result.Error)
		}
		return fmt.Errorf("[%s] query could not be converted to SQL", result.Code)
	}

	if jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(result)
	}

	// Print the generated SQL
	fmt.Println(formatSQL(result.SQL))

	if result.ThreadID != "" {
		fmt.Fprintf(os.Stderr, "\nThread: %s\n", result.ThreadID)
	}

	return nil
}
