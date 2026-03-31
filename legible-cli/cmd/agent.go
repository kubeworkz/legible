package cmd

import (
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"github.com/Kubeworkz/legible/legible-cli/internal/agent"
	"github.com/Kubeworkz/legible/legible-cli/internal/config"
	"github.com/spf13/cobra"
)

var agentCmd = &cobra.Command{
	Use:   "agent",
	Short: "Manage sandboxed AI agents",
	Long: `Create, manage, and monitor AI agents running in OpenShell sandboxes.

Agents run in isolated containers with policy-enforced access to your
Legible project's MCP server. Each agent gets its own sandbox with
pre-configured credentials and network policies.

Requires OpenShell CLI: curl -LsSf https://raw.githubusercontent.com/NVIDIA/OpenShell/main/install.sh | sh`,
}

var agentCreateCmd = &cobra.Command{
	Use:   "create [name]",
	Short: "Create a new sandboxed agent",
	Long: `Create a new AI agent in an OpenShell sandbox with pre-configured
access to your Legible project.

The agent sandbox includes:
  - The Legible CLI, pre-authenticated
  - MCP client connection to your Legible server
  - Network policy restricting access to Legible endpoints only

Examples:
  legible agent create my-analyst
  legible agent create my-analyst --type claude
  legible agent create my-analyst --type codex --gpu
  legible agent create my-analyst --policy ./custom-policy.yaml`,
	Args: cobra.ExactArgs(1),
	RunE: runAgentCreate,
}

var agentListCmd = &cobra.Command{
	Use:   "list",
	Short: "List running agents",
	Long:  `List all agent sandboxes and their status.`,
	RunE:  runAgentList,
}

var agentConnectCmd = &cobra.Command{
	Use:   "connect [name]",
	Short: "Connect to a running agent sandbox",
	Long: `Open a shell session inside a running agent sandbox.

Examples:
  legible agent connect my-analyst`,
	Args: cobra.ExactArgs(1),
	RunE: runAgentConnect,
}

var agentStopCmd = &cobra.Command{
	Use:   "stop [name]",
	Short: "Stop a running agent sandbox",
	Long: `Stop and remove an agent sandbox.

Examples:
  legible agent stop my-analyst`,
	Args: cobra.ExactArgs(1),
	RunE: runAgentStop,
}

var agentPolicyCmd = &cobra.Command{
	Use:   "policy [name]",
	Short: "View or update an agent's network policy",
	Long: `View the active policy for an agent, or apply a new policy.

Examples:
  legible agent policy my-analyst
  legible agent policy my-analyst --set ./custom-policy.yaml`,
	Args: cobra.ExactArgs(1),
	RunE: runAgentPolicy,
}

var agentLogsCmd = &cobra.Command{
	Use:   "logs [name]",
	Short: "Stream agent sandbox logs",
	Long: `Stream logs from an agent sandbox.

Examples:
  legible agent logs my-analyst
  legible agent logs my-analyst --tail`,
	Args: cobra.ExactArgs(1),
	RunE: runAgentLogs,
}

func init() {
	// agent create flags
	agentCreateCmd.Flags().String("type", "claude", "Agent type (claude, codex, opencode, copilot)")
	agentCreateCmd.Flags().String("policy", "", "Custom policy YAML file (default: bundled Legible policy)")
	agentCreateCmd.Flags().Bool("gpu", false, "Enable GPU passthrough (experimental)")
	agentCreateCmd.Flags().String("from", "", "Custom sandbox image or directory")

	// agent policy flags
	agentPolicyCmd.Flags().String("set", "", "Apply a new policy YAML file")

	// agent logs flags
	agentLogsCmd.Flags().Bool("tail", false, "Follow log output")

	agentCmd.AddCommand(agentCreateCmd)
	agentCmd.AddCommand(agentListCmd)
	agentCmd.AddCommand(agentConnectCmd)
	agentCmd.AddCommand(agentStopCmd)
	agentCmd.AddCommand(agentPolicyCmd)
	agentCmd.AddCommand(agentLogsCmd)
	rootCmd.AddCommand(agentCmd)
}

