import { ShopCategory } from "./types";

export const CATEGORY_ICON: Record<ShopCategory, string> = {
  spaza: "Store",
  tuckshop: "ShoppingBasket",
  butchery: "Beef",
  greengrocer: "Leaf",
  takeaway: "UtensilsCrossed",
  hairdresser: "Scissors",
  caterer: "ChefHat",
  other: "Package",
};

export const CATEGORY_BG: Record<ShopCategory, string> = {
  spaza: "bg-ember/10 text-ember-dark",
  tuckshop: "bg-leaf/10 text-leaf",
  butchery: "bg-red-100 text-red-700",
  greengrocer: "bg-green-100 text-green-700",
  takeaway: "bg-amber-100 text-amber-700",
  hairdresser: "bg-purple-100 text-purple-700",
  caterer: "bg-blue-100 text-blue-700",
  other: "bg-sand-200 text-ink/60",
};
