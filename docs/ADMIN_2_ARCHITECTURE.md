# Savremeni Koreni — Admin 2.0

## Safety contract
- This branch is isolated from `main`.
- Admin 2.0 must never delete, rename, move, or overwrite existing media as a side effect of detaching it from content.
- Detach means removing a content reference only; the media asset remains in the Media Library.
- No IndexedDB/localStorage-only state is authoritative for published content.
- Publishing is separate from editing and must run validation + backup first.
- GitHub push must report the real commit SHA/URL; never claim a push that did not occur.

## Canonical model
Media assets are independent records. Products, gallery entries, landing pages and blog posts reference media IDs/paths.

## Phases
1. Read-only inventory and validation.
2. Product/media editing.
3. Gallery/landing/blog media editing.
4. Backup/restore and change history.
5. Validated publish to GitHub.
6. Optional integrations (email, ads, analytics).

## Current protected baseline
- 47 permanent products must remain unchanged during foundation work.
- Existing media files under `public/custom_products/` must not be altered by Admin 2.0 foundation work.
- Existing public site remains unchanged until Admin 2.0 passes read-only validation.
