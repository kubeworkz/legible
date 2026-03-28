package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"text/tabwriter"

	"github.com/Kubeworkz/legible/legible-launcher/commands/dbt"
	"github.com/Kubeworkz/legible/legible-cli/internal/client"
	"github.com/Kubeworkz/legible/legible-cli/internal/config"
	dbtfilter "github.com/Kubeworkz/legible/legible-cli/internal/dbt"
	"github.com/Kubeworkz/legible/legible-cli/internal/legibleconfig"
	"github.com/spf13/cobra"
)

var dbtCmd = &cobra.Command{
	Use:   "dbt",
	Short: "Import and sync dbt projects",
}

var dbtCreateCmd = &cobra.Command{
	Use:   "create",
	Short: "Create a new project from a dbt project",
	Long: `Create a new Legible project by importing models, columns, and
relationships from a local dbt project.

Requires:
  - A valid dbt project (dbt_project.yml)
  - catalog.json in target/ (run 'dbt docs generate')
  - manifest.json in target/ (run 'dbt build')

Examples:
  legible dbt create --path /path/to/dbt-project
  legible dbt create --path . --name "My Analytics"
  legible dbt create --path . --include "marts_.*" --dry-run`,
	RunE: runDbtCreate,
}

var dbtUpdateCmd = &cobra.Command{
	Use:   "update",
	Short: "Update an existing project from dbt changes",
	Long: `Re-sync a previously linked Legible project with the latest
changes from your dbt models. Reads the project ID from .legibleconfig
in the dbt project directory.

WARNING: This replaces the current MDL in your project with the updated
dbt models. Any manual changes made in the UI will be overwritten.

Examples:
  legible dbt update --path /path/to/dbt-project
  legible dbt update --path . --yes
  legible dbt update --path . --include "marts_.*" --dry-run`,
	RunE: runDbtUpdate,
}

func init() {
	// dbt create flags
	dbtCreateCmd.Flags().String("path", ".", "Path to the dbt project root directory")
	dbtCreateCmd.Flags().String("name", "", "Display name for the new project")
	dbtCreateCmd.Flags().String("profile", "", "dbt profile name to use")
	dbtCreateCmd.Flags().String("target", "", "dbt target/output to use")
	dbtCreateCmd.Flags().String("include", "", "Regex pattern to include matching models")
	dbtCreateCmd.Flags().String("exclude", "", "Regex pattern to exclude matching models")
	dbtCreateCmd.Flags().Bool("dry-run", false, "Preview models without creating the project")
	dbtCreateCmd.Flags().Bool("include-staging-models", false, "Include staging/intermediate models")

	// dbt update flags
	dbtUpdateCmd.Flags().String("path", ".", "Path to the dbt project root directory")
	dbtUpdateCmd.Flags().String("profile", "", "dbt profile name to use")
	dbtUpdateCmd.Flags().String("target", "", "dbt target/output to use")
	dbtUpdateCmd.Flags().String("include", "", "Regex pattern to include (dry-run only)")
	dbtUpdateCmd.Flags().String("exclude", "", "Regex pattern to exclude (dry-run only)")
	dbtUpdateCmd.Flags().Bool("dry-run", false, "Preview changes without applying")
	dbtUpdateCmd.Flags().BoolP("yes", "y", false, "Skip confirmation prompt")
	dbtUpdateCmd.Flags().Bool("include-staging-models", false, "Include staging/intermediate models")

	dbtCmd.AddCommand(dbtCreateCmd)
	dbtCmd.AddCommand(dbtUpdateCmd)
	rootCmd.AddCommand(dbtCmd)
}

