package agent

import (
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

// openshellBinary returns the path to the openshell CLI binary.
func openshellBinary() (string, error) {
	path, err := exec.LookPath("openshell")
	if err != nil {
		return "", fmt.Errorf("openshell CLI not found — install with: curl -LsSf https://raw.githubusercontent.com/NVIDIA/OpenShell/main/install.sh | sh")
	}
	return path, nil
}

// RunOpenshell executes an openshell CLI command, streaming output to stdout/stderr.
func RunOpenshell(args ...string) error {
	bin, err := openshellBinary()
	if err != nil {
		return err
	}

	cmd := exec.Command(bin, args...)
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

// RunOpenshellOutput executes an openshell CLI command and returns its stdout.
func RunOpenshellOutput(args ...string) (string, error) {
	bin, err := openshellBinary()
	if err != nil {
		return "", err
	}

	out, err := exec.Command(bin, args...).Output()
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			return "", fmt.Errorf("openshell %s: %s", strings.Join(args, " "), string(exitErr.Stderr))
		}
		return "", err
	}
	return strings.TrimSpace(string(out)), nil
}

// PolicyDir returns the path to the openshell config directory bundled with the CLI.
// It looks relative to the executable first, then falls back to well-known locations.
func PolicyDir() (string, error) {
	// 1. Check relative to the running binary
	exePath, err := os.Executable()
	if err == nil {
		dir := filepath.Join(filepath.Dir(exePath), "..", "openshell")
		if _, err := os.Stat(filepath.Join(dir, "policy.yaml")); err == nil {
			return dir, nil
		}
	}

	// 2. Check ~/.legible/openshell/
	home, err := os.UserHomeDir()
	if err == nil {
		dir := filepath.Join(home, ".legible", "openshell")
		if _, err := os.Stat(filepath.Join(dir, "policy.yaml")); err == nil {
			return dir, nil
		}
	}

	// 3. Check current working directory
	cwd, err := os.Getwd()
	if err == nil {
		dir := filepath.Join(cwd, "openshell")
		if _, err := os.Stat(filepath.Join(dir, "policy.yaml")); err == nil {
			return dir, nil
		}
	}

	return "", fmt.Errorf("openshell config directory not found (expected policy.yaml in openshell/ directory)")
}

// EnsureGateway checks if the openshell gateway is running and starts it if not.
// This is a local-only check; for org-scoped gateway management, see cmd/agent.go.
func EnsureGateway() error {
	// Check if gateway is already running by listing sandboxes (fast no-op if up)
	_, err := RunOpenshellOutput("sandbox", "list")
	if err == nil {
		return nil
	}

	// Gateway not running — the openshell CLI auto-creates it on first sandbox create
	return nil
}
