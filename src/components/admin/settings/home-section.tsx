"use client";

import { useCallback, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  House,
  Monitor,
  Plus,
  ScrollText,
  Smartphone,
  Trash2,
} from "lucide-react";
import { Hero } from "@/components/public/hero";
import { fieldClass } from "@/components/ui/input";
import { useNow } from "@/lib/hooks/use-now";
import {
  hasReadableText,
  resolveHeroContent,
  SITE_CONFIG_LIMITS,
} from "@/lib/site-config/client";
import { cn } from "@/lib/utils/cn";
import { zonedParts } from "@/lib/utils/time";
import type { SiteSettingsRow } from "@/lib/types/database";
import { saveHomeSettings } from "@/app/profil/(admin)/setting/actions";
import {
  FieldGroup,
  FormSection,
  SwitchField,
  TextAreaField,
  TextField,
} from "../form-controls";
import { ImageField, type ImageFieldPreview } from "../image-field";
import { SettingsTabForm } from "./settings-tab-form";
import { useSettingsSectionForm } from "./use-settings-section-form";

function samePreview(a: ImageFieldPreview, b: ImageFieldPreview) {
  return (
    a.url === b.url &&
    a.dimensions?.width === b.dimensions?.width &&
    a.dimensions?.height === b.dimensions?.height
  );
}

/**
 * Tab Beranda: hero halaman depan (label, judul + sakelar tampil, subjudul,
 * foto) dengan pratinjau langsung Desktop / Ponsel memakai komponen Hero
 * produksi, builder daftar Misi interaktif, visi, dan teks footer.
 */