func runDbtCreate(cmd *cobra.Command, args []string) error {
	path, _ := cmd.Flags().GetString("path")
	name, _ := cmd.Flags().GetString("name")
	profile, _ := cmd.Flags().GetString("profile")
	target, _ := cmd.Flags().GetString("target")
	include, _ := cmd.Flags().GetString("include")
	exclude, _ := cmd.Flags().GetString("exclude")
	dryRun, _ := cmd.Flags().GetBool("dry-run")
	includeStagingModels, _ := cmd.Flags().GetBool("include-staging-models")

	// Check if already linked
	if legibleconfig.Exists(path) {
		return fmt.Errorf("this dbt project is already linked (found .legibleconfig) — use 'legible dbt update' instead")
	}

	// Validate dbt project
	if !dbt.IsDbtProjectValid(path) {
		return fmt.Errorf("not a valid dbt project: %s (missing dbt_project.yml)", path)
	}

	// Use a temp directory for converter output
	tmpDir, err := os.MkdirTemp("", "legible-dbt-*")
	if err != nil {
		return fmt.Errorf("creating temp directory: %w", err)
	}
	defer os.RemoveAll(tmpDir)

	// Convert dbt project to Legible MDL + data source JSON
	fmt.Println("Converting dbt project...")
	_, err = dbt.ConvertDbtProjectCore(dbt.ConvertOptions{
		ProjectPath:          path,
		OutputDir:            tmpDir,
		ProfileName:          profile,
		Target:               target,
		RequireCatalog:       true,
		IncludeStagingModels: includeStagingModels,
	})
	if err != nil {
		return fmt.Errorf("dbt conversion failed: %w", err)
	}

	// Read the generated MDL
	mdl, err := readDbtMDL(filepath.Join(tmpDir, "legible-mdl.json"))
	if err != nil {
		return err
	}

	// Apply include/exclude filters
	f := dbtfilter.NewFilterSingle(include, exclude)
	mdl.Models = applyModelFilter(mdl.Models, f)
	if len(mdl.Models) == 0 {
		return fmt.Errorf("no models matched the filter criteria")
	}

	// Print summary
	printCreateSummary(mdl)

	if dryRun {
		fmt.Println("\nDry run — no project created.")
		return nil
	}

	// Read data source JSON (optional — converter may not have generated it)
	var dsInput *client.SaveDataSourceInput
	dsPath := filepath.Join(tmpDir, "legible-datasource.json")
	if _, err := os.Stat(dsPath); err == nil {
		dsInput, err = readDbtDataSource(dsPath)
		if err != nil {
			return err
		}
	}

	// Default project name from dbt project directory
	if name == "" {
		absPath, _ := filepath.Abs(path)
		name = filepath.Base(absPath)
	}

	// --- API calls ---
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("loading config: %w", err)
	}
	c, err := client.New(cfg)
	if err != nil {
		return err
	}

	// 1. Create project
	fmt.Printf("\nCreating project %q... ", name)
	project, err := c.CreateProject(name)
	if err != nil {
		fmt.Println("FAILED")
		return err
	}
	fmt.Printf("OK (ID: %d)\n", project.ID)

	// Switch client context to the new project
	projectIDStr := strconv.Itoa(project.ID)
	c.SetProjectID(projectIDStr)

	// 2. Save data source (if available)
	if dsInput != nil {
		fmt.Printf("Configuring %s data source... ", dsInput.Type)
		_, err = c.SaveDataSource(dsInput)
		if err != nil {
			fmt.Println("FAILED")
			return fmt.Errorf("saving data source: %w", err)
		}
		fmt.Println("OK")
	}

	// 3. Save tables as models
	tableNames := make([]string, len(mdl.Models))
	for i, m := range mdl.Models {
		tableNames[i] = m.Name
	}
	fmt.Printf("Importing %d models... ", len(tableNames))
	if err := c.SaveTables(tableNames); err != nil {
		fmt.Println("FAILED")
		return fmt.Errorf("saving tables: %w", err)
	}
	fmt.Println("OK")

	// 4. Save relationships (needs model/column IDs, so must come after SaveTables)
	if len(mdl.Relationships) > 0 {
		fmt.Printf("Saving %d relationships... ", len(mdl.Relationships))
		relInputs := toMDLRelations(mdl.Relationships)
		resolved, unresolved, err := c.ResolveRelations(relInputs)
		if err != nil {
			fmt.Println("FAILED")
			return fmt.Errorf("resolving relations: %w", err)
		}
		if len(unresolved) > 0 {
			fmt.Printf("(%d unresolved) ", len(unresolved))
			for _, u := range unresolved {
				fmt.Printf("\n  ⚠ %s", u)
			}
			fmt.Println()
		}
		if len(resolved) > 0 {
			if err := c.SaveRelations(resolved); err != nil {
				fmt.Println("FAILED")
				return fmt.Errorf("saving relations: %w", err)
			}
			fmt.Printf("OK (%d saved)\n", len(resolved))
		} else {
			fmt.Println("SKIPPED (none resolved)")
		}
	}

	// 5. Update model metadata (descriptions from dbt)
	syncModelMetadata(c, mdl)

	// 6. Deploy
	fmt.Print("Deploying... ")
	if _, err := c.Deploy(false); err != nil {
		fmt.Println("FAILED")
		return fmt.Errorf("deploying: %w", err)
	}
	fmt.Println("OK")

	// 7. Save .legibleconfig
	var includes, excludes []string
	if include != "" {
		includes = []string{include}
	}
	if exclude != "" {
		excludes = []string{exclude}
	}
	wcfg := legibleconfig.NewConfig(projectIDStr, includes, excludes)
	if err := legibleconfig.Save(path, wcfg); err != nil {
		return fmt.Errorf("saving .legibleconfig: %w", err)
	}

	fmt.Printf("\nProject created successfully!\n")
	fmt.Printf("  Project ID: %d\n", project.ID)
	fmt.Printf("  Models: %d\n", len(mdl.Models))
	fmt.Printf("  Config: %s/.legibleconfig\n", path)
	return nil
}

