package client

import (
	"encoding/json"
	"fmt"
)

// --- Gateways ---

// Gateway represents an org-scoped OpenShell gateway.
type Gateway struct {
	ID              int    `json:"id"`
	OrganizationID  int    `json:"organizationId"`
	Status          string `json:"status"`
	Endpoint        string `json:"endpoint,omitempty"`
	Port            int    `json:"port,omitempty"`
	PID             int    `json:"pid,omitempty"`
	CPUs            string `json:"cpus"`
	Memory          string `json:"memory"`
	SandboxCount    int    `json:"sandboxCount"`
	MaxSandboxes    int    `json:"maxSandboxes"`
	Version         string `json:"version,omitempty"`
	ErrorMessage    string `json:"errorMessage,omitempty"`
	LastHealthCheck string `json:"lastHealthCheck,omitempty"`
	CreatedAt       string `json:"createdAt"`
	UpdatedAt       string `json:"updatedAt"`
}

const gatewayFields = `id organizationId status endpoint port pid cpus memory sandboxCount maxSandboxes version errorMessage lastHealthCheck createdAt updatedAt`

// GetGateway fetches a gateway by ID.
func (c *Client) GetGateway(id int) (*Gateway, error) {
	query := fmt.Sprintf(`query GetGateway($where: GatewayWhereInput!) {
		gateway(where: $where) { %s }
	}`, gatewayFields)

	gqlResp, err := c.GraphQL(query, map[string]interface{}{
		"where": map[string]interface{}{"id": id},
	})
	if err != nil {
		return nil, fmt.Errorf("getting gateway: %w", err)
	}

	var data struct {
		Gateway Gateway `json:"gateway"`
	}
	if err := json.Unmarshal(gqlResp.Data, &data); err != nil {
		return nil, fmt.Errorf("parsing gateway: %w", err)
	}
	return &data.Gateway, nil
}

// GetGatewayForOrganization fetches the gateway for an organization.
func (c *Client) GetGatewayForOrganization(orgID int) (*Gateway, error) {
	query := fmt.Sprintf(`query GetGatewayForOrg($organizationId: Int!) {
		gatewayForOrganization(organizationId: $organizationId) { %s }
	}`, gatewayFields)

	gqlResp, err := c.GraphQL(query, map[string]interface{}{
		"organizationId": orgID,
	})
	if err != nil {
		return nil, fmt.Errorf("getting gateway for org: %w", err)
	}

	var data struct {
		GatewayForOrganization *Gateway `json:"gatewayForOrganization"`
	}
	if err := json.Unmarshal(gqlResp.Data, &data); err != nil {
		return nil, fmt.Errorf("parsing gateway: %w", err)
	}
	return data.GatewayForOrganization, nil
}

// ListRunningGateways lists all running gateways.
func (c *Client) ListRunningGateways() ([]Gateway, error) {
	query := fmt.Sprintf(`query {
		runningGateways { %s }
	}`, gatewayFields)

	gqlResp, err := c.GraphQL(query, nil)
	if err != nil {
		return nil, fmt.Errorf("listing gateways: %w", err)
	}

	var data struct {
		RunningGateways []Gateway `json:"runningGateways"`
	}
	if err := json.Unmarshal(gqlResp.Data, &data); err != nil {
		return nil, fmt.Errorf("parsing gateways: %w", err)
	}
	return data.RunningGateways, nil
}

// CreateGateway creates a new gateway for an organization.
func (c *Client) CreateGateway(orgID int, cpus, memory string, maxSandboxes int) (*Gateway, error) {
	query := fmt.Sprintf(`mutation CreateGateway($data: CreateGatewayInput!) {
		createGateway(data: $data) { %s }
	}`, gatewayFields)

	input := map[string]interface{}{
		"organizationId": orgID,
	}
	if cpus != "" {
		input["cpus"] = cpus
	}
	if memory != "" {
		input["memory"] = memory
	}
	if maxSandboxes > 0 {
		input["maxSandboxes"] = maxSandboxes
	}

	gqlResp, err := c.GraphQL(query, map[string]interface{}{
		"data": input,
	})
	if err != nil {
		return nil, fmt.Errorf("creating gateway: %w", err)
	}

	var data struct {
		CreateGateway Gateway `json:"createGateway"`
	}
	if err := json.Unmarshal(gqlResp.Data, &data); err != nil {
		return nil, fmt.Errorf("parsing gateway: %w", err)
	}
	return &data.CreateGateway, nil
}

// UpdateGateway updates a gateway's properties.
func (c *Client) UpdateGateway(id int, updates map[string]interface{}) (*Gateway, error) {
	query := fmt.Sprintf(`mutation UpdateGateway($where: GatewayWhereInput!, $data: UpdateGatewayInput!) {
		updateGateway(where: $where, data: $data) { %s }
	}`, gatewayFields)

	gqlResp, err := c.GraphQL(query, map[string]interface{}{
		"where": map[string]interface{}{"id": id},
		"data":  updates,
	})
	if err != nil {
		return nil, fmt.Errorf("updating gateway: %w", err)
	}

	var data struct {
		UpdateGateway Gateway `json:"updateGateway"`
	}
	if err := json.Unmarshal(gqlResp.Data, &data); err != nil {
		return nil, fmt.Errorf("parsing gateway: %w", err)
	}
	return &data.UpdateGateway, nil
}

// DeleteGateway deletes a gateway by ID.
func (c *Client) DeleteGateway(id int) error {
	query := `mutation DeleteGateway($where: GatewayWhereInput!) {
		deleteGateway(where: $where)
	}`

	_, err := c.GraphQL(query, map[string]interface{}{
		"where": map[string]interface{}{"id": id},
	})
	if err != nil {
		return fmt.Errorf("deleting gateway: %w", err)
	}
	return nil
}

// GetCurrentOrgID resolves the organization ID from the current session.
func (c *Client) GetCurrentOrgID() (int, error) {
	org, err := c.GetCurrentOrg()
	if err != nil {
		return 0, err
	}
	return org.ID, nil
}

// OrgInfo holds basic organization info.
type OrgInfo struct {
	ID   int    `json:"id"`
	Slug string `json:"slug"`
}

// GetCurrentOrg resolves the current organization (ID + slug).
func (c *Client) GetCurrentOrg() (*OrgInfo, error) {
	query := `query { listOrganizations { id slug displayName } }`

	gqlResp, err := c.GraphQL(query, nil)
	if err != nil {
		return nil, fmt.Errorf("fetching organization: %w", err)
	}

	var data struct {
		ListOrganizations []struct {
			ID          int    `json:"id"`
			Slug        string `json:"slug"`
			DisplayName string `json:"displayName"`
		} `json:"listOrganizations"`
	}
	if err := json.Unmarshal(gqlResp.Data, &data); err != nil {
		return nil, fmt.Errorf("parsing organization: %w", err)
	}
	if len(data.ListOrganizations) == 0 {
		return nil, fmt.Errorf("no organization found for current user")
	}
	org := data.ListOrganizations[0]
	return &OrgInfo{ID: org.ID, Slug: org.Slug}, nil
}
