---
id: docs-workflow
title: Documentation Update Rules
sidebar_position: 5
---

When code and documentation diverge, **fixing the documentation is part of the same change**.

## Changes That Require a Docs Update

| Change                                       | Docs to update                                                                                      |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Helper methods, events, error codes          | [Helper Protocol](../architecture/helper-protocol.md)                                               |
| Edge detection, dwell, palette lifetime      | [Edge Detection](../architecture/edge-detection.md)                                                 |
| Selection rules                              | [Grid Selection Model](../architecture/grid-selection.md), [Edge Snap Guide](../guide/edge-snap.md) |
| Layout schema, capture filter, restore order | [Layout Capture and Restore](../architecture/layout-restore.md), [Guide](../guide/layouts.md)       |
| Coordinate calculation                       | [Coordinate Systems](../architecture/coordinates.md)                                                |
| Settings items                               | The settings table in the user guide                                                                |
| Folder structure, adding packages            | [Monorepo Structure](monorepo.md)                                                                   |
| Lint and coding rules                        | [Coding Standards](coding-standards.md)                                                             |
| Architecture-level decisions                 | A new ADR                                                                                           |
| Documentation content                        | English translation: the same file under `docs/i18n/en/docusaurus-plugin-content-docs/current/`     |

## Writing ADRs

- File name `adr-NNN-short-title.md`; numbers increase sequentially.
- Sections: Status, Date, Context, Decision, Consequences
- When a decision overturns an earlier one, change the earlier ADR's status to "Superseded (ADR-NNN)".

## Links

- Link between documents with relative `.md` paths. A broken link fails the build.
- When code comments point to a document, use the `docs/docs/...` path.
- The root `AGENTS.md` is the entry point to the core documents. When you add a core document, update its table too.

## Verifying the Build

```bash
pnpm build:docs
```
