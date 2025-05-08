# Implementation Plan: Knowledge MCP Server (OneDrive Only)

This document outlines the step-by-step plan to migrate the codebase from embedJs to a Microsoft OneDrive, officeParser, and MongoDB-based pipeline, as described in the updated specification.

## Phase 1: Clean Slate & Tool/Handler Scaffolding

**Status:** ✅ Complete

- All embedJs and website code removed.
- OneDrive-only tool definitions and action handler scaffolding in place.
- Codebase builds and tests run (failures expected for unimplemented stubs).

---

## Phase 2a: Express Server Setup

**Status:** ✅ Complete

- HTTP server logic modularized and uses KNOWLEDGE_HTTP_PORT.
- /health endpoint and OneDrive OAuth router mounted.
- Main entrypoint starts both MCP and HTTP servers in one process.

---

## Phase 2b: Microsoft Graph/OneDrive Authentication Flow

**Status:** ✅ Complete

- Microsoft Graph OAuth utilities implemented (msAuth.ts).
- User model and repository updated to support microsoftAuth tokens.
- Express routes for /onedrive/oauth/start and /onedrive/oauth/callback implemented and type-safe.
- End-to-end OAuth flow ready for testing.

---

## Phase 3: Basic OneDrive Tools & File Text Extraction

**Status:** ✅ Complete

- OAuth flow works end-to-end.
- File search and retrieval are functional and user-friendly.
- Text extraction from Office, PDF, and plain text files is implemented and tested.
- Tool responses are user-friendly and consistent.

---

## Phase 4: Vector Database & Knowledge Source Management

**Status:** ⏳ In Progress

- Implement knowledge source creation: enumerate files, extract text, chunk, embed, and store in MongoDB. ✅
- Implement listing of knowledge sources with filtering and pagination. ✅
- Implement deletion of knowledge sources and all associated embeddings. ✅
- Implement search over vector database: query MongoDB for vectors by knowledge source ID and similarity, with support for pagination (limit/skip), minimum similarity score (minScore), total count, and nextSteps guidance. ✅
- Implement refresh, share, and other advanced actions as per the spec. ⏳

---

## Summary Table (Updated)

| Phase | Focus                             | Key Actions                                                                                                               | Status         |
| ----- | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | -------------- |
| 1     | Clean Slate & Scaffolding         | Remove embedJs code, add new tool/action handler scaffolding                                                              | ✅ Done        |
| 2a    | Express Server Setup              | Add Express server, health check, mount OAuth router                                                                      | ✅ Done        |
| 2b    | Auth Flow                         | Implement Graph auth, token storage, callback, and validation                                                             | ✅ Done        |
| 3     | Basic OneDrive Tools & Extraction | Implement and test file search/retrieve tools, text extraction                                                            | ✅ Done        |
| 4     | Vector DB & Knowledge Sources     | Add knowledge source creation, listing, deletion, search (with pagination/minScore), refresh, share, and advanced actions | ⏳ In Progress |

---

This plan should be followed sequentially to ensure a smooth migration and implementation of the new OneDrive-only Knowledge MCP Server.

---

**Next Step:**

The next major features to implement are refresh, share, and other advanced actions as per the specification. The search functionality (including pagination, minScore, total count, and nextSteps) is now complete and fully functional.
