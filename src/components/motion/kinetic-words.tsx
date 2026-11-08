import { Fragment, type CSSProperties } from "react";

/** Kata ke-n berikutnya tidak menunggu lebih lama lagi: judul panjang tetap cepat. */
const MAX_STAGGERED_WORDS = 10;

/**
 * Isi judul yang masuk per kata (.motion-word di motion.css). Dirender di
 * server: teks tetap kalimat utuh untuk crawler dan pembaca layar, hanya
 * dibungkus span per kata. Pasang di dalam elemen judul pemanggil; mulai
 * animasi bisa digeser dengan `wordsDelay()` pada elemen tersebut.
 */
export function KineticWords({ text }: { text: string }) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return (
    <>
      {words.map((word, index) => (
        <Fragment key={`${index}-${word}`}>
          {index > 0 && " "}
          <span
            className="motion-word"
            style={
              {
                "--word-index": Math.min(index, MAX_STAGGERED_WORDS),
              } as CSSProperties
            }
          >
            {word}
          </span>
        </Fragment>
      ))}
    </>
  );
}

/** Style pembungkus: geser mulai animasi kata (mis. setelah badge muncul). */
export function wordsDelay(ms: number): CSSProperties {
  return { "--words-delay": `${ms}ms` } as CSSProperties;
}

/** Style elemen .motion-blur-in dengan jeda masuk tertentu. */
export function blurDelay(ms: number): CSSProperties {
  return { "--blur-delay": `${ms}ms` } as CSSProperties;
}
