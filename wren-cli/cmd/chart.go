package cmd

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/Canner/WrenAI/wren-cli/internal/client"
	"github.com/spf13/cobra"
)

var chartCmd = &cobra.Command{
	Use:   "chart",
	Short: "Generate a Vega-Lite chart specification from a question and SQL",
	Long: `Generate a Vega-Lite chart specification that visualizes the results
of a SQL query in the context of a natural language question.

The AI service analyzes the question, executes the SQL, and produces
a Vega-Lite JSON spec suitable for rendering with any Vega-compatible library.

Requires both --question and --sql flags.

Examples:
  wren chart --question "Monthly order trends" --sql "SELECT date_trunc('month', order_date) as month, count(*) FROM orders GROUP BY 1"
  wren chart -q "Revenue by product category" -s "SELECT category, sum(price) FROM products GROUP BY 1" --json`,
	RunE: runChart,
}

func init() {
	chartCmd.Flags().StringP("question", "q", "", "The natural language question (required)")
	chartCmd.Flags().StringP("sql", "s", "", "The SQL query to visualize (required)")
	chartCmd.Flags().Int("sample-size", 10000, "Max rows to sample for chart generation")
	chartCmd.Flags().String("thread-id", "", "Optional thread ID for context")
	chartCmd.MarkFlagRequired("question")
	chartCmd.MarkFlagRequired("sql")
	rootCmd.AddCommand(chartCmd)
}

func runChart(cmd *cobra.Command, args []string) error {
	question, _ := cmd.Flags().GetString("question")
	sql, _ := cmd.Flags().GetString("sql")
	sampleSize, _ := cmd.Flags().GetInt("sample-size")
	threadID, _ := cmd.Flags().GetString("thread-id")

	c, _, err := newClientFromConfig()
	if err != nil {
		return err
	}

	req := &client.GenerateChartRequest{
		Question:   question,
		SQL:        sql,
		SampleSize: sampleSize,
		ThreadID:   threadID,
	}

	fmt.Fprintf(os.Stderr, "Generating chart...")
	result, err := c.GenerateChart(req)
	fmt.Fprintf(os.Stderr, "\r                     \r")
	if err != nil {
		return err
	}

	if jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(result)
	}

	// Pretty-print the Vega spec
	if result.VegaSpec != nil {
		specJSON, err := json.MarshalIndent(result.VegaSpec, "", "  ")
		if err != nil {
			return fmt.Errorf("formatting Vega spec: %w", err)
		}
		fmt.Println(string(specJSON))
	} else {
		fmt.Println("(no chart spec generated)")
	}

	if result.ThreadID != "" {
		fmt.Fprintf(os.Stderr, "Thread ID: %s\n", result.ThreadID)
	}

	return nil
}
