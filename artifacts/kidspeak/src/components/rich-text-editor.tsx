import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import { useEffect, useCallback } from "react";
import {
  Bold, Italic, List, ListOrdered, Link as LinkIcon, Image as ImageIcon,
  Heading1, Heading2, Heading3, AlignLeft, AlignCenter, AlignRight,
  Undo, Redo, Minus, Quote,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface RichTextEditorProps {
  value: string;
  onChange: (val: string) => void;
  dir?: "ltr" | "rtl";
  placeholder?: string;
  minHeight?: number;
}

export function RichTextEditor({ value, onChange, dir = "ltr", placeholder, minHeight = 200 }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Image.configure({ inline: false, allowBase64: true }),
      Link.configure({ openOnClick: false, autolink: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TextStyle,
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none px-4 py-3",
        dir,
        style: `min-height: ${minHeight}px;`,
      },
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || "", false as any);
    }
  }, [value, editor]);

  const addLink = useCallback(() => {
    const url = window.prompt("Enter URL:");
    if (!url) return;
    if (editor?.state.selection.empty) {
      editor.chain().focus().setLink({ href: url }).run();
    } else {
      editor?.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);

  const addImage = useCallback(() => {
    const url = window.prompt("Enter image URL:");
    if (url) editor?.chain().focus().setImage({ src: url }).run();
  }, [editor]);

  if (!editor) return null;

  const ToolBtn = ({ onClick, active, title, children }: { onClick: () => void; active?: boolean; title: string; children: React.ReactNode }) => (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className={`p-1.5 rounded text-sm transition-colors ${active ? "bg-[#1B2E8F] text-white" : "text-gray-600 hover:bg-gray-100"}`}
    >
      {children}
    </button>
  );

  return (
    <div className="border rounded-xl overflow-hidden" style={{ borderColor: "#1B2E8F25" }}>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 p-2 border-b bg-gray-50" style={{ borderColor: "#1B2E8F15" }}>
        <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Bold">
          <Bold className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Italic">
          <Italic className="w-3.5 h-3.5" />
        </ToolBtn>
        <div className="w-px h-5 bg-gray-300 mx-1" />
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="H1">
          <Heading1 className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="H2">
          <Heading2 className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="H3">
          <Heading3 className="w-3.5 h-3.5" />
        </ToolBtn>
        <div className="w-px h-5 bg-gray-300 mx-1" />
        <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Bullet list">
          <List className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Ordered list">
          <ListOrdered className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Quote">
          <Quote className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} active={false} title="Divider">
          <Minus className="w-3.5 h-3.5" />
        </ToolBtn>
        <div className="w-px h-5 bg-gray-300 mx-1" />
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Align left">
          <AlignLeft className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Center">
          <AlignCenter className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Align right">
          <AlignRight className="w-3.5 h-3.5" />
        </ToolBtn>
        <div className="w-px h-5 bg-gray-300 mx-1" />
        <ToolBtn onClick={addLink} active={editor.isActive("link")} title="Add link">
          <LinkIcon className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={addImage} active={false} title="Add image">
          <ImageIcon className="w-3.5 h-3.5" />
        </ToolBtn>
        <div className="w-px h-5 bg-gray-300 mx-1" />
        <ToolBtn onClick={() => editor.chain().focus().undo().run()} active={false} title="Undo">
          <Undo className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().redo().run()} active={false} title="Redo">
          <Redo className="w-3.5 h-3.5" />
        </ToolBtn>
      </div>

      {/* Editor body */}
      <div className="bg-white">
        {!editor.getText() && placeholder && (
          <div className="absolute pointer-events-none px-4 py-3 text-sm text-muted-foreground">{placeholder}</div>
        )}
        <EditorContent editor={editor} dir={dir} />
      </div>
    </div>
  );
}
