package client

import (
	"encoding/json"
	"fmt"
)

// --- Threads ---

// Thread represents a conversation thread.
type Thread struct {
	ID      int    `json:"id"`
	Summary string `json:"summary"`
}

// ThreadResponse represents a single Q&A response within a thread.
type ThreadResponse struct {
	ID       int    `json:"id"`
	ThreadID int    `json:"threadId"`
	Question string `json:"question"`
	SQL      string `json:"sql,omitempty"`
}

// DetailedThread contains a thread and all its responses.
type DetailedThread struct {
	ID        int              `json:"id"`
	Responses []ThreadResponse `json:"responses"`
}

// ListThreads returns all threads for the current project.
func (c *Client) ListThreads() ([]Thread, error) {
	query := `query { threads { id summary } }`

	gqlResp, err := c.GraphQL(query, nil)
	if err != nil {
		return nil, fmt.Errorf("listing threads: %w", err)
	}

	var data struct {
		Threads []Thread `json:"threads"`
	}
	if err := json.Unmarshal(gqlResp.Data, &data); err != nil {
		return nil, fmt.Errorf("parsing threads: %w", err)
	}
	return data.Threads, nil
}

// GetThread returns a thread with all its responses.
func (c *Client) GetThread(threadID int) (*DetailedThread, error) {
	query := `query GetThread($threadId: Int!) {
		thread(threadId: $threadId) {
			id
			responses { id threadId question sql }
		}
	}`

	gqlResp, err := c.GraphQL(query, map[string]interface{}{
		"threadId": threadID,
	})
	if err != nil {
		return nil, fmt.Errorf("getting thread: %w", err)
	}

	var data struct {
		Thread DetailedThread `json:"thread"`
	}
	if err := json.Unmarshal(gqlResp.Data, &data); err != nil {
		return nil, fmt.Errorf("parsing thread: %w", err)
	}
	return &data.Thread, nil
}

// UpdateThread updates a thread's summary.
func (c *Client) UpdateThread(threadID int, summary string) (*Thread, error) {
	query := `mutation UpdateThread($where: ThreadUniqueWhereInput!, $data: UpdateThreadInput!) {
		updateThread(where: $where, data: $data) { id summary }
	}`

	gqlResp, err := c.GraphQL(query, map[string]interface{}{
		"where": map[string]interface{}{"id": threadID},
		"data":  map[string]interface{}{"summary": summary},
	})
	if err != nil {
		return nil, fmt.Errorf("updating thread: %w", err)
	}

	var data struct {
		UpdateThread Thread `json:"updateThread"`
	}
	if err := json.Unmarshal(gqlResp.Data, &data); err != nil {
		return nil, fmt.Errorf("parsing thread: %w", err)
	}
	return &data.UpdateThread, nil
}

// DeleteThread deletes a thread by ID.
func (c *Client) DeleteThread(threadID int) error {
	query := `mutation DeleteThread($where: ThreadUniqueWhereInput!) {
		deleteThread(where: $where)
	}`

	_, err := c.GraphQL(query, map[string]interface{}{
		"where": map[string]interface{}{"id": threadID},
	})
	if err != nil {
		return fmt.Errorf("deleting thread: %w", err)
	}
	return nil
}

// --- Relationships ---

// Relation represents a relationship between two models.
type Relation struct {
	RelationID               int    `json:"relationId"`
	Type                     string `json:"type"`
	Name                     string `json:"displayName"`
	FromModelID              int    `json:"fromModelId"`
	FromModelName            string `json:"fromModelName"`
	FromModelDisplayName     string `json:"fromModelDisplayName"`
	FromColumnID             int    `json:"fromColumnId"`
	FromColumnName           string `json:"fromColumnName"`
	FromColumnDisplayName    string `json:"fromColumnDisplayName"`
	ToModelID                int    `json:"toModelId"`
	ToModelName              string `json:"toModelName"`
	ToModelDisplayName       string `json:"toModelDisplayName"`
	ToColumnID               int    `json:"toColumnId"`
	ToColumnName             string `json:"toColumnName"`
	ToColumnDisplayName      string `json:"toColumnDisplayName"`
}

// ListRelations returns all relationships via the diagram query.
func (c *Client) ListRelations() ([]Relation, error) {
	query := `query {
		diagram {
			models {
				relationFields {
					relationId type displayName
					fromModelId fromModelName fromModelDisplayName
					fromColumnId fromColumnName fromColumnDisplayName
					toModelId toModelName toModelDisplayName
					toColumnId toColumnName toColumnDisplayName
				}
			}
		}
	}`

	gqlResp, err := c.GraphQL(query, nil)
	if err != nil {
		return nil, fmt.Errorf("listing relations: %w", err)
	}

	var data struct {
		Diagram struct {
			Models []struct {
				RelationFields []Relation `json:"relationFields"`
			} `json:"models"`
		} `json:"diagram"`
	}
	if err := json.Unmarshal(gqlResp.Data, &data); err != nil {
		return nil, fmt.Errorf("parsing relations: %w", err)
	}

	// Collect unique relations (each appears on two models)
	seen := map[int]bool{}
	var relations []Relation
	for _, m := range data.Diagram.Models {
		for _, r := range m.RelationFields {
			if !seen[r.RelationID] {
				seen[r.RelationID] = true
				relations = append(relations, r)
			}
		}
	}
	return relations, nil
}

