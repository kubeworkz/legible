package client

import (
	"encoding/json"
	"fmt"
)

// --- Agents ---

// Agent represents a project-scoped agent record.
type Agent struct {
	ID               int    `json:"id"`
	ProjectID        int    `json:"projectId"`
	Name             string `json:"name"`
	SandboxName      string `json:"sandboxName"`
	Status           string `json:"status"`
	ProviderName     string `json:"providerName,omitempty"`
	PolicyYaml       string `json:"policyYaml,omitempty"`
	Image            string `json:"image,omitempty"`
	BlueprintID      *int   `json:"blueprintId,omitempty"`
	InferenceProfile string `json:"inferenceProfile,omitempty"`
	GatewayID        *int   `json:"gatewayId,omitempty"`
	AutoProvisioned  bool   `json:"autoProvisioned"`
	CreatedAt        string `json:"createdAt"`
	UpdatedAt        string `json:"updatedAt"`
}

const agentFields = `id projectId name sandboxName status providerName policyYaml image blueprintId inferenceProfile gatewayId autoProvisioned createdAt updatedAt`

// CreateAgent registers a new agent in the server.
func (c *Client) CreateAgent(input map[string]interface{}) (*Agent, error) {
	query := fmt.Sprintf(`mutation CreateAgent($data: CreateAgentInput!) {
		createAgent(data: $data) { %s }
	}`, agentFields)

	gqlResp, err := c.GraphQL(query, map[string]interface{}{
		"data": input,
	})
	if err != nil {
		return nil, fmt.Errorf("creating agent: %w", err)
	}

	var data struct {
		CreateAgent Agent `json:"createAgent"`
	}
	if err := json.Unmarshal(gqlResp.Data, &data); err != nil {
		return nil, fmt.Errorf("parsing agent: %w", err)
	}
	return &data.CreateAgent, nil
}

// UpdateAgent updates an agent's status or metadata.
func (c *Client) UpdateAgent(id int, updates map[string]interface{}) (*Agent, error) {
	query := fmt.Sprintf(`mutation UpdateAgent($where: AgentWhereInput!, $data: UpdateAgentInput!) {
		updateAgent(where: $where, data: $data) { %s }
	}`, agentFields)

	gqlResp, err := c.GraphQL(query, map[string]interface{}{
		"where": map[string]interface{}{"id": id},
		"data":  updates,
	})
	if err != nil {
		return nil, fmt.Errorf("updating agent: %w", err)
	}

	var data struct {
		UpdateAgent Agent `json:"updateAgent"`
	}
	if err := json.Unmarshal(gqlResp.Data, &data); err != nil {
		return nil, fmt.Errorf("parsing agent: %w", err)
	}
	return &data.UpdateAgent, nil
}

// ListAgents lists all agents for the current project.
func (c *Client) ListAgents() ([]Agent, error) {
	query := fmt.Sprintf(`query { agents { %s } }`, agentFields)

	gqlResp, err := c.GraphQL(query, nil)
	if err != nil {
		return nil, fmt.Errorf("listing agents: %w", err)
	}

	var data struct {
		Agents []Agent `json:"agents"`
	}
	if err := json.Unmarshal(gqlResp.Data, &data); err != nil {
		return nil, fmt.Errorf("parsing agents: %w", err)
	}
	return data.Agents, nil
}

// GetAgentBySandboxName finds an agent by its sandbox name.
// Returns nil if no matching agent is found.
func (c *Client) GetAgentBySandboxName(sandboxName string) (*Agent, error) {
	agents, err := c.ListAgents()
	if err != nil {
		return nil, err
	}
	for _, a := range agents {
		if a.SandboxName == sandboxName {
			return &a, nil
		}
	}
	return nil, nil
}
