package cmd

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
)

var jsonOutput bool

var rootCmd = &cobra.Command{
	Use:   "wren",
	Short: "WrenAI CLI — manage models, queries, and deployments",
	Long: `WrenAI CLI lets you interact with a WrenAI server from the command line.

Configure your connection:
  wren login                    Interactive setup
  wren config set endpoint URL  Set server endpoint
  wren config set api-key KEY   Set API key
  wren whoami                   Verify authentication`,
	SilenceUsage:  true,
	SilenceErrors: true,
}

func init() {
	rootCmd.PersistentFlags().BoolVar(&jsonOutput, "json", false, "Output results as JSON")
}

// Execute runs the root command.
func Execute() {
	if err := rootCmd.Execute(); err != nil {
		fmt.Fprintln(os.Stderr, "Error:", err)
		os.Exit(1)
	}
}
