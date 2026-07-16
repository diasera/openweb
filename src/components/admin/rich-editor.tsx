"use client";

import { useCallback, useEffect, useRef, useState, type Ref } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import {
  Bold,
  Italic,
  UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Link2,
  ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo2,
  Redo2,
  LoaderCircle,
  type LucideIcon,
} from "lucide-react";
import { PhotoEditor } from "@/components/media-editor";
import { useToast } from "@/components/ui/toast";
import { requestJson } from "@/lib/api/client";
import { IMAGE_UPLOAD_ACCEPT } from "@/lib/constants";
import { canEditPhoto } from "@/lib/media-editor";
import { prepareImageFile } from "@/lib/media-formats";
import { validateImageFile } from "@/lib/uploads/policy";
import { cn } from "@/lib/utils/cn";

/**
 * Editor artikel admin ala Word (TipTap). StarterKit v3 mencakup bold/italic/
 * underline/strike/heading/list/quote/link/history; kita tambah image, align,
 * placeholder. onChange mengirim HTML (untuk render) + JSON (untuk edit ulang).
 */
export function RichEditor({
  initialContent,
  onChange,
}: {
  initialContent?: unknown;
  onChange: (html: string, json: string) => void;
}) {
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const imageButtonRef = useRef<HTMLButtonElement>(null);
  const operationControllerRef = useRef<AbortController | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const returnImageButton = useCallback(() => imageButtonRef.current, []);

  const beginImageOperation = useCallback(() => {
    operationControllerRef.current?.abort();
    const controller = new AbortController();
    operationControllerRef.current = controller;
    setUploading(true);
    return controller;
  }, []);

  const finishImageOperation = useCallback((controller: AbortController) => {
    if (operationControllerRef.current !== controller) return;
    operationControllerRef.current = null;
    setUploading(false);
  }, []);

  useEffect(
    () => () => {
      const controller = operationControllerRef.current;
      operationControllerRef.current = null;
      controller?.abort();
    },
    [],
  );

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Image,
      Placeholder.configure({ placeholder: "Tulis artikel di sini…" }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: (initialContent as object | string) ?? "",
    editorProps: {
      attributes: {
        class:
          "prose prose-sm sm:prose-base max-w-none min-h-[320px] p-4 focus:outline-none prose-headings:font-display prose-a:text-primary-readable",
      },
    },
    onUpdate: ({ editor }) =>
      onChange(editor.getHTML(), JSON.stringify(editor.getJSON())),
  });

  if (!editor) return null;
  const activeEditor = editor;

  async function uploadAndInsertImage(file: File, signal: AbortSignal) {
    const validation = validateImageFile(file);
    if (!validation.ok) {
      throw new Error(validation.error);
    }

    const form = new FormData();
    form.set("file", file);
    const data = await requestJson<{
      url?: string;
    }>(
      "/api/blog-image",
      { method: "POST", body: form, signal },
      "Gambar gagal diunggah.",
    );
    if (!data.url) throw new Error("Respons unggahan gambar tidak lengkap.");
    if (activeEditor.isDestroyed) {
      throw new Error("Editor artikel sudah ditutup.");
    }
    const inserted = activeEditor
      .chain()
      .focus()
      .setImage({ src: data.url })
      .run();
    if (!inserted) throw new Error("Gambar gagal dimasukkan ke artikel.");
    toast.success("Gambar ditambahkan ke artikel.");
  }

  async function selectImage(file: File | undefined) {
    if (!file || uploading) return;
    const controller = beginImageOperation();
    try {
      const prepared = await prepareImageFile(file, controller.signal);
      const validation = validateImageFile(prepared.file);
      if (!validation.ok) throw new Error(validation.error);

      setPendingFile(prepared.file);
      if (canEditPhoto(prepared.file) && !prepared.animated) {
        setEditorOpen(true);
        if (prepared.notice) toast.success(prepared.notice);
        return;
      }

      await uploadAndInsertImage(prepared.file, controller.signal);
      setPendingFile(null);
    } catch (cause) {
      if (controller.signal.aborted) return;
      setPendingFile(null);
      toast.error(
        cause instanceof Error
          ? cause.message
          : "Gambar tidak dapat dipersiapkan.",
      );
    } finally {
      finishImageOperation(controller);
    }
  }

  function toggleLink() {
    const prev = editor!.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL tautan (kosongkan untuk hapus):", prev ?? "");
    if (url === null) return;
    if (url === "") {
      editor!.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor!.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  }

  return (
    <>
      <div className="border-border rounded-ios overflow-hidden border">
        <div className="border-border bg-surface sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b p-1.5">
          <Tb icon={Undo2} title="Undo" onClick={() => editor.chain().focus().undo().run()} />
          <Tb icon={Redo2} title="Redo" onClick={() => editor.chain().focus().redo().run()} />
          <Divider />
          <Tb icon={Heading1} title="Judul 1" active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} />
          <Tb icon={Heading2} title="Judul 2" active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} />
          <Divider />
          <Tb icon={Bold} title="Tebal" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} />
          <Tb icon={Italic} title="Miring" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} />
          <Tb icon={UnderlineIcon} title="Garis bawah" active={editor.isActive("underline")} onClick={() => editor.chain().focus().toggleUnderline().run()} />
          <Tb icon={Strikethrough} title="Coret" active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} />
          <Divider />
          <Tb icon={List} title="Poin" active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} />
          <Tb icon={ListOrdered} title="Bernomor" active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} />
          <Tb icon={Quote} title="Kutipan" active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} />
          <Divider />
          <Tb icon={AlignLeft} title="Rata kiri" active={editor.isActive({ textAlign: "left" })} onClick={() => editor.chain().focus().setTextAlign("left").run()} />
          <Tb icon={AlignCenter} title="Rata tengah" active={editor.isActive({ textAlign: "center" })} onClick={() => editor.chain().focus().setTextAlign("center").run()} />
          <Tb icon={AlignRight} title="Rata kanan" active={editor.isActive({ textAlign: "right" })} onClick={() => editor.chain().focus().setTextAlign("right").run()} />
          <Divider />
          <Tb icon={Link2} title="Tautan" active={editor.isActive("link")} onClick={toggleLink} />
          <Tb
            buttonRef={imageButtonRef}
            icon={uploading ? LoaderCircle : ImageIcon}
            title={uploading ? "Mengunggah gambar" : "Gambar"}
            disabled={uploading}
            busy={uploading}
            onClick={() => fileRef.current?.click()}
          />
          <input
            ref={fileRef}
            type="file"
            accept={IMAGE_UPLOAD_ACCEPT}
            disabled={uploading}
            className="hidden"
            onChange={(event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              void selectImage(file);
            }}
          />
        </div>
        <EditorContent editor={editor} />
      </div>
      <PhotoEditor
        open={editorOpen}
        file={pendingFile}
        profile="article-image"
        returnFocus={returnImageButton}
        onCancel={() => {
          setEditorOpen(false);
          setPendingFile(null);
        }}
        onSave={async (result) => {
          const controller = beginImageOperation();
          try {
            await uploadAndInsertImage(result.file, controller.signal);
            setEditorOpen(false);
            setPendingFile(null);
          } catch (cause) {
            if (!controller.signal.aborted) {
              const message =
                cause instanceof Error
                  ? cause.message
                  : "Gambar gagal diunggah.";
              toast.error(message);
              throw cause instanceof Error ? cause : new Error(message);
            }
          } finally {
            finishImageOperation(controller);
          }
        }}
      />
    </>
  );
}

function Tb({
  icon: Icon,
  title,
  active,
  disabled,
  busy,
  buttonRef,
  onClick,
}: {
  icon: LucideIcon;
  title: string;
  active?: boolean;
  disabled?: boolean;
  busy?: boolean;
  buttonRef?: Ref<HTMLButtonElement>;
  onClick: () => void;
}) {
  return (
    <button
      ref={buttonRef}
      type="button"
      title={title}
      aria-label={title}
      aria-busy={busy || undefined}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "hover:bg-surface-2 grid h-8 w-8 place-items-center rounded-lg transition disabled:cursor-wait disabled:opacity-50",
        active && "bg-primary/10 text-primary-readable",
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn("h-[17px] w-[17px]", busy && "animate-spin")}
      />
    </button>
  );
}

function Divider() {
  return <span className="bg-border mx-1 h-5 w-px" />;
}
