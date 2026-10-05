"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { fieldClass, Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/field";
import { Card } from "@/components/ui/card";
import { ImageField } from "@/components/admin/image-field";
import { RichEditor } from "@/components/admin/rich-editor";
import { useAdminAction } from "@/components/admin/use-admin-action";
import { savePost } from "@/app/profil/(admin)/blog/actions";
import { useToast } from "@/components/ui/toast";
import { BLOG_CATEGORIES } from "@/lib/categories";
import { hasPreparingImageDraft } from "@/lib/hooks/use-image-draft";
import type { BlogPostRow, PostStatus } from "@/lib/types/database";

/** Editor artikel penuh: judul, ringkasan, cover, konten kaya, simpan/terbit. */
export function PostEditor({ post }: { post?: BlogPostRow }) {
  const router = useRouter();
  const { toast } = useToast();
  const formRef = useRef<HTMLFormElement>(null);
  const { pending, run } = useAdminAction();
  const [note, setNote] = useState("");
  // Hanya penanda label tombol; `pending` menentukan apakah sedang menyimpan.
  const [savingStatus, setSavingStatus] = useState<PostStatus | null>(null);
  const [html, setHtml] = useState(post?.content_html ?? "");
  const [json, setJson] = useState(
    post?.content_json ? JSON.stringify(post.content_json) : "",
  );

  function reject(message: string) {
    setNote(message);
    toast.error(message);
  }

  function save(status: PostStatus) {
    if (!formRef.current) return;
    if (hasPreparingImageDraft(formRef.current)) {
      reject("Tunggu sampai gambar selesai disiapkan.");
      return;
    }
    const fd = new FormData(formRef.current);
    if (!String(fd.get("title") ?? "").trim()) {
      reject("Judul wajib diisi.");
      return;
    }
    fd.set("status", status);
    fd.set("content_html", html);
    fd.set("content_json", json);
    setNote("");
    setSavingStatus(status);
    run(() => savePost(fd), {
      successMessage:
        status === "published" ? "Artikel diterbitkan" : "Draft tersimpan",
      errorMessage: "Koneksi terputus saat menyimpan artikel. Coba lagi.",
      onError: setNote,
      onSuccess: () => {
        router.push("/profil/blog");
        router.refresh();
      },
    });
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <Link
          href="/profil/blog"
          className="text-muted hover:text-foreground inline-flex items-center gap-1 text-sm"
        >
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={pending} onClick={() => save("draft")}>
            {pending && savingStatus === "draft" ? "Menyimpan…" : "Simpan draft"}
          </Button>
          <Button size="sm" disabled={pending} onClick={() => save("published")}>
            {pending && savingStatus === "published" ? "Menerbitkan…" : "Terbitkan"}
          </Button>
        </div>
      </div>

      <form ref={formRef} className="space-y-4" onSubmit={(e) => e.preventDefault()}>
        {post && <input type="hidden" name="id" value={post.id} />}

        <input
          name="title"
          defaultValue={post?.title}
          placeholder="Judul artikel"
          aria-label="Judul artikel"
          required
          maxLength={160}
          className="font-display placeholder:text-muted w-full bg-transparent text-3xl font-bold outline-hidden"
        />

        <Card className="p-4">
          <div className="grid gap-4">
            <ImageField
              name="cover"
              label="Gambar cover (opsional)"
              initialUrl={post?.cover_image_url}
              profile="blog-cover"
              wide
              removable
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Kategori" htmlFor="category">
                <select
                  id="category"
                  name="category"
                  defaultValue={post?.category ?? ""}
                  className={fieldClass("self", "h-11 w-full rounded-2xl px-3 text-base outline-hidden sm:text-subhead")}
                >
                  <option value="">— pilih —</option>
                  {BLOG_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Tag" htmlFor="tags" hint="Pisahkan dengan koma.">
                <Input
                  id="tags"
                  name="tags"
                  defaultValue={post?.tags?.join(", ") ?? ""}
                  placeholder="panduan, kegiatan"
                />
              </Field>
            </div>
            <Field label="Ringkasan (opsional)" htmlFor="excerpt" hint="Tampil di daftar blog & SEO.">
              <Textarea id="excerpt" name="excerpt" rows={2} defaultValue={post?.excerpt ?? ""} />
            </Field>
          </div>
        </Card>

        <RichEditor
          initialContent={post?.content_json ?? post?.content_html}
          onChange={(h, j) => {
            setHtml(h);
            setJson(j);
          }}
        />

        {note && (
          <p className="text-danger text-sm" role="alert">
            {note}
          </p>
        )}
      </form>
    </div>
  );
}
