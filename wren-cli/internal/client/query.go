package client

import (
	"encoding/json"
	"fmt"
	"io"
	"strings"
	"time"
)

// SetTimeout changes the HTTP client timeout.
// Useful for long-running AI operations that may take several minutes.
func (c *Client) SetTimeout(d time.Duration) {
	c.http.Timeout = d
}

// --- Generate SQL ---

// GenerateSQLRequest is the request body for POST /api/v1/generate_sql.
type GenerateSQLRequest struct {
	Question         string `json:"question"`
	ThreadID         string `json:"threadId,omitempty"`
	Language         string `json:"language,omitempty"`
	ReturnSQLDialect bool   `json:"returnSqlDialect,omitempty"`
}

// GenerateSQLResult is the response from /api/v1/generate_sql.
type GenerateSQLResult struct {
	ID       string `json:"id,omitempty"`
	SQL      string `json:"sql,omitempty"`
	ThreadID string `json:"threadId,omitempty"`

	// Error fields (returned for non-SQL queries or failures)
	Code               string `json:"code,omitempty"`
	Error              string `json:"error,omitempty"`
	ExplanationQueryID string `json:"explanationQueryId,omitempty"`
}

// GenerateSQL converts a natural language question into SQL.
// This may take up to 3 minutes as it polls the AI service internally.
func (c *Client) GenerateSQL(req *GenerateSQLRequest) (*GenerateSQLResult, error) {
	data, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("marshaling request: %w", err)
	}

	resp, err := c.doRequest("POST", "/api/v1/generate_sql", strings.NewReader(string(data)))
	if err != nil {
		return nil, fmt.Errorf("generating SQL: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading response: %w", err)
	}

	var result GenerateSQLResult
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("parsing response: %w (body: %s)", err, string(body))
	}

	// 200 = success, 400 = non-SQL query or validation error
	if resp.StatusCode == 200 {
		return &result, nil
	}
	if resp.StatusCode == 400 {
		// Return the result with error info so the caller can handle it
		return &result, nil
	}

	return nil, fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(body))
}

// --- Ask (full pipeline) ---

// AskRequest is the request body for POST /api/v1/ask.
type AskRequest struct {
	Question   string `json:"question"`
	SampleSize int    `json:"sampleSize,omitempty"`
	Language   string `json:"language,omitempty"`
	ThreadID   string `json:"threadId,omitempty"`
}

// AskResult is the response from /api/v1/ask.
type AskResult struct {
	// Success fields (TEXT_TO_SQL)
	SQL      string `json:"sql,omitempty"`
	Summary  string `json:"summary,omitempty"`
	ThreadID string `json:"threadId,omitempty"`

	// Non-SQL query response
	Type        string `json:"type,omitempty"`
	Explanation string `json:"explanation,omitempty"`

	// Error fields
	ID    string `json:"id,omitempty"`
	Code  string `json:"code,omitempty"`
	Error string `json:"error,omitempty"`
}

// Ask submits a natural language question and returns SQL + execution results + summary.
// This may take up to 3 minutes as it runs the full AI pipeline.
func (c *Client) Ask(req *AskRequest) (*AskResult, error) {
	data, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("marshaling request: %w", err)
	}

	resp, err := c.doRequest("POST", "/api/v1/ask", strings.NewReader(string(data)))
	if err != nil {
		return nil, fmt.Errorf("asking: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading response: %w", err)
	}

	var result AskResult
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("parsing response: %w (body: %s)", err, string(body))
	}

	if resp.StatusCode == 200 {
		return &result, nil
	}

	// Return parsed error info if available (e.g., 400 with code/error fields)
	if result.Code != "" || result.Error != "" {
		return &result, nil
	}

	return nil, fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(body))
}

// --- Run SQL ---

// RunSQLRequest is the request body for POST /api/v1/run_sql.
type RunSQLRequest struct {
	SQL      string `json:"sql"`
	ThreadID string `json:"threadId,omitempty"`
	Limit    int    `json:"limit,omitempty"`
}

// RunSQLColumn describes a column in the result set.
type RunSQLColumn struct {
	Name       string                 `json:"name"`
	Type       string                 `json:"type"`
	NotNull    bool                   `json:"notNull"`
	Properties map[string]interface{} `json:"properties,omitempty"`
}

// RunSQLResult is the response from /api/v1/run_sql.
type RunSQLResult struct {
	Records   []map[string]interface{} `json:"records"`
	Columns   []RunSQLColumn           `json:"columns"`
	ThreadID  string                   `json:"threadId,omitempty"`
	TotalRows int                      `json:"totalRows"`

	// Error fields
	ID    string `json:"id,omitempty"`
	Code  string `json:"code,omitempty"`
	Error string `json:"error,omitempty"`
}

// RunSQL executes a SQL query against the Wren Engine and returns results.
func (c *Client) RunSQL(req *RunSQLRequest) (*RunSQLResult, error) {
	data, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("marshaling request: %w", err)
	}

	resp, err := c.doRequest("POST", "/api/v1/run_sql", strings.NewReader(string(data)))
	if err != nil {
		return nil, fmt.Errorf("running SQL: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading response: %w", err)
	}

	var result RunSQLResult
	if err := json.Unmarshal(body, &result); err != nil {
		return nil, fmt.Errorf("parsing response: %w (body: %s)", err, string(body))
	}

	if resp.StatusCode == 200 {
		return &result, nil
	}

	// Return parsed error info if available (e.g., 400 with code/error fields)
	if result.Code != "" || result.Error != "" {
		return &result, nil
	}

	return nil, fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(body))}