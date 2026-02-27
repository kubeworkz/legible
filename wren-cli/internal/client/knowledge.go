package client

import "fmt"

// --- Instructions ---

// Instruction represents a knowledge instruction.
type Instruction struct {
	ID          int      `json:"id"`
	Instruction string   `json:"instruction"`
	Questions   []string `json:"questions"`
	IsGlobal    bool     `json:"isGlobal"`
}

// CreateInstructionRequest is the request body for creating an instruction.
type CreateInstructionRequest struct {
	Instruction string   `json:"instruction"`
	Questions   []string `json:"questions,omitempty"`
	IsGlobal    bool     `json:"isGlobal,omitempty"`
}

// UpdateInstructionRequest is the request body for updating an instruction.
type UpdateInstructionRequest struct {
	Instruction *string  `json:"instruction,omitempty"`
	Questions   []string `json:"questions,omitempty"`
	IsGlobal    *bool    `json:"isGlobal,omitempty"`
}

// ListInstructions returns all instructions for the current project.
func (c *Client) ListInstructions() ([]Instruction, error) {
	var result []Instruction
	if err := c.GetJSON("/api/v1/knowledge/instructions", &result); err != nil {
		return nil, fmt.Errorf("listing instructions: %w", err)
	}
	return result, nil
}

// CreateInstruction creates a new instruction.
func (c *Client) CreateInstruction(req *CreateInstructionRequest) (*Instruction, error) {
	var result Instruction
	if err := c.PostJSON("/api/v1/knowledge/instructions", req, &result); err != nil {
		return nil, fmt.Errorf("creating instruction: %w", err)
	}
	return &result, nil
}

// UpdateInstruction updates an existing instruction.
func (c *Client) UpdateInstruction(id int, req *UpdateInstructionRequest) (*Instruction, error) {
	var result Instruction
	path := fmt.Sprintf("/api/v1/knowledge/instructions/%d", id)
	if err := c.PutJSON(path, req, &result); err != nil {
		return nil, fmt.Errorf("updating instruction: %w", err)
	}
	return &result, nil
}

// DeleteInstruction deletes an instruction by ID.
func (c *Client) DeleteInstruction(id int) error {
	path := fmt.Sprintf("/api/v1/knowledge/instructions/%d", id)
	if err := c.Delete(path); err != nil {
		return fmt.Errorf("deleting instruction: %w", err)
	}
	return nil
}

// --- SQL Pairs ---

// SqlPair represents a question-SQL pair in the knowledge base.
type SqlPair struct {
	ID        int    `json:"id"`
	ProjectID int    `json:"projectId,omitempty"`
	SQL       string `json:"sql"`
	Question  string `json:"question"`
	CreatedAt string `json:"createdAt,omitempty"`
	UpdatedAt string `json:"updatedAt,omitempty"`
}

// CreateSqlPairRequest is the request body for creating a SQL pair.
type CreateSqlPairRequest struct {
	SQL      string `json:"sql"`
	Question string `json:"question"`
}

// UpdateSqlPairRequest is the request body for updating a SQL pair.
type UpdateSqlPairRequest struct {
	SQL      string `json:"sql,omitempty"`
	Question string `json:"question,omitempty"`
}

// ListSqlPairs returns all SQL pairs for the current project.
func (c *Client) ListSqlPairs() ([]SqlPair, error) {
	var result []SqlPair
	if err := c.GetJSON("/api/v1/knowledge/sql_pairs", &result); err != nil {
		return nil, fmt.Errorf("listing SQL pairs: %w", err)
	}
	return result, nil
}

// CreateSqlPair creates a new SQL pair.
func (c *Client) CreateSqlPair(req *CreateSqlPairRequest) (*SqlPair, error) {
	var result SqlPair
	if err := c.PostJSON("/api/v1/knowledge/sql_pairs", req, &result); err != nil {
		return nil, fmt.Errorf("creating SQL pair: %w", err)
	}
	return &result, nil
}

// UpdateSqlPair updates an existing SQL pair.
func (c *Client) UpdateSqlPair(id int, req *UpdateSqlPairRequest) (*SqlPair, error) {
	var result SqlPair
	path := fmt.Sprintf("/api/v1/knowledge/sql_pairs/%d", id)
	if err := c.PutJSON(path, req, &result); err != nil {
		return nil, fmt.Errorf("updating SQL pair: %w", err)
	}
	return &result, nil
}

// DeleteSqlPair deletes a SQL pair by ID.
func (c *Client) DeleteSqlPair(id int) error {
	path := fmt.Sprintf("/api/v1/knowledge/sql_pairs/%d", id)
	if err := c.Delete(path); err != nil {
		return fmt.Errorf("deleting SQL pair: %w", err)
	}
	return nil
}
