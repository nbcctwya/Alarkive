import { LibraryClient } from "@/components/library/LibraryClient";
import { listDocuments } from "@/server/repositories/documents";

export default function LibraryPage() {
  try {
    return <LibraryClient initialDocuments={listDocuments()} />;
  } catch {
    return (
      <LibraryClient
        initialDocuments={[]}
        initialError="无法读取本地数据库。请确认迁移已执行后重试。"
      />
    );
  }
}

export const dynamic = "force-dynamic";
