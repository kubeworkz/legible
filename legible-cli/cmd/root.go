package cmd

import (
	"fmt"
	"os"

	"github.com/spf13/cobra"
)

var jsonOutput bool

var rootCmd = &cobra.Command{
	Use:   "legible",
	Short: "Legible CLI — manage models, queries, and deployments",
	Long: `Legible CLI lets you interact with a Legible server from the command line.

Configure your connection:
  legible login                    Interactive setup
  legible config set endpoint URL  Set server endpoint
  legible config set api-key KEY   Set API key
  legible whoami                   Verify authentication`,
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
