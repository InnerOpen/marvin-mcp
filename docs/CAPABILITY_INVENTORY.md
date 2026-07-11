# SDK Capability Inventory

This inventory is based on `@inneropen/marvin-sdk@2.0.0-next.17`.

The SDK has two relevant public entry points:

- `@inneropen/marvin-sdk/publish`: read-only publishing client using `MARVIN_SITE_CLIENT_TOKEN`.
- `@inneropen/marvin-sdk/platform`: authenticated platform client using user token/session credentials.

The first MCP release uses the publishing client only. Platform capabilities are documented and intentionally not exposed until write authentication, permission-aware discovery, and mutation safety are designed.

| SDK Module              | Purpose                                                      | Auth               | Read/Write | MCP Mapping                                         | First Release      |
| ----------------------- | ------------------------------------------------------------ | ------------------ | ---------- | --------------------------------------------------- | ------------------ |
| Publishing Workspace    | Workspace identity and public site settings                  | Site token         | Read       | Workspace resources and inspection tool             | Yes                |
| Publishing Entries      | Published entry list/get                                     | Site token         | Read       | Entry list/find tools and `marvin://entries/{slug}` | Yes                |
| Publishing Collections  | Published collection list/get and entries                    | Site token         | Read       | Collection tools and resources                      | Yes                |
| Publishing Assets       | Published asset metadata                                     | Site token         | Read       | Asset review tools                                  | Yes, list metadata |
| Publishing Resources    | Reusable resources                                           | Site token         | Read       | Resource tools and resources                        | Yes                |
| Platform Entries        | Entry CRUD and collection membership by ID                   | User token/session | Read/write | Future editor tools                                 | No                 |
| Platform Entry Types    | Schema management                                            | User token/session | Read/write | Future schema resources/admin tools                 | No                 |
| Platform Collections    | Collection CRUD and reorder                                  | User token/session | Read/write | Future editor tools                                 | No                 |
| Platform Assets         | Asset upload/update/delete                                   | User token/session | Read/write | Future media tools                                  | No                 |
| Platform Resources      | Resource CRUD                                                | User token/session | Read/write | Future resource tools                               | No                 |
| Platform Forms          | Form CRUD and submission handling                            | Mixed              | Read/write | Future forms tools/resources                        | No                 |
| Platform Administration | Users, API clients, workspaces, webhooks, maintenance, tasks | User token/session | Read/write | Future admin capabilities                           | No                 |

## Architecture Review

The server is organized around Marvin capabilities, not REST endpoints. Each capability owns its tool, resource, and prompt registration under `src/capabilities/*`.

Current runtime flow:

```text
MCP client
    ↓ stdio
server.ts
    ↓ registerCapabilities()
capabilities/*
    ↓ MarvinClientLike
@inneropen/marvin-sdk/publish
    ↓ HTTPS
Marvin API
```

This keeps Streamable HTTP transport separate from capability registration and leaves room for future platform-authenticated capabilities, permission-aware filtering, actions, skills, agents, and workspace memory.
