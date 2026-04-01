package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"strconv"
	"text/tabwriter"

	"github.com/Kubeworkz/legible/legible-cli/internal/client"
	"github.com/spf13/cobra"
)

var gatewayCmd = &cobra.Command{
	Use:     "gateway",
	Aliases: []string{"gateways", "gw"},
	Short:   "Manage org-scoped OpenShell gateways",
	Long: `Manage OpenShell gateways that host agent sandboxes.

Each organization gets one gateway. All agent sandboxes within the org
share that gateway instance.

Examples:
  legible gateway status           Show gateway for current org
  legible gateway create           Create a gateway for current org
  legible gateway list             List all running gateways
  legible gateway delete <id>      Delete a gateway`,
}

var gatewayStatusCmd = &cobra.Command{
	Use:   "status",
	Short: "Show the gateway for the current organization",
	RunE:  runGatewayStatus,
}

var gatewayListCmd = &cobra.Command{
	Use:     "list",
	Aliases: []string{"ls"},
	Short:   "List all running gateways",
	RunE:    runGatewayList,
}

var gatewayInfoCmd = &cobra.Command{
	Use:   "info <gateway-id>",
	Short: "Show detailed information about a gateway",
	Args:  cobra.ExactArgs(1),
	RunE:  runGatewayInfo,
}

var gatewayCreateCmd = &cobra.Command{
	Use:   "create",
	Short: "Create a gateway for the current organization",
	Long: `Create an OpenShell gateway for your organization.

Each org can have one gateway. The gateway hosts all agent sandboxes
within the organization. Default resources: 4 CPUs, 16GB memory, 20 max sandboxes.

Examples:
  legible gateway create
  legible gateway create --cpus 8.0 --memory 32g --max-sandboxes 50`,
	RunE: runGatewayCreate,
}

var gatewayUpdateCmd = &cobra.Command{
	Use:   "update <gateway-id>",
	Short: "Update a gateway's status or resource limits",
	Long: `Update properties of a gateway. Typically used to mark status changes.

Examples:
  legible gateway update 1 --status running --endpoint localhost --port 8080`,
	Args: cobra.ExactArgs(1),
	RunE: runGatewayUpdate,
}

var gatewayDeleteCmd = &cobra.Command{
	Use:   "delete <gateway-id>",
	Short: "Delete a gateway",
	Long: `Delete a stopped gateway. Running gateways must be stopped first.

Examples:
  legible gateway delete 1`,
	Args: cobra.ExactArgs(1),
	RunE: runGatewayDelete,
}

func init() {
	// gateway create flags
	gatewayCreateCmd.Flags().String("cpus", "", "CPU allocation (default: 4.0)")
	gatewayCreateCmd.Flags().String("memory", "", "Memory allocation (default: 16g)")
	gatewayCreateCmd.Flags().Int("max-sandboxes", 0, "Maximum sandbox count (default: 20)")

	// gateway update flags
	gatewayUpdateCmd.Flags().String("status", "", "Set gateway status")
	gatewayUpdateCmd.Flags().String("endpoint", "", "Set gateway endpoint")
	gatewayUpdateCmd.Flags().Int("port", 0, "Set gateway port")

	gatewayCmd.AddCommand(gatewayStatusCmd)
	gatewayCmd.AddCommand(gatewayListCmd)
	gatewayCmd.AddCommand(gatewayInfoCmd)
	gatewayCmd.AddCommand(gatewayCreateCmd)
	gatewayCmd.AddCommand(gatewayUpdateCmd)
	gatewayCmd.AddCommand(gatewayDeleteCmd)
	rootCmd.AddCommand(gatewayCmd)
}

func runGatewayStatus(cmd *cobra.Command, args []string) error {
	c, _, err := newClientFromConfig()
	if err != nil {
		return err
	}

	orgID, err := c.GetCurrentOrgID()
	if err != nil {
		return err
	}

	gw, err := c.GetGatewayForOrganization(orgID)
	if err != nil {
		return err
	}

	if gw == nil {
		fmt.Println("No gateway configured for this organization.")
		fmt.Println("Create one with: legible gateway create")
		return nil
	}

	if jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(gw)
	}

	printGatewayDetail(gw)
	return nil
}

func runGatewayList(cmd *cobra.Command, args []string) error {
	c, _, err := newClientFromConfig()
	if err != nil {
		return err
	}

	gateways, err := c.ListRunningGateways()
	if err != nil {
		return err
	}

	if jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(gateways)
	}

	if len(gateways) == 0 {
		fmt.Println("No running gateways.")
		return nil
	}

	w := tabwriter.NewWriter(os.Stdout, 0, 0, 2, ' ', 0)
	fmt.Fprintln(w, "ID\tORG\tSTATUS\tENDPOINT\tSANDBOXES\tCPUS\tMEMORY")
	for _, gw := range gateways {
		endpoint := "-"
		if gw.Endpoint != "" {
			endpoint = fmt.Sprintf("%s:%d", gw.Endpoint, gw.Port)
		}
		fmt.Fprintf(w, "%d\t%d\t%s\t%s\t%d/%d\t%s\t%s\n",
			gw.ID, gw.OrganizationID, gw.Status, endpoint,
			gw.SandboxCount, gw.MaxSandboxes, gw.CPUs, gw.Memory,
		)
	}
	w.Flush()
	return nil
}

