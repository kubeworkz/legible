package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"strconv"
	"strings"
	"text/tabwriter"

	"github.com/Canner/WrenAI/wren-cli/internal/client"
	"github.com/spf13/cobra"
)

var instructionCmd = &cobra.Command{
	Use:     "instruction",
	Aliases: []string{"instructions"},
	Short:   "Manage knowledge instructions",
	Long: `Instructions guide the AI when generating SQL.

Global instructions apply to every query. Question-matching instructions
only activate when the user's question matches one of the specified patterns.`,
}

var instructionListCmd = &cobra.Command{
	Use:     "list",
	Aliases: []string{"ls"},
	Short:   "List all instructions",
	RunE:    runInstructionList,
}

var instructionCreateCmd = &cobra.Command{
	Use:   "create",
	Short: "Create a new instruction",
	Long: `Create a new knowledge instruction. Use --global for instructions that
apply to every query, or --question to match specific questions.

Examples:
  wren instruction create --global --text "Always use fiscal year calendar"
  wren instruction create --text "Revenue means net revenue" --question "What is revenue?" --question "Show revenue"`,
	RunE: runInstructionCreate,
}

var instructionUpdateCmd = &cobra.Command{
	Use:   "update <id>",
	Short: "Update an existing instruction",
	Long: `Update an instruction's text, questions, or global flag.

Examples:
  wren instruction update 1 --text "Use calendar year instead"
  wren instruction update 2 --question "New question" --question "Another"
  wren instruction update 3 --global`,
	Args: cobra.ExactArgs(1),
	RunE: runInstructionUpdate,
}

var instructionDeleteCmd = &cobra.Command{
	Use:   "delete <id>",
	Short: "Delete an instruction",
	Long: `Delete an instruction by ID.

Examples:
  wren instruction delete 1`,
	Args: cobra.ExactArgs(1),
	RunE: runInstructionDelete,
}

var (
	instrText      string
	instrGlobal    bool
	instrQuestions []string
)

func init() {
	instructionCreateCmd.Flags().StringVar(&instrText, "text", "", "Instruction text (required)")
	instructionCreateCmd.Flags().BoolVar(&instrGlobal, "global", false, "Make this a global instruction")
	instructionCreateCmd.Flags().StringArrayVar(&instrQuestions, "question", nil, "Matching question (can be repeated)")
	instructionCreateCmd.MarkFlagRequired("text")

	instructionUpdateCmd.Flags().StringVar(&instrText, "text", "", "Updated instruction text")
	instructionUpdateCmd.Flags().BoolVar(&instrGlobal, "global", false, "Make this a global instruction")
	instructionUpdateCmd.Flags().StringArrayVar(&instrQuestions, "question", nil, "Updated matching questions (replaces all)")

	instructionCmd.AddCommand(instructionListCmd)
	instructionCmd.AddCommand(instructionCreateCmd)
	instructionCmd.AddCommand(instructionUpdateCmd)
	instructionCmd.AddCommand(instructionDeleteCmd)
	rootCmd.AddCommand(instructionCmd)
}

func runInstructionList(cmd *cobra.Command, args []string) error {
	c, cfg, err := newClientFromConfig()
	if err != nil {
		return err
	}
	if cfg.ProjectID == "" {
		return fmt.Errorf("no project selected — run: wren project use <id>")
	}

	instructions, err := c.ListInstructions()
	if err != nil {
		return err
	}

	if jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(instructions)
	}

	if len(instructions) == 0 {
		fmt.Println("No instructions found.")
		return nil
	}

	w := tabwriter.NewWriter(os.Stdout, 0, 4, 2, ' ', 0)
	fmt.Fprintln(w, "ID\tTYPE\tINSTRUCTION\tQUESTIONS")
	for _, inst := range instructions {
		instType := "question"
		if inst.IsGlobal {
			instType = "global"
		}
		text := truncate(inst.Instruction, 60)
		questions := "-"
		if len(inst.Questions) > 0 {
			questions = truncate(strings.Join(inst.Questions, "; "), 50)
		}
		fmt.Fprintf(w, "%d\t%s\t%s\t%s\n", inst.ID, instType, text, questions)
	}
	w.Flush()

	return nil
}

func runInstructionCreate(cmd *cobra.Command, args []string) error {
	c, cfg, err := newClientFromConfig()
	if err != nil {
		return err
	}
	if cfg.ProjectID == "" {
		return fmt.Errorf("no project selected — run: wren project use <id>")
	}

	req := &client.CreateInstructionRequest{
		Instruction: instrText,
	}

	if instrGlobal {
		req.IsGlobal = true
	} else if len(instrQuestions) > 0 {
		req.Questions = instrQuestions
	} else {
		return fmt.Errorf("must specify either --global or at least one --question")
	}

	result, err := c.CreateInstruction(req)
	if err != nil {
		return err
	}

	if jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(result)
	}

	fmt.Printf("Created instruction %d (%s)\n", result.ID, instructionType(result))
	return nil
}

func runInstructionUpdate(cmd *cobra.Command, args []string) error {
	c, cfg, err := newClientFromConfig()
	if err != nil {
		return err
	}
	if cfg.ProjectID == "" {
		return fmt.Errorf("no project selected — run: wren project use <id>")
	}

	id, err := strconv.Atoi(args[0])
	if err != nil {
		return fmt.Errorf("invalid instruction ID: %s", args[0])
	}

	req := &client.UpdateInstructionRequest{}
	hasChange := false

	if cmd.Flags().Changed("text") {
		req.Instruction = &instrText
		hasChange = true
	}
	if cmd.Flags().Changed("global") {
		req.IsGlobal = &instrGlobal
		hasChange = true
	}
	if cmd.Flags().Changed("question") {
		req.Questions = instrQuestions
		hasChange = true
	}

	if !hasChange {
		return fmt.Errorf("no changes specified — use --text, --global, or --question")
	}

	result, err := c.UpdateInstruction(id, req)
	if err != nil {
		return err
	}

	if jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(result)
	}

	fmt.Printf("Updated instruction %d\n", result.ID)
	return nil
}

func runInstructionDelete(cmd *cobra.Command, args []string) error {
	c, cfg, err := newClientFromConfig()
	if err != nil {
		return err
	}
	if cfg.ProjectID == "" {
		return fmt.Errorf("no project selected — run: wren project use <id>")
	}

	id, err := strconv.Atoi(args[0])
	if err != nil {
		return fmt.Errorf("invalid instruction ID: %s", args[0])
	}

	if err := c.DeleteInstruction(id); err != nil {
		return err
	}

	if !jsonOutput {
		fmt.Printf("Deleted instruction %d\n", id)
	}
	return nil
}

func instructionType(inst *client.Instruction) string {
	if inst.IsGlobal {
		return "global"
	}
	return "question-matching"
}

func truncate(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen-3] + "..."
}
