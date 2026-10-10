"use client";

import { useCallback, useEffect, useRef, useState, type Ref } from "react";
import {
  EditorContent,
  useEditor,
  useEditorState,
  type Editor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Check,
  Heading1,
  Heading2,
  ImageIcon,
  Italic,
  Link2,
  Link2Off,
  List,
  ListOrdered,
  LoaderCircle,
  Quote,
  Redo2,
  Strikethrough,
  UnderlineIcon,
  Undo2,
  X,
  type LucideIcon,
} from "lucide-react";
import { PhotoEditor } from "@/components/media-editor";
import { useToast } from "@/components/ui/toast";
import { requestJson } from "@/lib/api/client";
import { IMAGE_UPLOAD_ACCEPT } from "@/lib/constants";
import { canEditPhoto } from "@/lib/media-editor";
import { prepareImageFile } from "@/lib/media-formats";
import { validateImageFile } from "@/lib/uploads/policy";
import { readingTime, wordCount } from "@/lib/utils/reading-time";
import { cn } from "@/lib/utils/cn";

const LINK_PROTOCOLS = new Set(["https:", "http:", "mailto:"]);

/**
 * Tautan artikel: path internal, web, atau email. Tanpa skema dianggap
 * https ("contoh.org"); javascript:/data: dan lainnya ditolak di sini
 * (server tetap menyaring ulang lewat normalizeArticleHtml).
 */