func runAgentCreate(cmd *cobra.Command, args []string) error {
	name := args[0]
	agentType, _ := cmd.Flags().GetString("type")
	customPolicy, _ := cmd.Flags().GetString("policy")
	gpu, _ := cmd.Flags().GetBool("gpu")
	from, _ := cmd.Flags().GetString("from")

	// Load Legible config for provider injection
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("loading config: %w", err)
	}
	if cfg.Endpoint == "" || cfg.APIKey == "" {
		return fmt.Errorf("not authenticated — run: legible login")
	}

	// Determine MCP endpoint from Legible endpoint
	// Default: same host, port 9000
	mcpEndpoint := deriveMCPEndpoint(cfg.Endpoint)

	fmt.Printf("Creating agent %q (type: %s)...\n", name, agentType)

	// Step 1: Create the OpenShell provider with Legible credentials
	fmt.Print("  Setting up credentials provider... ")
	providerName := "legible-" + name
	err = agent.RunOpenshell("provider", "create",
		"--name", providerName,
		"--type", "custom",
		"--env", "LEGIBLE_ENDPOINT="+cfg.Endpoint,
		"--env", "LEGIBLE_API_KEY="+cfg.APIKey,
		"--env", "LEGIBLE_PROJECT_ID="+cfg.ProjectID,
		"--env", "LEGIBLE_MCP_ENDPOINT="+mcpEndpoint,
	)
	if err != nil {
		fmt.Println("FAILED")
		return fmt.Errorf("creating provider: %w", err)
	}
	fmt.Println("OK")

	// Step 2: Build sandbox create args
	createArgs := []string{"sandbox", "create", "--name", name}

	// Use custom sandbox image or the bundled one
	if from != "" {
		createArgs = append(createArgs, "--from", from)
	} else {
		// Use the bundled Legible sandbox directory
		policyDir, err := agent.PolicyDir()
		if err != nil {
			return err
		}
		createArgs = append(createArgs, "--from", policyDir)
	}

	if gpu {
		createArgs = append(createArgs, "--gpu")
	}

	// Add provider
	createArgs = append(createArgs, "--provider", providerName)

	// Append agent type as the command
	createArgs = append(createArgs, "--", agentType)

	// Step 3: Create the sandbox
	fmt.Print("  Creating sandbox... ")
	err = agent.RunOpenshell(createArgs...)
	if err != nil {
		fmt.Println("FAILED")
		return fmt.Errorf("creating sandbox: %w", err)
	}
	fmt.Println("OK")

	// Step 4: Apply the network policy
	policyFile := customPolicy
	if policyFile == "" {
		policyDir, err := agent.PolicyDir()
		if err != nil {
			return err
		}
		policyFile = policyDir + "/policy.yaml"
	}

	fmt.Print("  Applying network policy... ")
	err = agent.RunOpenshell("policy", "set", name, "--policy", policyFile, "--wait")
	if err != nil {
		fmt.Println("FAILED")
		fmt.Printf("  ⚠ Policy not applied: %v\n", err)
		fmt.Println("  The sandbox is running with default (deny-all) policy.")
		fmt.Printf("  Apply manually: openshell policy set %s --policy %s\n", name, policyFile)
	} else {
		fmt.Println("OK")
	}

	fmt.Printf("\nAgent %q created successfully!\n", name)
	fmt.Printf("  Type:     %s\n", agentType)
	fmt.Printf("  MCP:      %s\n", mcpEndpoint)
	fmt.Printf("  Connect:  legible agent connect %s\n", name)
	fmt.Printf("  Logs:     legible agent logs %s --tail\n", name)
	fmt.Printf("  Stop:     legible agent stop %s\n", name)
	return nil
}

func runAgentList(cmd *cobra.Command, args []string) error {
	if jsonOutput {
		out, err := agent.RunOpenshellOutput("sandbox", "list", "--output", "json")
		if err != nil {
			return err
		}
		// Pass through JSON
		fmt.Println(out)
		return nil
	}
	return agent.RunOpenshell("sandbox", "list")
}

func runAgentConnect(cmd *cobra.Command, args []string) error {
	return agent.RunOpenshell("sandbox", "connect", args[0])
}

func runAgentStop(cmd *cobra.Command, args []string) error {
	name := args[0]

	fmt.Printf("Stopping agent %q... ", name)
	err := agent.RunOpenshell("sandbox", "delete", name)
	if err != nil {
		fmt.Println("FAILED")
		return err
	}
	fmt.Println("OK")

	// Clean up the provider
	providerName := "legible-" + name
	_ = agent.RunOpenshell("provider", "delete", providerName)

	return nil
}

func runAgentPolicy(cmd *cobra.Command, args []string) error {
	name := args[0]
	setPolicyFile, _ := cmd.Flags().GetString("set")

	if setPolicyFile != "" {
		fmt.Printf("Applying policy to %q... ", name)
		err := agent.RunOpenshell("policy", "set", name, "--policy", setPolicyFile, "--wait")
		if err != nil {
			fmt.Println("FAILED")
			return err
		}
		fmt.Println("OK")
		return nil
	}

	// Show current policy
	if jsonOutput {
		out, err := agent.RunOpenshellOutput("policy", "get", name, "--output", "json")
		if err != nil {
			return err
		}
		fmt.Println(out)
		return nil
	}
	return agent.RunOpenshell("policy", "get", name)
}

func runAgentLogs(cmd *cobra.Command, args []string) error {
	name := args[0]
	tail, _ := cmd.Flags().GetBool("tail")

	logArgs := []string{"logs", name}
	if tail {
		logArgs = append(logArgs, "--tail")
	}
	return agent.RunOpenshell(logArgs...)
}

// deriveMCPEndpoint extracts the host from the Legible endpoint and constructs
// the MCP server URL. For local Docker setups, it maps localhost to
// host.docker.internal so sandboxes can reach the host network.
func deriveMCPEndpoint(legibleEndpoint string) string {
	// Strip protocol and path
	host := legibleEndpoint
	host = strings.TrimPrefix(host, "https://")
	host = strings.TrimPrefix(host, "http://")
	if idx := strings.Index(host, "/"); idx > 0 {
		host = host[:idx]
	}

	// Strip port if present
	hostname := host
	if idx := strings.LastIndex(host, ":"); idx > 0 {
		hostname = host[:idx]
	}

	// Map localhost to host.docker.internal for Docker sandboxes
	if hostname == "localhost" || hostname == "127.0.0.1" {
		hostname = "host.docker.internal"
	}

	return fmt.Sprintf("http://%s:9000/mcp", hostname)
}

// agentSummary is used for JSON output of agent info.
type agentSummary struct {
	Name     string `json:"name"`
	Type     string `json:"type"`
	Endpoint string `json:"mcp_endpoint"`
	Status   string `json:"status"`
}

func printAgentJSON(s agentSummary) {
	enc := json.NewEncoder(os.Stdout)
	enc.SetIndent("", "  ")
	enc.Encode(s) //nolint:errcheck
}
