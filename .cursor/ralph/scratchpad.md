---
iteration: 1
max_iterations: 0
completion_promise: null
---

Implement the full HORNET deep cleanup plan in batches. Current state:
- Branch: codex/codebase-systematization
- 91 tests passing, 86 JS files syntax-clean
- Phase 1 + Phase 2 complete

Work through approved batches in order. After each batch verify tests pass.

Batch 1 (P0+P1 bug fixes):
- P0-2: Fix editArtButtonHandler intercepting card button IDs
- P1-2: Fix logger.js propagating errors and aborting successful operations  
- P1-3: Add deferReply to deleteart.js before DB query
- P1-4: Remove TEST_GUILD_ID / MAIN_GUILD_ID from diagnostics env check
- P1-5: Remove dead local-file deletion in deletecard.js
- P1-6: Fix refreshgallery.js leaking err.message to users

Batch 2 (P2 dead code + consistency):
- P0-1: Move clan.js image URL to settings.js with expiry warning comment
- P2-1: Fix about.js to use package.json version, delete config/version.js
- P2-2: Delete unused config/characters.js
- P2-3: Remove dead settings import from database/mongo.js
- P2-4: Move inline require() calls to top-level in addlink.js, links.js
- P2-5: Add URL validation in addlink.js
- P2-6: Extract dangerousPermissions to shared constant

Batch 3 (P3 indexes + Map cleanup):
- P3-1: Add missing MongoDB indexes to Card, Art, Link schemas
- P3-2: Add lazy TTL prune to autoReplyCooldown.js
- P1-1: Add gallery/categoryMenu Map cleanup (TTL prune + close() calls)

After each batch: run tests and syntax check, report results.