func runDbtUpdate(cmd *cobra.Command, args []string) error {
	path, _ := cmd.Flags().GetString("path")
	profile, _ := cmd.Flags().GetString("profile")
	target, _ := cmd.Flags().GetString("target")
	include, _ := cmd.Flags().GetString("include")
	exclude, _ := cmd.Flags().GetString("exclude")
	dryRun, _ := cmd.Flags().GetBool("dry-run")
	yes, _ := cmd.Flags().GetBool("yes")
	includeStagingModels, _ := cmd.Flags().GetBool("include-staging-models")

	// Filter flags can only be used with --dry-run
	if (include != "" || exclude != "") && !dryRun {
		return fmt.Errorf("--include and --exclude can only be used with --dry-run on update; edit .legibleconfig to change filters permanently")
	}

	// Load .legibleconfig
	wcfg, err := legibleconfig.Load(path)
	if err != nil {
		return err
	}

	fmt.Printf("Linked project ID: %s\n", wcfg.WrenProject.ID)
	if wcfg.WrenProject.LastSynced != "" {
		fmt.Printf("Last synced: %s\n", wcfg.WrenProject.LastSynced)
	}

	// Validate dbt project
	if !dbt.IsDbtProjectValid(path) {
		return fmt.Errorf("not a valid dbt project: %s (missing dbt_project.yml)", path)
	}

	// Use a temp dir for converter output
	tmpDir, err := os.MkdirTemp("", "legible-dbt-*")
	if err != nil {
		return fmt.Errorf("creating temp directory: %w", err)
	}
	defer os.RemoveAll(tmpDir)

	// Re-convert dbt project
	fmt.Println("Converting dbt project...")
	_, err = dbt.ConvertDbtProjectCore(dbt.ConvertOptions{
		ProjectPath:          path,
		OutputDir:            tmpDir,
		ProfileName:          profile,
		Target:               target,
		RequireCatalog:       true,
		IncludeStagingModels: includeStagingModels,
	})
	if err != nil {
		return fmt.Errorf("dbt conversion failed: %w", err)
	}

	// Read the generated MDL
	mdl, err := readDbtMDL(filepath.Join(tmpDir, "legible-mdl.json"))
	if err != nil {
		return err
	}

	// Use saved filters unless overridden for dry-run
	activeIncludes := wcfg.Filter.Include
	activeExcludes := wcfg.Filter.Exclude
	if include != "" {
		activeIncludes = []string{include}
	}
	if exclude != "" {
		activeExcludes = []string{exclude}
	}
	f := dbtfilter.NewFilter(activeIncludes, activeExcludes)
	mdl.Models = applyModelFilter(mdl.Models, f)
	if len(mdl.Models) == 0 {
		return fmt.Errorf("no models matched the filter criteria")
	}

	// --- API calls (needed early for diff) ---
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("loading config: %w", err)
	}
	c, err := client.New(cfg)
	if err != nil {
		return err
	}
	c.SetProjectID(wcfg.WrenProject.ID)

	// Show diff: compare incoming dbt models with current server models
	showModelDiff(c, mdl)

	if dryRun {
		fmt.Println("\nDry run — no changes applied.")
		return nil
	}

	// Confirmation prompt
	if !yes {
		fmt.Println("\n⚠ WARNING: This will replace the current MDL. Manual UI changes will be overwritten.")
		fmt.Print("Proceed with update? [y/N] ")
		var answer string
		fmt.Scanln(&answer)
		if answer != "y" && answer != "Y" {
			fmt.Println("Aborted.")
			return nil
		}
	}

	// Save tables
	tableNames := make([]string, len(mdl.Models))
	for i, m := range mdl.Models {
		tableNames[i] = m.Name
	}
	fmt.Printf("Updating %d models... ", len(tableNames))
	if err := c.SaveTables(tableNames); err != nil {
		fmt.Println("FAILED")
		return fmt.Errorf("saving tables: %w", err)
	}
	fmt.Println("OK")

	// Save relationships
	if len(mdl.Relationships) > 0 {
		fmt.Printf("Saving %d relationships... ", len(mdl.Relationships))
		relInputs := toMDLRelations(mdl.Relationships)
		resolved, unresolved, err := c.ResolveRelations(relInputs)
		if err != nil {
			fmt.Println("FAILED")
			return fmt.Errorf("resolving relations: %w", err)
		}
		if len(unresolved) > 0 {
			fmt.Printf("(%d unresolved) ", len(unresolved))
			for _, u := range unresolved {
				fmt.Printf("\n  ⚠ %s", u)
			}
			fmt.Println()
		}
		if len(resolved) > 0 {
			if err := c.SaveRelations(resolved); err != nil {
				fmt.Println("FAILED")
				return fmt.Errorf("saving relations: %w", err)
			}
			fmt.Printf("OK (%d saved)\n", len(resolved))
		} else {
			fmt.Println("SKIPPED (none resolved)")
		}
	}

	// Update model metadata (descriptions from dbt)
	syncModelMetadata(c, mdl)

	// Deploy
	fmt.Print("Deploying... ")
	if _, err := c.Deploy(false); err != nil {
		fmt.Println("FAILED")
		return fmt.Errorf("deploying: %w", err)
	}
	fmt.Println("OK")

	// Update last_synced
	wcfg.TouchSynced()
	if err := legibleconfig.Save(path, wcfg); err != nil {
		return fmt.Errorf("saving .legibleconfig: %w", err)
	}

	fmt.Printf("\nUpdate complete. Models: %d\n", len(mdl.Models))
	return nil
}

