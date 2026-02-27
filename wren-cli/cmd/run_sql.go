package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"text/tabwriter"

	"github.com/Canner/WrenAI/wren-cli/internal/client"
	"github.com/spf13/cobra"
)

var runSQLCmd = &cobra.Command{
	Use:   "run-sql <sql>",
	Short: "Execute a SQL query against the Wren Engine",
	Long: `Execute a SQL query directly and display the result as a table.

The SQL must be valid Wren SQL (using model/view names from the semantic layer).
Use 'wren sql' to generate SQL from a natural language question first.

Examples:
  wren run-sql "SELECT * FROM customers LIMIT 10"
  wren run-sql "SELECT count(*) FROM orders" --limit 100
  wren run-sql "SELECT region, sum(revenue) FROM sales GROUP BY region" --json`,
	Args: cobra.ExactArgs(1),
	RunE: runRunSQL,
}

var (
	runSQLLimit    int
	runSQLThreadID string
)

func init() {
	runSQLCmd.Flags().IntVar(&runSQLLimit, "limit", 0, "Max rows to return (default: server decides, typically 1000)")
	runSQLCmd.Flags().StringVar(&runSQLThreadID, "thread-id", "", "Thread ID for conversation context")
	rootCmd.AddCommand(runSQLCmd)
}

func runRunSQL(cmd *cobra.Command, args []string) error {
	c, cfg, err := newClientFromConfig()
	if err != nil {
		return err
	}
	if cfg.ProjectID == "" {
		return fmt.Errorf("no project selected — run: wren project use <id>")
	}

	sqlQuery := args[0]
	req := &client.RunSQLRequest{
		SQL:      sqlQuery,
		ThreadID: runSQLThreadID,
	}
	if runSQLLimit > 0 {
		req.Limit = runSQLLimit
	}

	result, err := c.RunSQL(req)
	if err != nil {
		return err
	}

	// Check for error in response
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

	// Print result as a table
	if len(result.Columns) == 0 {
		fmt.Println("Query executed successfully (no columns returned).")
		return nil
	}

	if len(result.Records) == 0 {
		fmt.Println("No rows returned.")
		fmt.Fprintf(os.Stderr, "Columns: %s\n", columnNames(result.Columns))
		return nil
	}

	printResultTable(result)

	fmt.Fprintf(os.Stderr, "\n%d row(s) returned", len(result.Records))
	if result.TotalRows > len(result.Records) {
		fmt.Fprintf(os.Stderr, " (of %d total)", result.TotalRows)
	}
	fmt.Fprintln(os.Stderr)

	return nil
}

// printResultTable renders query results as an aligned ASCII table.
func printResultTable(result *client.RunSQLResult) {
	w := tabwriter.NewWriter(os.Stdout, 0, 4, 2, ' ', 0)

	// Header
	headers := make([]string, len(result.Columns))
	for i, col := range result.Columns {
		headers[i] = col.Name
	}
	fmt.Fprintln(w, strings.Join(headers, "\t"))

	// Separator
	seps := make([]string, len(result.Columns))
	for i, h := range headers {
		seps[i] = strings.Repeat("-", max(len(h), 4))
	}
	fmt.Fprintln(w, strings.Join(seps, "\t"))

	// Rows
	for _, record := range result.Records {
		vals := make([]string, len(result.Columns))
		for i, col := range result.Columns {
			val, ok := record[col.Name]
			if !ok || val == nil {
				vals[i] = "NULL"
			} else {
				vals[i] = formatValue(val)
			}
		}
		fmt.Fprintln(w, strings.Join(vals, "\t"))
	}

	w.Flush()
}

// formatValue converts an interface{} to a display string.
func formatValue(v interface{}) string {
	switch val := v.(type) {
	case string:
		return val
	case float64:
		// JSON numbers are float64; display as int if no fractional part
		if val == float64(int64(val)) {
			return fmt.Sprintf("%d", int64(val))
		}
		return fmt.Sprintf("%g", val)
	case bool:
		if val {
			return "true"
		}
		return "false"
	case nil:
		return "NULL"
	default:
		// For complex types, marshal to JSON
		b, err := json.Marshal(val)
		if err != nil {
			return fmt.Sprintf("%v", val)
		}
		return string(b)
	}
}

// columnNames returns a comma-separated list of column names.
func columnNames(cols []client.RunSQLColumn) string {
	names := make([]string, len(cols))
	for i, c := range cols {
		names[i] = c.Name
	}
	return strings.Join(names, ", ")
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}
