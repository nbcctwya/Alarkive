import { randomUUID } from "node:crypto";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  chapters,
  documents,
  documentTags,
  readingProgress,
} from "@/db/schema";
import type { DocumentSummary } from "@/types";

function toSummary(
  document: typeof documents.$inferSelect,
  tags: string[],
  chapterCount: number,
  completedCount: number,
): DocumentSummary {
  return {
    id: document.id,
    title: document.title,
    description: document.description,
    tags,
    chapterCount,
    progress:
      chapterCount === 0
        ? 0
        : Math.round((completedCount / chapterCount) * 100),
    updatedAt: document.updatedAt,
    lastReadAt: document.lastReadAt,
  };
}

export function listDocuments(): DocumentSummary[] {
  const documentRows = db
    .select()
    .from(documents)
    .where(eq(documents.status, "active"))
    .orderBy(desc(documents.updatedAt))
    .all();
  const tagRows = db.select().from(documentTags).all();
  const chapterRows = db
    .select({ id: chapters.id, documentId: chapters.documentId })
    .from(chapters)
    .all();
  const completedRows = db
    .select({
      documentId: readingProgress.documentId,
      chapterId: readingProgress.chapterId,
    })
    .from(readingProgress)
    .where(eq(readingProgress.completed, true))
    .all();

  return documentRows.map((document) =>
    toSummary(
      document,
      tagRows
        .filter((tag) => tag.documentId === document.id)
        .map((tag) => tag.tag),
      chapterRows.filter((chapter) => chapter.documentId === document.id)
        .length,
      completedRows.filter((row) => row.documentId === document.id).length,
    ),
  );
}

export function getDocumentById(id: string): DocumentSummary | null {
  return listDocuments().find((document) => document.id === id) ?? null;
}

export function createDocument(input: {
  title: string;
  description?: string;
  tags?: string[];
}): DocumentSummary {
  const now = new Date().toISOString();
  const id = randomUUID();
  const title = input.title.trim();
  if (!title) throw new Error("文档标题不能为空");

  db.transaction((tx) => {
    tx.insert(documents)
      .values({
        id,
        title,
        description: input.description?.trim() ?? "",
        createdAt: now,
        updatedAt: now,
      })
      .run();
    const tags = [
      ...new Set(input.tags?.map((tag) => tag.trim()).filter(Boolean)),
    ];
    if (tags.length) {
      tx.insert(documentTags)
        .values(tags.map((tag) => ({ documentId: id, tag })))
        .run();
    }
  });

  const created = getDocumentById(id);
  if (!created) throw new Error("文档创建后无法读取");
  return created;
}

export function updateDocument(
  id: string,
  input: Partial<Pick<DocumentSummary, "title" | "description" | "lastReadAt">>,
): DocumentSummary | null {
  const values: Partial<typeof documents.$inferInsert> = {
    updatedAt: new Date().toISOString(),
  };
  if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title) throw new Error("文档标题不能为空");
    values.title = title;
  }
  if (input.description !== undefined)
    values.description = input.description.trim();
  if (input.lastReadAt !== undefined) values.lastReadAt = input.lastReadAt;
  const result = db
    .update(documents)
    .set(values)
    .where(eq(documents.id, id))
    .run();
  return result.changes ? getDocumentById(id) : null;
}

export function deleteDocument(id: string): boolean {
  return db.delete(documents).where(eq(documents.id, id)).run().changes > 0;
}

export function touchDocumentLastRead(id: string): void {
  const now = new Date().toISOString();
  db.update(documents)
    .set({ lastReadAt: now })
    .where(eq(documents.id, id))
    .run();
}
