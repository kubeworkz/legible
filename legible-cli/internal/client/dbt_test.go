package client

import "testing"

func TestParseConditionColumns(t *testing.T) {
	tests := []struct {
		name      string
		condition string
		wantFrom  string
		wantTo    string
		wantErr   bool
	}{
		{
			"standard condition",
			`"orders"."customer_id" = "customers"."id"`,
			"customer_id", "id", false,
		},
		{
			"extra whitespace",
			`"orders"."order_id"   =   "lineitems"."order_id"`,
			"order_id", "order_id", false,
		},
		{
			"no spaces around equals",
			`"a"."col1"="b"."col2"`,
			"col1", "col2", false,
		},
		{
			"underscored names",
			`"my_model"."my_col_1" = "other_model"."other_col_2"`,
			"my_col_1", "other_col_2", false,
		},
		{
			"empty string",
			"",
			"", "", true,
		},
		{
			"garbage",
			"not a condition",
			"", "", true,
		},
		{
			"missing quotes",
			"orders.customer_id = customers.id",
			"", "", true,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			from, to, err := ParseConditionColumns(tt.condition)
			if (err != nil) != tt.wantErr {
				t.Fatalf("ParseConditionColumns(%q) error = %v, wantErr %v", tt.condition, err, tt.wantErr)
			}
			if err != nil {
				return
			}
			if from != tt.wantFrom {
				t.Errorf("from = %q, want %q", from, tt.wantFrom)
			}
			if to != tt.wantTo {
				t.Errorf("to = %q, want %q", to, tt.wantTo)
			}
		})
	}
}

func TestFindFieldByName(t *testing.T) {
	fields := []Field{
		{ID: 1, ReferenceName: "customer_id", SourceColumnName: "cust_id"},
		{ID: 2, ReferenceName: "order_date", SourceColumnName: "ord_date"},
		{ID: 3, ReferenceName: "amount", SourceColumnName: "amount"},
	}

	tests := []struct {
		name   string
		lookup string
		wantID int
		wantOK bool
	}{
		{"match by ReferenceName", "customer_id", 1, true},
		{"match by SourceColumnName", "cust_id", 1, true},
		{"match exact ReferenceName", "order_date", 2, true},
		{"match exact SourceColumnName", "ord_date", 2, true},
		{"match when both equal", "amount", 3, true},
		{"not found", "nonexistent", 0, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			f := findFieldByName(fields, tt.lookup)
			if tt.wantOK {
				if f == nil {
					t.Fatal("expected field, got nil")
				}
				if f.ID != tt.wantID {
					t.Errorf("ID = %d, want %d", f.ID, tt.wantID)
				}
			} else {
				if f != nil {
					t.Errorf("expected nil, got field with ID %d", f.ID)
				}
			}
		})
	}
}
