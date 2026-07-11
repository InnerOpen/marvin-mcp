# Marvin MCP

Official Model Context Protocol server for Marvin CMS.

`marvin-mcp` is the LLM-facing adapter for Marvin. It talks directly to `@inneropen/marvin-sdk`; it does not shell out to `marvin-cli` and it does not recreate Marvin API behavior.

```text
MCP Client
    ↓ stdio
marvin-mcp
    ↓
@inneropen/marvin-sdk
    ↓ HTTPS
Marvin API
```

## Project Relationship

```text
marvin-cli ──┐
             ├──> marvin-sdk ──> Marvin API
marvin-mcp ──┘
```

`marvin-cli` is for humans and shells. `marvin-mcp` is for MCP-compatible AI clients. `marvin-sdk` remains the canonical programmatic Marvin client.

## Installation

After publication:

```bash
npx -y @inneropen/marvin-mcp
```

For local development:

```bash
npm install
npm run dev
```

## Configuration

Required:

```text
MARVIN_API_URL
MARVIN_SITE_CLIENT_TOKEN
MARVIN_WORKSPACE_SLUG
```

Optional:

```text
MARVIN_MCP_LOG_LEVEL=silent|error|warn|info|debug
MARVIN_MCP_READ_ONLY=true|false
```

Default: `MARVIN_MCP_READ_ONLY` is `true`. Current SDK-backed mutation tools are not implemented, so write tools are absent either way in this first release.

Logs go to stderr. Tokens are never printed intentionally and are redacted from structured logs/errors.

## Tools

Self-description:

| Tool                           | Purpose                                                     |
| ------------------------------ | ----------------------------------------------------------- |
| `marvin_describe_capabilities` | Describe Marvin MCP capabilities and SDK capability support |

Read tools:

| Tool                            | Purpose                                                        |
| ------------------------------- | -------------------------------------------------------------- |
| `marvin_get_workspace`          | Get workspace info and site settings                           |
| `marvin_list_entries`           | List entries with `entryType`, `collection`, `limit`, `offset` |
| `marvin_get_entry`              | Get one entry by slug                                          |
| `marvin_list_collections`       | List collections                                               |
| `marvin_get_collection`         | Get one collection by slug                                     |
| `marvin_get_collection_entries` | Get entries in a collection                                    |
| `marvin_list_assets`            | List asset metadata                                            |
| `marvin_list_resources`         | List reusable resources                                        |
| `marvin_get_resource`           | Get one resource by slug                                       |

No destructive or generic API proxy tools are exposed.

## Resources

| URI                           | Purpose                                  |
| ----------------------------- | ---------------------------------------- |
| `marvin://capabilities`       | Capability and SDK inventory             |
| `marvin://workspace`          | Workspace info                           |
| `marvin://workspace/site`     | Public site settings                     |
| `marvin://entry-types`        | Entry types inferred from listed entries |
| `marvin://collections`        | Collection summaries                     |
| `marvin://resources`          | Resource summaries                       |
| `marvin://entries/{slug}`     | Entry details                            |
| `marvin://collections/{slug}` | Collection details                       |
| `marvin://resources/{slug}`   | Resource details                         |

## Prompts

| Prompt                       | Purpose                                                      |
| ---------------------------- | ------------------------------------------------------------ |
| `review_workspace_structure` | Inspect structure and recommend non-destructive improvements |
| `create_site_page`           | Guide drafting a page without automatic publishing           |
| `prepare_release_update`     | Draft a release/update content item                          |
| `audit_content_model`        | Audit entries, collections, resources, and site settings     |
| `review_collections`         | Review collection organization                               |
| `review_assets`              | Review asset metadata quality                                |
| `review_resources`           | Review reusable resources                                    |

## Capabilities

Marvin MCP is organized by Marvin capability under `src/capabilities/*`. Each capability owns its tools, resources, and prompts.

| Capability  | MCP Surface                                                             |
| ----------- | ----------------------------------------------------------------------- |
| Workspace   | `marvin_get_workspace`, `marvin://workspace`, `marvin://workspace/site` |
| Entries     | `marvin_list_entries`, `marvin_get_entry`, `marvin://entries/{slug}`    |
| Entry Types | `marvin://entry-types`, `audit_content_model`                           |
| Collections | collection tools, `marvin://collections`, `marvin://collections/{slug}` |
| Assets      | `marvin_list_assets`, `review_assets`                                   |
| Resources   | resource tools, `marvin://resources`, `marvin://resources/{slug}`       |
| Capability  | `marvin_describe_capabilities`, `marvin://capabilities`                 |

