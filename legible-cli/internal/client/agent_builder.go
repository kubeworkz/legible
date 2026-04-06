package client

import (
	"encoding/json"
	"fmt"
)

// --- Agent Builder (Agent Definitions) ---

// AgentDefinition represents an agent definition from the Agent Builder.
type AgentDefinition struct {
	ID             int                    `json:"id"`
	ProjectID      int                    `json:"projectId"`
	Name           string                 `json:"name"`
	Description    string                 `json:"description,omitempty"`
	WorkflowID     *int                   `json:"workflowId,omitempty"`
	SystemPrompt   string                 `json:"systemPrompt,omitempty"`
	ToolIDs        []int                  `json:"toolIds,omitempty"`
	MemoryConfig   map[string]interface{} `json:"memoryConfig,omitempty"`
	Model          string                 `json:"model,omitempty"`
	Temperature    *float64               `json:"temperature,omitempty"`
	MaxTokens      *int                   `json:"maxTokens,omitempty"`
	Status         string                 `json:"status"`
	CurrentVersion int                    `json:"currentVersion"`
	DeployConfig   map[string]interface{} `json:"deployConfig,omitempty"`
	DeployedAt     string                 `json:"deployedAt,omitempty"`
	Tags           []string               `json:"tags,omitempty"`
	Icon           string                 `json:"icon,omitempty"`
	CreatedBy      *int                   `json:"createdBy,omitempty"`
	CreatedAt      string                 `json:"createdAt"`
	UpdatedAt      string                 `json:"updatedAt"`
}

// AgentDefinitionVersion represents a published version snapshot.
type AgentDefinitionVersion struct {
	ID                  int    `json:"id"`
	AgentDefinitionID   int    `json:"agentDefinitionId"`
	Version             int    `json:"version"`
	Model               string `json:"model,omitempty"`
	SystemPrompt        string `json:"systemPrompt,omitempty"`
	ChangeNote          string `json:"changeNote,omitempty"`
	CreatedAt           string `json:"createdAt"`
}

// ChatSession represents an agent chat session.
type ChatSession struct {
	SessionID int    `json:"sessionId"`
	AgentID   int    `json:"agentId"`
	Title     string `json:"title"`
	Status    string `json:"status"`
	CreatedAt string `json:"createdAt"`
}

// ChatMessage represents a message in a chat session.
type ChatMessage struct {
	ID             int                    `json:"id"`
	Role           string                 `json:"role"`
	Content        string                 `json:"content"`
	ToolName       string                 `json:"toolName,omitempty"`
	ToolInput      interface{}            `json:"toolInput,omitempty"`
	ToolOutput     interface{}            `json:"toolOutput,omitempty"`
	ReasoningSteps []ReasoningStep        `json:"reasoningSteps,omitempty"`
	Metadata       map[string]interface{} `json:"metadata,omitempty"`
	Status         string                 `json:"status"`
	Error          string                 `json:"error,omitempty"`
	CreatedAt      string                 `json:"createdAt"`
}

// ReasoningStep represents a step in the agent's reasoning process.
type ReasoningStep struct {
	Type       string      `json:"type"`
	Content    string      `json:"content,omitempty"`
	ToolName   string      `json:"toolName,omitempty"`
	ToolInput  interface{} `json:"toolInput,omitempty"`
	ToolOutput interface{} `json:"toolOutput,omitempty"`
	DurationMs int         `json:"durationMs,omitempty"`
}

// ChatSendResponse is the response from sending a message.
type ChatSendResponse struct {
	SessionID int           `json:"sessionId"`
	Messages  []ChatMessage `json:"messages"`
}

const agentDefFields = `id projectId name description systemPrompt toolIds
	memoryConfig { maxMessages maxTokens strategy ragEnabled ragMaxResults }
	model temperature maxTokens status currentVersion
	deployConfig deployedAt tags icon createdBy createdAt updatedAt`

const agentDefVersionFields = `id agentDefinitionId version model systemPrompt changeNote createdAt`

