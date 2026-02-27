package client

import (
	"encoding/json"
	"fmt"
	"io"
	"strings"
	"time"
)

// --- Calculated Fields ---

// CalculatedField represents a calculated field on a model.
type CalculatedField struct {
	ID               int    `json:"id"`
	DisplayName      string `json:"displayName"`
	ReferenceName    string `json:"referenceName"`
	SourceColumnName string `json:"sourceColumnName"`
	Type             string `json:"type,omitempty"`
	IsCalculated     bool   `json:"isCalculated"`
	NotNull          bool   `json:"notNull"`
	Expression       string `json:"expression,omitempty"`
}

// ListCalculatedFields returns calculated fields for a model.
func (c *Client) ListCalculatedFields(modelID int) ([]CalculatedField, error) {
	// Use listModels which returns FieldInfo (with id) for calculatedFields
	query := `query {
		listModels {
			id
			calculatedFields {
				id displayName referenceName sourceColumnName type isCalculated notNull expression
			}
		}
	}`

	gqlResp, err := c.GraphQL(query, nil)
	if err != nil {
		return nil, fmt.Errorf("listing calculated fields: %w", err)
	}

	var data struct {
		ListModels []struct {
			ID               int               `json:"id"`
			CalculatedFields []CalculatedField `json:"calculatedFields"`
		} `json:"listModels"`
	}
	if err := json.Unmarshal(gqlResp.Data, &data); err != nil {
		return nil, fmt.Errorf("parsing calculated fields: %w", err)
	}

	// Find the target model and return its calculated fields
	for _, m := range data.ListModels {
		if m.ID == modelID {
			return m.CalculatedFields, nil
		}
	}
	return nil, fmt.Errorf("model %d not found", modelID)
}

// CreateCalculatedField creates a new calculated field on a model.
func (c *Client) CreateCalculatedField(modelID int, name, expression string, lineage []int) error {
	query := `mutation CreateCalculatedField($data: CreateCalculatedFieldInput!) {
		createCalculatedField(data: $data)
	}`

	_, err := c.GraphQL(query, map[string]interface{}{
		"data": map[string]interface{}{
			"modelId":    modelID,
			"name":       name,
			"expression": expression,
			"lineage":    lineage,
		},
	})
	if err != nil {
		return fmt.Errorf("creating calculated field: %w", err)
	}
	return nil
}

// UpdateCalculatedField updates a calculated field.
func (c *Client) UpdateCalculatedField(fieldID int, name, expression string, lineage []int) error {
	query := `mutation UpdateCalculatedField($where: UpdateCalculatedFieldWhere!, $data: UpdateCalculatedFieldInput!) {
		updateCalculatedField(where: $where, data: $data)
	}`

	_, err := c.GraphQL(query, map[string]interface{}{
		"where": map[string]interface{}{"id": fieldID},
		"data": map[string]interface{}{
			"name":       name,
			"expression": expression,
			"lineage":    lineage,
		},
	})
	if err != nil {
		return fmt.Errorf("updating calculated field: %w", err)
	}
	return nil
}

// DeleteCalculatedField deletes a calculated field.
func (c *Client) DeleteCalculatedField(fieldID int) error {
	query := `mutation DeleteCalculatedField($where: UpdateCalculatedFieldWhere!) {
		deleteCalculatedField(where: $where)
	}`

	_, err := c.GraphQL(query, map[string]interface{}{
		"where": map[string]interface{}{"id": fieldID},
	})
	if err != nil {
		return fmt.Errorf("deleting calculated field: %w", err)
	}
	return nil
}

// ValidateCalculatedField checks if a calculated field name is valid.
func (c *Client) ValidateCalculatedField(name string, modelID int, columnID *int) (*CalcFieldValidation, error) {
	query := `mutation ValidateCalculatedField($data: ValidateCalculatedFieldInput!) {
		validateCalculatedField(data: $data) { valid message }
	}`

	data := map[string]interface{}{
		"name":    name,
		"modelId": modelID,
	}
	if columnID != nil {
		data["columnId"] = *columnID
	}

	gqlResp, err := c.GraphQL(query, map[string]interface{}{
		"data": data,
	})
	if err != nil {
		return nil, fmt.Errorf("validating calculated field: %w", err)
	}

	var result struct {
		ValidateCalculatedField CalcFieldValidation `json:"validateCalculatedField"`
	}
	if err := json.Unmarshal(gqlResp.Data, &result); err != nil {
		return nil, fmt.Errorf("parsing validation result: %w", err)
	}
	return &result.ValidateCalculatedField, nil
}

// CalcFieldValidation is the result of a calculated field name validation.
type CalcFieldValidation struct {
	Valid   bool   `json:"valid"`
	Message string `json:"message,omitempty"`
}

