# Legible Agent Sandbox
#
# Custom sandbox image for Legible agents running inside OpenShell.
# Includes the Legible CLI, MCP client tools, and pre-configured
# connection to the Legible MCP server.
#
# Build:  openshell sandbox create --from ./legible-cli/openshell -- claude
# Or:     docker build -t legible-sandbox:local legible-cli/openshell/

FROM ubuntu:24.04

ARG LEGIBLE_CLI_VERSION=latest
ARG TARGETARCH

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    git \
    jq \
    python3 \
    python3-pip \
    nodejs \
    npm \
    vim \
    nano \
    && rm -rf /var/lib/apt/lists/*

# Install the Legible CLI
COPY build/legible-linux-${TARGETARCH:-amd64} /usr/local/bin/legible
RUN chmod +x /usr/local/bin/legible

# Create sandbox user and workspace
RUN useradd -m -s /bin/bash sandbox
WORKDIR /home/sandbox

# Pre-configure MCP client connection
# The actual endpoint and credentials are injected by the OpenShell provider at runtime
RUN mkdir -p /home/sandbox/.legible
COPY sandbox-mcp-config.json /home/sandbox/.legible/mcp-config.json

# Copy the default policy for reference
COPY policy.yaml /home/sandbox/.legible/policy.yaml

# Set up entrypoint that configures legible CLI from provider env vars
COPY sandbox-entrypoint.sh /usr/local/bin/sandbox-entrypoint.sh
RUN chmod +x /usr/local/bin/sandbox-entrypoint.sh

RUN chown -R sandbox:sandbox /home/sandbox
USER sandbox

ENTRYPOINT ["/usr/local/bin/sandbox-entrypoint.sh"]
CMD ["/bin/bash"]
