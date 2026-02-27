package client

import (
	"encoding/json"
	"fmt"
)

// Project represents a WrenAI project.
type Project struct {
	ID          int    `json:"id"`
	Type        string `json:"type,omitempty"`
	DisplayName string `json:"displayName"`
	Language    string `json:"language,omitempty"`
	Timezone    string `json:"timezone,omitempty"`
	CreatedAt   string `json:"createdAt,omitempty"`
	UpdatedAt   string `json:"updatedAt,omitempty"`
}

// ListProjects returns all projects in the organization.
func (c *Client) ListProjects() ([]Project, error) {
	query := `query {
		listProjects {
			id displayName type language timezone createdAt updatedAt
		}
	}`

	gqlResp, err := c.GraphQL(query, nil)
	if err != nil {
		return nil, fmt.Errorf("listing projects: %w", err)
	}

	var data struct {
		ListProjects []Project `json:"listProjects"`
	}
	if err := json.Unmarshal(gqlResp.Data, &data); err != nil {
		return nil, fmt.Errorf("parsing projects: %w", err)
	}
	return data.ListProjects, nil
}

// GetProject returns a single project by ID.
func (c *Client) GetProject(projectID int) (*Project, error) {
	query := `query GetProject($projectId: Int!) {
		project(projectId: $projectId) {
			id displayName type language timezone createdAt updatedAt
		}
	}`

	gqlResp, err := c.GraphQL(query, map[string]interface{}{
		"projectId": projectID,
	})
	if err != nil {
		return nil, fmt.Errorf("getting project: %w", err)
	}

	var data struct {
		Project Project `json:"project"`
	}
	if err := json.Unmarshal(gqlResp.Data, &data); err != nil {
		return nil, fmt.Errorf("parsing project: %w", err)
	}
	return &data.Project, nil
}

// Model represents a WrenAI model.
type Model struct {
	ID              int     `json:"id"`
	DisplayName     string  `json:"displayName"`
	ReferenceName   string  `json:"referenceName"`
	SourceTableName string  `json:"sourceTableName"`
	RefSQL          string  `json:"refSql,omitempty"`
	PrimaryKey      string  `json:"primaryKey,omitempty"`
	Cached          bool    `json:"cached"`
	RefreshTime     string  `json:"refreshTime,omitempty"`
	Description     string  `json:"description,omitempty"`
	Fields          []Field `json:"fields"`
	CalculatedFields []Field `json:"calculatedFields"`
}

// Field represents a column/field in a model.
type Field struct {
	ID               int    `json:"id"`
	DisplayName      string `json:"displayName"`
	ReferenceName    string `json:"referenceName"`
	SourceColumnName string `json:"sourceColumnName"`
	Type             string `json:"type,omitempty"`
	IsCalculated     bool   `json:"isCalculated"`
	NotNull          bool   `json:"notNull"`
	Expression       string `json:"expression,omitempty"`
}

// DetailedModel has full detail including relations.
type DetailedModel struct {
	DisplayName     string           `json:"displayName"`
	ReferenceName   string           `json:"referenceName"`
	SourceTableName string           `json:"sourceTableName"`
	RefSQL          string           `json:"refSql,omitempty"`
	PrimaryKey      string           `json:"primaryKey,omitempty"`
	Cached          bool             `json:"cached"`
	RefreshTime     string           `json:"refreshTime,omitempty"`
	Description     string           `json:"description,omitempty"`
	Fields          []DetailedColumn `json:"fields"`
	CalculatedFields []DetailedColumn `json:"calculatedFields"`
	Relations       []DetailedRelation `json:"relations"`
}

// DetailedColumn is a column with full metadata.
type DetailedColumn struct {
	DisplayName      string `json:"displayName"`
	ReferenceName    string `json:"referenceName"`
	SourceColumnName string `json:"sourceColumnName"`
	Type             string `json:"type,omitempty"`
	IsCalculated     bool   `json:"isCalculated"`
	NotNull          bool   `json:"notNull"`
}

// DetailedRelation represents a relationship between models.
type DetailedRelation struct {
	FromModelID  int    `json:"fromModelId"`
	FromColumnID int    `json:"fromColumnId"`
	ToModelID    int    `json:"toModelId"`
	ToColumnID   int    `json:"toColumnId"`
	Type         string `json:"type"`
	Name         string `json:"name"`
}