// CreateRelation creates a new relationship between models.
func (c *Client) CreateRelation(fromModelID, fromColumnID, toModelID, toColumnID int, relType string) error {
	query := `mutation CreateRelation($data: RelationInput!) {
		createRelation(data: $data)
	}`

	_, err := c.GraphQL(query, map[string]interface{}{
		"data": map[string]interface{}{
			"fromModelId":  fromModelID,
			"fromColumnId": fromColumnID,
			"toModelId":    toModelID,
			"toColumnId":   toColumnID,
			"type":         relType,
		},
	})
	if err != nil {
		return fmt.Errorf("creating relation: %w", err)
	}
	return nil
}

// UpdateRelation updates a relationship's type.
func (c *Client) UpdateRelation(relationID int, relType string) error {
	query := `mutation UpdateRelation($where: WhereIdInput!, $data: UpdateRelationInput!) {
		updateRelation(where: $where, data: $data)
	}`

	_, err := c.GraphQL(query, map[string]interface{}{
		"where": map[string]interface{}{"id": relationID},
		"data":  map[string]interface{}{"type": relType},
	})
	if err != nil {
		return fmt.Errorf("updating relation: %w", err)
	}
	return nil
}

// DeleteRelation deletes a relationship.
func (c *Client) DeleteRelation(relationID int) error {
	query := `mutation DeleteRelation($where: WhereIdInput!) {
		deleteRelation(where: $where)
	}`

	_, err := c.GraphQL(query, map[string]interface{}{
		"where": map[string]interface{}{"id": relationID},
	})
	if err != nil {
		return fmt.Errorf("deleting relation: %w", err)
	}
	return nil
}

// --- Project CRUD ---

// CreateProject creates a new project.
func (c *Client) CreateProject(displayName string) (*Project, error) {
	query := `mutation CreateProject($data: CreateProjectInput!) {
		createProject(data: $data) {
			id displayName type language timezone createdAt updatedAt
		}
	}`

	gqlResp, err := c.GraphQL(query, map[string]interface{}{
		"data": map[string]interface{}{"displayName": displayName},
	})
	if err != nil {
		return nil, fmt.Errorf("creating project: %w", err)
	}

	var data struct {
		CreateProject Project `json:"createProject"`
	}
	if err := json.Unmarshal(gqlResp.Data, &data); err != nil {
		return nil, fmt.Errorf("parsing project: %w", err)
	}
	return &data.CreateProject, nil
}

// UpdateProject updates a project's settings.
func (c *Client) UpdateProject(projectID int, displayName, language, timezone *string) (*Project, error) {
	query := `mutation UpdateProject($projectId: Int!, $data: UpdateProjectInput!) {
		updateProject(projectId: $projectId, data: $data) {
			id displayName type language timezone createdAt updatedAt
		}
	}`

	updateData := map[string]interface{}{}
	if displayName != nil {
		updateData["displayName"] = *displayName
	}
	if language != nil {
		updateData["language"] = *language
	}
	if timezone != nil {
		updateData["timezone"] = *timezone
	}

	gqlResp, err := c.GraphQL(query, map[string]interface{}{
		"projectId": projectID,
		"data":      updateData,
	})
	if err != nil {
		return nil, fmt.Errorf("updating project: %w", err)
	}

	var data struct {
		UpdateProject Project `json:"updateProject"`
	}
	if err := json.Unmarshal(gqlResp.Data, &data); err != nil {
		return nil, fmt.Errorf("parsing project: %w", err)
	}
	return &data.UpdateProject, nil
}

// DeleteProject deletes a project by ID.
func (c *Client) DeleteProject(projectID int) error {
	query := `mutation DeleteProject($projectId: Int!) {
		deleteProject(projectId: $projectId)
	}`

	_, err := c.GraphQL(query, map[string]interface{}{
		"projectId": projectID,
	})
	if err != nil {
		return fmt.Errorf("deleting project: %w", err)
	}
	return nil
}

// --- View CRUD ---

// GetView returns a single view by ID.
func (c *Client) GetView(viewID int) (*View, error) {
	query := `query GetView($where: ViewWhereUniqueInput!) {
		view(where: $where) { id name statement displayName }
	}`

	gqlResp, err := c.GraphQL(query, map[string]interface{}{
		"where": map[string]interface{}{"id": viewID},
	})
	if err != nil {
		return nil, fmt.Errorf("getting view: %w", err)
	}

	var data struct {
		View View `json:"view"`
	}
	if err := json.Unmarshal(gqlResp.Data, &data); err != nil {
		return nil, fmt.Errorf("parsing view: %w", err)
	}
	return &data.View, nil
}

// CreateView creates a new view from a thread response.
func (c *Client) CreateView(name string, responseID int) (*View, error) {
	query := `mutation CreateView($data: CreateViewInput!) {
		createView(data: $data) { id name statement displayName }
	}`

	gqlResp, err := c.GraphQL(query, map[string]interface{}{
		"data": map[string]interface{}{
			"name":               name,
			"responseId":         responseID,
			"rephrasedQuestion":  name,
		},
	})
	if err != nil {
		return nil, fmt.Errorf("creating view: %w", err)
	}

	var data struct {
		CreateView View `json:"createView"`
	}
	if err := json.Unmarshal(gqlResp.Data, &data); err != nil {
		return nil, fmt.Errorf("parsing view: %w", err)
	}
	return &data.CreateView, nil
}

// DeleteView deletes a view by ID.
func (c *Client) DeleteView(viewID int) error {
	query := `mutation DeleteView($where: ViewWhereUniqueInput!) {
		deleteView(where: $where)
	}`

	_, err := c.GraphQL(query, map[string]interface{}{
		"where": map[string]interface{}{"id": viewID},
	})
	if err != nil {
		return fmt.Errorf("deleting view: %w", err)
	}
	return nil
}
