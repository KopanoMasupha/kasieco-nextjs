/**
 * Real product photos (in /public/products). A deal or shelf item gets the
 * photo of the same kind of product in the same pack size; if that size isn't
 * here, the same kind in another size. Anything else keeps its drawn pack shot
 * until someone uploads a photo.
 */
import { ProductKind, productKind, splitSize } from "./products";
import { photoUrl } from "./photoUrl";

const PHOTOS: { kind: ProductKind; size?: string; file: string; alt: string }[] = [
  { kind: "maize", size: "5kg", file: "maize-5kg.jpg", alt: "Iwisa Super Maize Meal 5 kg" },
  { kind: "maize", size: "10kg", file: "maize-10kg.jpg", alt: "White Star Super Maize Meal 10 kg" },
  { kind: "sugar", size: "2kg", file: "sugar-2kg.jpg", alt: "Best Choice pure white sugar 2 kg" },
  { kind: "flour", size: "10kg", file: "flour-10kg.jpg", alt: "Snowflake cake wheat flour 10 kg" },
  { kind: "oil", size: "750ml", file: "oil-750ml.jpg", alt: "B-well cooking oil blend 750 ml" },
  { kind: "soap", size: "175g", file: "soap-175g.jpg", alt: "Dettol Original bath soap 175 g" },
];

export function stockPhoto(name: string): { src: string; alt: string } | undefined {
  const kind = productKind(name);
  if (kind === "generic") return undefined;
  const size = splitSize(name).size?.toLowerCase();
  const hit = PHOTOS.find((p) => p.kind === kind && p.size === size) ?? PHOTOS.find((p) => p.kind === kind);
  return hit ? { src: photoUrl(hit.file), alt: hit.alt } : undefined;
}
