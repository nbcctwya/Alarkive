export interface DocumentSummary {
  id: string;
  title: string;
  description: string;
  tags: string[];
  chapterTitles?: string[];
  chapterCount: number;
  progress: number;
  updatedAt: string;
  lastReadAt: string | null;
}