// View represents a WrenAI view.
type View struct {
	ID          int    `json:"id"`
	Name        string `json:"name"`
	Statement   string `json:"statement"`
	DisplayName string `json:"displayName"`
}

// ListModels returns all models in the current project.
func (c *Client) ListModels() ([]Model, error) {
	query := `query {
		listModels {
			id displayName referenceName sourceTableName refSql
			primaryKey cached refreshTime description
			fields { id displayName referenceName sourceColumnName type isCalculated notNull expression }
			calculatedFields { id displayName referenceName sourceColumnName type isCalculated notNull expression }
		}
	}`

	gqlResp, err := c.GraphQL(query, nil)
	if err != nil {
		return nil, fmt.Errorf("listing models: %w", err)
	}

	var data struct {
		ListModels []Model `json:"listModels"`
	}
	if err := json.Unmarshal(gqlResp.Data, &data); err != nil {
		return nil, fmt.Errorf("parsing models: %w", err)
	}
	return data.ListModels, nil
}

// GetModel returns detailed information for a single model.
func (c *Client) GetModel(modelID int) (*DetailedModel, error) {
	query := `query GetModel($where: ModelWhereInput!) {
		model(where: $where) {
			displayName referenceName sourceTableName
			primaryKey cached refreshTime description
			fields { displayName referenceName sourceColumnName type isCalculated notNull }
			calculatedFields { displayName referenceName sourceColumnName type isCalculated notNull }
			relations { fromModelId fromColumnId toModelId toColumnId type name }
		}
	}`

	gqlResp, err := c.GraphQL(query, map[string]interface{}{
		"where": map[string]interface{}{"id": modelID},
	})
	if err != nil {
		return nil, fmt.Errorf("getting model: %w", err)
	}

	var data struct {
		Model DetailedModel `json:"model"`
	}
	if err := json.Unmarshal(gqlResp.Data, &data); err != nil {
		return nil, fmt.Errorf("parsing model: %w", err)
	}
	return &data.Model, nil
}

// ListViews returns all views in the current project.
func (c *Client) ListViews() ([]View, error) {
	query := `query {
		listViews { id name statement displayName }
	}`

	gqlResp, err := c.GraphQL(query, nil)
	if err != nil {
		return nil, fmt.Errorf("listing views: %w", err)
	}

	var data struct {
		ListViews []View `json:"listViews"`
	}
	if err := json.Unmarshal(gqlResp.Data, &data); err != nil {
		return nil, fmt.Errorf("parsing views: %w", err)
	}
	return data.ListViews, nil
}

// DeployResult contains the result of a deploy operation.
type DeployResult struct {
	Status string `json:"status"`
	Hash   string `json:"hash,omitempty"`
}

// Deploy triggers a deployment of the current project's MDL.
func (c *Client) Deploy(force bool) (*DeployResult, error) {
	query := `mutation Deploy($force: Boolean) {
		deploy(force: $force)
	}`

	gqlResp, err := c.GraphQL(query, map[string]interface{}{
		"force": force,
	})
	if err != nil {
		return nil, fmt.Errorf("deploying: %w", err)
	}

	var data struct {
		Deploy json.RawMessage `json:"deploy"`
	}
	if err := json.Unmarshal(gqlResp.Data, &data); err != nil {
		return nil, fmt.Errorf("parsing deploy result: %w", err)
	}

	return &DeployResult{
		Status: "deployed",
	}, nil
}

// GetDeployedModels fetches models from the REST API (deployed MDL).
type DeployedMDL struct {
	Hash          string            `json:"hash"`
	Models        []json.RawMessage `json:"models"`
	Relationships []json.RawMessage `json:"relationships"`
	Views         []json.RawMessage `json:"views"`
}

// GetDeployedModels returns the currently deployed MDL via REST API.
func (c *Client) GetDeployedModels() (*DeployedMDL, error) {
	var result DeployedMDL
	if err := c.GetJSON("/api/v1/models", &result); err != nil {
		return nil, fmt.Errorf("getting deployed models: %w", err)
	}
	return &result, nil
}
