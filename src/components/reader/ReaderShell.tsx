"use client";

import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Circle,
  Edit3,
  Library,
  Menu,
  Moon,
  PanelLeft,
  PanelRight,
  Settings2,
  Sun,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MarkdownRenderer } from "@/components/markdown/MarkdownRenderer";
import {
  markChapterCompletedAction,
  saveReadingProgressAction,
} from "@/actions/reading-progress";
import type {
  ChapterReadingState,
  ChapterContent,
  ChapterNode,
  DocumentSummary,
  ReadingProgress,
} from "@/types";

function flattenTree(nodes: ChapterNode[]): ChapterNode[] {
  return nodes.flatMap((node) => [node, ...flattenTree(node.children)]);
}

function ReaderHeader({
  document,
  progress,
  onOpenToc,
  onToggleSettings,
}: {
  document: DocumentSummary;
  progress: number;
  onOpenToc: () => void;
  onToggleSettings: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 flex min-h-16 items-center gap-3 border-b border-[var(--border)] bg-[color:var(--surface)]/95 px-3 backdrop-blur md:px-5">
      <button
        className="ui-button icon lg:hidden"
        onClick={onOpenToc}
        aria-label="打开全书目录"
      >
        <Menu size={18} />
      </button>
      <Link
        href="/library"
        className="flex shrink-0 items-center gap-2 font-bold"
      >
        <BookOpen size={21} className="text-[var(--accent)]" />
        <span className="hidden sm:inline">Alarkive</span>
      </Link>
      <span className="hidden h-7 w-px bg-[var(--border)] sm:block" />
      <h1 className="min-w-0 flex-1 truncate text-sm font-semibold md:text-base">
        {document.title}
      </h1>
      <div className="hidden w-52 items-center gap-3 lg:flex">
        <span className="muted text-xs">阅读进度</span>
        <div className="progress-track flex-1">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <span className="text-xs font-semibold">{progress}%</span>
      </div>
      <Link className="ui-button hidden sm:inline-flex" href="/library">
        <Library size={16} />
        返回 Library
      </Link>
      <Link
        className="ui-button primary"
        href={`/documents/${document.id}/edit`}
      >
        <Edit3 size={16} />
        <span className="hidden md:inline">进入编辑</span>
      </Link>
      <button
        className="ui-button icon xl:hidden"
        onClick={onToggleSettings}
        aria-label="阅读设置"
      >
        <Settings2 size={18} />
      </button>
    </header>
  );
}

