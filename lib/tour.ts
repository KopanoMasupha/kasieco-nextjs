/**
 * The shop-owner onboarding tour. Thuli walks a new owner through the
 * features in the order they'll use them. Each step can open a page and
 * point at an element tagged with data-tour="…" on that page.
 */
import type { Pool } from "./types";
import type { GuidePose } from "@/components/onboarding/Guide";

export interface TourContext {
  firstName: string;
  pools: Pool[];
}

export interface TourStep {
  id: string;
  route?: string | ((ctx: TourContext) => string); // page to open first
  target?: string; // data-tour value to spotlight; none = centred card
  pose: GuidePose;
  title: string | ((ctx: TourContext) => string);
  body: string;
}

/** The open deal that's closest to filling — the most exciting one to show. */
const showcaseDeal = (ctx: TourContext) => {
  const open = ctx.pools.filter((p) => p.status === "open");
  const fill = (p: Pool) => p.commitments.reduce((s, c) => s + c.qty, 0) / p.minQty;
  const pick = open.sort((a, b) => fill(b) - fill(a))[0] ?? ctx.pools[0];
  return pick ? `/owner/pools/${pick.id}` : "/owner/pools";
};

export const OWNER_TOUR: TourStep[] = [
  {
    id: "welcome",
    route: "/owner",
    pose: "wave",
    title: (c) => `Sawubona, ${c.firstName}! I'm Thuli.`,
    body: "I'll show you around MzansiConnect in about a minute: how to buy stock cheaper together with other shops, pay safely, and get it delivered to your door.",
  },
  {
    id: "verified",
    route: "/owner",
    target: "verified",
    pose: "point",
    title: "You're a verified shop",
    body: "This badge means you passed the compliance check. Only verified shops can join deals, so wholesalers and funders can trust everyone here.",
  },
  {
    id: "money",
    route: "/owner",
    target: "money",
    pose: "point",
    title: "Your money at a glance",
    body: "Due now is what you owe for deals that filled, with a countdown to your 48-hour deadline. It also stays in the menu bar. In escrow is money TradeSafe is keeping safe until your stock arrives. MzansiConnect never holds your cash.",
  },
  {
    id: "stock",
    route: "/owner",
    target: "stock",
    pose: "point",
    title: "Know your shelves",
    body: "This graph shows how many days each item will last. Red means it's running low. That's your cue to join a deal before you run out.",
  },
  {
    id: "nav-buy",
    route: "/owner",
    target: "nav-buy",
    pose: "point",
    title: "Buy is where you save",
    body: "Wholesalers post bulk deals here. The more shops that join a deal, the lower the price drops for everyone.",
  },
  {
    id: "deal-list",
    route: "/owner/pools",
    target: "deal-list",
    pose: "point",
    title: "Shop like a store",
    body: "Each tile shows the product, the price together against the price alone (crossed out), how full the deal is, and when it closes. Tap Add to cart, or open one to see more.",
  },
  {
    id: "deal-showcase",
    route: showcaseDeal,
    target: "deal-showcase",
    pose: "point",
    title: "See exactly what you get",
    body: "What's in the case, the stars other shops gave this wholesaler after delivery, and roughly how much profit you'll make selling it at kasi prices.",
  },
  {
    id: "deal-price",
    route: showcaseDeal,
    target: "deal-price",
    pose: "point",
    title: "Watch the price drop",
    body: "Each bar is a price step. As more shops reserve, the price moves down. When the deal fills, everyone pays the same lowest price.",
  },
  {
    id: "deal-join",
    route: showcaseDeal,
    target: "deal-join",
    pose: "point",
    title: "Add it to your cart",
    body: "Choose how many and tap Add to cart. Keep shopping, then check out all your deals at once. You pay R0 now. When a deal fills you have 48 hours to pay through TradeSafe.",
  },
  {
    id: "nav-cart",
    target: "nav-cart",
    pose: "point",
    title: "Check out your stock",
    body: "Your cart lives here. At checkout you pick delivery days once for everything and reserve it all in one tap. Still R0 today.",
  },
  {
    id: "nav-payments",
    target: "nav-payments",
    pose: "point",
    title: "Pay safely",
    body: "Everything you owe, and everything held in escrow for you, lives here. Pay by instant EFT, card, or cash at a till.",
  },
  {
    id: "nav-exchange",
    target: "nav-exchange",
    pose: "point",
    title: "Help each other out",
    body: "Got extra stock, or short on something? Swap or sell with verified shops nearby, at a fair price you can both see. No bakkie? Book a MzansiConnect driver to move it.",
  },
  {
    id: "nav-funding",
    target: "nav-funding",
    pose: "point",
    title: "Grow your shop",
    body: "Grants, loans and training you may qualify for, with a quick check first so you don't waste time applying.",
  },
  {
    id: "done",
    pose: "happy",
    title: (c) => `You're ready, ${c.firstName}!`,
    body: "Start with a deal on the Buy page. You can replay this tour any time from your account menu.",
  },
];

const KEY = (userId: string) => `mc-tour-done:${userId}`;

export function tourDone(userId: string) {
  try {
    return localStorage.getItem(KEY(userId)) === "1";
  } catch {
    return true; // storage blocked: don't keep popping up
  }
}

export function markTourDone(userId: string) {
  try {
    localStorage.setItem(KEY(userId), "1");
  } catch {
    // ignore
  }
}

/** Ask the tour to start (from a "Take the tour" button anywhere). */
export function startTour() {
  window.dispatchEvent(new CustomEvent("mc:start-tour"));
}