// ListAgentDefinitions returns all agent definitions for the current project.
func (c *Client) ListAgentDefinitions() ([]AgentDefinition, error) {
	query := fmt.Sprintf(`query { agentDefinitions { %s } }`, agentDefFields)

	gqlResp, err := c.GraphQL(query, nil)
	if err != nil {
		return nil, fmt.Errorf("listing agent definitions: %w", err)
	}

	var data struct {
		AgentDefinitions []AgentDefinition `json:"agentDefinitions"`
	}
	if err := json.Unmarshal(gqlResp.Data, &data); err != nil {
		return nil, fmt.Errorf("parsing agent definitions: %w", err)
	}
	return data.AgentDefinitions, nil
}

// GetAgentDefinition returns a single agent definition by ID.
func (c *Client) GetAgentDefinition(id int) (*AgentDefinition, error) {
	query := fmt.Sprintf(`query($where: AgentDefinitionWhereInput!) {
		agentDefinition(where: $where) { %s }
	}`, agentDefFields)

	gqlResp, err := c.GraphQL(query, map[string]interface{}{
		"where": map[string]interface{}{"id": id},
	})
	if err != nil {
		return nil, fmt.Errorf("getting agent definition: %w", err)
	}

	var data struct {
		AgentDefinition AgentDefinition `json:"agentDefinition"`
	}
	if err := json.Unmarshal(gqlResp.Data, &data); err != nil {
		return nil, fmt.Errorf("parsing agent definition: %w", err)
	}
	return &data.AgentDefinition, nil
}

// CreateAgentDefinition creates a new agent definition.
func (c *Client) CreateAgentDefinition(input map[string]interface{}) (*AgentDefinition, error) {
	query := fmt.Sprintf(`mutation($data: CreateAgentDefinitionInput!) {
		createAgentDefinition(data: $data) { %s }
	}`, agentDefFields)

	gqlResp, err := c.GraphQL(query, map[string]interface{}{
		"data": input,
	})
	if err != nil {
		return nil, fmt.Errorf("creating agent definition: %w", err)
	}

	var data struct {
		CreateAgentDefinition AgentDefinition `json:"createAgentDefinition"`
	}
	if err := json.Unmarshal(gqlResp.Data, &data); err != nil {
		return nil, fmt.Errorf("parsing agent definition: %w", err)
	}
	return &data.CreateAgentDefinition, nil
}

// UpdateAgentDefinition updates an existing agent definition.
func (c *Client) UpdateAgentDefinition(id int, input map[string]interface{}) (*AgentDefinition, error) {
	query := fmt.Sprintf(`mutation($where: AgentDefinitionWhereInput!, $data: UpdateAgentDefinitionInput!) {
		updateAgentDefinition(where: $where, data: $data) { %s }
	}`, agentDefFields)

	gqlResp, err := c.GraphQL(query, map[string]interface{}{
		"where": map[string]interface{}{"id": id},
		"data":  input,
	})
	if err != nil {
		return nil, fmt.Errorf("updating agent definition: %w", err)
	}

	var data struct {
		UpdateAgentDefinition AgentDefinition `json:"updateAgentDefinition"`
	}
	if err := json.Unmarshal(gqlResp.Data, &data); err != nil {
		return nil, fmt.Errorf("parsing agent definition: %w", err)
	}
	return &data.UpdateAgentDefinition, nil
}

// DeleteAgentDefinition deletes an agent definition by ID.
func (c *Client) DeleteAgentDefinition(id int) error {
	query := `mutation($where: AgentDefinitionWhereInput!) {
		deleteAgentDefinition(where: $where)
	}`

	_, err := c.GraphQL(query, map[string]interface{}{
		"where": map[string]interface{}{"id": id},
	})
	if err != nil {
		return fmt.Errorf("deleting agent definition: %w", err)
	}
	return nil
}

// PublishAgentDefinition publishes a version of an agent definition.
func (c *Client) PublishAgentDefinition(id int, changeNote string) (*AgentDefinition, error) {
	query := fmt.Sprintf(`mutation($where: AgentDefinitionWhereInput!, $changeNote: String) {
		publishAgentDefinition(where: $where, changeNote: $changeNote) { %s }
	}`, agentDefFields)

	vars := map[string]interface{}{
		"where": map[string]interface{}{"id": id},
	}
	if changeNote != "" {
		vars["changeNote"] = changeNote
	}

	gqlResp, err := c.GraphQL(query, vars)
	if err != nil {
		return nil, fmt.Errorf("publishing agent definition: %w", err)
	}

	var data struct {
		PublishAgentDefinition AgentDefinition `json:"publishAgentDefinition"`
	}
	if err := json.Unmarshal(gqlResp.Data, &data); err != nil {
		return nil, fmt.Errorf("parsing agent definition: %w", err)
	}
	return &data.PublishAgentDefinition, nil
}

