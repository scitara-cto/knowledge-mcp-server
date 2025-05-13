# Implementation Plan: Upgrading knowledge-mcp-server for the New dynamic-mcp-server

## Overview

This plan outlines the steps required to update `knowledge-mcp-server` to fully leverage the new features and architecture of the refactored `dynamic-mcp-server`. The goal is to:

- Use the shared MongoDB connection and user/tool management from the core
- Register custom HTTP routes on the exported server
- Align user and tool models with the new core
- Remove redundant or conflicting logic
- Ensure extensibility for project-specific needs (e.g., knowledge sources, Microsoft auth)

---

## 1. Remove Redundant Database Connection Logic

- [x] Delete or refactor `src/db/connection.ts` and any code that manages its own Mongoose/MongoDB connection.
- [x] Update all model and repository imports/usages to use the shared connection from `dynamic-mcp-server`.
- [x] If the core exports a native MongoDB client, refactor models to use it (or request a Mongoose instance if needed).

**Status:** Complete

---

## 2. Update User and Tool Models

- [x] Align the user model with the new core structure (`allowedTools`, `sharedTools`, etc.).
- [x] Extend the user model as needed for project-specific fields (e.g., `knowledgeSources`, `microsoftAuth`).
- [x] Ensure the user repository supports these extensions (subclass or wrap as needed).
- [x] Update tool models and repositories to use the new registration and sharing logic.

> **Note:** The project now uses the dms UserRepository for all user operations. App-specific logic is implemented in `AppUserRepository`.

**Status:** Complete

---

## 3. Refactor Tool Registration

- [x] Use `addTool` from the core for persistent tool registration.
- [x] Use `publishTool` for in-memory/session tools if needed.
- [x] Remove any custom tool registration logic that duplicates core functionality.

**Status:** Complete

---

## 4. Integrate with Exported HTTP Server

- [x] Remove the custom Express server startup in `src/http/httpServer.ts`.
- [x] Register all custom routes (OAuth, health, etc.) on the exported HTTP server using `addAuthHttpRoute` or the provided API.
- [x] Ensure no port conflicts or duplicate servers.

> **Note:** All custom routes are now registered on the dms HTTP server using `addAuthHttpRoute`, and the custom Express server has been removed.

**Status:** Complete

---

## 5. Update Environment and Admin Bootstrapping

- [x] Set the `MCP_ADMIN_EMAIL` environment variable for admin user bootstrapping.
- [x] Remove any custom admin creation logic.

> **Note:** MCP_ADMIN_EMAIL is now set in the .env file and admin bootstrapping is handled by dms.

**Status:** Complete

---

## 6. Update Authorization and Tool Sharing Logic

- [x] Refactor all access control to use `applicationAuthorization.knowledge.owned` and `shared` from the user record (instead of legacy fields).
- [x] Use the new sharing endpoints and models for tool sharing.
- [x] Remove or update any legacy sharing logic.

**Status:** Complete

---

## 7. Testing and Migration

- [x] Test all user, tool, and sharing flows using the new infrastructure.
- [x] Migrate any existing user/tool data to the new structure if needed (write migration scripts if necessary).
- [x] Add/Update tests to cover new flows and integration points.
- [x] All core and action handler tests pass; build is clean.

**Status:** Complete

---

## 8. Documentation and Developer Guidance

- [ ] Update the project README and developer docs to reflect the new architecture and extension points.
- [ ] Document how to extend the user model, add custom routes, and register tools in the new setup.

**Status:** In Progress

---

## Special Considerations

- **User Model Extension:**
  - If you need to add fields with Mongoose-level validation, check if the core schema is strict. If so, request `{ strict: false }` or a schema extension API.
- **Repository Pattern:**
  - Prefer subclassing or wrapping the core repositories for custom logic.
- **Testing:**
  - Use the mocking strategies and test patterns recommended in the core docs.

---

## Checklist

- [x] Remove redundant DB connection
- [x] Update models/repositories
- [x] Refactor tool registration
- [x] Integrate HTTP routes
- [x] Update environment/admin logic
- [x] Refactor authorization/sharing
- [x] Test and migrate data
- [ ] Update documentation

---

**Current Status:**

- All migration and refactor steps are complete except for documentation.
- All tests and build pass.
- The codebase is fully aligned with the new architecture and repository model.

**Next Steps:**

- [ ] Complete and polish documentation (README, developer docs, extension points).
- [ ] (Optional) Review for any remaining linter warnings or type suppressions and address as needed.
