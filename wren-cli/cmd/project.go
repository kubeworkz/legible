package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"strconv"
	"text/tabwriter"

	"github.com/Canner/WrenAI/wren-cli/internal/client"
	"github.com/Canner/WrenAI/wren-cli/internal/config"
	"github.com/spf13/cobra"
)

var projectCmd = &cobra.Command{
	Use:     "project",
	Aliases: []string{"projects"},
	Short:   "Manage projects",
}

var projectListCmd = &cobra.Command{
	Use:     "list",
	Aliases: []string{"ls"},
	Short:   "List all projects in the organization",
	RunE:    runProjectList,
}

var projectUseCmd = &cobra.Command{
	Use:   "use <project-id>",
	Short: "Set the active project for subsequent commands",
	Long: `Sets the project ID in your config so all subsequent commands
operate on that project. Use "wren project list" to see available projects.

Examples:
  wren project use 1
  wren project use 42`,
	Args: cobra.ExactArgs(1),
	RunE: runProjectUse,
}

var projectCurrentCmd = &cobra.Command{
	Use:   "current",
	Short: "Show the currently active project",
	RunE:  runProjectCurrent,
}

var projectInfoCmd = &cobra.Command{
	Use:   "info [project-id]",
	Short: "Show detailed information about a project",
	Long: `Show detailed information about a project. If no ID is given,
uses the currently configured project.`,
	Args: cobra.MaximumNArgs(1),
	RunE: runProjectInfo,
}

var projectCreateCmd = &cobra.Command{
	Use:   "create <name>",
	Short: "Create a new project",
	Args:  cobra.ExactArgs(1),
	RunE:  runProjectCreate,
}

var projectUpdateCmd = &cobra.Command{
	Use:   "update [project-id]",
	Short: "Update a project's settings",
	Long: `Update a project's name, language, or timezone.
If no project ID is given, uses the currently configured project.

Examples:
  wren project update --name "My Project"
  wren project update 2 --language en --timezone "Asia/Tokyo"`,
	Args: cobra.MaximumNArgs(1),
	RunE: runProjectUpdate,
}

var projectDeleteCmd = &cobra.Command{
	Use:   "delete <project-id>",
	Short: "Delete a project",
	Args:  cobra.ExactArgs(1),
	RunE:  runProjectDelete,
}

func init() {
	projectUpdateCmd.Flags().String("name", "", "New display name")
	projectUpdateCmd.Flags().String("language", "", "Language code (e.g. en, zh)")
	projectUpdateCmd.Flags().String("timezone", "", "Timezone (e.g. Asia/Tokyo)")

	projectCmd.AddCommand(projectListCmd)
	projectCmd.AddCommand(projectUseCmd)
	projectCmd.AddCommand(projectCurrentCmd)
	projectCmd.AddCommand(projectInfoCmd)
	projectCmd.AddCommand(projectCreateCmd)
	projectCmd.AddCommand(projectUpdateCmd)
	projectCmd.AddCommand(projectDeleteCmd)
	rootCmd.AddCommand(projectCmd)
}

func runProjectList(cmd *cobra.Command, args []string) error {
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("loading config: %w", err)
	}

	c, err := client.New(cfg)
	if err != nil {
		return err
	}

	projects, err := c.ListProjects()
	if err != nil {
		return err
	}

	if jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(projects)
	}

	if len(projects) == 0 {
		fmt.Println("No projects found.")
		return nil
	}

	w := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
	fmt.Fprintln(w, "ID\tNAME\tTYPE\tLANGUAGE\tTIMEZONE")
	for _, p := range projects {
		active := ""
		if cfg.ProjectID == strconv.Itoa(p.ID) {
			active = " *"
		}
		pType := p.Type
		if pType == "" {
			pType = "-"
		}
		tz := p.Timezone
		if tz == "" {
			tz = "-"
		}
		fmt.Fprintf(w, "%d\t%s%s\t%s\t%s\t%s\n", p.ID, p.DisplayName, active, pType, p.Language, tz)
	}
	w.Flush()

	return nil
}

func runProjectUse(cmd *cobra.Command, args []string) error {
	projectID := args[0]

	// Validate it's a number
	id, err := strconv.Atoi(projectID)
	if err != nil {
		return fmt.Errorf("project ID must be a number, got %q", projectID)
	}

	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("loading config: %w", err)
	}

	// Verify project exists by fetching it
	c, err := client.New(cfg)
	if err != nil {
		return err
	}

	project, err := c.GetProject(id)
	if err != nil {
		return fmt.Errorf("project %d not found: %w", id, err)
	}

	cfg.ProjectID = projectID
	if err := cfg.Save(); err != nil {
		return fmt.Errorf("saving config: %w", err)
	}

	if jsonOutput {
		out := map[string]interface{}{
			"status":    "switched",
			"projectId": id,
			"name":      project.DisplayName,
		}
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(out)
	}

	fmt.Printf("Switched to project: %s (ID: %d)\n", project.DisplayName, id)
	return nil
}