// --- helpers ---

// readDbtMDL reads and parses the legible-mdl.json output from the converter.
func readDbtMDL(path string) (*dbt.LegibleMDLManifest, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("reading MDL file: %w", err)
	}
	var mdl dbt.LegibleMDLManifest
	if err := json.Unmarshal(data, &mdl); err != nil {
		return nil, fmt.Errorf("parsing MDL file: %w", err)
	}
	return &mdl, nil
}

// readDbtDataSource reads and parses the legible-datasource.json output.
func readDbtDataSource(path string) (*client.SaveDataSourceInput, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, fmt.Errorf("reading data source file: %w", err)
	}
	var ds client.SaveDataSourceInput
	if err := json.Unmarshal(data, &ds); err != nil {
		return nil, fmt.Errorf("parsing data source file: %w", err)
	}
	return &ds, nil
}

// applyModelFilter filters LegibleModel slices using a ModelFilter.
func applyModelFilter(models []dbt.LegibleModel, f *dbtfilter.ModelFilter) []dbt.LegibleModel {
	if f.IsEmpty() {
		return models
	}
	var result []dbt.LegibleModel
	for _, m := range models {
		if f.Match(m.Name) {
			result = append(result, m)
		}
	}
	return result
}

// toMDLRelations converts dbt Relationship structs to client MDLRelation structs.
func toMDLRelations(rels []dbt.Relationship) []client.MDLRelation {
	out := make([]client.MDLRelation, len(rels))
	for i, r := range rels {
		out[i] = client.MDLRelation{
			Name:      r.Name,
			Models:    r.Models,
			JoinType:  r.JoinType,
			Condition: r.Condition,
		}
	}
	return out
}

// syncModelMetadata pushes model/column descriptions from the dbt MDL to the API.
// It matches models by name and updates descriptions found in Properties["description"].
func syncModelMetadata(c *client.Client, mdl *dbt.LegibleMDLManifest) {
	// Build a lookup of dbt models by name
	dbtModelByName := make(map[string]*dbt.LegibleModel, len(mdl.Models))
	for i := range mdl.Models {
		dbtModelByName[mdl.Models[i].Name] = &mdl.Models[i]
	}

	// Fetch the server-side models (with IDs)
	serverModels, err := c.ListModels()
	if err != nil {
		fmt.Printf("  ⚠ Could not fetch models for metadata sync: %v\n", err)
		return
	}

	updated := 0
	for _, sm := range serverModels {
		dm := dbtModelByName[sm.ReferenceName]
		if dm == nil {
			continue
		}

		input := &client.UpdateModelMetadataInput{}
		hasUpdates := false

		// Model description
		if desc, ok := dm.Properties["description"]; ok && desc != "" {
			input.Description = desc
			hasUpdates = true
		}

		// Column descriptions
		colDescByName := make(map[string]string)
		for _, col := range dm.Columns {
			if desc, ok := col.Properties["description"]; ok && desc != "" {
				colDescByName[col.Name] = desc
			}
		}
		if len(colDescByName) > 0 {
			for _, f := range sm.Fields {
				if desc, ok := colDescByName[f.ReferenceName]; ok {
					input.Columns = append(input.Columns, client.UpdateColumnMetadataInput{
						ID:          f.ID,
						Description: desc,
					})
				}
			}
			if len(input.Columns) > 0 {
				hasUpdates = true
			}
		}

		if hasUpdates {
			if err := c.UpdateModelMetadata(sm.ID, input); err != nil {
				fmt.Printf("  ⚠ Failed to update metadata for %s: %v\n", sm.ReferenceName, err)
			} else {
				updated++
			}
		}
	}

	if updated > 0 {
		fmt.Printf("Updated metadata for %d models.\n", updated)
	}
}

