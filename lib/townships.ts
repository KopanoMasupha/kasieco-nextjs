/**
 * Hero slideshow photos. They load from Wikimedia Commons (openly licensed).
 * To use your own photos instead, drop them in /public/townships/ and change
 * `src` to e.g. "/townships/mamelodi.jpg" — no other code changes needed.
 */
export interface TownshipSlide {
  township: string;
  province: string;
  caption: string;
  src: string;
  credit: string;
  creditUrl: string;
}

const commons = (file: string, width = 1800) =>
  `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file)}?width=${width}`;
const page = (file: string) => `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file.replace(/ /g, "_"))}`;

const slide = (township: string, province: string, caption: string, file: string, author = "Wikimedia Commons contributors"): TownshipSlide => ({
  township,
  province,
  caption,
  src: commons(file),
  credit: `Photo: ${author} · Wikimedia Commons`,
  creditUrl: page(file),
});

export const TOWNSHIP_SLIDES: TownshipSlide[] = [
  slide("Khayelitsha", "Western Cape", "Small businesses keep kasi money in the kasi", "Small business in Khayelitsha.jpg"),
  slide("Site C, Khayelitsha", "Western Cape", "Corner stores that swap stock instead of running out", "Khayelitsha Site-C Cash-Store.JPG"),
  slide("Khayelitsha", "Western Cape", "Customers find what's on the shelf before they walk", "Minibus Taxis in Khayelitsha, South Africa.JPG"),
];
