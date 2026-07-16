import { db } from "../src/server/db";
import {
  chapters,
  documents as documentsTable,
  documentTags,
  readingProgress as readingProgressTable,
} from "../src/server/db/schema";
import {
  chapterContents,
  chapterTrees,
  documents,
  readingProgress,
} from "./seed-data/example-course";
import type { ChapterNode } from "../src/types/chapters";

function flatten(nodes: ChapterNode[]): ChapterNode[] {
  return nodes.flatMap((node) => [node, ...flatten(node.children)]);
}

const normalizeDate = (value: string | null) =>
  value ? new Date(value).toISOString() : null;

db.transaction((tx) => {
  for (const document of documents) {
    tx.insert(documentsTable)
      .values({
        id: document.id,
        title: document.title,
        description: document.description,
        status: "active",
        createdAt: normalizeDate(document.updatedAt)!,
        updatedAt: normalizeDate(document.updatedAt)!,
        lastReadAt: normalizeDate(document.lastReadAt),
      })
      .onConflictDoNothing()
      .run();

    for (const tag of document.tags) {
      tx.insert(documentTags)
        .values({ documentId: document.id, tag })
        .onConflictDoNothing()
        .run();
    }
  }

  for (const [documentId, tree] of Object.entries(chapterTrees)) {
    for (const node of flatten(tree)) {
      const content = chapterContents[node.id];
      tx.insert(chapters)
        .values({
          id: node.id,
          documentId,
          parentId: node.parentId,
          title: node.title,
          content: content?.content ?? "",
          scratchpad: content?.scratchpad ?? "",
          orderIndex: node.orderIndex,
          createdAt:
            normalizeDate(content?.updatedAt ?? null) ??
            new Date().toISOString(),
          updatedAt:
            normalizeDate(content?.updatedAt ?? null) ??
            new Date().toISOString(),
        })
        .onConflictDoNothing()
        .run();
    }
  }

  for (const progress of Object.values(readingProgress)) {
    for (const chapterId of progress.completedChapterIds) {
      tx.insert(readingProgressTable)
        .values({
          documentId: progress.documentId,
          chapterId,
          scrollPosition: 0,
          completed: true,
          updatedAt: new Date("2026-07-15T09:40:00+08:00").toISOString(),
        })
        .onConflictDoNothing()
        .run();
    }
    if (progress.chapterId) {
      tx.insert(readingProgressTable)
        .values({
          documentId: progress.documentId,
          chapterId: progress.chapterId,
          scrollPosition: progress.scrollPosition,
          completed: progress.completedChapterIds.includes(progress.chapterId),
          updatedAt: new Date("2026-07-15T09:42:00+08:00").toISOString(),
        })
        .onConflictDoNothing()
        .run();
    }
  }
});

console.log("Example seed applied without duplicating existing records.");
