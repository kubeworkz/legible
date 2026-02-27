package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"strconv"
	"strings"
	"text/tabwriter"

	"github.com/spf13/cobra"
)

var threadCmd = &cobra.Command{
	Use:     "thread",
	Aliases: []string{"threads"},
	Short:   "Manage conversation threads",
	Long: `Threads store your question-and-answer conversation history.
Each thread contains one or more responses with generated SQL.`,
}

var threadListCmd = &cobra.Command{
	Use:     "list",
	Aliases: []string{"ls"},
	Short:   "List all conversation threads",
	RunE:    runThreadList,
}

var threadShowCmd = &cobra.Command{
	Use:   "show <thread-id>",
	Short: "Show a thread with all its responses",
	Long: `Display a thread and all the question/SQL pairs within it.

Examples:
  wren thread show 1
  wren thread show 1 --json`,
	Args: cobra.ExactArgs(1),
	RunE: runThreadShow,
}

var threadRenameCmd = &cobra.Command{
	Use:   "rename <thread-id> <new-summary>",
	Short: "Rename a thread's summary",
	Long: `Update the summary text of a thread.

Examples:
  wren thread rename 1 "Revenue analysis"`,
	Args: cobra.ExactArgs(2),
	RunE: runThreadRename,
}

var threadDeleteCmd = &cobra.Command{
	Use:   "delete <thread-id>",
	Short: "Delete a thread and all its responses",
	Long: `Permanently delete a thread.

Examples:
  wren thread delete 1`,
	Args: cobra.ExactArgs(1),
	RunE: runThreadDelete,
}

func init() {
	threadCmd.AddCommand(threadListCmd)
	threadCmd.AddCommand(threadShowCmd)
	threadCmd.AddCommand(threadRenameCmd)
	threadCmd.AddCommand(threadDeleteCmd)
	rootCmd.AddCommand(threadCmd)
}

func runThreadList(cmd *cobra.Command, args []string) error {
	c, cfg, err := newClientFromConfig()
	if err != nil {
		return err
	}
	if cfg.ProjectID == "" {
		return fmt.Errorf("no project selected — run: wren project use <id>")
	}

	threads, err := c.ListThreads()
	if err != nil {
		return err
	}

	if jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(threads)
	}

	if len(threads) == 0 {
		fmt.Println("No threads found.")
		return nil
	}

	w := tabwriter.NewWriter(os.Stdout, 0, 4, 2, ' ', 0)
	fmt.Fprintln(w, "ID\tSUMMARY")
	for _, t := range threads {
		summary := truncate(t.Summary, 80)
		fmt.Fprintf(w, "%d\t%s\n", t.ID, summary)
	}
	w.Flush()

	return nil
}

func runThreadShow(cmd *cobra.Command, args []string) error {
	c, cfg, err := newClientFromConfig()
	if err != nil {
		return err
	}
	if cfg.ProjectID == "" {
		return fmt.Errorf("no project selected — run: wren project use <id>")
	}

	id, err := strconv.Atoi(args[0])
	if err != nil {
		return fmt.Errorf("invalid thread ID: %s", args[0])
	}

	thread, err := c.GetThread(id)
	if err != nil {
		return err
	}

	if jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(thread)
	}

	fmt.Printf("Thread %d\n", thread.ID)
	fmt.Printf("Responses: %d\n\n", len(thread.Responses))

	for i, r := range thread.Responses {
		fmt.Printf("--- Response %d (ID: %d) ---\n", i+1, r.ID)
		fmt.Printf("Q: %s\n", r.Question)
		if r.SQL != "" {
			fmt.Printf("SQL:\n%s\n", indentSQL(r.SQL))
		} else {
			fmt.Println("SQL: (none)")
		}
		fmt.Println()
	}

	return nil
}

func runThreadRename(cmd *cobra.Command, args []string) error {
	c, cfg, err := newClientFromConfig()
	if err != nil {
		return err
	}
	if cfg.ProjectID == "" {
		return fmt.Errorf("no project selected — run: wren project use <id>")
	}

	id, err := strconv.Atoi(args[0])
	if err != nil {
		return fmt.Errorf("invalid thread ID: %s", args[0])
	}

	summary := args[1]

	result, err := c.UpdateThread(id, summary)
	if err != nil {
		return err
	}

	if jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(result)
	}

	fmt.Printf("Renamed thread %d: %s\n", result.ID, result.Summary)
	return nil
}

func runThreadDelete(cmd *cobra.Command, args []string) error {
	c, cfg, err := newClientFromConfig()
	if err != nil {
		return err
	}
	if cfg.ProjectID == "" {
		return fmt.Errorf("no project selected — run: wren project use <id>")
	}

	id, err := strconv.Atoi(args[0])
	if err != nil {
		return fmt.Errorf("invalid thread ID: %s", args[0])
	}

	if err := c.DeleteThread(id); err != nil {
		return err
	}

	if !jsonOutput {
		fmt.Printf("Deleted thread %d\n", id)
	}
	return nil
}

// indentSQL adds a 2-space indent to each line of SQL for display.
func indentSQL(sql string) string {
	lines := strings.Split(sql, "\n")
	for i, line := range lines {
		lines[i] = "  " + line
	}
	return strings.Join(lines, "\n")
}
