import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { chapters, readingProgress } from "@/db/schema";
import type { ChapterReadingState, ReadingProgress } from "@/types";

export function listChapterReadingStates(
  documentId: string,
): ChapterReadingState[] {
  return db
    .select()
    .from(readingProgress)
    .where(eq(readingProgress.documentId, documentId))
    .orderBy(desc(readingProgress.updatedAt))
    .all()
    .map((row) => ({
      chapterId: row.chapterId,
      scrollPosition: row.scrollPosition,
      completed: row.completed,
      updatedAt: row.updatedAt,
    }));
}

export function getReadingProgress(documentId: string): ReadingProgress {
  const states = listChapterReadingStates(documentId);
  const chapterCount = db
    .select({ id: chapters.id })
    .from(chapters)
    .where(eq(chapters.documentId, documentId))
    .all().length;
  const latest = states[0];
  const completedChapterIds = states
    .filter((state) => state.completed)
    .map((state) => state.chapterId);
  return {
    documentId,
    chapterId: latest?.chapterId ?? "",
    scrollPosition: latest?.scrollPosition ?? 0,
    completedChapterIds,
    progress:
      chapterCount === 0
        ? 0
        : Math.round((completedChapterIds.length / chapterCount) * 100),
  };
}

export function upsertReadingProgress(input: {
  documentId: string;
  chapterId: string;
  scrollPosition?: number;
  completed?: boolean;
}): ChapterReadingState {
  const existing = db
    .select()
    .from(readingProgress)
    .where(
      and(
        eq(readingProgress.documentId, input.documentId),
        eq(readingProgress.chapterId, input.chapterId),
      ),
    )
    .get();
  const now = new Date().toISOString();
  const values = {
    documentId: input.documentId,
    chapterId: input.chapterId,
    scrollPosition: Math.max(
      0,
      Math.round(input.scrollPosition ?? existing?.scrollPosition ?? 0),
    ),
    completed: input.completed ?? existing?.completed ?? false,
    updatedAt: now,
  };
  db.insert(readingProgress)
    .values(values)
    .onConflictDoUpdate({
      target: [readingProgress.documentId, readingProgress.chapterId],
      set: {
        scrollPosition: values.scrollPosition,
        completed: values.completed,
        updatedAt: now,
      },
    })
    .run();
  return {
    chapterId: input.chapterId,
    scrollPosition: values.scrollPosition,
    completed: values.completed,
    updatedAt: now,
  };
}

export function markChapterCompleted(
  documentId: string,
  chapterId: string,
  completed: boolean,
): ChapterReadingState {
  return upsertReadingProgress({ documentId, chapterId, completed });
}
