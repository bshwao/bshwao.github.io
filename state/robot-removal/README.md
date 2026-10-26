# First-Floor Robot Removal — Verification

**Checkpoint:** October 26, 2026.

## Scope

Both About-floor robots were removed, including their controls, animation scheduler, geometry module, and dedicated tests. Robot-specific vertex-color handling was removed from batching and object feedback. The desk, chair, gallery furniture, and existing room interactions remain.

## Recorded results

| Artifact | Coverage |
| --- | --- |
| [check.txt](check.txt) | 178 source/server tests and 76 module/reference checks passed |
| [integration.txt](integration.txt) | All five DOM/camera integration modes passed |
| [webgl-desktop.json](webgl-desktop.json) | 31 views, zero idle frames, stable resources, and complete GPU disposal |
| [gallery.jpg](gallery.jpg), [study.jpg](study.jpg) | Production browser captures without robots or robot controls |
| [diff-check.txt](diff-check.txt) | Clean whitespace check |

Earlier robot directories are archived trial evidence. This report describes the October 26 implementation; see [QA.md](../../QA.md) for the full verification history.
