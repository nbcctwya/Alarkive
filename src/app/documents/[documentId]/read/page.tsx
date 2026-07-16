import { ReaderShell } from "@/components/reader/ReaderShell";
import { notFound } from "next/navigation";
import { getDocumentById } from "@/repositories/documents";
import {
  listChapterRecords,
  listChaptersByDocument,
} from "@/repositories/chapters";
import {
  getReadingProgress,
  listChapterReadingStates,
} from "@/repositories/reading-progress";

export default async function ReaderPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const { documentId } = await params;
  const document = getDocumentById(documentId);
  if (!document) notFound();
  const tree = listChaptersByDocument(documentId);
  const records = listChapterRecords(documentId);
  const contents = Object.fromEntries(
    records.map((record) => [record.id, record]),
  );
  const progress = getReadingProgress(documentId);
  if (!progress.chapterId) progress.chapterId = records[0]?.id ?? "";
  return (
    <ReaderShell
      document={document}
      tree={tree}
      contents={contents}
      initialProgress={progress}
      initialChapterStates={listChapterReadingStates(documentId)}
    />
  );
}

export const dynamic = "force-dynamic";
