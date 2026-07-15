import {
  createDocument,
  deleteDocument,
  getDocumentById,
  listDocuments,
} from "../src/repositories/documents";
import {
  createChapter,
  getChapterById,
  updateChapter,
} from "../src/repositories/chapters";
import {
  getReadingProgress,
  markChapterCompleted,
  upsertReadingProgress,
} from "../src/repositories/reading-progress";

const markerTitle = "Alarkive persistence verification";
const markerContent = "# Persistent Markdown\n\nrestart-safe-marker";
const mode = process.argv[2] ?? "verify";

function findMarker() {
  return listDocuments().find((document) => document.title === markerTitle);
}

if (mode === "prepare") {
  const existing = findMarker();
  if (existing) deleteDocument(existing.id);
  const document = createDocument({
    title: markerTitle,
    description: "Temporary end-to-end persistence check",
    tags: ["verification"],
  });
  const chapter = createChapter({
    documentId: document.id,
    title: "Persistent chapter",
  });
  updateChapter(chapter.id, {
    content: markerContent,
    scratchpad: "restart-safe-scratchpad",
  });
  upsertReadingProgress({
    documentId: document.id,
    chapterId: chapter.id,
    scrollPosition: 432,
  });
  markChapterCompleted(document.id, chapter.id, true);
  console.log(`${document.id} ${chapter.id}`);
} else if (mode === "cleanup") {
  const existing = findMarker();
  if (existing) deleteDocument(existing.id);
  console.log("Persistence verification data removed.");
} else {
  const document = findMarker();
  if (!document)
    throw new Error("Persistence verification document is missing");
  const persistedDocument = getDocumentById(document.id);
  const progress = getReadingProgress(document.id);
  const chapter = getChapterById(progress.chapterId);
  if (!persistedDocument || persistedDocument.chapterCount !== 1)
    throw new Error("Persisted document or chapter count is invalid");
  if (chapter?.content !== markerContent)
    throw new Error("Persisted Markdown content does not match");
  if (chapter.scratchpad !== "restart-safe-scratchpad")
    throw new Error("Persisted scratchpad does not match");
  if (progress.scrollPosition !== 432 || progress.progress !== 100)
    throw new Error("Persisted reading progress does not match");
  console.log(`${document.id} ${chapter.id} persistence-ok`);
}
