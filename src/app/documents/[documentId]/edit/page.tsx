import { EditorWorkspace } from "@/components/editor/EditorWorkspace";
import { notFound } from "next/navigation";
import { getDocumentById } from "@/repositories/documents";
import {
  listChapterRecords,
  listChaptersByDocument,
} from "@/repositories/chapters";

export default async function EditorPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const { documentId } = await params;
  const document = getDocumentById(documentId);
  if (!document) notFound();
  const records = listChapterRecords(documentId);
  const contents = Object.fromEntries(
    records.map((record) => [record.id, record]),
  );
  return (
    <EditorWorkspace
      document={document}
      initialTree={listChaptersByDocument(documentId)}
      initialContents={contents}
    />
  );
}

export const dynamic = "force-dynamic";