// --- API History ---

// ApiHistoryItem represents a single API history entry.
type ApiHistoryItem struct {
	ID              string      `json:"id"`
	ProjectID       int         `json:"projectId"`
	ApiType         string      `json:"apiType"`
	ThreadID        string      `json:"threadId,omitempty"`
	StatusCode      int         `json:"statusCode,omitempty"`
	DurationMs      int         `json:"durationMs,omitempty"`
	RequestPayload  interface{} `json:"requestPayload,omitempty"`
	ResponsePayload interface{} `json:"responsePayload,omitempty"`
	CreatedAt       string      `json:"createdAt"`
}

// ApiHistoryPage is a paginated list of API history entries.
type ApiHistoryPage struct {
	Items   []ApiHistoryItem `json:"items"`
	Total   int              `json:"total"`
	HasMore bool             `json:"hasMore"`
}

// ApiHistoryFilter contains optional filters for API history queries.
type ApiHistoryFilter struct {
	ApiType    string `json:"apiType,omitempty"`
	StatusCode int    `json:"statusCode,omitempty"`
	ThreadID   string `json:"threadId,omitempty"`
	StartDate  string `json:"startDate,omitempty"`
	EndDate    string `json:"endDate,omitempty"`
}

// GetApiHistory queries API history with optional filters and pagination.
func (c *Client) GetApiHistory(filter *ApiHistoryFilter, offset, limit int) (*ApiHistoryPage, error) {
	query := `query GetApiHistory($filter: ApiHistoryFilterInput, $pagination: ApiHistoryPaginationInput!) {
		apiHistory(filter: $filter, pagination: $pagination) {
			items {
				id projectId apiType threadId statusCode durationMs
				requestPayload responsePayload createdAt
			}
			total
			hasMore
		}
	}`

	vars := map[string]interface{}{
		"pagination": map[string]interface{}{
			"offset": offset,
			"limit":  limit,
		},
	}

	if filter != nil {
		f := map[string]interface{}{}
		if filter.ApiType != "" {
			f["apiType"] = filter.ApiType
		}
		if filter.StatusCode != 0 {
			f["statusCode"] = filter.StatusCode
		}
		if filter.ThreadID != "" {
			f["threadId"] = filter.ThreadID
		}
		if filter.StartDate != "" {
			f["startDate"] = filter.StartDate
		}
		if filter.EndDate != "" {
			f["endDate"] = filter.EndDate
		}
		vars["filter"] = f
	}

	gqlResp, err := c.GraphQL(query, vars)
	if err != nil {
		return nil, fmt.Errorf("querying API history: %w", err)
	}

	var data struct {
		ApiHistory ApiHistoryPage `json:"apiHistory"`
	}
	if err := json.Unmarshal(gqlResp.Data, &data); err != nil {
		return nil, fmt.Errorf("parsing API history: %w", err)
	}
	return &data.ApiHistory, nil
}

// --- API Keys ---

// ApiKey represents an organization API key.
type ApiKey struct {
	ID              int    `json:"id"`
	Name            string `json:"name"`
	SecretKeyMasked string `json:"secretKeyMasked"`
	LastUsedAt      string `json:"lastUsedAt,omitempty"`
	ExpiresAt       string `json:"expiresAt,omitempty"`
	CreatedByEmail  string `json:"createdByEmail,omitempty"`
	CreatedAt       string `json:"createdAt"`
	RevokedAt       string `json:"revokedAt,omitempty"`
}

// CreateApiKeyResult contains both the key metadata and the full secret (shown once).
type CreateApiKeyResult struct {
	Key       ApiKey `json:"key"`
	SecretKey string `json:"secretKey"`
}

// ListApiKeys returns all API keys for the organization.
func (c *Client) ListApiKeys() ([]ApiKey, error) {
	query := `query {
		listApiKeys {
			id name secretKeyMasked lastUsedAt expiresAt createdByEmail createdAt revokedAt
		}
	}`

	gqlResp, err := c.GraphQL(query, nil)
	if err != nil {
		return nil, fmt.Errorf("listing API keys: %w", err)
	}

	var data struct {
		ListApiKeys []ApiKey `json:"listApiKeys"`
	}
	if err := json.Unmarshal(gqlResp.Data, &data); err != nil {
		return nil, fmt.Errorf("parsing API keys: %w", err)
	}
	return data.ListApiKeys, nil
}

