package client

import (
	"encoding/json"
	"fmt"
	"regexp"
)

// SaveDataSourceInput mirrors the GraphQL DataSourceInput type.
type SaveDataSourceInput struct {
	Type       string                 `json:"type"`
	Properties map[string]interface{} `json:"properties"`
}

// SaveDataSourceResult is the response from saveDataSource.
type SaveDataSourceResult struct {
	Type       string          `json:"type"`
	Properties json.RawMessage `json:"properties"`
	ProjectID  int             `json:"projectId"`
}

// SaveDataSource configures the data source connection for the current project.
func (c *Client) SaveDataSource(input *SaveDataSourceInput) (*SaveDataSourceResult, error) {
	query := `mutation SaveDataSource($data: DataSourceInput!) {
		saveDataSource(data: $data) {
			type properties projectId
		}
	}`

	gqlResp, err := c.GraphQL(query, map[string]interface{}{
		"data": input,
	})
	if err != nil {
		return nil, fmt.Errorf("saving data source: %w", err)
	}

	var data struct {
		SaveDataSource SaveDataSourceResult `json:"saveDataSource"`
	}
	if err := json.Unmarshal(gqlResp.Data, &data); err != nil {
		return nil, fmt.Errorf("parsing save data source result: %w", err)
	}
	return &data.SaveDataSource, nil
}

// SaveTables tells the server to import the given table names as models.
func (c *Client) SaveTables(tableNames []string) error {
	query := `mutation SaveTables($data: SaveTablesInput!) {
		saveTables(data: $data)
	}`

	_, err := c.GraphQL(query, map[string]interface{}{
		"data": map[string]interface{}{
			"tables": tableNames,
		},
	})
	if err != nil {
		return fmt.Errorf("saving tables: %w", err)
	}
	return nil
}

// SetProjectID updates the project context used for subsequent API calls.
func (c *Client) SetProjectID(id string) {
	c.projectID = id
}

// --- MDL upload methods ---

// CreateModelInput is the input for creating a single model from a source table.
type CreateModelInput struct {
	SourceTableName string   `json:"sourceTableName"`
	Fields          []string `json:"fields"`
	PrimaryKey      string   `json:"primaryKey,omitempty"`
}

// CreateModel creates a model from a database table with the specified columns.
func (c *Client) CreateModel(input *CreateModelInput) error {
	query := `mutation CreateModel($data: CreateModelInput!) {
		createModel(data: $data)
	}`

	_, err := c.GraphQL(query, map[string]interface{}{
		"data": input,
	})
	if err != nil {
		return fmt.Errorf("creating model %q: %w", input.SourceTableName, err)
	}
	return nil
}

// RelationInput mirrors the GraphQL RelationInput type.
type RelationInput struct {
	FromModelID  int    `json:"fromModelId"`
	FromColumnID int    `json:"fromColumnId"`
	ToModelID    int    `json:"toModelId"`
	ToColumnID   int    `json:"toColumnId"`
	Type         string `json:"type"`
}

// SaveRelations creates or replaces relationships between models.
// This mutation automatically triggers an async deploy.
func (c *Client) SaveRelations(relations []RelationInput) error {
	query := `mutation SaveRelations($data: SaveRelationInput!) {
		saveRelations(data: $data)
	}`

	_, err := c.GraphQL(query, map[string]interface{}{
		"data": map[string]interface{}{
			"relations": relations,
		},
	})
	if err != nil {
		return fmt.Errorf("saving relations: %w", err)
	}
	return nil
}

// UpdateColumnMetadataInput updates a single column's metadata.
type UpdateColumnMetadataInput struct {
	ID          int    `json:"id"`
	DisplayName string `json:"displayName,omitempty"`
	Description string `json:"description,omitempty"`
}

