# Admin 2.0 foundation

This directory is intentionally isolated from the existing AdminPanel.

The first implementation target is READ-ONLY inventory. It must expose:
- permanent products;
- repository media inventory;
- product image assignments;
- validation results.

Do not import or reuse the destructive persistence behaviour of AutoProjectPersister as the Admin 2.0 source of truth.