function BookTableOfContents({
  tree,
  currentId,
  open,
  onClose,
  onSelect,
}: {
  tree: ChapterNode[];
  currentId: string;
  open: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(
    () =>
      new Set(
        tree.filter((node) => node.children.length).map((node) => node.id),
      ),
  );
  const render = (nodes: ChapterNode[], depth = 0) =>
    nodes.map((node) => {
      const hasChildren = node.children.length > 0;
      return (
        <li key={node.id}>
          <div
            className={`flex items-center rounded-lg ${node.id === currentId ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]" : "hover:bg-[var(--surface-muted)]"}`}
            style={{ paddingLeft: `${depth * 10}px` }}
          >
            <button
              className="grid size-8 shrink-0 place-items-center"
              onClick={() => {
                if (!hasChildren) return;
                setExpanded((value) => {
                  const next = new Set(value);
                  if (next.has(node.id)) next.delete(node.id);
                  else next.add(node.id);
                  return next;
                });
              }}
              aria-label={hasChildren ? "展开或收起" : undefined}
            >
              {hasChildren ? (
                expanded.has(node.id) ? (
                  <ChevronDown size={14} />
                ) : (
                  <ChevronRight size={14} />
                )
              ) : (
                <span className="size-1 rounded-full bg-current opacity-40" />
              )}
            </button>
            <button
              className="min-w-0 flex-1 truncate py-2 pr-2 text-left text-sm"
              onClick={() => {
                onSelect(node.id);
                if (window.innerWidth < 1024) onClose();
              }}
            >
              {node.title}
            </button>
          </div>
          {hasChildren && expanded.has(node.id) && (
            <ul>{render(node.children, depth + 1)}</ul>
          )}
        </li>
      );
    });
  return (
    <aside
      className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-[var(--border)] bg-[var(--surface)] transition-transform lg:sticky lg:top-16 lg:h-[calc(100vh-4rem)] lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
    >
      <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
        <div>
          <p className="muted text-xs">CONTENTS</p>
          <h2 className="mt-1 font-semibold">全书目录</h2>
        </div>
        <button
          className="ui-button icon ghost lg:hidden"
          onClick={onClose}
          aria-label="关闭目录"
        >
          <X size={18} />
        </button>
      </div>
      <nav className="flex-1 overflow-y-auto p-3" aria-label="全书目录">
        <ul className="space-y-0.5">{render(tree)}</ul>
      </nav>
      <div className="border-t border-[var(--border)] p-4">
        <p className="muted text-xs leading-5">
          阅读位置会在接入本地数据库后自动保存。
        </p>
      </div>
    </aside>
  );
}

type FontSize = "small" | "medium" | "large";
type ContentWidth = "compact" | "comfortable" | "wide";
const fontClasses: Record<FontSize, string> = {
  small: "text-base",
  medium: "text-lg",
  large: "text-xl",
};
const widthClasses: Record<ContentWidth, string> = {
  compact: "max-w-[680px]",
  comfortable: "max-w-[780px]",
  wide: "max-w-[920px]",
};

function ReaderSettings({
  fontSize,
  width,
  dark,
  leftVisible,
  rightVisible,
  onFontSize,
  onWidth,
  onDark,
  onLeftVisible,
  onRightVisible,
}: {
  fontSize: FontSize;
  width: ContentWidth;
  dark: boolean;
  leftVisible: boolean;
  rightVisible: boolean;
  onFontSize: (value: FontSize) => void;
  onWidth: (value: ContentWidth) => void;
  onDark: () => void;
  onLeftVisible: () => void;
  onRightVisible: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 border-b border-[var(--border)] bg-[var(--background)] px-4 py-2.5 text-xs">
      <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1">
        <span className="muted px-2">字号</span>
        {(["small", "medium", "large"] as const).map((size, index) => (
          <button
            key={size}
            className={`rounded-md px-2.5 py-1 ${fontSize === size ? "bg-[var(--accent-soft)] font-semibold text-[var(--accent-strong)]" : "muted"}`}
            onClick={() => onFontSize(size)}
          >
            {["小", "中", "大"][index]}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-1">
        <span className="muted px-2">宽度</span>
        {(["compact", "comfortable", "wide"] as const).map((size, index) => (
          <button
            key={size}
            className={`rounded-md px-2.5 py-1 ${width === size ? "bg-[var(--accent-soft)] font-semibold text-[var(--accent-strong)]" : "muted"}`}
            onClick={() => onWidth(size)}
          >
            {["窄", "舒适", "宽"][index]}
          </button>
        ))}
      </div>
      <button className="ui-button min-h-8 px-2.5 py-1" onClick={onDark}>
        {dark ? <Sun size={15} /> : <Moon size={15} />}
        {dark ? "浅色" : "深色"}
      </button>
      <div className="hidden items-center gap-1 xl:flex">
        <button
          className={`ui-button icon min-h-8 ${leftVisible ? "text-[var(--accent)]" : "muted"}`}
          onClick={onLeftVisible}
          title="切换全书目录"
        >
          <PanelLeft size={16} />
        </button>
        <button
          className={`ui-button icon min-h-8 ${rightVisible ? "text-[var(--accent)]" : "muted"}`}
          onClick={onRightVisible}
          title="切换本章导航"
        >
          <PanelRight size={16} />
        </button>
      </div>
    </div>
  );
}

function extractHeadings(content: string) {
  return content.split("\n").flatMap((line) => {
    const match = /^(#{2,3})\s+(.+)$/.exec(line);
    if (!match) return [];
    return [
      {
        level: match[1].length,
        title: match[2],
        id: match[2]
          .trim()
          .toLowerCase()
          .replace(/[^\p{L}\p{N}]+/gu, "-"),
      },
    ];
  });
}

function ChapterTableOfContents({ content }: { content: string }) {
  const headings = extractHeadings(content);
  return (
    <section className="surface p-4">
      <p className="muted text-xs font-semibold tracking-widest uppercase">
        On this page
      </p>
      <h2 className="mt-1 mb-3 font-semibold">本章导航</h2>
      {headings.length ? (
        <nav>
          <ul className="space-y-1">
            {headings.map((heading) => (
              <li key={heading.id}>
                <a
                  className="muted block rounded-md px-2 py-1.5 text-sm hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"
                  style={{
                    paddingLeft: heading.level === 3 ? "1.25rem" : ".5rem",
                  }}
                  href={`#${heading.id}`}
                >
                  {heading.title}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      ) : (
        <p className="muted text-sm">本章暂无小标题</p>
      )}
    </section>
  );
}

function ReadingProgressCard({
  progress,
  currentIndex,
  total,
  onNext,
  completed,
  savingCompletion,
  onToggleCompleted,
}: {
  progress: number;
  currentIndex: number;
  total: number;
  onNext: () => void;
  completed: boolean;
  savingCompletion: boolean;
  onToggleCompleted: () => void;
}) {
  const remaining = Math.max(2, (total - currentIndex - 1) * 4);
  return (
    <section className="surface p-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">阅读进度</h2>
        <span className="text-sm font-semibold text-[var(--accent)]">
          {progress}%
        </span>
      </div>
      <div className="progress-track mt-4">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <div className="muted mt-4 grid grid-cols-2 gap-3 text-xs">
        <div>
          <p>章节位置</p>
          <p className="mt-1 font-semibold text-[var(--text)]">
            {currentIndex + 1} / {total}
          </p>
        </div>
        <div>
          <p>预计剩余</p>
          <p className="mt-1 flex items-center gap-1 font-semibold text-[var(--text)]">
            <Clock3 size={13} />
            {remaining} 分钟
          </p>
        </div>
      </div>
      <button
        className={`ui-button mt-4 w-full ${completed ? "border-emerald-300 text-emerald-700" : ""}`}
        onClick={onToggleCompleted}
        disabled={savingCompletion}
      >
        {completed ? <CheckCircle2 size={16} /> : <Circle size={16} />}
        {savingCompletion
          ? "保存中…"
          : completed
            ? "本章已完成"
            : "标记本章完成"}
      </button>
      <button
        className="ui-button mt-2 w-full"
        onClick={onNext}
        disabled={currentIndex >= total - 1}
      >
        跳转到下一小节 <ArrowRight size={14} />
      </button>
    </section>
  );
}

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
  const [settingsVisible, setSettingsVisible] = useState(true);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [operationError, setOperationError] = useState("");
  const [savingCompletion, setSavingCompletion] = useState(false);
  const [chapterStates, setChapterStates] = useState<
    Record<string, ChapterReadingState>
  >(() =>
    Object.fromEntries(
      initialChapterStates.map((state) => [state.chapterId, state]),
    ),
  );
  const chapterStatesRef = useRef(chapterStates);
  const currentScrollRef = useRef(0);
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
    await persistPosition(chapterId, currentScrollRef.current);
    await persistPosition(id, chapterStates[id]?.scrollPosition ?? 0);
    setChapterId(id);
    setOperationError("");
  };
  const previous = () =>
    currentIndex > 0 && void select(chapters[currentIndex - 1].id);
  const next = () =>
    currentIndex >= 0 &&
    currentIndex < chapters.length - 1 &&
    void select(chapters[currentIndex + 1].id);

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
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.clearTimeout(timer);
    };
  }, [chapterId, persistPosition]);

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
        {leftVisible && (
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
            className={`surface mx-auto px-5 py-7 sm:px-8 md:px-12 md:py-10 ${widthClasses[width]}`}
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
            <ChapterTableOfContents content={content} />
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
    </div>
  );
}
