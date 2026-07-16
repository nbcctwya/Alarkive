"use client";

import { ArrowLeft, ArrowRight, BookOpen, Edit3, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { touchDocumentLastReadAction } from "@/actions/documents";
import {
  markChapterCompletedAction,
  saveReadingProgressAction,
} from "@/actions/reading-progress";
import { BookTableOfContents } from "@/components/reader/BookTableOfContents";
import { ChapterTableOfContents } from "@/components/reader/ChapterTableOfContents";
import { ReaderHeader } from "@/components/reader/ReaderHeader";
import {
  ReaderSettings,
  fontClasses,
  widthClasses,
  type ContentWidth,
  type FontSize,
} from "@/components/reader/ReaderSettings";
import { ReadingProgressCard } from "@/components/reader/ReadingProgressCard";
import { flattenTree } from "@/components/reader/chapter-tree";
import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";
import type { ChapterContent, ChapterNode } from "@/types/chapters";
import type { DocumentSummary } from "@/types/documents";
import type { ChapterReadingState, ReadingProgress } from "@/types/reading";

export function ReaderShell({
  document,
  tree,
  contents,
  initialProgress,
  initialChapterStates,
}: {
  document: DocumentSummary;
  tree: ChapterNode[];
  contents: Record<string, ChapterContent>;
  initialProgress: ReadingProgress;
  initialChapterStates: ChapterReadingState[];
}) {
  const chapters = useMemo(() => flattenTree(tree), [tree]);
  const [chapterId, setChapterId] = useState(initialProgress.chapterId);
  const [fontSize, setFontSize] = useState<FontSize>("medium");
  const [width, setWidth] = useState<ContentWidth>("comfortable");
  const [dark, setDark] = useState(false);
  const [leftVisible, setLeftVisible] = useState(true);
  const [rightVisible, setRightVisible] = useState(true);
  const [mobileToc, setMobileToc] = useState(false);
  const [mobileChapterToc, setMobileChapterToc] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(true);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [operationError, setOperationError] = useState("");
  const [savingCompletion, setSavingCompletion] = useState(false);
  const [activeHeadingId, setActiveHeadingId] = useState("");
  const [chapterStates, setChapterStates] = useState<
    Record<string, ChapterReadingState>
  >(() =>
    Object.fromEntries(
      initialChapterStates.map((state) => [state.chapterId, state]),
    ),
  );
  const chapterStatesRef = useRef(chapterStates);
  const currentScrollRef = useRef(0);
  const touchedDocumentRef = useRef(false);
  const selectionRevisionRef = useRef(0);
  const skipNextCleanupFlushRef = useRef(false);
  const currentIndex = chapters.findIndex(
    (chapter) => chapter.id === chapterId,
  );
  const chapter = chapters[currentIndex];
  const content =
    contents[chapter?.id]?.content ??
    `# ${chapter?.title ?? "未找到章节"}\n\n本章还没有内容。`;
  const completedCount = Object.values(chapterStates).filter(
    (state) => state.completed,
  ).length;
  const progress = chapters.length
    ? Math.round((completedCount / chapters.length) * 100)
    : 0;
  const persistPosition = useCallback(
    async (targetChapterId: string, scrollPosition: number) => {
      if (!targetChapterId) return true;
      const roundedPosition = Math.max(0, Math.round(scrollPosition));
      const result = await saveReadingProgressAction({
        documentId: document.id,
        chapterId: targetChapterId,
        scrollPosition: roundedPosition,
      });
      if (!result.ok) {
        setOperationError(result.error);
        return false;
      }
      setChapterStates((states) => ({
        ...states,
        [targetChapterId]: result.data,
      }));
      return true;
    },
    [document.id],
  );
  const select = async (id: string) => {
    if (!id || id === chapterId) return;
    const selectionRevision = selectionRevisionRef.current + 1;
    selectionRevisionRef.current = selectionRevision;
    const currentSaved = await persistPosition(
      chapterId,
      currentScrollRef.current,
    );
    if (selectionRevision !== selectionRevisionRef.current) return;
    const nextSaved = await persistPosition(
      id,
      chapterStates[id]?.scrollPosition ?? 0,
    );
    if (selectionRevision !== selectionRevisionRef.current) return;
    skipNextCleanupFlushRef.current = true;
    setChapterId(id);
    if (currentSaved && nextSaved) setOperationError("");
  };
  const previous = () =>
    currentIndex > 0 && void select(chapters[currentIndex - 1].id);
  const next = () =>
    currentIndex >= 0 &&
    currentIndex < chapters.length - 1 &&
    void select(chapters[currentIndex + 1].id);

  useEffect(() => {
    if (touchedDocumentRef.current) return;
    touchedDocumentRef.current = true;
    void touchDocumentLastReadAction(document.id).then((result) => {
      if (!result.ok) setOperationError(result.error);
    });
  }, [document.id]);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("alarkive.reader.settings");
      if (saved) {
        const preferences = JSON.parse(saved) as {
          fontSize?: FontSize;
          width?: ContentWidth;
          dark?: boolean;
          leftVisible?: boolean;
          rightVisible?: boolean;
        };
        if (preferences.fontSize) setFontSize(preferences.fontSize);
        if (preferences.width) setWidth(preferences.width);
        if (typeof preferences.dark === "boolean") setDark(preferences.dark);
        if (typeof preferences.leftVisible === "boolean")
          setLeftVisible(preferences.leftVisible);
        if (typeof preferences.rightVisible === "boolean")
          setRightVisible(preferences.rightVisible);
      }
    } catch {
      setOperationError("阅读设置损坏，已恢复默认值。");
    } finally {
      setPreferencesLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!preferencesLoaded) return;
    window.localStorage.setItem(
      "alarkive.reader.settings",
      JSON.stringify({ fontSize, width, dark, leftVisible, rightVisible }),
    );
  }, [dark, fontSize, leftVisible, preferencesLoaded, rightVisible, width]);

  useEffect(() => {
    chapterStatesRef.current = chapterStates;
  }, [chapterStates]);

  useEffect(() => {
    if (!chapterId) return;
    const position = chapterStatesRef.current[chapterId]?.scrollPosition ?? 0;
    currentScrollRef.current = position;
    window.requestAnimationFrame(() => window.scrollTo({ top: position }));
  }, [chapterId]);

  useEffect(() => {
    const headings = Array.from(
      window.document.querySelectorAll<HTMLElement>(
        ".reader-article .markdown-body h1[id], .reader-article .markdown-body h2[id], .reader-article .markdown-body h3[id], .reader-article .markdown-body h4[id], .reader-article .markdown-body h5[id], .reader-article .markdown-body h6[id]",
      ),
    );
    setActiveHeadingId(headings[0]?.id ?? "");
    if (!headings.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (a, b) =>
              Math.abs(a.boundingClientRect.top) -
              Math.abs(b.boundingClientRect.top),
          )[0];
        if (visible?.target.id) setActiveHeadingId(visible.target.id);
      },
      { rootMargin: "-18% 0px -68% 0px", threshold: [0, 1] },
    );
    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, [chapterId, content]);

  useEffect(() => {
    if (!chapterId) return;
    let timer = 0;
    const handleScroll = () => {
      currentScrollRef.current = window.scrollY;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        void persistPosition(chapterId, currentScrollRef.current);
      }, 900);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    const flushOnLeave = () => {
      const payload = JSON.stringify({
        documentId: document.id,
        chapterId,
        scrollPosition: currentScrollRef.current,
      });
      const body = new Blob([payload], { type: "application/json" });
      if (!navigator.sendBeacon("/api/reading-progress", body)) {
        void fetch("/api/reading-progress", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: payload,
          keepalive: true,
        });
      }
    };
    const flushWhenHidden = () => {
      if (window.document.visibilityState === "hidden") flushOnLeave();
    };
    window.addEventListener("pagehide", flushOnLeave);
    window.document.addEventListener("visibilitychange", flushWhenHidden);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("pagehide", flushOnLeave);
      window.document.removeEventListener("visibilitychange", flushWhenHidden);
      window.clearTimeout(timer);
      if (skipNextCleanupFlushRef.current)
        skipNextCleanupFlushRef.current = false;
      else flushOnLeave();
    };
  }, [chapterId, document.id, persistPosition]);

  const toggleCompleted = async () => {
    if (!chapterId) return;
    const completed = !(chapterStates[chapterId]?.completed ?? false);
    setSavingCompletion(true);
    const result = await markChapterCompletedAction(
      document.id,
      chapterId,
      completed,
    );
    setSavingCompletion(false);
    if (!result.ok) {
      setOperationError(result.error);
      return;
    }
    setChapterStates((states) => ({
      ...states,
      [chapterId]: result.data,
    }));
    setOperationError("");
  };

  return (
    <div
      className={`min-h-screen bg-[var(--background)] text-[var(--text)] ${dark ? "dark-reader" : ""}`}
    >
      <ReaderHeader
        document={document}
        progress={progress}
        onOpenToc={() => setMobileToc(true)}
        onOpenChapterToc={() => setMobileChapterToc(true)}
        onToggleSettings={() => setSettingsVisible((value) => !value)}
      />
      {settingsVisible && (
        <ReaderSettings
          fontSize={fontSize}
          width={width}
          dark={dark}
          leftVisible={leftVisible}
          rightVisible={rightVisible}
          onFontSize={setFontSize}
          onWidth={setWidth}
          onDark={() => setDark((value) => !value)}
          onLeftVisible={() => setLeftVisible((value) => !value)}
          onRightVisible={() => setRightVisible((value) => !value)}
        />
      )}
      <div
        className={`mx-auto grid max-w-[1680px] items-start ${leftVisible ? "lg:grid-cols-[18rem_minmax(0,1fr)]" : "lg:grid-cols-[minmax(0,1fr)]"} ${leftVisible && rightVisible ? "xl:grid-cols-[18rem_minmax(0,1fr)_17rem]" : rightVisible ? "xl:grid-cols-[minmax(0,1fr)_17rem]" : ""}`}
      >
        {(leftVisible || mobileToc) && (
          <BookTableOfContents
            tree={tree}
            currentId={chapterId}
            open={mobileToc}
            onClose={() => setMobileToc(false)}
            onSelect={select}
          />
        )}
        {mobileToc && (
          <button
            className="fixed inset-0 z-30 bg-black/20 lg:hidden"
            onClick={() => setMobileToc(false)}
            aria-label="关闭目录遮罩"
          />
        )}
        <main className="min-w-0 px-3 py-5 sm:px-6 md:py-8">
          {operationError && (
            <div className="mx-auto mb-4 flex max-w-[920px] items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              <span>{operationError}</span>
              <button
                onClick={() => setOperationError("")}
                aria-label="关闭错误提示"
              >
                <X size={15} />
              </button>
            </div>
          )}
          <article
            className={`reader-article surface mx-auto px-5 py-7 sm:px-8 md:px-12 md:py-10 ${widthClasses[width]}`}
          >
            {chapters.length ? (
              <MarkdownRenderer
                content={content}
                className={fontClasses[fontSize]}
              />
            ) : (
              <div className="grid min-h-80 place-items-center text-center">
                <div>
                  <BookOpen className="muted mx-auto mb-3" />
                  <h2 className="text-xl font-semibold">这份文档还没有章节</h2>
                  <p className="muted mt-2 text-sm">
                    进入编辑器创建第一个章节，然后开始阅读。
                  </p>
                  <Link
                    className="ui-button primary mt-5"
                    href={`/documents/${document.id}/edit`}
                  >
                    <Edit3 size={16} />
                    进入编辑
                  </Link>
                </div>
              </div>
            )}
            {chapters.length > 0 && (
              <nav
                className="mt-10 flex items-center justify-between gap-3 border-t border-[var(--border)] pt-6"
                aria-label="章节翻页"
              >
                <button
                  className="ui-button"
                  onClick={previous}
                  disabled={currentIndex === 0}
                >
                  <ArrowLeft size={16} />
                  上一篇
                </button>
                <span className="muted text-xs">
                  {currentIndex + 1} / {chapters.length}
                </span>
                <button
                  className="ui-button"
                  onClick={next}
                  disabled={currentIndex >= chapters.length - 1}
                >
                  下一篇
                  <ArrowRight size={16} />
                </button>
              </nav>
            )}
          </article>
        </main>
        {rightVisible && chapters.length > 0 && (
          <aside className="sticky top-29 hidden h-[calc(100vh-8rem)] space-y-4 overflow-y-auto px-3 py-5 xl:block">
            <ChapterTableOfContents
              content={content}
              activeId={activeHeadingId}
            />
            <ReadingProgressCard
              progress={progress}
              currentIndex={currentIndex}
              total={chapters.length}
              onNext={next}
              completed={chapterStates[chapterId]?.completed ?? false}
              savingCompletion={savingCompletion}
              onToggleCompleted={() => void toggleCompleted()}
            />
          </aside>
        )}
      </div>
      {mobileChapterToc && chapters.length > 0 && (
        <>
          <button
            className="fixed inset-0 z-30 bg-black/20 xl:hidden"
            onClick={() => setMobileChapterToc(false)}
            aria-label="关闭本章导航遮罩"
          />
          <aside className="fixed inset-y-0 right-0 z-40 w-76 overflow-y-auto border-l border-[var(--border)] bg-[var(--background)] p-4 xl:hidden">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-semibold">本章阅读</h2>
              <button
                className="ui-button icon ghost"
                onClick={() => setMobileChapterToc(false)}
                aria-label="关闭本章导航"
              >
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <ChapterTableOfContents
                content={content}
                activeId={activeHeadingId}
                onNavigate={() => setMobileChapterToc(false)}
              />
              <ReadingProgressCard
                progress={progress}
                currentIndex={currentIndex}
                total={chapters.length}
                onNext={() => {
                  next();
                  setMobileChapterToc(false);
                }}
                completed={chapterStates[chapterId]?.completed ?? false}
                savingCompletion={savingCompletion}
                onToggleCompleted={() => void toggleCompleted()}
              />
            </div>
          </aside>
        </>
      )}
    </div>
  );
}
