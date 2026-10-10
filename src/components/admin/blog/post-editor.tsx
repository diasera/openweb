"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  LoaderCircle,
  Save,
  Send,
  Settings2,
} from "lucide-react";
import { savePost } from "@/app/profil/(admin)/blog/actions";
import { Button, buttonClass } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { BLOG_CATEGORIES } from "@/lib/categories";
import { adminFeatureHref } from "@/lib/constants";
import { useFormDirty } from "@/lib/hooks/use-form-dirty";
import { hasPreparingImageDraft } from "@/lib/hooks/use-image-draft";
import type { BlogPostRow, PostStatus } from "@/lib/types/database";
import { slugify } from "@/lib/utils/slug";
import { StatusBadge } from "../admin-list";
import { FormSection, SelectField, TextAreaField, TextField } from "../form-controls";
import { ImageField } from "../image-field";
import { SerpPreview } from "../serp-preview";
import { useAdminAction } from "../use-admin-action";
import { RichEditor } from "./rich-editor";

const BLOG_ADMIN_HREF = adminFeatureHref("blog");
const STATUS_LABEL: Record<PostStatus, string> = {
  draft: "Draf",
  published: "Terbit",
  archived: "Arsip",
};

function excerptFromHtml(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160);
}

/**
 * Editor artikel: judul besar + editor kaya sebagai fokus utama, pengaturan
 * (cover, kategori, tag, ringkasan, pratinjau Google) di kolom samping.
 * Bilah aksi menempel, menandai perubahan yang belum disimpan, dan Ctrl/⌘+S
 * menyimpan tanpa mengubah status. Setelah simpan, editor tetap terbuka.
 */
