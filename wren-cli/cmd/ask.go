package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/Canner/WrenAI/wren-cli/internal/client"
	"github.com/spf13/cobra"
)

var askCmd = &cobra.Command{
	Use:   "ask <question>",
	Short: "Ask a question in natural language and get SQL + results + summary",
	Long: `Submit a natural language question. WrenAI will generate SQL, execute it,
and return a text summary of the results.

This runs the full AI pipeline and may take up to 3 minutes depending
on query complexity.

Examples:
  wren ask "What are the top 10 customers by revenue?"
  wren ask "How many orders were placed last month?" --sample-size 100
  wren ask "Show me revenue by region" --json
  wren ask "Tell me about sales trends" --thread-id abc123`,
	Args: cobra.ExactArgs(1),
	RunE: runAsk,
}

var (
	askSampleSize int
	askLanguage   string
	askThreadID   string
)

func init() {
	askCmd.Flags().IntVar(&askSampleSize, "sample-size", 0, "Max rows for data/summary (default: server decides)")
	askCmd.Flags().StringVar(&askLanguage, "language", "", "Language for AI responses (e.g., English, 中文)")
	askCmd.Flags().StringVar(&askThreadID, "thread-id", "", "Thread ID for conversation context")
	rootCmd.AddCommand(askCmd)
}

func runAsk(cmd *cobra.Command, args []string) error {
	c, cfg, err := newClientFromConfig()
	if err != nil {
		return err
	}
	if cfg.ProjectID == "" {
		return fmt.Errorf("no project selected — run: wren project use <id>")
	}

	// Ask endpoint can take up to 3 minutes
	c.SetTimeout(4 * time.Minute)

	question := args[0]
	req := &client.AskRequest{
		Question: question,
		ThreadID: askThreadID,
		Language: askLanguage,
	}
	if askSampleSize > 0 {
		req.SampleSize = askSampleSize
	}

	if !jsonOutput {
		fmt.Fprintf(os.Stderr, "Thinking...\n")
	}

	result, err := c.Ask(req)
	if err != nil {
		return err
	}

	// Check for errors in the response
	if result.Error != "" {
		if jsonOutput {
			enc := json.NewEncoder(os.Stdout)
			enc.SetIndent("", "  ")
			return enc.Encode(result)
		}
		code := result.Code
		if code == "" {
			code = "ERROR"
		}
		return fmt.Errorf("[%s] %s", code, result.Error)
	}

	if jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(result)
	}

	// Non-SQL query (explanation)
	if result.Type == "NON_SQL_QUERY" {
		fmt.Println(result.Explanation)
		if result.ThreadID != "" {
			fmt.Fprintf(os.Stderr, "\nThread: %s\n", result.ThreadID)
		}
		return nil
	}

	// Normal SQL result with summary
	if result.SQL != "" {
		fmt.Fprintf(os.Stderr, "\n--- SQL ---\n")
		fmt.Println(formatSQL(result.SQL))
	}
	if result.Summary != "" {
		fmt.Fprintf(os.Stderr, "\n--- Summary ---\n")
		fmt.Println(result.Summary)
	}
	if result.ThreadID != "" {
		fmt.Fprintf(os.Stderr, "\nThread: %s\n", result.ThreadID)
	}

	return nil
}

// formatSQL adds basic indentation to SQL for readability.
func formatSQL(sql string) string {
	// Simple formatting: add newlines before major SQL keywords
	keywords := []string{" FROM ", " WHERE ", " GROUP BY ", " HAVING ", " ORDER BY ", " LIMIT ", " JOIN ", " LEFT JOIN ", " RIGHT JOIN ", " INNER JOIN ", " OUTER JOIN ", " CROSS JOIN ", " UNION ", " WITH "}
	result := sql
	for _, kw := range keywords {
		result = strings.ReplaceAll(result, kw, "\n"+strings.TrimLeft(kw, " "))
	}
	return result
}
