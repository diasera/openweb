type JsonLdValue = Record<string, unknown> | Array<Record<string, unknown>>;

/** JSON-LD server component dengan escaping aman untuk konteks HTML. */
export function JsonLd({ data }: { data: JsonLdValue }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