export function PostEditor({
  post,
  siteName,
  siteUrl,
  logoUrl,
}: {
  post?: BlogPostRow;
  siteName: string;
  /** Origin kanonis dari server (getSiteOrigin). */
  siteUrl: string;
  logoUrl: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const { dirty, setDirty } = useFormDirty(formRef);
  const { pending, run } = useAdminAction();
  const [savingStatus, setSavingStatus] = useState<PostStatus | null>(null);
  const [html, setHtml] = useState(post?.content_html ?? "");
  const [json, setJson] = useState(post?.content_json ? JSON.stringify(post.content_json) : "");
  const [title, setTitle] = useState(post?.title ?? "");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const status = post?.status ?? "draft";
  const categories = post?.category && !(BLOG_CATEGORIES as readonly string[]).includes(post.category)
    ? [post.category, ...BLOG_CATEGORIES]
    : BLOG_CATEGORIES;

  function save(nextStatus: PostStatus) {
    const form = formRef.current;
    if (!form || pending) return;
    if (hasPreparingImageDraft(form)) {
      toast.error("Tunggu sampai gambar selesai disiapkan.");
      return;
    }
    const formData = new FormData(form);
    if (!String(formData.get("title") ?? "").trim()) {
      toast.error("Judul wajib diisi.");
      form.querySelector<HTMLInputElement>("[name=title]")?.focus();
      return;
    }
    formData.set("status", nextStatus);
    formData.set("content_html", html);
    formData.set("content_json", json);
    setSavingStatus(nextStatus);
    let savedId: string | undefined;
    run(
      async () => {
        const result = await savePost(formData);
        savedId = result.id;
        return result;
      },
      {
        successMessage:
          nextStatus === "published"
            ? status === "published"
              ? "Artikel diperbarui"
              : "Artikel diterbitkan"
            : nextStatus === "archived"
              ? "Artikel diarsipkan"
              : "Draf tersimpan",
        errorMessage: "Koneksi terputus saat menyimpan artikel. Coba lagi.",
        onSuccess: () => {
          setDirty(false);
          if (!post && savedId) router.replace(`${BLOG_ADMIN_HREF}/${savedId}`);
          else router.refresh();
        },
      },
    );
  }

  // Ctrl/⌘+S menyimpan dengan status saat ini (draf tetap draf, terbit tetap terbit).
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        saveRef.current(status === "archived" ? "draft" : status);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [status]);

  // Judul tumbuh mengikuti isinya; `field-sizing` belum ada di semua browser.
  const titleRef = useRef<HTMLTextAreaElement>(null);
  const fitTitle = () => {
    const element = titleRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  };
  useEffect(fitTitle, []);

  const slug = slugify(title || "artikel");
  const busyLabel = (target: PostStatus, idle: string, busy: string) =>
    pending && savingStatus === target ? busy : idle;

  return (
    <form
      ref={formRef}
      onSubmit={(event) => {
        event.preventDefault();
        save(status === "published" ? "published" : "draft");
      }}
      className="space-y-5"
    >
      {post && <input type="hidden" name="id" value={post.id} />}

      {/* ---- Bilah aksi menempel ----------------------------------------- */}
      <div className="glass-material sticky top-[calc(4.25rem+var(--safe-top))] z-20 -mx-1 flex items-center gap-2 rounded-full p-1.5 shadow-[var(--shadow-glass)] lg:top-[calc(4.75rem+var(--safe-top))]">
        <Link
          href={BLOG_ADMIN_HREF}
          aria-label="Kembali ke daftar artikel"
          className="hover:bg-surface-2 grid size-9 shrink-0 place-items-center rounded-full transition-colors"
        >
          <ArrowLeft className="size-4.5" aria-hidden="true" />
        </Link>
        <StatusBadge tone={status === "published" ? "success" : "neutral"}>
          {STATUS_LABEL[status]}
        </StatusBadge>
        {dirty && (
          <span className="text-muted hidden items-center gap-1.5 text-caption1 font-medium sm:inline-flex">
            <span className="bg-warning size-1.5 rounded-full" aria-hidden="true" />
            Belum disimpan
          </span>
        )}
        <span className="flex-1" />
        {post?.status === "published" && (
          <Link
            href={`/blog/${post.slug}`}
            target="_blank"
            className={buttonClass({ variant: "ghost", size: "sm", className: "hidden sm:inline-flex" })}
          >
            <ExternalLink className="size-4" aria-hidden="true" /> Lihat
          </Link>
        )}
        {status !== "published" && (
          <Button variant="secondary" size="sm" disabled={pending} onClick={() => save("draft")}>
            {pending && savingStatus === "draft" ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="size-4" aria-hidden="true" />
            )}
            {busyLabel("draft", "Simpan draf", "Menyimpan…")}
          </Button>
        )}
        <Button
          size="sm"
          disabled={pending}
          onClick={() => save("published")}
          className="motion-sheen relative overflow-hidden"
        >
          {pending && savingStatus === "published" ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Send className="size-4" aria-hidden="true" />
          )}
          {status === "published"
            ? busyLabel("published", "Perbarui", "Memperbarui…")
            : busyLabel("published", "Terbitkan", "Menerbitkan…")}
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        {/* ---- Tulisan ---------------------------------------------------- */}
        <div className="min-w-0 space-y-4">
          <textarea
            ref={titleRef}
            name="title"
            rows={1}
            defaultValue={post?.title}
            placeholder="Judul artikel"
            aria-label="Judul artikel"
            required
            maxLength={160}
            onChange={(event) => {
              setTitle(event.target.value);
              fitTitle();
            }}
            // Judul satu paragraf: Enter tidak membuat baris baru.
            onKeyDown={(event) => {
              if (event.key === "Enter") event.preventDefault();
            }}
            className="font-display placeholder:text-muted/60 w-full resize-none overflow-hidden bg-transparent text-title1 font-bold leading-tight tracking-tight outline-hidden sm:text-large-title"
          />
          <RichEditor
            initialContent={post?.content_json ?? post?.content_html}
            onChange={(nextHtml, nextJson) => {
              setHtml(nextHtml);
              setJson(nextJson);
            }}
          />
        </div>

        {/* ---- Pengaturan artikel ------------------------------------------ */}
        <div className="space-y-4 lg:sticky lg:top-[calc(8.5rem+var(--safe-top))]">
          <FormSection title="Pengaturan" icon={<Settings2 className="size-5" />}>
            <ImageField
              name="cover"
              label="Gambar cover"
              initialUrl={post?.cover_image_url}
              profile="blog-cover"
              wide
              removable
              hint="Tampil di daftar blog dan kartu sosial artikel."
            />
            <SelectField
              label="Kategori"
              id="category"
              name="category"
              defaultValue={post?.category ?? ""}
              options={[
                { value: "", label: "— Tanpa kategori —" },
                ...categories.map((category) => ({ value: category, label: category })),
              ]}
            />
            <TextField
              label="Tag"
              id="tags"
              name="tags"
              defaultValue={post?.tags?.join(", ") ?? ""}
              placeholder="panduan, kegiatan"
              hint="Pisahkan dengan koma."
              maxLength={200}
            />
            <TextAreaField
              label="Ringkasan"
              id="excerpt"
              name="excerpt"
              rows={3}
              maxLength={300}
              defaultValue={post?.excerpt ?? ""}
              onChange={(event) => setExcerpt(event.target.value)}
              hint={`${excerpt.length}/300 · tampil di daftar blog dan hasil pencarian.`}
            />
          </FormSection>

          <FormSection title="Di Google" icon={<FileText className="size-5" />}>
            <SerpPreview
              siteName={siteName}
              logoUrl={logoUrl}
              url={`${siteUrl}/blog/${post?.status === "published" ? post.slug : slug}`}
              title={`${title || "Judul artikel"} · ${siteName}`}
              description={excerpt || excerptFromHtml(html)}
            />
            <p className="text-muted text-caption1 leading-relaxed">
              Ringkasan kosong memakai paragraf pertama. URL lama otomatis dialihkan bila
              judul artikel terbit diganti.
            </p>
          </FormSection>
        </div>
      </div>
    </form>
  );
}
