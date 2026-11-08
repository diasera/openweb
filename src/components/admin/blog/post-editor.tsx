"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Archive,
  ExternalLink,
  FileText,
  Globe,
  Save,
  Send,
  Settings2,
  type LucideIcon,
} from "lucide-react";
import { savePost } from "@/app/profil/(admin)/blog/actions";
import { useIslandActions } from "@/components/public/dynamic-island";
import { buttonClass } from "@/components/ui/button";
import { RelativeTime } from "@/components/ui/relative-time";
import { useToast } from "@/components/ui/toast";
import { BLOG_CATEGORIES, categoryOptions } from "@/lib/categories";
import { adminBlogEditorHref } from "@/lib/constants";
import { useFormDirty } from "@/lib/hooks/use-form-dirty";
import { hasPreparingImageDraft } from "@/lib/hooks/use-image-draft";
import { useSaveShortcut } from "@/lib/hooks/use-save-shortcut";
import type { BlogPostRow, PostStatus } from "@/lib/types/database";
import { slugify } from "@/lib/utils/slug";
import { ChoiceChip, FormSection, SelectField, TextAreaField, TextField } from "../form-controls";
import { ImageField } from "../image-field";
import { IslandSaveButton } from "../island-save";
import { SerpPreview } from "../serp-preview";
import { useAdminAction } from "../use-admin-action";
import { RichEditor } from "./rich-editor";

const STATUS_CHOICES: ReadonlyArray<{ value: PostStatus; label: string; description: string }> = [
  { value: "draft", label: "Draf", description: "Hanya terlihat di admin." },
  { value: "published", label: "Terbit", description: "Tampil di blog, sitemap, dan feed RSS." },
  { value: "archived", label: "Arsip", description: "Disembunyikan dari publik, bisa diterbitkan lagi." },
];

interface PrimaryAction {
  label: string;
  busy: string;
  success: string;
  icon: LucideIcon;
}

/**
 * Satu tombol utama di island, labelnya mengikuti status yang dipilih:
 * menerbitkan, memperbarui artikel terbit, mengarsipkan, atau menyimpan draf.
 */
function primaryAction(saved: PostStatus | null, next: PostStatus): PrimaryAction {
  if (next === "published") {
    return saved === "published"
      ? { label: "Perbarui", busy: "Memperbarui…", success: "Artikel diperbarui", icon: Send }
      : { label: "Terbitkan", busy: "Menerbitkan…", success: "Artikel diterbitkan", icon: Send };
  }
  if (next === "archived" && saved !== "archived") {
    return { label: "Arsipkan", busy: "Mengarsipkan…", success: "Artikel diarsipkan", icon: Archive };
  }
  return {
    label: "Simpan",
    busy: "Menyimpan…",
    success: next === "draft" ? "Draf tersimpan" : "Artikel tersimpan",
    icon: Save,
  };
}

function excerptFromHtml(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 160);
}

/**
 * Editor artikel: judul besar + editor kaya sebagai fokus utama; publikasi
 * (status Draf/Terbit/Arsip), cover, kategori, tag, ringkasan, dan pratinjau
 * Google di kolom samping. Dynamic Island hanya memuat Kembali, judul, dan
 * SATU tombol utama selama ada perubahan (prioritas edit). Ctrl/⌘+S
 * menyimpan dengan status terpilih. Setelah simpan, editor tetap terbuka.
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
  const savedStatus = post?.status ?? null;
  const [status, setStatus] = useState<PostStatus>(post?.status ?? "draft");
  const [html, setHtml] = useState(post?.content_html ?? "");
  const [json, setJson] = useState(post?.content_json ? JSON.stringify(post.content_json) : "");
  const [title, setTitle] = useState(post?.title ?? "");
  const [excerpt, setExcerpt] = useState(post?.excerpt ?? "");
  const action = primaryAction(savedStatus, status);

  function save() {
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
    formData.set("status", status);
    formData.set("content_html", html);
    formData.set("content_json", json);
    let savedId: string | undefined;
    run(
      async () => {
        const result = await savePost(formData);
        savedId = result.id;
        return result;
      },
      {
        successMessage: action.success,
        errorMessage: "Koneksi terputus saat menyimpan artikel. Coba lagi.",
        onSuccess: () => {
          setDirty(false);
          if (!post && savedId) router.replace(adminBlogEditorHref(savedId));
          else router.refresh();
        },
      },
    );
  }

  useSaveShortcut(save);

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
  const Icon = action.icon;

  // Prioritas island: tombol utama hanya selama ada yang perlu disimpan
  // (artikel baru selalu belum tersimpan); sesudahnya island kembali normal.
  useIslandActions(
    dirty || !post || pending
      ? {
          actions: (
            <IslandSaveButton
              pending={pending}
              onClick={save}
              title={`${action.label} (Ctrl/⌘ S)`}
              icon={<Icon className="size-4" aria-hidden="true" />}
            >
              {pending ? action.busy : action.label}
            </IslandSaveButton>
          ),
        }
      : null,
  );

  return (
    <form
      ref={formRef}
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
      className="space-y-5"
    >
      {post && <input type="hidden" name="id" value={post.id} />}

      {/* grid-cols-1 = minmax(0,1fr): tanpa itu kolom implisit "auto" melebar
          mengikuti konten terlebar dan halaman bergulir menyamping di ponsel. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
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
              // Format lewat toolbar (tebal, judul, gambar) tidak memicu event
              // `input` native, jadi perubahannya ditandai dari sini.
              setDirty(true);
            }}
          />
        </div>

        {/* ---- Publikasi & pengaturan artikel ------------------------------ */}
        <div className="space-y-4 lg:sticky-below-island">
          <FormSection title="Publikasi" icon={<Globe className="size-5" />}>
            <div
              role="radiogroup"
              aria-label="Status artikel"
              className="space-y-2"
              onChange={(event: ChangeEvent<HTMLDivElement>) => {
                const input = event.target as unknown as HTMLInputElement;
                if (input.name === "status") setStatus(input.value as PostStatus);
              }}
            >
              {STATUS_CHOICES.map((choice) => (
                <ChoiceChip
                  key={choice.value}
                  type="radio"
                  name="status"
                  value={choice.value}
                  label={choice.label}
                  description={choice.description}
                  defaultChecked={status === choice.value}
                />
              ))}
            </div>
            {post && (
              <div className="text-muted flex flex-wrap items-center gap-x-2 gap-y-1 text-caption1">
                <span>
                  Diperbarui <RelativeTime iso={post.updated_at} />
                </span>
                {post.status === "published" && (
                  <Link
                    href={`/blog/${post.slug}`}
                    target="_blank"
                    className={buttonClass({ variant: "ghost", size: "sm", className: "ml-auto -my-1 h-8" })}
                  >
                    <ExternalLink className="size-3.5" aria-hidden="true" /> Lihat di situs
                  </Link>
                )}
              </div>
            )}
          </FormSection>

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
              options={categoryOptions(BLOG_CATEGORIES, post?.category)}
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