The SDK capability inventory and architecture review are documented in [docs/CAPABILITY_INVENTORY.md](docs/CAPABILITY_INVENTORY.md).

## Client Examples

Generic stdio MCP client:

```json
{
  "mcpServers": {
    "marvin": {
      "command": "npx",
      "args": ["-y", "@inneropen/marvin-mcp"],
      "env": {
        "MARVIN_API_URL": "https://marvin.example.com",
        "MARVIN_SITE_CLIENT_TOKEN": "${MARVIN_SITE_CLIENT_TOKEN}",
        "MARVIN_WORKSPACE_SLUG": "example-workspace",
        "MARVIN_MCP_READ_ONLY": "true"
      }
    }
  }
}
```

Claude Code and other clients use the same command/env shape, though exact config file locations differ by client.

## Development

```bash
npm run dev
npm run build
npm run typecheck
npm run lint
npm test
```

MCP Inspector:

```bash
npm run inspect
```

Integration tests are opt-in and read-only:

```bash
MARVIN_MCP_INTEGRATION_TESTS=true npm test
```

They also require `MARVIN_API_URL`, `MARVIN_SITE_CLIENT_TOKEN`, and `MARVIN_WORKSPACE_SLUG`.

## Capability Matrix

| Capability                         | SDK support                                                                        | Authentication     | MCP mapping                         | Read/write | Implemented | Limitations                                                                                                                                            |
| ---------------------------------- | ---------------------------------------------------------------------------------- | ------------------ | ----------------------------------- | ---------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Workspace info/site settings       | `@inneropen/marvin-sdk/publish` `getWorkspaceInfo()`, `getSite()`                  | Site token         | Tool and resources                  | Read       | Yes         | API credentials enforce access                                                                                                                         |
| List/get entries                   | Publishing `getEntries()`, `getEntry(slug)`                                        | Site token         | Tools and `marvin://entries/{slug}` | Read       | Yes         | SDK source does not send `status`; backend returns published entries. In `2.0.0-next.17`, missing entries return `null` and are reported as not found. |
| Collections                        | Publishing `getCollections()`, `getCollection(slug)`, `getCollectionEntries(slug)` | Site token         | Tools and resources                 | Read       | Yes         | Missing collections return `null`; collection entries depend on collection detail payload.                                                             |
| Assets                             | Publishing `getAssets(options)`                                                    | Site token         | `marvin_list_assets`                | Read       | Yes         | Metadata only; no binary payloads                                                                                                                      |
| Resources                          | Publishing `getResources()`, `getResource(slug)`                                   | Site token         | Tools and resources                 | Read       | Yes         | Resource entries method exists but is not a first-release tool                                                                                         |
| Entry types                        | Platform SDK has `entryTypes`; publishing SDK has no list method                   | Platform user auth | `marvin://entry-types`              | Read       | Partial     | Inferred from entries in first release                                                                                                                 |
| Platform entries/assets/forms/etc. | `@inneropen/marvin-sdk/platform` modules expose CRUD                               | User token/session | Future editor capabilities          | Read/write | No          | Requires auth, permission-aware registration, and mutation safety design                                                                               |
| Administration                     | Platform admin/user/workspace/API client/webhook/task modules                      | User token/session | Future admin capabilities           | Read/write | No          | High-impact/destructive and secret-adjacent operations are intentionally excluded                                                                      |

## SDK Capability Gaps

Current `@inneropen/marvin-sdk` `2.0.0-next.17` publishing client is read-focused. The installed declarations expose no create, update, add-to-collection, or publish entry methods, so this MCP server does not implement write tools and does not bypass the SDK with direct `fetch()` calls.

This prerelease returns `null` for missing entries and collections. The MCP server translates those results into structured not-found errors.

The SDK does not expose permission metadata for permission-aware discovery. First release behavior relies on `MARVIN_MCP_READ_ONLY` and Marvin API authorization failures.

## Security

Security decisions:

- Read-only mode defaults to `true`.
- No arbitrary HTTP request, shell, SQL, migration, plugin, or secret-management tools.
- No generic `marvin_api_request`.
- Inputs are validated with Zod.
- Outputs are normalized into JSON-safe structures.
- Asset storage internals and tokens are not exposed.
- Prompts never instruct automatic publishing.
- Final authorization is enforced by Marvin API credentials.

## Planned Streamable HTTP

The first transport is stdio. Server creation, capability registration, and transport connection are separated so Streamable HTTP can be added later without rewriting the tool/resource/prompt layer.
