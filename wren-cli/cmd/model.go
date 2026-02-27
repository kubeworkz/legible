package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"strconv"
	"strings"
	"text/tabwriter"

	"github.com/Canner/WrenAI/wren-cli/internal/client"
	"github.com/Canner/WrenAI/wren-cli/internal/config"
	"github.com/spf13/cobra"
)

var modelCmd = &cobra.Command{
	Use:     "model",
	Aliases: []string{"models"},
	Short:   "Manage and inspect models",
}

var modelListCmd = &cobra.Command{
	Use:     "list",
	Aliases: []string{"ls"},
	Short:   "List all models in the current project",
	RunE:    runModelList,
}

var modelDescribeCmd = &cobra.Command{
	Use:   "describe <model-id>",
	Short: "Show detailed information about a model",
	Long: `Display detailed information about a model including all fields,
calculated fields, and relationships.

Examples:
  wren model describe 1
  wren model describe 1 --json`,
	Args: cobra.ExactArgs(1),
	RunE: runModelDescribe,
}

var modelFieldsCmd = &cobra.Command{
	Use:   "fields <model-id>",
	Short: "List fields (columns) of a model",
	Long: `Show a table of all fields in a model, including type information.

Examples:
  wren model fields 1`,
	Args: cobra.ExactArgs(1),
	RunE: runModelFields,
}

func init() {
	modelCmd.AddCommand(modelListCmd)
	modelCmd.AddCommand(modelDescribeCmd)
	modelCmd.AddCommand(modelFieldsCmd)
	rootCmd.AddCommand(modelCmd)
}

func newClientFromConfig() (*client.Client, *config.Config, error) {
	cfg, err := config.Load()
	if err != nil {
		return nil, nil, fmt.Errorf("loading config: %w", err)
	}
	c, err := client.New(cfg)
	if err != nil {
		return nil, nil, err
	}
	return c, cfg, nil
}

func runModelList(cmd *cobra.Command, args []string) error {
	c, cfg, err := newClientFromConfig()
	if err != nil {
		return err
	}

	if cfg.ProjectID == "" {
		return fmt.Errorf("no project selected — run: wren project use <id>")
	}

	models, err := c.ListModels()
	if err != nil {
		return err
	}

	if jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(models)
	}

	if len(models) == 0 {
		fmt.Println("No models found in this project.")
		return nil
	}

	w := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
	fmt.Fprintln(w, "ID\tNAME\tSOURCE TABLE\tFIELDS\tCACHED\tDESCRIPTION")
	for _, m := range models {
		fieldCount := len(m.Fields)
		calcCount := len(m.CalculatedFields)
		fieldsStr := strconv.Itoa(fieldCount)
		if calcCount > 0 {
			fieldsStr = fmt.Sprintf("%d (+%d calc)", fieldCount, calcCount)
		}

		cached := "no"
		if m.Cached {
			cached = "yes"
		}

		desc := m.Description
		if len(desc) > 50 {
			desc = desc[:47] + "..."
		}
		if desc == "" {
			desc = "-"
		}

		fmt.Fprintf(w, "%d\t%s\t%s\t%s\t%s\t%s\n",
			m.ID, m.DisplayName, m.SourceTableName, fieldsStr, cached, desc)
	}
	w.Flush()

	return nil
}

