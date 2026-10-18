/** "bale (10 × 5kg)" → "bales (10 × 5kg)"; "case" → "cases"; singular when n === 1. */
export function units(label: string, n?: number): string {
  if (n === 1) return label;
  const i = label.indexOf(" (");
  const head = i >= 0 ? label.slice(0, i) : label;
  const tail = i >= 0 ? label.slice(i) : "";
  const plural = /(s|x|ch|sh)$/.test(head) ? head + "es" : /[^aeiou]y$/.test(head) ? head.slice(0, -1) + "ies" : head + "s";
  return plural + tail;
}
