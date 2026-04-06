package cmd

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"strconv"
	"strings"
	"text/tabwriter"
	"time"

	"github.com/pterm/pterm"
	"github.com/spf13/cobra"
)

// --- Parent command ---

var agentBuilderCmd = &cobra.Command{
	Use:     "agent-builder",
	Aliases: []string{"ab"},
	Short:   "Manage agent definitions (Agent Builder)",
	Long:    "Create, publish, deploy, archive, and chat with built agents.",
}

// --- list ---

var abListCmd = &cobra.Command{
	Use:   "list",
	Short: "List all agent definitions",
	RunE:  runABList,
}

func runABList(cmd *cobra.Command, args []string) error {
	c, _, err := newClientFromConfig()
	if err != nil {
		return err
	}

	defs, err := c.ListAgentDefinitions()
	if err != nil {
		return err
	}

	if jsonOutput {
		return json.NewEncoder(os.Stdout).Encode(defs)
	}

	if len(defs) == 0 {
		pterm.Info.Println("No agent definitions found.")
		return nil
	}

	w := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
	fmt.Fprintln(w, "ID\tNAME\tSTATUS\tVERSION\tMODEL\tCREATED")
	for _, d := range defs {
		created := formatTime(d.CreatedAt)
		fmt.Fprintf(w, "%d\t%s\t%s\tv%d\t%s\t%s\n",
			d.ID, d.Name, d.Status, d.CurrentVersion, d.Model, created)
	}
	return w.Flush()
}

// --- show ---

var abShowCmd = &cobra.Command{
	Use:   "show <id>",
	Short: "Show agent definition details",
	Args:  cobra.ExactArgs(1),
	RunE:  runABShow,
}

func runABShow(cmd *cobra.Command, args []string) error {
	id, err := strconv.Atoi(args[0])
	if err != nil {
		return fmt.Errorf("invalid id: %s", args[0])
	}

	c, _, err := newClientFromConfig()
	if err != nil {
		return err
	}

	def, err := c.GetAgentDefinition(id)
	if err != nil {
		return err
	}

	if jsonOutput {
		return json.NewEncoder(os.Stdout).Encode(def)
	}

	w := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
	fmt.Fprintf(w, "ID:\t%d\n", def.ID)
	fmt.Fprintf(w, "Name:\t%s\n", def.Name)
	fmt.Fprintf(w, "Status:\t%s\n", def.Status)
	fmt.Fprintf(w, "Version:\tv%d\n", def.CurrentVersion)
	fmt.Fprintf(w, "Model:\t%s\n", def.Model)
	if def.Description != "" {
		fmt.Fprintf(w, "Description:\t%s\n", def.Description)
	}
	if len(def.Tags) > 0 {
		fmt.Fprintf(w, "Tags:\t%s\n", strings.Join(def.Tags, ", "))
	}
	if def.Temperature != nil {
		fmt.Fprintf(w, "Temperature:\t%.2f\n", *def.Temperature)
	}
	if def.MaxTokens != nil {
		fmt.Fprintf(w, "Max Tokens:\t%d\n", *def.MaxTokens)
	}
	if def.SystemPrompt != "" {
		truncated := def.SystemPrompt
		if len(truncated) > 200 {
			truncated = truncated[:200] + "..."
		}
		fmt.Fprintf(w, "System Prompt:\t%s\n", truncated)
	}
	if def.DeployedAt != "" {
		fmt.Fprintf(w, "Deployed At:\t%s\n", formatTime(def.DeployedAt))
	}
	fmt.Fprintf(w, "Created:\t%s\n", formatTime(def.CreatedAt))
	fmt.Fprintf(w, "Updated:\t%s\n", formatTime(def.UpdatedAt))
	return w.Flush()
}

// --- create ---

var (
	abCreateName        string
	abCreateDescription string
	abCreateModel       string
	abCreatePrompt      string
	abCreateTemperature float64
	abCreateMaxTokens   int
	abCreateTags        []string
)

var abCreateCmd = &cobra.Command{
	Use:   "create",
	Short: "Create a new agent definition",
	RunE:  runABCreate,
}

func runABCreate(cmd *cobra.Command, args []string) error {
	if abCreateName == "" {
		return fmt.Errorf("--name is required")
	}

	c, _, err := newClientFromConfig()
	if err != nil {
		return err
	}

	input := map[string]interface{}{
		"name": abCreateName,
	}
	if abCreateDescription != "" {
		input["description"] = abCreateDescription
	}
	if abCreateModel != "" {
		input["model"] = abCreateModel
	}
	if abCreatePrompt != "" {
		input["systemPrompt"] = abCreatePrompt
	}
	if cmd.Flags().Changed("temperature") {
		input["temperature"] = abCreateTemperature
	}
	if cmd.Flags().Changed("max-tokens") {
		input["maxTokens"] = abCreateMaxTokens
	}
	if len(abCreateTags) > 0 {
		input["tags"] = abCreateTags
	}

	def, err := c.CreateAgentDefinition(input)
	if err != nil {
		return err
	}

	if jsonOutput {
		return json.NewEncoder(os.Stdout).Encode(def)
	}

	pterm.Success.Printfln("Created agent definition \"%s\" (ID: %d)", def.Name, def.ID)
	return nil
}

