DROP INDEX `chapters_sibling_order_idx`;--> statement-breakpoint
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY document_id, coalesce(parent_id, '')
      ORDER BY order_index, created_at, id
    ) - 1 AS normalized_order
  FROM chapters
)
UPDATE chapters
SET order_index = (
  SELECT normalized_order FROM ranked WHERE ranked.id = chapters.id
);--> statement-breakpoint
ALTER TABLE `chapters` ADD `parent_key` text GENERATED ALWAYS AS (coalesce(parent_id, '')) VIRTUAL;--> statement-breakpoint
CREATE UNIQUE INDEX `chapters_sibling_order_idx` ON `chapters` (`document_id`,`parent_key`,`order_index`);