// UpdateModelMetadataInput is the payload for updating a model's metadata.
type UpdateModelMetadataInput struct {
	DisplayName string                      `json:"displayName,omitempty"`
	Description string                      `json:"description,omitempty"`
	Columns     []UpdateColumnMetadataInput `json:"columns,omitempty"`
}

// UpdateModelMetadata updates a model's display name, description, and column metadata.
func (c *Client) UpdateModelMetadata(modelID int, input *UpdateModelMetadataInput) error {
	query := `mutation UpdateModelMetadata($where: ModelWhereInput!, $data: UpdateModelMetadataInput!) {
		updateModelMetadata(where: $where, data: $data)
	}`

	_, err := c.GraphQL(query, map[string]interface{}{
		"where": map[string]interface{}{"id": modelID},
		"data":  input,
	})
	if err != nil {
		return fmt.Errorf("updating model metadata (id=%d): %w", modelID, err)
	}
	return nil
}

// ResolveRelations converts MDL-style relationships (model/column names) into
// RelationInput structs (model/column IDs) by looking up the current models.
// Returns the resolved relations and any names that couldn't be resolved.
func (c *Client) ResolveRelations(rels []MDLRelation) ([]RelationInput, []string, error) {
	models, err := c.ListModels()
	if err != nil {
		return nil, nil, err
	}

	// Build lookup maps: referenceName → model, referenceName → field
	modelByName := make(map[string]*Model, len(models))
	for i := range models {
		modelByName[models[i].ReferenceName] = &models[i]
	}

	var resolved []RelationInput
	var unresolved []string

	for _, r := range rels {
		if len(r.Models) != 2 {
			unresolved = append(unresolved, fmt.Sprintf("%s: expected 2 models, got %d", r.Name, len(r.Models)))
			continue
		}

		fromModel := modelByName[r.Models[0]]
		toModel := modelByName[r.Models[1]]
		if fromModel == nil || toModel == nil {
			unresolved = append(unresolved, fmt.Sprintf("%s: model not found (%s → %s)", r.Name, r.Models[0], r.Models[1]))
			continue
		}

		fromColName, toColName, err := ParseConditionColumns(r.Condition)
		if err != nil {
			unresolved = append(unresolved, fmt.Sprintf("%s: %v", r.Name, err))
			continue
		}

		fromCol := findFieldByName(fromModel.Fields, fromColName)
		toCol := findFieldByName(toModel.Fields, toColName)
		if fromCol == nil || toCol == nil {
			unresolved = append(unresolved, fmt.Sprintf("%s: column not found (%s.%s → %s.%s)", r.Name, r.Models[0], fromColName, r.Models[1], toColName))
			continue
		}

		resolved = append(resolved, RelationInput{
			FromModelID:  fromModel.ID,
			FromColumnID: fromCol.ID,
			ToModelID:    toModel.ID,
			ToColumnID:   toCol.ID,
			Type:         r.JoinType,
		})
	}

	return resolved, unresolved, nil
}

// MDLRelation represents a relationship from the dbt converter output,
// using model/column names rather than numeric IDs.
type MDLRelation struct {
	Name      string   `json:"name"`
	Models    []string `json:"models"`
	JoinType  string   `json:"joinType"`
	Condition string   `json:"condition"`
}

// ParseConditionColumns extracts the from/to column names from a condition
// like: "model1"."col1" = "model2"."col2"
func ParseConditionColumns(condition string) (fromCol, toCol string, err error) {
	re := regexp.MustCompile(`"[^"]+"\."([^"]+)"\s*=\s*"[^"]+"\."([^"]+)"`)
	m := re.FindStringSubmatch(condition)
	if len(m) != 3 {
		return "", "", fmt.Errorf("cannot parse condition: %s", condition)
	}
	return m[1], m[2], nil
}

func findFieldByName(fields []Field, name string) *Field {
	for i := range fields {
		if fields[i].ReferenceName == name || fields[i].SourceColumnName == name {
			return &fields[i]
		}
	}
	return nil
}