// --- publish ---

var abPublishNote string

var abPublishCmd = &cobra.Command{
	Use:   "publish <id>",
	Short: "Publish a new version of an agent definition",
	Args:  cobra.ExactArgs(1),
	RunE:  runABPublish,
}

func runABPublish(cmd *cobra.Command, args []string) error {
	id, err := strconv.Atoi(args[0])
	if err != nil {
		return fmt.Errorf("invalid id: %s", args[0])
	}

	c, _, err := newClientFromConfig()
	if err != nil {
		return err
	}

	def, err := c.PublishAgentDefinition(id, abPublishNote)
	if err != nil {
		return err
	}

	if jsonOutput {
		return json.NewEncoder(os.Stdout).Encode(def)
	}

	pterm.Success.Printfln("Published \"%s\" → v%d", def.Name, def.CurrentVersion)
	return nil
}

// --- deploy ---

var abDeployCmd = &cobra.Command{
	Use:   "deploy <id>",
	Short: "Deploy an agent definition for API access",
	Args:  cobra.ExactArgs(1),
	RunE:  runABDeploy,
}

func runABDeploy(cmd *cobra.Command, args []string) error {
	id, err := strconv.Atoi(args[0])
	if err != nil {
		return fmt.Errorf("invalid id: %s", args[0])
	}

	c, _, err := newClientFromConfig()
	if err != nil {
		return err
	}

	def, err := c.DeployAgentDefinition(id)
	if err != nil {
		return err
	}

	if jsonOutput {
		return json.NewEncoder(os.Stdout).Encode(def)
	}

	pterm.Success.Printfln("Deployed \"%s\" (v%d) — status: %s", def.Name, def.CurrentVersion, def.Status)
	return nil
}

// --- archive ---

var abArchiveCmd = &cobra.Command{
	Use:   "archive <id>",
	Short: "Archive an agent definition",
	Args:  cobra.ExactArgs(1),
	RunE:  runABArchive,
}

func runABArchive(cmd *cobra.Command, args []string) error {
	id, err := strconv.Atoi(args[0])
	if err != nil {
		return fmt.Errorf("invalid id: %s", args[0])
	}

	c, _, err := newClientFromConfig()
	if err != nil {
		return err
	}

	def, err := c.ArchiveAgentDefinition(id)
	if err != nil {
		return err
	}

	if jsonOutput {
		return json.NewEncoder(os.Stdout).Encode(def)
	}

	pterm.Success.Printfln("Archived \"%s\" — status: %s", def.Name, def.Status)
	return nil
}

// --- versions ---

var abVersionsCmd = &cobra.Command{
	Use:   "versions <id>",
	Short: "Show version history for an agent definition",
	Args:  cobra.ExactArgs(1),
	RunE:  runABVersions,
}

func runABVersions(cmd *cobra.Command, args []string) error {
	id, err := strconv.Atoi(args[0])
	if err != nil {
		return fmt.Errorf("invalid id: %s", args[0])
	}

	c, _, err := newClientFromConfig()
	if err != nil {
		return err
	}

	versions, err := c.ListAgentDefinitionVersions(id)
	if err != nil {
		return err
	}

	if jsonOutput {
		return json.NewEncoder(os.Stdout).Encode(versions)
	}

	if len(versions) == 0 {
		pterm.Info.Println("No published versions yet.")
		return nil
	}

	w := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
	fmt.Fprintln(w, "VERSION\tMODEL\tCHANGE NOTE\tCREATED")
	for _, v := range versions {
		note := v.ChangeNote
		if len(note) > 60 {
			note = note[:60] + "..."
		}
		fmt.Fprintf(w, "v%d\t%s\t%s\t%s\n",
			v.Version, v.Model, note, formatTime(v.CreatedAt))
	}
	return w.Flush()
}

// --- chat (interactive REPL) ---

var abChatCmd = &cobra.Command{
	Use:   "chat <id>",
	Short: "Interactive chat with a deployed agent",
	Long: `Start an interactive chat session with a deployed agent.
Type your messages and press Enter to send. The agent will respond
with its reasoning steps and final answer. Type "exit" or press Ctrl+C to quit.`,
	Args: cobra.ExactArgs(1),
	RunE: runABChat,
}