func runModelDescribe(cmd *cobra.Command, args []string) error {
	modelID, err := strconv.Atoi(args[0])
	if err != nil {
		return fmt.Errorf("model ID must be a number, got %q", args[0])
	}

	c, cfg, err := newClientFromConfig()
	if err != nil {
		return err
	}

	if cfg.ProjectID == "" {
		return fmt.Errorf("no project selected — run: wren project use <id>")
	}

	model, err := c.GetModel(modelID)
	if err != nil {
		return err
	}

	if jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(model)
	}

	// Header
	fmt.Printf("Model: %s\n", model.DisplayName)
	fmt.Printf("Reference: %s\n", model.ReferenceName)
	fmt.Printf("Source Table: %s\n", model.SourceTableName)
	if model.RefSQL != "" {
		fmt.Printf("Ref SQL: %s\n", model.RefSQL)
	}
	if model.PrimaryKey != "" {
		fmt.Printf("Primary Key: %s\n", model.PrimaryKey)
	}
	if model.Description != "" {
		fmt.Printf("Description: %s\n", model.Description)
	}
	cached := "no"
	if model.Cached {
		cached = "yes"
		if model.RefreshTime != "" {
			cached += " (refresh: " + model.RefreshTime + ")"
		}
	}
	fmt.Printf("Cached: %s\n", cached)

	// Fields
	if len(model.Fields) > 0 {
		fmt.Printf("\nFields (%d):\n", len(model.Fields))
		w := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
		fmt.Fprintln(w, "  NAME\tTYPE\tSOURCE COLUMN\tNOT NULL")
		for _, f := range model.Fields {
			fType := f.Type
			if fType == "" {
				fType = "-"
			}
			notNull := ""
			if f.NotNull {
				notNull = "yes"
			}
			fmt.Fprintf(w, "  %s\t%s\t%s\t%s\n",
				f.DisplayName, fType, f.SourceColumnName, notNull)
		}
		w.Flush()
	}

	// Calculated fields
	if len(model.CalculatedFields) > 0 {
		fmt.Printf("\nCalculated Fields (%d):\n", len(model.CalculatedFields))
		w := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
		fmt.Fprintln(w, "  NAME\tTYPE\tSOURCE")
		for _, f := range model.CalculatedFields {
			fType := f.Type
			if fType == "" {
				fType = "-"
			}
			fmt.Fprintf(w, "  %s\t%s\t%s\n",
				f.DisplayName, fType, f.SourceColumnName)
		}
		w.Flush()
	}

	// Relations
	if len(model.Relations) > 0 {
		fmt.Printf("\nRelationships (%d):\n", len(model.Relations))
		w := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
		fmt.Fprintln(w, "  NAME\tTYPE\tFROM\tTO")
		for _, r := range model.Relations {
			fmt.Fprintf(w, "  %s\t%s\tmodel:%d.col:%d\tmodel:%d.col:%d\n",
				r.Name, r.Type,
				r.FromModelID, r.FromColumnID,
				r.ToModelID, r.ToColumnID)
		}
		w.Flush()
	}

	return nil
}

func runModelFields(cmd *cobra.Command, args []string) error {
	modelID, err := strconv.Atoi(args[0])
	if err != nil {
		return fmt.Errorf("model ID must be a number, got %q", args[0])
	}

	c, cfg, err := newClientFromConfig()
	if err != nil {
		return err
	}

	if cfg.ProjectID == "" {
		return fmt.Errorf("no project selected — run: wren project use <id>")
	}

	model, err := c.GetModel(modelID)
	if err != nil {
		return err
	}

	// Combine fields and calculated fields
	type fieldRow struct {
		Name       string `json:"name"`
		Type       string `json:"type"`
		Source     string `json:"sourceColumn"`
		NotNull    bool   `json:"notNull"`
		Calculated bool   `json:"calculated"`
	}

	var rows []fieldRow
	for _, f := range model.Fields {
		rows = append(rows, fieldRow{
			Name:       f.DisplayName,
			Type:       f.Type,
			Source:     f.SourceColumnName,
			NotNull:    f.NotNull,
			Calculated: false,
		})
	}
	for _, f := range model.CalculatedFields {
		rows = append(rows, fieldRow{
			Name:       f.DisplayName,
			Type:       f.Type,
			Source:     f.SourceColumnName,
			NotNull:    f.NotNull,
			Calculated: true,
		})
	}

	if jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(rows)
	}

	if len(rows) == 0 {
		fmt.Printf("Model %q has no fields.\n", model.DisplayName)
		return nil
	}

	fmt.Printf("Fields for model: %s\n\n", model.DisplayName)
	w := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
	fmt.Fprintln(w, "NAME\tTYPE\tSOURCE COLUMN\tNOT NULL\tCALCULATED")
	for _, r := range rows {
		fType := r.Type
		if fType == "" {
			fType = "-"
		}
		nn := ""
		if r.NotNull {
			nn = "yes"
		}
		calc := ""
		if r.Calculated {
			calc = "yes"
		}
		fmt.Fprintf(w, "%s\t%s\t%s\t%s\t%s\n",
			r.Name, fType, r.Source, nn, calc)
	}
	w.Flush()

	// Also show quick summary of types
	typeCounts := map[string]int{}
	for _, r := range rows {
		t := r.Type
		if t == "" {
			t = "unknown"
		}
		typeCounts[strings.ToUpper(t)]++
	}
	fmt.Printf("\nTotal: %d fields", len(rows))
	calcCount := 0
	for _, r := range rows {
		if r.Calculated {
			calcCount++
		}
	}
	if calcCount > 0 {
		fmt.Printf(" (%d calculated)", calcCount)
	}
	fmt.Println()

	return nil
}
