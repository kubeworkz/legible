package client

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/Canner/WrenAI/wren-cli/internal/config"
)

// Client is an HTTP client for the WrenAI REST and GraphQL APIs.
type Client struct {
	http      *http.Client
	endpoint  string
	apiKey    string
	projectID string
}

// New creates a Client from the loaded config.
func New(cfg *config.Config) (*Client, error) {
	if cfg.Endpoint == "" {
		return nil, fmt.Errorf("endpoint not configured — run: wren login")
	}
	if cfg.APIKey == "" {
		return nil, fmt.Errorf("API key not configured — run: wren login")
	}
	return &Client{
		http: &http.Client{
			Timeout: 30 * time.Second,
		},
		endpoint:  strings.TrimRight(cfg.Endpoint, "/"),
		apiKey:    cfg.APIKey,
		projectID: cfg.ProjectID,
	}, nil
}

// NewWithOverrides creates a Client with explicit endpoint/key (for login validation).
func NewWithOverrides(endpoint, apiKey string) *Client {
	return &Client{
		http: &http.Client{
			Timeout: 15 * time.Second,
		},
		endpoint: strings.TrimRight(endpoint, "/"),
		apiKey:   apiKey,
	}
}

// GraphQLRequest represents a GraphQL request body.
type GraphQLRequest struct {
	Query     string                 `json:"query"`
	Variables map[string]interface{} `json:"variables,omitempty"`
}

// GraphQLResponse represents a GraphQL response.
type GraphQLResponse struct {
	Data   json.RawMessage `json:"data"`
	Errors []struct {
		Message string `json:"message"`
	} `json:"errors,omitempty"`
}

// doRequest builds and executes an authenticated HTTP request.
func (c *Client) doRequest(method, path string, body io.Reader) (*http.Response, error) {
	url := c.endpoint + path
	req, err := http.NewRequest(method, url, body)
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")
	if c.projectID != "" {
		req.Header.Set("X-Project-Id", c.projectID)
	}
	return c.http.Do(req)
}

// GetJSON performs a GET request and decodes the JSON response into dest.
func (c *Client) GetJSON(path string, dest interface{}) error {
	resp, err := c.doRequest("GET", path, nil)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(body))
	}

	return json.NewDecoder(resp.Body).Decode(dest)
}

// PostJSON performs a POST request with a JSON body and decodes the response into dest.
func (c *Client) PostJSON(path string, payload interface{}, dest interface{}) error {
	data, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("marshaling request: %w", err)
	}

	resp, err := c.doRequest("POST", path, strings.NewReader(string(data)))
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("HTTP %d: %s", resp.StatusCode, string(body))
	}

	if dest != nil {
		return json.NewDecoder(resp.Body).Decode(dest)
	}
	return nil
}

// GraphQL executes a GraphQL query/mutation and returns the response.
func (c *Client) GraphQL(query string, variables map[string]interface{}) (*GraphQLResponse, error) {
	gqlReq := GraphQLRequest{
		Query:     query,
		Variables: variables,
	}
	data, err := json.Marshal(gqlReq)
	if err != nil {
		return nil, fmt.Errorf("marshaling graphql request: %w", err)
	}

	resp, err := c.doRequest("POST", "/api/graphql", strings.NewReader(string(data)))
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("GraphQL HTTP %d: %s", resp.StatusCode, string(body))
	}

	gqlResp := &GraphQLResponse{}
	if err := json.NewDecoder(resp.Body).Decode(gqlResp); err != nil {
		return nil, fmt.Errorf("decoding graphql response: %w", err)
	}

	if len(gqlResp.Errors) > 0 {
		msgs := make([]string, len(gqlResp.Errors))
		for i, e := range gqlResp.Errors {
			msgs[i] = e.Message
		}
		return gqlResp, fmt.Errorf("GraphQL errors: %s", strings.Join(msgs, "; "))
	}

	return gqlResp, nil
}

// ValidateConnection checks that the endpoint is reachable and the API key is valid.
// Returns organization/user info on success.
func (c *Client) ValidateConnection() (*WhoAmIResult, error) {
	// Use the models endpoint as a lightweight auth check.
	// A 200 or 400 (no deployment) both indicate valid auth.
	// Only 401 means the key is invalid.
	resp, err := c.doRequest("GET", "/api/v1/models", nil)
	if err != nil {
		return nil, fmt.Errorf("connection failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized {
		return nil, fmt.Errorf("authentication failed: invalid API key")
	}
	// 200 = success, 400 = auth OK but no deployment — both mean the key is valid
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusBadRequest {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("unexpected status %d: %s", resp.StatusCode, string(body))
	}

	// Now fetch user/org info via GraphQL
	return c.fetchWhoAmI()
}

// WhoAmIResult contains the current authenticated user/org information.
type WhoAmIResult struct {
	UserEmail    string   `json:"userEmail"`
	UserName     string   `json:"userName,omitempty"`
	OrgName      string   `json:"orgName,omitempty"`
	OrgID        int      `json:"orgId,omitempty"`
	Role         string   `json:"role,omitempty"`
	ProjectCount int      `json:"projectCount"`
	ProjectNames []string `json:"projectNames,omitempty"`
}

func (c *Client) fetchWhoAmI() (*WhoAmIResult, error) {
	result := &WhoAmIResult{}

	// Try to get user info (works with session auth, not API key auth)
	userQuery := `query { currentUser { email displayName } }`
	if gqlResp, err := c.GraphQL(userQuery, nil); err == nil {
		var data struct {
			CurrentUser struct {
				Email       string `json:"email"`
				DisplayName string `json:"displayName"`
			} `json:"currentUser"`
		}
		if json.Unmarshal(gqlResp.Data, &data) == nil && data.CurrentUser.Email != "" {
			result.UserEmail = data.CurrentUser.Email
			result.UserName = data.CurrentUser.DisplayName
		}
	}

	// Try to get project list (works with API key auth via organizationId)
	projQuery := `query { listProjects { id displayName } }`
	if gqlResp, err := c.GraphQL(projQuery, nil); err == nil {
		var data struct {
			ListProjects []struct {
				ID          int    `json:"id"`
				DisplayName string `json:"displayName"`
			} `json:"listProjects"`
		}
		if json.Unmarshal(gqlResp.Data, &data) == nil {
			result.ProjectCount = len(data.ListProjects)
			if len(data.ListProjects) > 0 {
				names := make([]string, len(data.ListProjects))
				for i, p := range data.ListProjects {
					names[i] = p.DisplayName
					if names[i] == "" {
						names[i] = fmt.Sprintf("project-%d", p.ID)
					}
				}
				result.ProjectNames = names
			}
		}
	}

	// If no user info returned, indicate API key auth
	if result.UserEmail == "" {
		result.UserEmail = "(authenticated via API key)"
	}

	return result, nil
}