func runABChat(cmd *cobra.Command, args []string) error {
	id, err := strconv.Atoi(args[0])
	if err != nil {
		return fmt.Errorf("invalid id: %s", args[0])
	}

	c, _, err := newClientFromConfig()
	if err != nil {
		return err
	}

	// Increase timeout for long-running chat responses
	c.SetTimeout(120 * time.Second)

	// Get agent info
	def, err := c.GetAgentDefinition(id)
	if err != nil {
		return err
	}

	if def.Status != "DEPLOYED" {
		return fmt.Errorf("agent \"%s\" is not deployed (status: %s) — deploy it first with: legible agent-builder deploy %d",
			def.Name, def.Status, def.ID)
	}

	// Create a session
	session, err := c.CreateAgentChatSession(id)
	if err != nil {
		return fmt.Errorf("creating session: %w", err)
	}

	pterm.DefaultHeader.WithBackgroundStyle(pterm.NewStyle(pterm.BgCyan)).
		Printfln("Chat with \"%s\" (v%d) — session %d", def.Name, def.CurrentVersion, session.SessionID)
	fmt.Println("Type your message and press Enter. Type \"exit\" to quit.")
	fmt.Println()

	scanner := bufio.NewScanner(os.Stdin)
	for {
		pterm.FgCyan.Print("you> ")
		if !scanner.Scan() {
			break
		}

		input := strings.TrimSpace(scanner.Text())
		if input == "" {
			continue
		}
		if strings.EqualFold(input, "exit") || strings.EqualFold(input, "quit") {
			pterm.Info.Println("Ending chat session.")
			break
		}

		spinner, _ := pterm.DefaultSpinner.Start("Thinking...")
		resp, err := c.SendAgentChatMessage(id, session.SessionID, input)
		spinner.Stop()

		if err != nil {
			pterm.Error.Printfln("Error: %v", err)
			continue
		}

		if jsonOutput {
			json.NewEncoder(os.Stdout).Encode(resp)
			continue
		}

		// Print response messages
		for _, msg := range resp.Messages {
			if msg.Role == "user" {
				continue
			}

			// Show reasoning steps if present
			for _, step := range msg.ReasoningSteps {
				switch step.Type {
				case "tool_call":
					pterm.FgGray.Printfln("  ⚙ Tool: %s", step.ToolName)
				case "tool_result":
					output := fmt.Sprintf("%v", step.ToolOutput)
					if len(output) > 200 {
						output = output[:200] + "..."
					}
					pterm.FgGray.Printfln("  ← %s", output)
				case "thinking":
					if step.Content != "" {
						thought := step.Content
						if len(thought) > 200 {
							thought = thought[:200] + "..."
						}
						pterm.FgGray.Printfln("  💭 %s", thought)
					}
				}
			}

			// Print the main assistant content
			if msg.Content != "" {
				pterm.FgGreen.Print("agent> ")
				fmt.Println(msg.Content)
			}

			if msg.Error != "" {
				pterm.Error.Printfln("Agent error: %s", msg.Error)
			}
		}
		fmt.Println()
	}

	return scanner.Err()
}

// --- init ---

func init() {
	// create flags
	abCreateCmd.Flags().StringVar(&abCreateName, "name", "", "Agent name (required)")
	abCreateCmd.Flags().StringVar(&abCreateDescription, "description", "", "Agent description")
	abCreateCmd.Flags().StringVar(&abCreateModel, "model", "", "LLM model identifier")
	abCreateCmd.Flags().StringVar(&abCreatePrompt, "system-prompt", "", "System prompt")
	abCreateCmd.Flags().Float64Var(&abCreateTemperature, "temperature", 0.7, "Temperature (0.0–2.0)")
	abCreateCmd.Flags().IntVar(&abCreateMaxTokens, "max-tokens", 0, "Max output tokens")
	abCreateCmd.Flags().StringSliceVar(&abCreateTags, "tags", nil, "Comma-separated tags")

	// publish flags
	abPublishCmd.Flags().StringVar(&abPublishNote, "note", "", "Change note for this version")

	// Register subcommands
	agentBuilderCmd.AddCommand(abListCmd)
	agentBuilderCmd.AddCommand(abShowCmd)
	agentBuilderCmd.AddCommand(abCreateCmd)
	agentBuilderCmd.AddCommand(abPublishCmd)
	agentBuilderCmd.AddCommand(abDeployCmd)
	agentBuilderCmd.AddCommand(abArchiveCmd)
	agentBuilderCmd.AddCommand(abVersionsCmd)
	agentBuilderCmd.AddCommand(abChatCmd)

	rootCmd.AddCommand(agentBuilderCmd)
}

// formatTime parses an ISO time string and returns a friendly format.
func formatTime(ts string) string {
	for _, layout := range []string{
		time.RFC3339,
		time.RFC3339Nano,
		"2006-01-02T15:04:05.000Z",
		"2006-01-02T15:04:05Z",
	} {
		if t, err := time.Parse(layout, ts); err == nil {
			return t.Format("2006-01-02 15:04")
		}
	}
	return ts
}
