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

// Valid expression names for calculated fields.
var validExpressions = map[string]bool{
	"ABS": true, "AVG": true, "COUNT": true, "COUNT_IF": true,
	"MAX": true, "MIN": true, "SUM": true, "CBRT": true,
	"CEIL": true, "CEILING": true, "EXP": true, "FLOOR": true,
	"LN": true, "LOG10": true, "ROUND": true, "SIGN": true,
	"LENGTH": true, "REVERSE": true,
}

var calcFieldCmd = &cobra.Command{
	Use:     "calc-field",
	Aliases: []string{"cf", "calculated-field"},
	Short:   "Manage calculated fields on models",
	Long: `Calculated fields are derived columns that use expressions (aggregations,
math functions) applied to existing columns via a lineage chain.

Available expressions:
  Aggregate: AVG, COUNT, COUNT_IF, MAX, MIN, SUM
  Math:      ABS, CBRT, CEIL, CEILING, EXP, FLOOR, LN, LOG10, ROUND, SIGN
  String:    LENGTH, REVERSE`,
}

var calcFieldListCmd = &cobra.Command{
	Use:     "list <model-id>",
	Aliases: []string{"ls"},
	Short:   "List calculated fields for a model",
	Args:    cobra.ExactArgs(1),
	RunE:    runCalcFieldList,
}

var calcFieldCreateCmd = &cobra.Command{
	Use:   "create",
	Short: "Create a calculated field on a model",
	Long: `Create a new calculated field. Requires the model ID, a name, an expression
type, and a lineage (chain of column IDs the expression operates on).

Examples:
  wren calc-field create --model 1 --name "total_orders" --expression COUNT --lineage 5
  wren calc-field create --model 1 --name "avg_price" --expression AVG --lineage 12,15`,
	RunE: runCalcFieldCreate,
}

var calcFieldDeleteCmd = &cobra.Command{
	Use:   "delete <field-id>",
	Short: "Delete a calculated field",
	Args:  cobra.ExactArgs(1),
	RunE:  runCalcFieldDelete,
}

var calcFieldValidateCmd = &cobra.Command{
	Use:   "validate",
	Short: "Validate a calculated field name",
	Long: `Check if a name is valid for a calculated field on a given model.

Examples:
  wren calc-field validate --model 1 --name "total_orders"`,
	RunE: runCalcFieldValidate,
}

func init() {
	calcFieldCreateCmd.Flags().Int("model", 0, "Model ID (required)")
	calcFieldCreateCmd.Flags().String("name", "", "Field name (required)")
	calcFieldCreateCmd.Flags().String("expression", "", "Expression type, e.g. COUNT, SUM, AVG (required)")
	calcFieldCreateCmd.Flags().String("lineage", "", "Comma-separated column IDs forming the lineage chain (required)")
	calcFieldCreateCmd.MarkFlagRequired("model")
	calcFieldCreateCmd.MarkFlagRequired("name")
	calcFieldCreateCmd.MarkFlagRequired("expression")
	calcFieldCreateCmd.MarkFlagRequired("lineage")

	calcFieldValidateCmd.Flags().Int("model", 0, "Model ID (required)")
	calcFieldValidateCmd.Flags().String("name", "", "Field name to validate (required)")
	calcFieldValidateCmd.Flags().Int("column", 0, "Existing column ID (for rename validation)")
	calcFieldValidateCmd.MarkFlagRequired("model")
	calcFieldValidateCmd.MarkFlagRequired("name")

	calcFieldCmd.AddCommand(calcFieldListCmd)
	calcFieldCmd.AddCommand(calcFieldCreateCmd)
	calcFieldCmd.AddCommand(calcFieldDeleteCmd)
	calcFieldCmd.AddCommand(calcFieldValidateCmd)
	rootCmd.AddCommand(calcFieldCmd)
}

