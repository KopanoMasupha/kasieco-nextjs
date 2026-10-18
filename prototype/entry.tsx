import React from "react";
import { createRoot } from "react-dom/client";
import { useLocation, NotFoundError, navigate } from "./shims/router";
import { StoreProvider } from "@/lib/store";
import AppShell from "@/components/AppShell";
import "@/lib/server/seedDb";
import { seedDB, SharedDB, DB_VERSION, publicState } from "@/lib/server/db";
import { reduce } from "@/lib/server/reducer";
import { computeInsights, templateNarrative } from "@/lib/ai/insights";
import { answerQuestion } from "@/lib/helpbot";

import Landing from "@/app/page";
import Consumer from "@/app/consumer/page";
import ConsumerShop from "@/app/consumer/shop/[id]/page";
import OwnerHome from "@/app/owner/page";
import Pools from "@/app/owner/pools/page";
import PoolDetail from "@/app/owner/pools/[id]/page";
import Exchange from "@/app/owner/exchange/page";
import Thread from "@/app/owner/exchange/[threadId]/page";
import Stock from "@/app/owner/stock/page";
import Funding from "@/app/owner/funding/page";
import Compliance from "@/app/owner/compliance/page";
import Learn from "@/app/owner/learn/page";
import Course from "@/app/owner/learn/[courseId]/page";
import Training from "@/app/owner/training/page";
import Register from "@/app/owner/register/page";
import Verify from "@/app/verify/page";
import SignInPage from "@/app/signin/page";
import Payments from "@/app/owner/payments/page";
import DropPoint from "@/app/owner/partner/page";
import AdminTeam from "@/app/admin/team/page";
import Inbox from "@/app/inbox/page";
import AdminHome from "@/app/admin/page";
import AdminDeals from "@/app/admin/deals/page";
import AdminNewDeal from "@/app/admin/deals/new/page";
import AdminDeal from "@/app/admin/deals/[id]/page";
import AdminDrivers from "@/app/admin/drivers/page";
import DriverHome from "@/app/driver/page";
import DriverTrip from "@/app/driver/trips/[id]/page";

// ---------- in-browser "server": the same reducer, persisted to localStorage ----------
(window as any).__nav = navigate; // test hook: jump to a page
const KEY = "mzansiconnect-demo-db-v10";
let db: SharedDB;
try {
  const raw = localStorage.getItem(KEY);
  const parsed = raw ? JSON.parse(raw) : null;
  db = parsed && parsed.version === DB_VERSION ? parsed : seedDB();
} catch {
  db = seedDB();
}
const save = () => {
  try { localStorage.setItem(KEY, JSON.stringify(db)); } catch {}
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const realFetch = window.fetch.bind(window);
window.fetch = async (input: any, init?: any) => {
  const url = typeof input === "string" ? input : input.url;
  if (!url.startsWith("/api/")) return realFetch(input, init);
  await new Promise((r) => setTimeout(r, 120)); // feel like a network
  const body = init?.body ? JSON.parse(init.body) : {};
  if (url.startsWith("/api/state")) return json(publicState(db));
  if (url.startsWith("/api/action")) {
    if (body.type === "RESET_DEMO") {
      db = seedDB();
      save();
      return json({ state: publicState(db), meta: {} });
    }
    const { db: next, meta } = reduce(db, body);
    db = next;
    save();
    return json({ state: publicState(db), meta });
  }
  if (url.startsWith("/api/ai/report")) {
    const shop = db.shops.find((s) => s.id === body.shopId);
    if (!shop) return json({ error: "Shop not found" }, 404);
    const insights = computeInsights(shop.id, { shops: db.shops, goods: db.goods, listings: db.listings });
    return json({ shopId: shop.id, generatedAt: new Date().toISOString(), narrative: templateNarrative(shop, insights), narrativeSource: "template", insights });
  }
  if (url.startsWith("/api/ai/chat")) {
    const last = [...(body.messages || [])].reverse().find((m: any) => m.role === "user");
    const a = answerQuestion(last?.content || "");
    return json({ text: a.text, links: a.links, source: "rules" });
  }
  return json({ error: "Unknown route" }, 404);
};

// ---------- router ----------
type Route = [RegExp, React.ComponentType<any>, string[]];
const routes: Route[] = [
  [/^\/$/, Landing, []],
  [/^\/consumer$/, Consumer, []],
  [/^\/consumer\/shop\/([^/]+)$/, ConsumerShop, ["id"]],
  [/^\/owner$/, OwnerHome, []],
  [/^\/owner\/pools$/, Pools, []],
  [/^\/owner\/pools\/([^/]+)$/, PoolDetail, ["id"]],
  [/^\/owner\/exchange$/, Exchange, []],
  [/^\/owner\/exchange\/([^/]+)$/, Thread, ["threadId"]],
  [/^\/owner\/stock$/, Stock, []],
  [/^\/owner\/funding$/, Funding, []],
  [/^\/owner\/compliance$/, Compliance, []],
  [/^\/owner\/learn$/, Learn, []],
  [/^\/owner\/learn\/([^/]+)$/, Course, ["courseId"]],
  [/^\/owner\/training$/, Training, []],
  [/^\/owner\/register$/, Register, []],
  [/^\/verify$/, Verify, []],
  [/^\/signin$/, SignInPage, []],
  [/^\/owner\/payments$/, Payments, []],
  [/^\/owner\/partner$/, DropPoint, []],
  [/^\/admin\/team$/, AdminTeam, []],
  [/^\/inbox$/, Inbox, []],
  [/^\/admin$/, AdminHome, []],
  [/^\/admin\/deals$/, AdminDeals, []],
  [/^\/admin\/deals\/new$/, AdminNewDeal, []],
  [/^\/admin\/deals\/([^/]+)$/, AdminDeal, ["id"]],
  [/^\/admin\/drivers$/, AdminDrivers, []],
  [/^\/driver$/, DriverHome, []],
  [/^\/driver\/trips\/([^/]+)$/, DriverTrip, ["id"]],
];

function NotFound() {
  return (
    <div className="card mx-auto max-w-md p-8 text-center">
      <h1 className="text-lg font-bold text-ink">That page isn't here</h1>
      <button className="btn-dark mt-4 px-5 py-2.5 text-sm" onClick={() => navigate("/")}>
        Back to the start
      </button>
    </div>
  );
}

class Boundary extends React.Component<{ k: string; children: React.ReactNode }, { err: unknown }> {
  state = { err: null as unknown };
  static getDerivedStateFromError(err: unknown) { return { err }; }
  componentDidUpdate(prev: any) { if (prev.k !== this.props.k && this.state.err) this.setState({ err: null }); }
  render() {
    if (this.state.err) return this.state.err instanceof NotFoundError ? <NotFound /> : <NotFound />;
    return this.props.children;
  }
}

function App() {
  const loc = useLocation();
  const path = loc.split("?")[0];
  let page: React.ReactNode = <NotFound />;
  for (const [re, C, names] of routes) {
    const m = path.match(re);
    if (m) {
      const params = Object.fromEntries(names.map((n, i) => [n, decodeURIComponent(m[i + 1])]));
      page = <C key={path} params={params} />;
      break;
    }
  }
  return (
    <StoreProvider>
      <AppShell>
        <Boundary k={path}>{page}</Boundary>
      </AppShell>
    </StoreProvider>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