func runProjectCurrent(cmd *cobra.Command, args []string) error {
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("loading config: %w", err)
	}

	if cfg.ProjectID == "" {
		if jsonOutput {
			enc := json.NewEncoder(os.Stdout)
			enc.SetIndent("", "  ")
			return enc.Encode(map[string]interface{}{"projectId": nil})
		}
		fmt.Println("No project selected. Use: wren project use <id>")
		return nil
	}

	id, _ := strconv.Atoi(cfg.ProjectID)

	// Try to fetch project info for a richer display
	c, err := client.New(cfg)
	if err == nil {
		if project, err := c.GetProject(id); err == nil {
			if jsonOutput {
				enc := json.NewEncoder(os.Stdout)
				enc.SetIndent("", "  ")
				return enc.Encode(project)
			}
			fmt.Printf("Current project: %s (ID: %d)\n", project.DisplayName, id)
			if project.Type != "" {
				fmt.Printf("Data source:     %s\n", project.Type)
			}
			if project.Timezone != "" {
				fmt.Printf("Timezone:        %s\n", project.Timezone)
			}
			return nil
		}
	}

	// Fallback: just show the configured ID
	if jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(map[string]interface{}{"projectId": id})
	}
	fmt.Printf("Current project ID: %d\n", id)
	return nil
}

func runProjectInfo(cmd *cobra.Command, args []string) error {
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("loading config: %w", err)
	}

	c, err := client.New(cfg)
	if err != nil {
		return err
	}

	var projectID int
	if len(args) == 1 {
		projectID, err = strconv.Atoi(args[0])
		if err != nil {
			return fmt.Errorf("project ID must be a number, got %q", args[0])
		}
	} else if cfg.ProjectID != "" {
		projectID, _ = strconv.Atoi(cfg.ProjectID)
	} else {
		return fmt.Errorf("no project specified — pass an ID or set one with: wren project use <id>")
	}

	project, err := c.GetProject(projectID)
	if err != nil {
		return err
	}

	if jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(project)
	}

	fmt.Printf("Project:     %s\n", project.DisplayName)
	fmt.Printf("ID:          %d\n", project.ID)
	if project.Type != "" {
		fmt.Printf("Data Source: %s\n", project.Type)
	}
	fmt.Printf("Language:    %s\n", project.Language)
	if project.Timezone != "" {
		fmt.Printf("Timezone:    %s\n", project.Timezone)
	}
	fmt.Printf("Created:     %s\n", project.CreatedAt)
	fmt.Printf("Updated:     %s\n", project.UpdatedAt)
	return nil
}

func runProjectCreate(cmd *cobra.Command, args []string) error {
	c, _, err := newClientFromConfig()
	if err != nil {
		return err
	}

	project, err := c.CreateProject(args[0])
	if err != nil {
		return err
	}

	if jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(project)
	}

	fmt.Printf("Created project %q (ID: %d)\n", project.DisplayName, project.ID)
	return nil
}

func runProjectUpdate(cmd *cobra.Command, args []string) error {
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("loading config: %w", err)
	}

	c, err := client.New(cfg)
	if err != nil {
		return err
	}

	var projectID int
	if len(args) == 1 {
		projectID, err = strconv.Atoi(args[0])
		if err != nil {
			return fmt.Errorf("project ID must be a number, got %q", args[0])
		}
	} else if cfg.ProjectID != "" {
		projectID, _ = strconv.Atoi(cfg.ProjectID)
	} else {
		return fmt.Errorf("no project specified — pass an ID or set one with: wren project use <id>")
	}

	nameFlag, _ := cmd.Flags().GetString("name")
	langFlag, _ := cmd.Flags().GetString("language")
	tzFlag, _ := cmd.Flags().GetString("timezone")

	if nameFlag == "" && langFlag == "" && tzFlag == "" {
		return fmt.Errorf("specify at least one of --name, --language, or --timezone")
	}

	var name, lang, tz *string
	if nameFlag != "" {
		name = &nameFlag
	}
	if langFlag != "" {
		lang = &langFlag
	}
	if tzFlag != "" {
		tz = &tzFlag
	}

	project, err := c.UpdateProject(projectID, name, lang, tz)
	if err != nil {
		return err
	}

	if jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(project)
	}

	fmt.Printf("Updated project %q (ID: %d)\n", project.DisplayName, project.ID)
	return nil
}

func runProjectDelete(cmd *cobra.Command, args []string) error {
	projectID, err := strconv.Atoi(args[0])
	if err != nil {
		return fmt.Errorf("project ID must be a number, got %q", args[0])
	}

	c, _, err := newClientFromConfig()
	if err != nil {
		return err
	}

	if err := c.DeleteProject(projectID); err != nil {
		return err
	}

	if jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(map[string]interface{}{"deleted": true, "id": projectID})
	}

	fmt.Printf("Deleted project %d.\n", projectID)
	return nil
}
