ALTER TABLE md_item
  DROP CONSTRAINT md_item_code_format_ck;

ALTER TABLE md_item
  ADD CONSTRAINT md_item_code_format_ck
  CHECK (item_code ~ '^[A-Z0-9_.-]{1,32}$');