func runGatewayInfo(cmd *cobra.Command, args []string) error {
	id, err := strconv.Atoi(args[0])
	if err != nil {
		return fmt.Errorf("invalid gateway ID: %s", args[0])
	}

	c, _, err := newClientFromConfig()
	if err != nil {
		return err
	}

	gw, err := c.GetGateway(id)
	if err != nil {
		return err
	}

	if jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(gw)
	}

	printGatewayDetail(gw)
	return nil
}

func runGatewayCreate(cmd *cobra.Command, args []string) error {
	c, _, err := newClientFromConfig()
	if err != nil {
		return err
	}

	orgID, err := c.GetCurrentOrgID()
	if err != nil {
		return err
	}

	cpus, _ := cmd.Flags().GetString("cpus")
	memory, _ := cmd.Flags().GetString("memory")
	maxSandboxes, _ := cmd.Flags().GetInt("max-sandboxes")

	fmt.Print("Creating gateway... ")
	gw, err := c.CreateGateway(orgID, cpus, memory, maxSandboxes)
	if err != nil {
		fmt.Println("FAILED")
		return err
	}
	fmt.Println("OK")

	if jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(gw)
	}

	fmt.Printf("\nGateway created for organization %d\n", orgID)
	fmt.Printf("  ID:             %d\n", gw.ID)
	fmt.Printf("  Status:         %s\n", gw.Status)
	fmt.Printf("  CPUs:           %s\n", gw.CPUs)
	fmt.Printf("  Memory:         %s\n", gw.Memory)
	fmt.Printf("  Max Sandboxes:  %d\n", gw.MaxSandboxes)
	return nil
}

func runGatewayUpdate(cmd *cobra.Command, args []string) error {
	id, err := strconv.Atoi(args[0])
	if err != nil {
		return fmt.Errorf("invalid gateway ID: %s", args[0])
	}

	c, _, err := newClientFromConfig()
	if err != nil {
		return err
	}

	updates := map[string]interface{}{}
	if status, _ := cmd.Flags().GetString("status"); status != "" {
		updates["status"] = status
	}
	if endpoint, _ := cmd.Flags().GetString("endpoint"); endpoint != "" {
		updates["endpoint"] = endpoint
	}
	if port, _ := cmd.Flags().GetInt("port"); port > 0 {
		updates["port"] = port
	}

	if len(updates) == 0 {
		return fmt.Errorf("no update flags specified (--status, --endpoint, --port)")
	}

	gw, err := c.UpdateGateway(id, updates)
	if err != nil {
		return err
	}

	if jsonOutput {
		enc := json.NewEncoder(os.Stdout)
		enc.SetIndent("", "  ")
		return enc.Encode(gw)
	}

	fmt.Printf("Gateway %d updated.\n", id)
	printGatewayDetail(gw)
	return nil
}

func runGatewayDelete(cmd *cobra.Command, args []string) error {
	id, err := strconv.Atoi(args[0])
	if err != nil {
		return fmt.Errorf("invalid gateway ID: %s", args[0])
	}

	c, _, err := newClientFromConfig()
	if err != nil {
		return err
	}

	fmt.Printf("Deleting gateway %d... ", id)
	if err := c.DeleteGateway(id); err != nil {
		fmt.Println("FAILED")
		return err
	}
	fmt.Println("OK")
	return nil
}

func printGatewayDetail(gw *client.Gateway) {
	fmt.Printf("Gateway #%d\n", gw.ID)
	fmt.Printf("  Organization:   %d\n", gw.OrganizationID)
	fmt.Printf("  Status:         %s\n", gw.Status)
	if gw.Endpoint != "" {
		fmt.Printf("  Endpoint:       %s:%d\n", gw.Endpoint, gw.Port)
	}
	if gw.PID > 0 {
		fmt.Printf("  PID:            %d\n", gw.PID)
	}
	fmt.Printf("  CPUs:           %s\n", gw.CPUs)
	fmt.Printf("  Memory:         %s\n", gw.Memory)
	fmt.Printf("  Sandboxes:      %d / %d\n", gw.SandboxCount, gw.MaxSandboxes)
	if gw.Version != "" {
		fmt.Printf("  Version:        %s\n", gw.Version)
	}
	if gw.ErrorMessage != "" {
		fmt.Printf("  Error:          %s\n", gw.ErrorMessage)
	}
	if gw.LastHealthCheck != "" {
		fmt.Printf("  Last Check:     %s\n", gw.LastHealthCheck)
	}
	fmt.Printf("  Created:        %s\n", gw.CreatedAt)
	fmt.Printf("  Updated:        %s\n", gw.UpdatedAt)
}
