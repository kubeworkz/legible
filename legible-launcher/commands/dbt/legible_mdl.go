package dbt

// LegibleMDLManifest represents the complete Legible MDL structure
type LegibleMDLManifest struct {
	JsonSchema      string           `json:"$schema"`
	Catalog         string           `json:"catalog"`
	Schema          string           `json:"schema"`
	EnumDefinitions []EnumDefinition `json:"enumDefinitions,omitempty"`
	Models          []LegibleModel      `json:"models"`
	Relationships   []Relationship   `json:"relationships"`
	Metrics         []Metric         `json:"metrics,omitempty"`
	Views           []View           `json:"views"`
	DataSource      string           `json:"dataSource,omitempty"`
}

// EnumDefinition represents a named list of values that can be used by columns.
type EnumDefinition struct {
	Name   string      `json:"name"`
	Values []EnumValue `json:"values"`
}

type EnumValue struct {
	Name  string `json:"name"`
	Value string `json:"value,omitempty"`
}

// LegibleModel represents a model in the Legible MDL format
type LegibleModel struct {
	Name           string            `json:"name"`
	TableReference TableReference    `json:"tableReference"`
	Columns        []LegibleColumn      `json:"columns"`
	PrimaryKey     string            `json:"primaryKey,omitempty"`
	Cached         bool              `json:"cached,omitempty"`
	RefreshTime    string            `json:"refreshTime,omitempty"`
	Properties     map[string]string `json:"properties,omitempty"`
}

// TableReference represents a reference to a table
type TableReference struct {
	Catalog string `json:"catalog,omitempty"`
	Schema  string `json:"schema,omitempty"`
	Table   string `json:"table"`
}

// LegibleColumn represents a column in the Legible MDL format
type LegibleColumn struct {
	Name         string            `json:"name"`
	DisplayName  string            `json:"displayName,omitempty"`
	Type         string            `json:"type"`
	Relationship string            `json:"relationship,omitempty"`
	IsCalculated bool              `json:"isCalculated,omitempty"`
	NotNull      bool              `json:"notNull,omitempty"`
	Expression   *string           `json:"expression,omitempty"`
	Properties   map[string]string `json:"properties,omitempty"`
}

// Relationship represents a relationship between models
type Relationship struct {
	Name       string            `json:"name"`
	Models     []string          `json:"models"`
	JoinType   string            `json:"joinType"`
	Condition  string            `json:"condition"`
	Properties map[string]string `json:"properties,omitempty"`
}

// Metric defines a business-level calculation in Legible MDL.
type Metric struct {
	Name        string   `json:"name"`
	Models      []string `json:"models"`
	Dimensions  []string `json:"dimensions"`
	Aggregation string   `json:"aggregation"`
	DisplayName string   `json:"displayName"`
	Description string   `json:"description,omitempty"`
}

// View represents a view in the Legible MDL format
type View struct {
	Name       string            `json:"name"`
	Statement  string            `json:"statement"`
	Properties map[string]string `json:"properties,omitempty"`
}