// CreateApiKey creates a new API key.
func (c *Client) CreateApiKey(name string) (*CreateApiKeyResult, error) {
	query := `mutation CreateApiKey($data: CreateApiKeyInput!) {
		createApiKey(data: $data) {
			key { id name secretKeyMasked createdAt }
			secretKey
		}
	}`

	gqlResp, err := c.GraphQL(query, map[string]interface{}{
		"data": map[string]interface{}{"name": name},
	})
	if err != nil {
		return nil, fmt.Errorf("creating API key: %w", err)
	}

	var data struct {
		CreateApiKey CreateApiKeyResult `json:"createApiKey"`
	}
	if err := json.Unmarshal(gqlResp.Data, &data); err != nil {
		return nil, fmt.Errorf("parsing API key result: %w", err)
	}
	return &data.CreateApiKey, nil
}

// RevokeApiKey revokes (disables) an API key without deleting it.
func (c *Client) RevokeApiKey(keyID int) error {
	query := `mutation RevokeApiKey($keyId: Int!) {
		revokeApiKey(keyId: $keyId)
	}`

	_, err := c.GraphQL(query, map[string]interface{}{
		"keyId": keyID,
	})
	if err != nil {
		return fmt.Errorf("revoking API key: %w", err)
	}
	return nil
}

// DeleteApiKey permanently deletes an API key.
func (c *Client) DeleteApiKey(keyID int) error {
	query := `mutation DeleteApiKey($keyId: Int!) {
		deleteApiKey(keyId: $keyId)
	}`

	_, err := c.GraphQL(query, map[string]interface{}{
		"keyId": keyID,
	})
	if err != nil {
		return fmt.Errorf("deleting API key: %w", err)
	}
	return nil
}

// --- Summary Generation ---

// GenerateSummaryRequest is the request body for POST /api/v1/generate_summary.
type GenerateSummaryRequest struct {
	Question   string `json:"question"`
	SQL        string `json:"sql"`
	SampleSize int    `json:"sampleSize,omitempty"`
	Language   string `json:"language,omitempty"`
	ThreadID   string `json:"threadId,omitempty"`
}

// GenerateSummaryResult is the response from /api/v1/generate_summary.
type GenerateSummaryResult struct {
	Summary  string `json:"summary,omitempty"`
	ThreadID string `json:"threadId,omitempty"`

	// Error fields
	Code  string `json:"code,omitempty"`
	Error string `json:"error,omitempty"`
}

// GenerateSummary generates a natural language summary from a question and SQL.
func (c *Client) GenerateSummary(req *GenerateSummaryRequest) (*GenerateSummaryResult, error) {
	data, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("marshaling request: %w", err)
	}

	// Summary generation can take a while
	origTimeout := c.http.Timeout
	c.http.Timeout = 4 * time.Minute
	defer func() { c.http.Timeout = origTimeout }()

	resp, err := c.doRequest("POST", "/api/v1/generate_summary", strings.NewReader(string(data)))
	if err != nil {
		return nil, fmt.Errorf("generating summary: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading response: %w", err)
	}

	var result GenerateSummaryResult
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("parsing response: %w (body: %s)", err, string(body))
	}

	if resp.StatusCode >= 400 {
		if result.Error != "" {
			return &result, fmt.Errorf("summary generation failed: %s", result.Error)
		}
		return &result, fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(body))
	}

	return &result, nil
}

// --- Chart Generation ---

// GenerateChartRequest is the request body for POST /api/v1/generate_vega_chart.
type GenerateChartRequest struct {
	Question   string `json:"question"`
	SQL        string `json:"sql"`
	ThreadID   string `json:"threadId,omitempty"`
	SampleSize int    `json:"sampleSize,omitempty"`
}

// GenerateChartResult is the response from /api/v1/generate_vega_chart.
type GenerateChartResult struct {
	VegaSpec interface{} `json:"vegaSpec,omitempty"`
	ThreadID string      `json:"threadId,omitempty"`

	// Error fields
	Code  string `json:"code,omitempty"`
	Error string `json:"error,omitempty"`
}

// GenerateChart generates a Vega-Lite chart spec from a question and SQL.
func (c *Client) GenerateChart(req *GenerateChartRequest) (*GenerateChartResult, error) {
	data, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("marshaling request: %w", err)
	}

	// Chart generation can take a while
	origTimeout := c.http.Timeout
	c.http.Timeout = 4 * time.Minute
	defer func() { c.http.Timeout = origTimeout }()

	resp, err := c.doRequest("POST", "/api/v1/generate_vega_chart", strings.NewReader(string(data)))
	if err != nil {
		return nil, fmt.Errorf("generating chart: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading response: %w", err)
	}

	var result GenerateChartResult
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("parsing response: %w (body: %s)", err, string(body))
	}

	if resp.StatusCode >= 400 {
		if result.Error != "" {
			return &result, fmt.Errorf("chart generation failed: %s", result.Error)
		}
		return &result, fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(body))
	}

	return &result, nil
}