function safeLinkHref(value: string): string | null {
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  const candidate = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(candidate);
    return LINK_PROTOCOLS.has(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Status aktif tombol toolbar. TipTap v3 tidak lagi merender ulang komponen
 * pada tiap transaksi, jadi status dibaca lewat useEditorState: memindah
 * kursor ke teks tebal/judul langsung memperbarui tombol yang aktif.
 */
function toolbarState(editor: Editor | null) {
  if (!editor) return null;
  return {
    heading1: editor.isActive("heading", { level: 1 }),
    heading2: editor.isActive("heading", { level: 2 }),
    bold: editor.isActive("bold"),
    italic: editor.isActive("italic"),
    underline: editor.isActive("underline"),
    strike: editor.isActive("strike"),
    bulletList: editor.isActive("bulletList"),
    orderedList: editor.isActive("orderedList"),
    blockquote: editor.isActive("blockquote"),
    alignLeft: editor.isActive({ textAlign: "left" }),
    alignCenter: editor.isActive({ textAlign: "center" }),
    alignRight: editor.isActive({ textAlign: "right" }),
    link: editor.isActive("link"),
    canUndo: editor.can().undo(),
    canRedo: editor.can().redo(),
    words: wordCount(editor.getText()),
  };
}

/**
 * Editor artikel admin (TipTap): toolbar kaca menempel saat digulir, bilah
 * tautan inline (pengganti prompt browser), gambar lewat PhotoEditor bersama,
 * dan hitungan kata/waktu baca. onChange mengirim HTML (render) + JSON (edit).
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
  const linkInputRef = useRef<HTMLInputElement>(null);
  const operationControllerRef = useRef<AbortController | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [linkDraft, setLinkDraft] = useState<string | null>(null);
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

  useEffect(() => {
    if (linkDraft !== null) linkInputRef.current?.focus();
  }, [linkDraft]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ link: { openOnClick: false } }),
      Image,
      Placeholder.configure({ placeholder: "Mulai menulis cerita…" }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: (initialContent as object | string) ?? "",
    editorProps: {
      attributes: {
        "aria-label": "Isi artikel",
        class:
          "prose prose-sm sm:prose-base max-w-none min-h-[22rem] px-5 py-5 focus:outline-hidden prose-headings:font-display prose-a:text-primary-readable prose-img:rounded-2xl",
      },
    },
    onUpdate: ({ editor: current }) =>
      onChange(current.getHTML(), JSON.stringify(current.getJSON())),
  });
  const active = useEditorState({
    editor,
    selector: ({ editor: current }) => toolbarState(current),
  });

  if (!editor || !active) {
    return <div className="motion-skeleton min-h-[26rem] rounded-card" aria-hidden="true" />;
  }
  const activeEditor = editor;
  const chain = () => activeEditor.chain().focus();

  async function uploadAndInsertImage(file: File, signal: AbortSignal) {
    const validation = validateImageFile(file);
    if (!validation.ok) throw new Error(validation.error);
    const form = new FormData();
    form.set("file", file);
    const data = await requestJson<{ url?: string }>(
      "/api/blog-image",
      { method: "POST", body: form, signal },
      "Gambar gagal diunggah.",
    );
    if (!data.url) throw new Error("Respons unggahan gambar tidak lengkap.");
    if (activeEditor.isDestroyed) throw new Error("Editor artikel sudah ditutup.");
    const inserted = activeEditor.chain().focus().setImage({ src: data.url }).run();
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
      toast.error(cause instanceof Error ? cause.message : "Gambar tidak dapat dipersiapkan.");
    } finally {
      finishImageOperation(controller);
    }
  }

  function openLinkBar() {
    setLinkDraft((activeEditor.getAttributes("link").href as string | undefined) ?? "");
  }

  function applyLink() {
    const value = linkDraft?.trim() ?? "";
    if (!value) {
      chain().extendMarkRange("link").unsetLink().run();
      setLinkDraft(null);
      return;
    }
    const href = safeLinkHref(value);
    if (!href) {
      toast.error("Tautan harus berupa URL web atau path internal.");
      return;
    }
    chain().extendMarkRange("link").setLink({ href }).run();
    setLinkDraft(null);
  }

  return (
    <>
      {/* overflow-clip (bukan hidden): tidak membuat wadah gulir, jadi
          toolbar sticky tetap menempel saat halaman digulir. */}
      <div className="border-border bg-surface shadow-soft overflow-clip rounded-card border">
        <div className="glass-material sticky top-[calc(3.75rem+var(--safe-top))] z-10 border-x-0 border-t-0 lg:top-[calc(4.25rem+var(--safe-top))]">
          <div
            role="toolbar"
            aria-label="Format artikel"
            className="no-scrollbar flex items-center gap-0.5 overflow-x-auto p-1.5"
          >
            <ToolGroup>
              <Tool icon={Undo2} title="Urungkan" disabled={!active.canUndo} onClick={() => chain().undo().run()} />
              <Tool icon={Redo2} title="Ulangi" disabled={!active.canRedo} onClick={() => chain().redo().run()} />
            </ToolGroup>
            <ToolGroup>
              <Tool icon={Heading1} title="Judul 1" active={active.heading1} onClick={() => chain().toggleHeading({ level: 1 }).run()} />
              <Tool icon={Heading2} title="Judul 2" active={active.heading2} onClick={() => chain().toggleHeading({ level: 2 }).run()} />
            </ToolGroup>
            <ToolGroup>
              <Tool icon={Bold} title="Tebal" active={active.bold} onClick={() => chain().toggleBold().run()} />
              <Tool icon={Italic} title="Miring" active={active.italic} onClick={() => chain().toggleItalic().run()} />
              <Tool icon={UnderlineIcon} title="Garis bawah" active={active.underline} onClick={() => chain().toggleUnderline().run()} />
              <Tool icon={Strikethrough} title="Coret" active={active.strike} onClick={() => chain().toggleStrike().run()} />
            </ToolGroup>
            <ToolGroup>
              <Tool icon={List} title="Poin" active={active.bulletList} onClick={() => chain().toggleBulletList().run()} />
              <Tool icon={ListOrdered} title="Bernomor" active={active.orderedList} onClick={() => chain().toggleOrderedList().run()} />
              <Tool icon={Quote} title="Kutipan" active={active.blockquote} onClick={() => chain().toggleBlockquote().run()} />
            </ToolGroup>
            <ToolGroup>
              <Tool icon={AlignLeft} title="Rata kiri" active={active.alignLeft} onClick={() => chain().setTextAlign("left").run()} />
              <Tool icon={AlignCenter} title="Rata tengah" active={active.alignCenter} onClick={() => chain().setTextAlign("center").run()} />
              <Tool icon={AlignRight} title="Rata kanan" active={active.alignRight} onClick={() => chain().setTextAlign("right").run()} />
            </ToolGroup>
            <ToolGroup last>
              <Tool icon={Link2} title="Tautan" active={active.link || linkDraft !== null} onClick={openLinkBar} />
              <Tool
                buttonRef={imageButtonRef}
                icon={uploading ? LoaderCircle : ImageIcon}
                title={uploading ? "Mengunggah gambar" : "Sisipkan gambar"}
                disabled={uploading}
                busy={uploading}
                onClick={() => fileRef.current?.click()}
              />
            </ToolGroup>
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

          {linkDraft !== null && (
            <div className="border-border/70 animate-fade-in flex items-center gap-1.5 border-t p-1.5">
              <Link2 className="text-muted ml-2 size-4 shrink-0" aria-hidden="true" />
              <input
                ref={linkInputRef}
                value={linkDraft}
                onChange={(event) => setLinkDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    applyLink();
                  }
                  if (event.key === "Escape") {
                    event.preventDefault();
                    setLinkDraft(null);
                    activeEditor.commands.focus();
                  }
                }}
                aria-label="Alamat tautan"
                placeholder="https://… atau /blog/…"
                className="placeholder:text-muted min-w-0 flex-1 bg-transparent px-1 text-base outline-hidden sm:text-sm"
              />
              <Tool icon={Check} title="Terapkan tautan" onClick={applyLink} />
              {active.link && (
                <Tool
                  icon={Link2Off}
                  title="Hapus tautan"
                  onClick={() => {
                    chain().extendMarkRange("link").unsetLink().run();
                    setLinkDraft(null);
                  }}
                />
              )}
              <Tool icon={X} title="Tutup" onClick={() => setLinkDraft(null)} />
            </div>
          )}
        </div>

        <EditorContent editor={editor} />

        <div className="border-border/70 text-muted flex items-center justify-between border-t px-4 py-2 text-caption1 tabular-nums">
          <span>{active.words} kata</span>
          <span>±{readingTime(editor.getText())} mnt baca</span>
        </div>
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
              const message = cause instanceof Error ? cause.message : "Gambar gagal diunggah.";
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

function ToolGroup({ children, last = false }: { children: React.ReactNode; last?: boolean }) {
  return (
    <div className={cn("flex shrink-0 items-center gap-0.5", !last && "border-border/70 mr-1 border-r pr-1")}>
      {children}
    </div>
  );
}

function Tool({
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
      aria-pressed={active === undefined ? undefined : active}
      aria-busy={busy || undefined}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(
        "motion-pressable grid size-9 shrink-0 place-items-center rounded-xl transition-colors disabled:opacity-35",
        active ? "bg-primary/12 text-primary-readable" : "text-muted hover:bg-surface-2 hover:text-foreground",
      )}
    >
      <Icon aria-hidden="true" className={cn("size-[17px]", busy && "animate-spin")} />
    </button>
  );
}
