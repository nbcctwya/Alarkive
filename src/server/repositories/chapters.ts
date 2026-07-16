import { randomUUID } from "node:crypto";
import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/server/db";
import { chapters, documents } from "@/server/db/schema";
import type { ChapterContent, ChapterNode } from "@/types/chapters";

export interface ChapterRecord extends ChapterContent {
  documentId: string;
  parentId: string | null;
  orderIndex: number;
  createdAt: string;
}

function toRecord(row: typeof chapters.$inferSelect): ChapterRecord {
  return {
    id: row.id,
    documentId: row.documentId,
    parentId: row.parentId,
    title: row.title,
    content: row.content,
    scratchpad: row.scratchpad,
    orderIndex: row.orderIndex,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function listChapterRecords(documentId: string): ChapterRecord[] {
  return db
    .select()
    .from(chapters)
    .where(eq(chapters.documentId, documentId))
    .orderBy(asc(chapters.orderIndex), asc(chapters.createdAt))
    .all()
    .map(toRecord);
}

export function listChaptersByDocument(documentId: string): ChapterNode[] {
  const rows = listChapterRecords(documentId);
  const nodes = new Map<string, ChapterNode>(
    rows.map((row) => [
      row.id,
      {
        id: row.id,
        documentId: row.documentId,
        parentId: row.parentId,
        title: row.title,
        orderIndex: row.orderIndex,
        children: [],
      },
    ]),
  );
  const roots: ChapterNode[] = [];
  for (const row of rows) {
    const node = nodes.get(row.id)!;
    const parent = row.parentId ? nodes.get(row.parentId) : null;
    if (parent) parent.children.push(node);
    else roots.push(node);
  }
  const sort = (items: ChapterNode[]) => {
    items.sort((a, b) => a.orderIndex - b.orderIndex);
    items.forEach((item) => sort(item.children));
  };
  sort(roots);
  return roots;
}

export function getChapterById(id: string): ChapterRecord | null {
  const row = db.select().from(chapters).where(eq(chapters.id, id)).get();
  return row ? toRecord(row) : null;
}

export function createChapter(input: {
  documentId: string;
  parentId?: string | null;
  title: string;
  content?: string;
  scratchpad?: string;
}): ChapterRecord {
  const document = db
    .select({ id: documents.id })
    .from(documents)
    .where(eq(documents.id, input.documentId))
    .get();
  if (!document) throw new Error("文档不存在");
  if (input.parentId) {
    const parent = getChapterById(input.parentId);
    if (!parent || parent.documentId !== input.documentId)
      throw new Error("父章节不存在");
  }
  const now = new Date().toISOString();
  const id = randomUUID();
  db.transaction((tx) => {
    const siblingCondition = input.parentId
      ? and(
          eq(chapters.documentId, input.documentId),
          eq(chapters.parentId, input.parentId),
        )
      : and(
          eq(chapters.documentId, input.documentId),
          isNull(chapters.parentId),
        );
    const siblings = tx
      .select({ id: chapters.id })
      .from(chapters)
      .where(siblingCondition)
      .orderBy(asc(chapters.orderIndex), asc(chapters.createdAt))
      .all();
    // Normalize in two passes so a stale/gapped order cannot collide with the
    // unique sibling index while moving rows into contiguous positions.
    siblings.forEach((sibling, index) =>
      tx
        .update(chapters)
        .set({ orderIndex: -(index + 1) })
        .where(eq(chapters.id, sibling.id))
        .run(),
    );
    siblings.forEach((sibling, orderIndex) =>
      tx
        .update(chapters)
        .set({ orderIndex })
        .where(eq(chapters.id, sibling.id))
        .run(),
    );
    tx.insert(chapters)
      .values({
        id,
        documentId: input.documentId,
        parentId: input.parentId ?? null,
        title: input.title.trim() || "未命名章节",
        content: input.content ?? "",
        scratchpad: input.scratchpad ?? "",
        orderIndex: siblings.length,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    tx.update(documents)
      .set({ updatedAt: now })
      .where(eq(documents.id, input.documentId))
      .run();
  });
  return getChapterById(id)!;
}

export function updateChapter(
  id: string,
  input: Partial<Pick<ChapterRecord, "title" | "content" | "scratchpad">>,
): ChapterRecord | null {
  const current = getChapterById(id);
  if (!current) return null;
  const now = new Date().toISOString();
  const values: Partial<typeof chapters.$inferInsert> = { updatedAt: now };
  if (input.title !== undefined)
    values.title = input.title.trim() || "未命名章节";
  if (input.content !== undefined) values.content = input.content;
  if (input.scratchpad !== undefined) values.scratchpad = input.scratchpad;
  db.transaction((tx) => {
    tx.update(chapters).set(values).where(eq(chapters.id, id)).run();
    tx.update(documents)
      .set({ updatedAt: now })
      .where(eq(documents.id, current.documentId))
      .run();
  });
  return getChapterById(id);
}

export function deleteChapter(id: string): boolean {
  const current = getChapterById(id);
  if (!current) return false;
  db.transaction((tx) => {
    tx.delete(chapters).where(eq(chapters.id, id)).run();
    const siblings = tx
      .select({ id: chapters.id })
      .from(chapters)
      .where(
        current.parentId
          ? and(
              eq(chapters.documentId, current.documentId),
              eq(chapters.parentId, current.parentId),
            )
          : and(
              eq(chapters.documentId, current.documentId),
              isNull(chapters.parentId),
            ),
      )
      .orderBy(asc(chapters.orderIndex))
      .all();
    siblings.forEach((sibling, orderIndex) =>
      tx
        .update(chapters)
        .set({ orderIndex })
        .where(eq(chapters.id, sibling.id))
        .run(),
    );
    tx.update(documents)
      .set({ updatedAt: new Date().toISOString() })
      .where(eq(documents.id, current.documentId))
      .run();
  });
  return true;
}

export function reorderChapter(id: string, direction: -1 | 1): boolean {
  const current = getChapterById(id);
  if (!current) return false;
  const siblings = db
    .select()
    .from(chapters)
    .where(
      current.parentId
        ? and(
            eq(chapters.documentId, current.documentId),
            eq(chapters.parentId, current.parentId),
          )
        : and(
            eq(chapters.documentId, current.documentId),
            isNull(chapters.parentId),
          ),
    )
    .orderBy(asc(chapters.orderIndex))
    .all();
  const index = siblings.findIndex((row) => row.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= siblings.length) return false;
  const temporaryIndex = -1;
  const now = new Date().toISOString();
  db.transaction((tx) => {
    tx.update(chapters)
      .set({ orderIndex: temporaryIndex, updatedAt: now })
      .where(eq(chapters.id, siblings[index].id))
      .run();
    tx.update(chapters)
      .set({ orderIndex: siblings[index].orderIndex, updatedAt: now })
      .where(eq(chapters.id, siblings[target].id))
      .run();
    tx.update(chapters)
      .set({ orderIndex: siblings[target].orderIndex, updatedAt: now })
      .where(eq(chapters.id, siblings[index].id))
      .run();
    tx.update(documents)
      .set({ updatedAt: now })
      .where(eq(documents.id, current.documentId))
      .run();
  });
  return true;
}
