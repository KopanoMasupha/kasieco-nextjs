import { PriceTier } from "./types";

export interface WholesaleProduct {
  id: string;
  productName: string;
  unitLabel: string;
  supplierName: string;
  minQty: number;
  tiers: PriceTier[];
  deliveryCents: number;
}

export const WHOLESALE_CATALOGUE: WholesaleProduct[] = [
  {
    id: "maize-5kg",
    productName: "Maize meal 5kg",
    unitLabel: "bag",
    supplierName: "Highveld Milling Co.",
    minQty: 20,
    tiers: [
      { minQty: 0, price: 95 },
      { minQty: 15, price: 88 },
      { minQty: 25, price: 82 },
      { minQty: 40, price: 76 },
    ],
    deliveryCents: 45000,
  },
  {
    id: "oil-case",
    productName: "Cooking oil 750ml (case of 12)",
    unitLabel: "case",
    supplierName: "Kasi Wholesalers",
    minQty: 10,
    tiers: [
      { minQty: 0, price: 320 },
      { minQty: 8, price: 295 },
      { minQty: 15, price: 270 },
    ],
    deliveryCents: 45000,
  },
  {
    id: "sugar-2kg",
    productName: "Sugar 2kg",
    unitLabel: "bag",
    supplierName: "Highveld Milling Co.",
    minQty: 15,
    tiers: [
      { minQty: 0, price: 45 },
      { minQty: 12, price: 40 },
      { minQty: 20, price: 36 },
    ],
    deliveryCents: 35000,
  },
  {
    id: "canned-beans-case",
    productName: "Baked beans 410g (case of 24)",
    unitLabel: "case",
    supplierName: "Mamelodi Cash & Carry",
    minQty: 8,
    tiers: [
      { minQty: 0, price: 288 },
      { minQty: 6, price: 264 },
      { minQty: 12, price: 240 },
    ],
    deliveryCents: 40000,
  },
];
