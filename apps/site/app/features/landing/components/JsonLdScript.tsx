export type JsonLdScriptProps = {
  /** Already serialized with `serializeJsonLd` (escapes `<`, so it cannot close the script tag). */
  json: string;
};

export function JsonLdScript({ json }: JsonLdScriptProps) {
  // The JSON is produced and escaped by serializeJsonLd, so it cannot break out of the tag.
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