func parseLineage(s string) ([]int, error) {
	parts := strings.Split(s, ",")
	ids := make([]int, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p == "" {
			continue
		}
		id, err := strconv.Atoi(p)
		if err != nil {
			return nil, fmt.Errorf("invalid lineage ID %q: must be a number", p)
		}
		ids = append(ids, id)
	}
	if len(ids) == 0 {
		return nil, fmt.Errorf("lineage must contain at least one column ID")
	}
	return ids, nil
}

func runCalcFieldList(cmd *cobra.Command, args []string) error {
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

	fields, err := c.ListCalculatedFields(modelID)
	if err != nil {
		return err
	}

	if jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(fields)
	}

	if len(fields) == 0 {
		fmt.Println("No calculated fields found on this model.")
		return nil
	}

	w := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
	fmt.Fprintln(w, "ID\tNAME\tTYPE\tEXPRESSION\tSOURCE")
	for _, f := range fields {
		fType := f.Type
		if fType == "" {
			fType = "-"
		}
		expr := f.Expression
		if expr == "" {
			expr = "-"
		}
		fmt.Fprintf(w, "%d\t%s\t%s\t%s\t%s\n", f.ID, f.DisplayName, fType, expr, f.SourceColumnName)
	}
	w.Flush()

	return nil
}

func runCalcFieldCreate(cmd *cobra.Command, args []string) error {
	modelID, _ := cmd.Flags().GetInt("model")
	name, _ := cmd.Flags().GetString("name")
	expression, _ := cmd.Flags().GetString("expression")
	lineageStr, _ := cmd.Flags().GetString("lineage")

	expression = strings.ToUpper(expression)
	if !validExpressions[expression] {
		valid := make([]string, 0, len(validExpressions))
		for k := range validExpressions {
			valid = append(valid, k)
		}
		return fmt.Errorf("invalid expression %q; valid expressions: %s",
			expression, strings.Join(valid, ", "))
	}

	lineage, err := parseLineage(lineageStr)
	if err != nil {
		return err
	}

	c, cfg, err := newClientFromConfig()
	if err != nil {
		return err
	}
	if cfg.ProjectID == "" {
		return fmt.Errorf("no project selected — run: wren project use <id>")
	}

	if err := c.CreateCalculatedField(modelID, name, expression, lineage); err != nil {
		return err
	}

	if jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(map[string]interface{}{
			"created": true,
			"model":   modelID,
			"name":    name,
		})
	}

	fmt.Printf("Created calculated field %q on model %d.\n", name, modelID)
	return nil
}

func runCalcFieldDelete(cmd *cobra.Command, args []string) error {
	fieldID, err := strconv.Atoi(args[0])
	if err != nil {
		return fmt.Errorf("field ID must be a number, got %q", args[0])
	}

	c, cfg, err := newClientFromConfig()
	if err != nil {
		return err
	}
	if cfg.ProjectID == "" {
		return fmt.Errorf("no project selected — run: wren project use <id>")
	}

	if err := c.DeleteCalculatedField(fieldID); err != nil {
		return err
	}

	if jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(map[string]interface{}{"deleted": true, "id": fieldID})
	}

	fmt.Printf("Deleted calculated field %d.\n", fieldID)
	return nil
}

func runCalcFieldValidate(cmd *cobra.Command, args []string) error {
	modelID, _ := cmd.Flags().GetInt("model")
	name, _ := cmd.Flags().GetString("name")
	columnIDVal, _ := cmd.Flags().GetInt("column")

	c, cfg, err := newClientFromConfig()
	if err != nil {
		return err
	}
	if cfg.ProjectID == "" {
		return fmt.Errorf("no project selected — run: wren project use <id>")
	}

	var columnID *int
	if columnIDVal > 0 {
		columnID = &columnIDVal
	}

	result, err := c.ValidateCalculatedField(name, modelID, columnID)
	if err != nil {
		return err
	}

	if jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(result)
	}

	if result.Valid {
		fmt.Printf("Name %q is valid for model %d.\n", name, modelID)
	} else {
		fmt.Printf("Name %q is invalid: %s\n", name, result.Message)
	}
	return nil
}
