import { randomUUID } from "node:crypto";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/server/db";
import {
  chapters,
  documents,
  documentTags,
  readingProgress,
} from "@/server/db/schema";
import type { DocumentSummary } from "@/types/documents";

function normalizeTags(tags: string[] | undefined): string[] {
  return [...new Set(tags?.map((tag) => tag.trim()).filter(Boolean) ?? [])];
}

export interface UpdateDocumentInput {
  title?: string;
  description?: string;
  lastReadAt?: string | null;
  tags?: string[];
}

function toSummary(
  document: typeof documents.$inferSelect,
  tags: string[],
  chapterTitles: string[],
  completedCount: number,
): DocumentSummary {
  return {
    id: document.id,
    title: document.title,
    description: document.description,
    tags,
    chapterTitles,
    chapterCount: chapterTitles.length,
    progress:
      chapterTitles.length === 0
        ? 0
        : Math.round((completedCount / chapterTitles.length) * 100),
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
    .select({
      id: chapters.id,
      documentId: chapters.documentId,
      title: chapters.title,
    })
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
      chapterRows
        .filter((chapter) => chapter.documentId === document.id)
        .map((chapter) => chapter.title),
      completedRows.filter((row) => row.documentId === document.id).length,
    ),
  );
}

export function getDocumentById(id: string): DocumentSummary | null {
  const document = db
    .select()
    .from(documents)
    .where(and(eq(documents.id, id), eq(documents.status, "active")))
    .get();
  if (!document) return null;
  const tags = db
    .select({ tag: documentTags.tag })
    .from(documentTags)
    .where(eq(documentTags.documentId, id))
    .orderBy(sql`rowid`)
    .all()
    .map((row) => row.tag);
  const chapterRows = db
    .select({ title: chapters.title })
    .from(chapters)
    .where(eq(chapters.documentId, id))
    .all();
  const completedCount = db
    .select({ chapterId: readingProgress.chapterId })
    .from(readingProgress)
    .where(
      and(
        eq(readingProgress.documentId, id),
        eq(readingProgress.completed, true),
      ),
    )
    .all().length;
  return toSummary(
    document,
    tags,
    chapterRows.map((row) => row.title),
    completedCount,
  );
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
    const tags = normalizeTags(input.tags);
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
  input: UpdateDocumentInput,
): DocumentSummary | null {
  const existing = db
    .select({ id: documents.id })
    .from(documents)
    .where(eq(documents.id, id))
    .get();
  if (!existing) return null;
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
  db.transaction((tx) => {
    tx.update(documents).set(values).where(eq(documents.id, id)).run();
    if (input.tags !== undefined) {
      tx.delete(documentTags).where(eq(documentTags.documentId, id)).run();
      const tags = normalizeTags(input.tags);
      if (tags.length) {
        tx.insert(documentTags)
          .values(tags.map((tag) => ({ documentId: id, tag })))
          .run();
      }
    }
  });
  return getDocumentById(id);
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
