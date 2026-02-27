package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"text/tabwriter"

	"github.com/Canner/WrenAI/wren-cli/internal/client"
	"github.com/spf13/cobra"
)

var historyCmd = &cobra.Command{
	Use:     "history",
	Aliases: []string{"hist"},
	Short:   "View API request history",
	Long: `View the history of API requests made through the WrenAI server.
Useful for auditing and debugging API usage.

Filterable by API type, status code, thread ID, and date range.

API types: GENERATE_SQL, RUN_SQL, GENERATE_VEGA_CHART, GENERATE_SUMMARY,
           ASK, GET_INSTRUCTIONS, CREATE_INSTRUCTION, UPDATE_INSTRUCTION,
           DELETE_INSTRUCTION, CREATE_SQL_PAIR, UPDATE_SQL_PAIR,
           DELETE_SQL_PAIR, GET_SQL_PAIRS, GET_MODELS`,
}

var historyListCmd = &cobra.Command{
	Use:     "list",
	Aliases: []string{"ls"},
	Short:   "List API history entries",
	RunE:    runHistoryList,
}

func init() {
	historyListCmd.Flags().String("type", "", "Filter by API type (e.g. GENERATE_SQL, RUN_SQL)")
	historyListCmd.Flags().Int("status", 0, "Filter by HTTP status code (e.g. 200, 400)")
	historyListCmd.Flags().String("thread", "", "Filter by thread ID")
	historyListCmd.Flags().String("start-date", "", "Filter by start date (ISO 8601)")
	historyListCmd.Flags().String("end-date", "", "Filter by end date (ISO 8601)")
	historyListCmd.Flags().Int("offset", 0, "Pagination offset")
	historyListCmd.Flags().Int("limit", 20, "Number of results to return (default: 20)")
	historyListCmd.Flags().Bool("verbose", false, "Show request/response payloads")

	historyCmd.AddCommand(historyListCmd)
	rootCmd.AddCommand(historyCmd)
}

func runHistoryList(cmd *cobra.Command, args []string) error {
	c, _, err := newClientFromConfig()
	if err != nil {
		return err
	}

	apiType, _ := cmd.Flags().GetString("type")
	statusCode, _ := cmd.Flags().GetInt("status")
	threadID, _ := cmd.Flags().GetString("thread")
	startDate, _ := cmd.Flags().GetString("start-date")
	endDate, _ := cmd.Flags().GetString("end-date")
	offset, _ := cmd.Flags().GetInt("offset")
	limit, _ := cmd.Flags().GetInt("limit")
	verbose, _ := cmd.Flags().GetBool("verbose")

	var filter *client.ApiHistoryFilter
	if apiType != "" || statusCode != 0 || threadID != "" || startDate != "" || endDate != "" {
		filter = &client.ApiHistoryFilter{
			ApiType:    apiType,
			StatusCode: statusCode,
			ThreadID:   threadID,
			StartDate:  startDate,
			EndDate:    endDate,
		}
	}

	page, err := c.GetApiHistory(filter, offset, limit)
	if err != nil {
		return err
	}

	if jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(page)
	}

	if len(page.Items) == 0 {
		fmt.Println("No API history entries found.")
		return nil
	}

	fmt.Printf("API History (%d of %d total):\n\n", len(page.Items), page.Total)

	if verbose {
		for i, item := range page.Items {
			if i > 0 {
				fmt.Println("---")
			}
			fmt.Printf("ID:        %s\n", item.ID)
			fmt.Printf("Type:      %s\n", item.ApiType)
			fmt.Printf("Status:    %d\n", item.StatusCode)
			if item.DurationMs > 0 {
				fmt.Printf("Duration:  %dms\n", item.DurationMs)
			}
			if item.ThreadID != "" {
				fmt.Printf("Thread:    %s\n", item.ThreadID)
			}
			fmt.Printf("Time:      %s\n", item.CreatedAt)
			if item.RequestPayload != nil {
				reqJSON, _ := json.MarshalIndent(item.RequestPayload, "  ", "  ")
				fmt.Printf("Request:\n  %s\n", string(reqJSON))
			}
			if item.ResponsePayload != nil {
				respJSON, _ := json.MarshalIndent(item.ResponsePayload, "  ", "  ")
				fmt.Printf("Response:\n  %s\n", string(respJSON))
			}
		}
	} else {
		w := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
		fmt.Fprintln(w, "TYPE\tSTATUS\tDURATION\tTHREAD\tTIME")
		for _, item := range page.Items {
			dur := "-"
			if item.DurationMs > 0 {
				dur = fmt.Sprintf("%dms", item.DurationMs)
			}
			thread := "-"
			if item.ThreadID != "" {
				tid := item.ThreadID
				if len(tid) > 8 {
					tid = tid[:8] + "..."
				}
				thread = tid
			}
			ts := item.CreatedAt
			if len(ts) > 19 {
				ts = ts[:19]
			}
			fmt.Fprintf(w, "%s\t%d\t%s\t%s\t%s\n",
				item.ApiType, item.StatusCode, dur, thread, ts)
		}
		w.Flush()
	}

	if page.HasMore {
		fmt.Printf("\n(more results available — use --offset %d to see next page)\n",
			offset+limit)
	}

	return nil
}
