package agent

import (
	"fmt"
	"os"
	"os/exec"
	"strings"
)

// nemoclawBinary returns the path to the nemoclaw CLI binary.
func nemoclawBinary() (string, error) {
	path, err := exec.LookPath("nemoclaw")
	if err != nil {
		return "", fmt.Errorf("nemoclaw CLI not found — install with: curl -fsSL https://www.nvidia.com/nemoclaw.sh | bash")
	}
	return path, nil
}

// NemoClawAvailable returns true if the nemoclaw CLI is installed.
func NemoClawAvailable() bool {
	_, err := nemoclawBinary()
	return err == nil
}

// RunNemoClaw executes a nemoclaw CLI command, streaming output to stdout/stderr.
func RunNemoClaw(args ...string) error {
	bin, err := nemoclawBinary()
	if err != nil {
		return err
	}

	cmd := exec.Command(bin, args...)
	cmd.Stdin = os.Stdin
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	return cmd.Run()
}

// RunNemoClawOutput executes a nemoclaw CLI command and returns its stdout.
func RunNemoClawOutput(args ...string) (string, error) {
	bin, err := nemoclawBinary()
	if err != nil {
		return "", err
	}

	out, err := exec.Command(bin, args...).Output()
	if err != nil {
		if exitErr, ok := err.(*exec.ExitError); ok {
			return "", fmt.Errorf("nemoclaw %s: %s", strings.Join(args, " "), string(exitErr.Stderr))
		}
		return "", err
	}
	return strings.TrimSpace(string(out)), nil
}