export function HomeSection({
  settings,
  onDirtyChange,
}: {
  settings: SiteSettingsRow;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const { formRef, dirty, handleSubmit, pending, fieldErrors } =
    useSettingsSectionForm(
      "home",
      saveHomeSettings,
      "Beranda tersimpan",
      onDirtyChange,
    );
  const resolved = resolveHeroContent(settings);
  // Judul lama berisi simbol (mis. ".") = cara lama menyembunyikan judul.
  const initialTitle = hasReadableText(settings.hero_title)
    ? settings.hero_title
    : "";
  const [hero, setHero] = useState({
    hero_badge: settings.hero_badge ?? "",
    hero_title: initialTitle,
    hero_subtitle: settings.hero_subtitle ?? "",
    hero_show_title: resolved.title !== null,
  });
  const [previewViewport, setPreviewViewport] = useState<"desktop" | "mobile">(
    "desktop",
  );
  const initialDimensions =
    settings.hero_image_width && settings.hero_image_height
      ? {
          width: settings.hero_image_width,
          height: settings.hero_image_height,
        }
      : null;
  const [heroImage, setHeroImage] = useState<ImageFieldPreview>({
    url: settings.hero_image_url,
    dimensions: initialDimensions,
  });
  const syncHeroImage = useCallback((next: ImageFieldPreview) => {
    setHeroImage((current) => (samePreview(current, next) ? current : next));
  }, []);
  const [missions, setMissions] = useState<string[]>(() =>
    settings.misi && settings.misi.length > 0 ? [...settings.misi] : [""],
  );
  const [footer, setFooter] = useState(settings.footer_text ?? "");
  // Tahun kolofon dihitung seperti halaman publik (zona situs), hanya di klien.
  const now = useNow(60_000);
  const year = now === null ? null : zonedParts(new Date(now)).year;
  const content = resolveHeroContent({ site_name: settings.site_name, ...hero });
  const backfill = Boolean(settings.hero_image_url && !initialDimensions);

  const notifyFormDirty = () => {
    // Memicu event input pada form sehingga deteksi dirty SettingsTabForm aktif.
    formRef.current?.dispatchEvent(new Event("input", { bubbles: true }));
  };

  function updateMission(index: number, value: string) {
    setMissions((prev) => prev.map((item, i) => (i === index ? value : item)));
    notifyFormDirty();
  }

  function addMission() {
    if (missions.length >= SITE_CONFIG_LIMITS.missions) return;
    setMissions((prev) => [...prev, ""]);
    notifyFormDirty();
  }

  function removeMission(index: number) {
    setMissions((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0 ? next : [""];
    });
    notifyFormDirty();
  }

  function moveMission(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= missions.length) return;
    setMissions((prev) => {
      const next = [...prev];
      const [item] = next.splice(index, 1);
      next.splice(target, 0, item!);
      return next;
    });
    notifyFormDirty();
  }

  const serializedMissions = missions
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");

  return (
    <SettingsTabForm
      formRef={formRef}
      dirty={dirty}
      onSubmit={handleSubmit}
      pending={pending}
    >
      <FormSection
        id="hero"
        title="Hero halaman depan"
        description="Kartu besar pertama yang dilihat pengunjung. Pratinjau di bawah memakai komponen yang sama dengan halaman depan."
        icon={<House className="size-5" />}
      >
        <figure className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted text-caption1 font-semibold uppercase tracking-wide">
              Pratinjau Langsung
            </span>
            <div
              role="group"
              aria-label="Ukuran layar pratinjau hero"
              className="bg-surface-2 inline-flex items-center rounded-full p-0.5"
            >
              <button
                type="button"
                aria-pressed={previewViewport === "desktop"}
                onClick={() => setPreviewViewport("desktop")}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-caption2 font-semibold transition-colors",
                  previewViewport === "desktop"
                    ? "bg-surface text-foreground shadow-2xs"
                    : "text-muted hover:text-foreground",
                )}
              >
                <Monitor className="size-3.5" aria-hidden="true" />
                Desktop
              </button>
              <button
                type="button"
                aria-pressed={previewViewport === "mobile"}
                onClick={() => setPreviewViewport("mobile")}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-caption2 font-semibold transition-colors",
                  previewViewport === "mobile"
                    ? "bg-surface text-foreground shadow-2xs"
                    : "text-muted hover:text-foreground",
                )}
              >
                <Smartphone className="size-3.5" aria-hidden="true" />
                Ponsel
              </button>
            </div>
          </div>

          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none select-none transition-all duration-300",
              previewViewport === "mobile" &&
                "border-border bg-bg mx-auto max-w-[360px] rounded-[2rem] border p-2.5 shadow-sm",
            )}
          >
            <Hero
              {...content}
              imageUrl={heroImage.url}
              imageWidth={heroImage.dimensions?.width}
              imageHeight={heroImage.dimensions?.height}
              priority={false}
              scrollMotion={false}
              headingLevel="p"
            />
          </div>
          <figcaption className="text-muted text-caption1">
            {content.title
              ? "Judul tampil di atas foto dan menjadi judul utama (h1) halaman depan."
              : `Judul disembunyikan dari foto. Mesin pencari tetap membaca “${content.headline}” sebagai judul utama.`}
          </figcaption>
        </figure>

        <ImageField
          name="hero_image"
          label="Gambar hero"
          initialUrl={settings.hero_image_url}
          initialDimensions={initialDimensions}
          profile="site-hero"
          wide
          removable
          withDimensions
          onPreviewChange={syncHeroImage}
          hint={
            backfill
              ? "Foto lama ini belum punya metadata ukuran. Simpan sekali agar gambar responsif aktif, tanpa memotong foto."
              : "Rasio mengikuti hasil editor; pilih Asli/Bebas untuk panorama. Halaman depan tidak memotong foto."
          }
        />

        <SwitchField
          name="hero_show_title"
          title="Tampilkan judul di atas foto"
          description="Matikan bila foto sudah memuat tulisan/logo sendiri. Judul tetap dibaca Google dari nama website."
          defaultChecked={hero.hero_show_title}
          onCheckedChange={(checked) =>
            setHero((value) => ({ ...value, hero_show_title: checked }))
          }
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Judul hero"
            id="hero_title"
            name="hero_title"
            defaultValue={initialTitle}
            placeholder={settings.site_name}
            maxLength={SITE_CONFIG_LIMITS.heroTitle}
            error={fieldErrors.hero_title}
            disabled={!hero.hero_show_title}
            hint="Kosongkan untuk memakai nama website."
            onChange={(event) =>
              setHero((value) => ({ ...value, hero_title: event.target.value }))
            }
          />
          <TextField
            label="Label kecil (opsional)"
            id="hero_badge"
            name="hero_badge"
            defaultValue={settings.hero_badge ?? ""}
            maxLength={SITE_CONFIG_LIMITS.heroBadge}
            error={fieldErrors.hero_badge}
            placeholder="mis. Pendaftaran dibuka"
            hint="Chip di atas judul. Kosongkan untuk menyembunyikan."
            onChange={(event) =>
              setHero((value) => ({ ...value, hero_badge: event.target.value }))
            }
          />
        </div>
        {/* Field nonaktif tidak ikut FormData: judul tetap dikirim agar tidak terhapus. */}
        {!hero.hero_show_title && (
          <input type="hidden" name="hero_title" value={hero.hero_title} />
        )}
        <TextField
          label="Subjudul"
          id="hero_subtitle"
          name="hero_subtitle"
          defaultValue={settings.hero_subtitle ?? ""}
          maxLength={SITE_CONFIG_LIMITS.heroSubtitle}
          error={fieldErrors.hero_subtitle}
          onChange={(event) =>
            setHero((value) => ({
              ...value,
              hero_subtitle: event.target.value,
            }))
          }
        />
      </FormSection>

      <FormSection
        id="tentang"
        title="Tentang & footer"
        description="Visi dan misi tampil di halaman Tentang; teks footer tampil di bawah halaman depan, Profil, dan Tentang."
        icon={<ScrollText className="size-5" />}
      >
        <TextAreaField
          label="Visi / tujuan"
          id="visi"
          name="visi"
          rows={3}
          maxLength={SITE_CONFIG_LIMITS.visi}
          defaultValue={settings.visi ?? ""}
          error={fieldErrors.visi}
        />

        {/* Builder daftar Misi interaktif (sinkron ke input tersembunyi `name="misi"`) */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <label className="text-sm font-semibold">Misi / prinsip</label>
            <span className="text-muted text-caption2 tabular-nums">
              {missions.filter((m) => m.trim()).length}/
              {SITE_CONFIG_LIMITS.missions} poin
            </span>
          </div>
          <input type="hidden" name="misi" value={serializedMissions} />
          <div className="space-y-2">
            {missions.map((mission, index) => (
              <div key={index} className="flex items-center gap-1.5">
                <span className="text-muted w-5 shrink-0 text-center font-mono text-xs">
                  {index + 1}.
                </span>
                <input
                  type="text"
                  value={mission}
                  onChange={(event) => updateMission(index, event.target.value)}
                  placeholder={`Poin misi ${index + 1}…`}
                  aria-label={`Poin misi ${index + 1}`}
                  maxLength={220}
                  className={fieldClass(
                    "self",
                    "min-w-0 flex-1 rounded-xl px-3 py-2 text-sm",
                  )}
                />
                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => moveMission(index, -1)}
                    aria-label="Naikkan urutan misi"
                    className="text-muted hover:bg-surface-2 hover:text-foreground grid size-8 place-items-center rounded-lg disabled:opacity-30"
                  >
                    <ArrowUp className="size-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    disabled={index === missions.length - 1}
                    onClick={() => moveMission(index, 1)}
                    aria-label="Turunkan urutan misi"
                    className="text-muted hover:bg-surface-2 hover:text-foreground grid size-8 place-items-center rounded-lg disabled:opacity-30"
                  >
                    <ArrowDown className="size-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeMission(index)}
                    aria-label="Hapus poin misi"
                    className="text-muted hover:bg-danger/10 hover:text-danger grid size-8 place-items-center rounded-lg"
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          {fieldErrors.misi && (
            <p className="text-danger text-xs">{fieldErrors.misi}</p>
          )}
          {missions.length < SITE_CONFIG_LIMITS.missions && (
            <button
              type="button"
              onClick={addMission}
              className="text-primary-readable hover:bg-primary/8 inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
            >
              <Plus className="size-3.5" aria-hidden="true" />
              Tambah poin misi
            </button>
          )}
        </div>

        <FieldGroup title="Footer">
          <TextField
            label="Teks footer"
            id="footer_text"
            name="footer_text"
            defaultValue={settings.footer_text ?? ""}
            maxLength={SITE_CONFIG_LIMITS.footerText}
            error={fieldErrors.footer_text}
            placeholder="mis. Dibuat dengan cinta oleh angkatan 2026"
            hint="Tidak perlu menulis © atau tahun — keduanya ditambahkan otomatis."
            onChange={(event) => setFooter(event.target.value)}
          />
          <p className="bg-surface-2/70 text-muted rounded-2xl px-4 py-3 text-center text-caption1">
            © {year ?? "—"} {settings.site_name}
            {footer.trim() ? ` · ${footer.trim()}` : ""}
          </p>
        </FieldGroup>
      </FormSection>
    </SettingsTabForm>
  );
}