// DeployAgentDefinition deploys an agent definition.
func (c *Client) DeployAgentDefinition(id int) (*AgentDefinition, error) {
	query := fmt.Sprintf(`mutation($where: AgentDefinitionWhereInput!) {
		deployAgentDefinition(where: $where) { %s }
	}`, agentDefFields)

	gqlResp, err := c.GraphQL(query, map[string]interface{}{
		"where": map[string]interface{}{"id": id},
	})
	if err != nil {
		return nil, fmt.Errorf("deploying agent definition: %w", err)
	}

	var data struct {
		DeployAgentDefinition AgentDefinition `json:"deployAgentDefinition"`
	}
	if err := json.Unmarshal(gqlResp.Data, &data); err != nil {
		return nil, fmt.Errorf("parsing agent definition: %w", err)
	}
	return &data.DeployAgentDefinition, nil
}

// ArchiveAgentDefinition archives an agent definition.
func (c *Client) ArchiveAgentDefinition(id int) (*AgentDefinition, error) {
	query := fmt.Sprintf(`mutation($where: AgentDefinitionWhereInput!) {
		archiveAgentDefinition(where: $where) { %s }
	}`, agentDefFields)

	gqlResp, err := c.GraphQL(query, map[string]interface{}{
		"where": map[string]interface{}{"id": id},
	})
	if err != nil {
		return nil, fmt.Errorf("archiving agent definition: %w", err)
	}

	var data struct {
		ArchiveAgentDefinition AgentDefinition `json:"archiveAgentDefinition"`
	}
	if err := json.Unmarshal(gqlResp.Data, &data); err != nil {
		return nil, fmt.Errorf("parsing agent definition: %w", err)
	}
	return &data.ArchiveAgentDefinition, nil
}

// ListAgentDefinitionVersions returns the version history for an agent definition.
func (c *Client) ListAgentDefinitionVersions(agentDefID int) ([]AgentDefinitionVersion, error) {
	query := fmt.Sprintf(`query($agentDefinitionId: Int!) {
		agentDefinitionVersions(agentDefinitionId: $agentDefinitionId) { %s }
	}`, agentDefVersionFields)

	gqlResp, err := c.GraphQL(query, map[string]interface{}{
		"agentDefinitionId": agentDefID,
	})
	if err != nil {
		return nil, fmt.Errorf("listing versions: %w", err)
	}

	var data struct {
		AgentDefinitionVersions []AgentDefinitionVersion `json:"agentDefinitionVersions"`
	}
	if err := json.Unmarshal(gqlResp.Data, &data); err != nil {
		return nil, fmt.Errorf("parsing versions: %w", err)
	}
	return data.AgentDefinitionVersions, nil
}

// --- Agent Chat (REST API) ---

// CreateAgentChatSession creates a new chat session for a deployed agent.
func (c *Client) CreateAgentChatSession(agentID int) (*ChatSession, error) {
	var result ChatSession
	path := fmt.Sprintf("/api/v1/agents/%d/sessions", agentID)
	if err := c.PostJSON(path, nil, &result); err != nil {
		return nil, fmt.Errorf("creating chat session: %w", err)
	}
	return &result, nil
}

// SendAgentChatMessage sends a message and returns the response messages.
func (c *Client) SendAgentChatMessage(agentID, sessionID int, message string) (*ChatSendResponse, error) {
	var result ChatSendResponse
	path := fmt.Sprintf("/api/v1/agents/%d/sessions/%d/messages", agentID, sessionID)
	payload := map[string]string{"message": message}
	if err := c.PostJSON(path, payload, &result); err != nil {
		return nil, fmt.Errorf("sending message: %w", err)
	}
	return &result, nil
}

// GetAgentChatMessages lists messages in a session.
func (c *Client) GetAgentChatMessages(agentID, sessionID int) (*ChatSendResponse, error) {
	var result ChatSendResponse
	path := fmt.Sprintf("/api/v1/agents/%d/sessions/%d/messages", agentID, sessionID)
	if err := c.GetJSON(path, &result); err != nil {
		return nil, fmt.Errorf("getting messages: %w", err)
	}
	return &result, nil
}