// printCreateSummary prints a table of models to sync (for create dry-run or fallback).
// Supports --json output.
func printCreateSummary(mdl *dbt.LegibleMDLManifest) {
	type modelEntry struct {
		Name    string `json:"name"`
		Columns int    `json:"columns"`
	}

	entries := make([]modelEntry, len(mdl.Models))
	for i, m := range mdl.Models {
		entries[i] = modelEntry{Name: m.Name, Columns: len(m.Columns)}
	}

	if jsonOutput {
		result := map[string]interface{}{
			"models":        entries,
			"relationships": len(mdl.Relationships),
			"summary": map[string]int{
				"total": len(entries),
			},
		}
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		enc.Encode(result) //nolint:errcheck
		return
	}

	fmt.Println()
	w := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
	fmt.Fprintln(w, "MODEL\tCOLUMNS")
	for _, e := range entries {
		fmt.Fprintf(w, "%s\t%d\n", e.Name, e.Columns)
	}
	w.Flush()

	fmt.Printf("\nTotal: %d models\n", len(entries))
	if len(mdl.Relationships) > 0 {
		fmt.Printf("Relationships: %d\n", len(mdl.Relationships))
	}
}

// showModelDiff fetches current server models and compares with the incoming dbt models,
// printing a table with status (+/-/unchanged) per model. Supports --json output.
func showModelDiff(c *client.Client, mdl *dbt.LegibleMDLManifest) {
	serverModels, err := c.ListModels()
	if err != nil {
		// Non-fatal: fall back to plain create-style summary
		printCreateSummary(mdl)
		return
	}

	// Build sets
	serverSet := make(map[string]*client.Model, len(serverModels))
	for i := range serverModels {
		serverSet[serverModels[i].ReferenceName] = &serverModels[i]
	}
	incomingSet := make(map[string]*dbt.LegibleModel, len(mdl.Models))
	for i := range mdl.Models {
		incomingSet[mdl.Models[i].Name] = &mdl.Models[i]
	}

	type diffEntry struct {
		Name    string `json:"name"`
		Status  string `json:"status"`
		Columns int    `json:"columns"`
	}

	var entries []diffEntry
	for _, m := range mdl.Models {
		status := "add"
		if serverSet[m.Name] != nil {
			status = "unchanged"
		}
		entries = append(entries, diffEntry{
			Name:    m.Name,
			Status:  status,
			Columns: len(m.Columns),
		})
	}
	for _, sm := range serverModels {
		if incomingSet[sm.ReferenceName] == nil {
			entries = append(entries, diffEntry{
				Name:    sm.ReferenceName,
				Status:  "remove",
				Columns: len(sm.Fields),
			})
		}
	}

	var addCount, removeCount, unchangedCount int
	for _, e := range entries {
		switch e.Status {
		case "add":
			addCount++
		case "remove":
			removeCount++
		case "unchanged":
			unchangedCount++
		}
	}

	if jsonOutput {
		result := map[string]interface{}{
			"models":        entries,
			"relationships": len(mdl.Relationships),
			"summary": map[string]int{
				"add":       addCount,
				"remove":    removeCount,
				"unchanged": unchangedCount,
				"total":     len(entries),
			},
		}
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		enc.Encode(result) //nolint:errcheck
		return
	}

	fmt.Println()
	w := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
	fmt.Fprintln(w, "STATUS\tMODEL\tCOLUMNS")
	for _, e := range entries {
		marker := " "
		switch e.Status {
		case "add":
			marker = "+"
		case "remove":
			marker = "-"
		}
		fmt.Fprintf(w, "%s\t%s\t%d\n", marker, e.Name, e.Columns)
	}
	w.Flush()

	fmt.Printf("\nSummary: %d added, %d removed, %d unchanged (%d total)\n", addCount, removeCount, unchangedCount, len(entries))
	if len(mdl.Relationships) > 0 {
		fmt.Printf("Relationships: %d\n", len(mdl.Relationships))
	}
}
