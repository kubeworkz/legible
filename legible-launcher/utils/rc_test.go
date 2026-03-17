package utils

import (
	"os"
	"testing"
)

func TestReadWriteRcFile(t *testing.T) {
	dir, err := os.MkdirTemp("", "legiblerc")
	if err != nil {
		t.Errorf("Error: %v", err)
	}
	defer func() { _ = os.RemoveAll(dir) }()

	// create a LegibleRC struct
	w := LegibleRC{dir}
	// write a key value pair to the rc file
	err = w.Set("key", "value", false)
	if err != nil {
		t.Errorf("Error: %v", err)
	}

	// read the value of the key from the rc file
	v, err := w.Read("key")
	if err != nil {
		t.Errorf("Error: %v", err)
	}
	if v != "value" {
		t.Errorf("Expected value: value, got: %s", v)
	}
}

// read the value of a non-existent key from the rc file
func TestSet(t *testing.T) {
	// create a temp directory
	dir, err := os.MkdirTemp("", "legiblerc")
	if err != nil {
		t.Errorf("Error: %v", err)
	}
	defer func() { _ = os.RemoveAll(dir) }()

	// create a LegibleRC struct
	w := LegibleRC{dir}
	// read the value of a non-existent key from the rc file
	v, err := w.Read("key")
	if err != nil {
		t.Errorf("Error: %v", err)
	}
	if v != "" {
		t.Errorf("Expected value: \"\", got: %s", v)
	}
}
