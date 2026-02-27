package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"github.com/Canner/WrenAI/wren-cli/internal/client"
	"github.com/spf13/cobra"
)

var summaryCmd = &cobra.Command{
	Use:   "summary",
	Short: "Generate a natural language summary from a question and SQL",
	Long: `Generate a human-readable summary that answers a question using
the provided SQL query. The AI executes the SQL, analyzes the results,
and produces a natural language response.

Requires both --question and --sql flags.

Examples:
  wren summary --question "How many orders?" --sql "SELECT count(*) FROM orders"
  wren summary -q "Top customers by revenue" -s "SELECT customer_id, sum(price) FROM order_items GROUP BY 1 ORDER BY 2 DESC LIMIT 5"`,
	RunE: runSummary,
}

func init() {
	summaryCmd.Flags().StringP("question", "q", "", "The natural language question (required)")
	summaryCmd.Flags().StringP("sql", "s", "", "The SQL query to summarize (required)")
	summaryCmd.Flags().Int("sample-size", 500, "Max rows to sample for summary generation")
	summaryCmd.Flags().String("language", "", "Response language (e.g. en, zh)")
	summaryCmd.Flags().String("thread-id", "", "Optional thread ID for context")
	summaryCmd.MarkFlagRequired("question")
	summaryCmd.MarkFlagRequired("sql")
	rootCmd.AddCommand(summaryCmd)
}

func runSummary(cmd *cobra.Command, args []string) error {
	question, _ := cmd.Flags().GetString("question")
	sql, _ := cmd.Flags().GetString("sql")
	sampleSize, _ := cmd.Flags().GetInt("sample-size")
	language, _ := cmd.Flags().GetString("language")
	threadID, _ := cmd.Flags().GetString("thread-id")

	c, _, err := newClientFromConfig()
	if err != nil {
		return err
	}

	req := &client.GenerateSummaryRequest{
		Question:   question,
		SQL:        sql,
		SampleSize: sampleSize,
		Language:   language,
		ThreadID:   threadID,
	}

	fmt.Fprintf(os.Stderr, "Generating summary...")
	result, err := c.GenerateSummary(req)
	fmt.Fprintf(os.Stderr, "\r                      \r")
	if err != nil {
		return err
	}

	if jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(result)
	}

	if result.Summary != "" {
		// Unescape common escape sequences from streamed content
		summary := result.Summary
		summary = strings.ReplaceAll(summary, "\\n", "\n")
		summary = strings.ReplaceAll(summary, "\\t", "\t")
		fmt.Println(summary)
	} else {
		fmt.Println("(empty summary)")
	}

	return nil
}
