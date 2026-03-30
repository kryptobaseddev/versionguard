---
"@codluv/versionguard": minor
---

feat: replace local CKM module with ckm-sdk package

Removes the handrolled `src/ckm/` module (engine, types, index) and replaces
it with the published `ckm-sdk@2026.3.1` package. The CKM engine is now backed
by a Rust core via NAPI-RS bindings, providing schema validation, v1→v2
migration, and progressive disclosure — all features the local module lacked.

The `vg ckm` CLI command works identically. The `CkmEngine` type is no longer
exported from the public API (the SDK engine is opaque).
