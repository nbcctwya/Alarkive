"use client";

import {
  Code2,
  Heading1,
  Heading2,
  Image as ImageIcon,
  Link2,
  List,
  Minus,
  Quote,
  Sigma,
  Table2,
  Upload,
  WandSparkles,
} from "lucide-react";
import type { RefObject } from "react";

const tools = [
  { label: "H1", icon: Heading1, before: "# ", after: "" },
  { label: "H2", icon: Heading2, before: "## ", after: "" },
  { label: "列表", icon: List, before: "- ", after: "" },
  { label: "引用", icon: Quote, before: "> ", after: "" },
  { label: "链接", icon: Link2, before: "[", after: "](https://)" },
  { label: "代码", icon: Code2, before: "```\n", after: "\n```" },
  {
    label: "表格",
    icon: Table2,
    before: "| 列 1 | 列 2 |\n| --- | --- |\n| 内容 | 内容 |",
    after: "",
  },
  { label: "公式", icon: Sigma, before: "$$\n", after: "\n$$" },
  { label: "图片", icon: ImageIcon, before: "![说明](", after: ")" },
  { label: "分割线", icon: Minus, before: "\n---\n", after: "" },
];

export function MarkdownToolbar({
  onInsert,
  onFormat,
  onUploadImage,
  onManageImages,
}: {
  onInsert: (before: string, after: string) => void;
  onFormat: () => void;
  onUploadImage: () => void;
  onManageImages: () => void;
}) {
  return (
    <div className="flex overflow-x-auto border-b border-[var(--border)] bg-[var(--surface-muted)] p-2">
      {tools.map(({ label, icon: Icon, before, after }) => (
        <button
          key={label}
          className="ui-button ghost shrink-0 px-2.5"
          title={label}
          onClick={() => onInsert(before, after)}
        >
          <Icon size={16} />
          <span className="hidden 2xl:inline">{label}</span>
        </button>
      ))}
      <span className="mx-1 w-px shrink-0 bg-[var(--border)]" />
      <button
        className="ui-button ghost shrink-0 px-2.5"
        title="整理 Markdown 格式"
        onClick={onFormat}
      >
        <WandSparkles size={16} />
        <span className="hidden 2xl:inline">整理格式</span>
      </button>
      <span className="mx-1 w-px shrink-0 bg-[var(--border)]" />
      <button
        className="ui-button ghost shrink-0 px-2.5"
        title="上传图片并插入 Markdown"
        onClick={onUploadImage}
      >
        <Upload size={16} />
        <span className="hidden 2xl:inline">上传图片</span>
      </button>
      <button
        className="ui-button ghost shrink-0 px-2.5"
        title="管理本文档的图片"
        onClick={onManageImages}
      >
        <ImageIcon size={16} />
        <span className="hidden 2xl:inline">图片资源</span>
      </button>
    </div>
  );
}

export function MarkdownEditor({
  value,
  onChange,
  textareaRef,
}: {
  value: string;
  onChange: (value: string) => void;
  textareaRef: RefObject<HTMLTextAreaElement | null>;
}) {
  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      spellCheck={false}
      className="min-h-0 flex-1 resize-none bg-[var(--surface)] p-5 font-mono text-sm leading-7 outline-none md:p-7"
      aria-label="Markdown 编辑区"
    />
  );
}
