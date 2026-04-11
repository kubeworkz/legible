## Service

- `wren-engine`: the engine service. check out example here: [wren-engine
  /example](https://github.com/Canner/wren-engine/tree/main/example)
- `wren-ai-service`: the AI service.
- `qdrant`: the vector store ai service is using.
- `legible-ui`: the UI service.
- `bootstrap`: put required files to volume for engine service.

## Volume

Shared data using `data` volume.

Path structure as following:

- `/mdl`
  - `*.json` (will put `sample.json` during bootstrap)
- `accounts`
- `config.properties`

## Network

- Check out [Network drivers overview](https://docs.docker.com/engine/network/drivers/) to learn more about `bridge` network driver.

## How to start with OpenAI

1. copy `.env.example` to `.env` and modify the OpenAI API key.
2. copy `config.example.yaml` to `config.yaml` for AI service configuration.
3. start all services: `docker-compose --env-file .env up -d`.
4. stop all services: `docker-compose --env-file .env down`.

### Optional

- If your port 3000 is occupied, you can modify the `HOST_PORT` in `.env`.

## How to start with custom LLM

To start with a custom LLM, the process is similar to starting with OpenAI. The main difference is that you need to modify the `config.yaml` file
that we created on the previous step. After modifying the file, you can restart the services by running `docker-compose --env-file .env up -d --force-recreate wren-ai-service`.

For detailed information on how to modify the configuration for different LLM providers and models, please refer to the [AI Service Configuration](../wren-ai-service/docs/configuration.md).
This guide provides comprehensive instructions on setting up various LLM providers, embedders, and other components of the AI service.

## How to enable the DB2 for i MCP server

The `mcp-server-db2i` service provides AI agents with direct read-only access to IBM DB2 for i databases.

1. Uncomment the `mcp-server-db2i` service block in `docker-compose.yaml`.
2. Set the required environment variables in your `.env` file:

   ```bash
   # Required
   DB2I_HOSTNAME=your-ibm-i-host.com
   DB2I_USERNAME=your-username
   DB2I_PASSWORD=your-password

   # Optional
   DB2I_SCHEMA=your-default-schema
   DB2I_PORT=446
   DB2I_DATABASE=*LOCAL
   DB2I_MCP_PORT=9002
   DB2I_MCP_AUTH_MODE=token
   DB2I_MCP_AUTH_TOKEN=<generate with: openssl rand -hex 32>
   ```

3. Start the service: `docker-compose --env-file .env up -d mcp-server-db2i`.

The server exposes an HTTP MCP endpoint at `http://localhost:9002/mcp`. It only allows read-only SELECT queries. See the [mcp-server-db2i documentation](https://github.com/Strom-Capital/mcp-server-db2i) for full configuration options.
