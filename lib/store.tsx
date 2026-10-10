"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
  useCallback,
} from "react";
import {
  Shop,
  Good,
  ConsumerOrder,
  Pool,
  StockListing,
  ExchangeThread,
  TrainingSession,
  VerificationRequest,
  Certificate,
  Course,
  Role,
  SessionAccount,
  FundingApplication,
  FundingProfile,
  FundingProgramme,
} from "./types";
import {
  SEED_SHOPS,
  SEED_GOODS,
  SEED_POOLS,
  SEED_LISTINGS,
  SEED_THREADS,
  SEED_ORDERS,
  SEED_TRAINING_SESSIONS,
  SEED_VERIFICATION_REQUESTS,
  SEED_CERTIFICATES,
  SEED_COURSES,
} from "./seed";
import { ServerAction } from "./server/actions";
import { SEED_FUNDING_PROGRAMMES } from "./funding";

const LOCAL_STORAGE_KEY = "mzansi-business-session-v2";

// ---- shared (server) state ----

interface SharedState {
  shops: Shop[];
  goods: Good[];
  orders: ConsumerOrder[];
  pools: Pool[];
  listings: StockListing[];
  threads: ExchangeThread[];
  trainingSessions: TrainingSession[];
  verificationRequests: VerificationRequest[];
  certificates: Certificate[];
  courses: Course[];
  fundingProgrammes: FundingProgramme[];
  fundingProfiles: FundingProfile[];
  fundingApplications: FundingApplication[];
}

const initialShared: SharedState = {
  shops: SEED_SHOPS,
  goods: SEED_GOODS,
  orders: SEED_ORDERS,
  pools: SEED_POOLS,
  listings: SEED_LISTINGS,
  threads: SEED_THREADS,
  trainingSessions: SEED_TRAINING_SESSIONS,
  verificationRequests: SEED_VERIFICATION_REQUESTS,
  certificates: SEED_CERTIFICATES,
  courses: SEED_COURSES,
  fundingProgrammes: SEED_FUNDING_PROGRAMMES,
  fundingProfiles: [],
  fundingApplications: [],
};

// ---- local (per-browser session) state ----

interface LocalState {
  /** The signed-in account, or null when browsing as a guest. */
  account: SessionAccount | null;
  role: Role;
  myShopId: string;
  verifierUnlocked: boolean;
  hydrated: boolean;
}

const initialLocal: LocalState = {
  account: null,
  role: "consumer",
  myShopId: "shop-thandi",
  verifierUnlocked: false,
  hydrated: false,
};

type LocalAction =
  | { type: "HYDRATE"; payload: Partial<LocalState> }
  | { type: "SIGN_IN"; account: SessionAccount }
  | { type: "SIGN_OUT" }
  | { type: "SET_ROLE"; role: Role }
  | { type: "SET_MY_SHOP"; shopId: string }
  | { type: "UNLOCK_VERIFIER" };

function localReducer(state: LocalState, action: LocalAction): LocalState {
  switch (action.type) {
    case "HYDRATE":
      return { ...state, ...action.payload, hydrated: true };
    case "SIGN_IN":
      // only shop owners can sign in, and signing in switches to the owner view
      return {
        ...state,
        account: action.account,
        role: "owner",
        myShopId: action.account.shopId ?? state.myShopId,
      };
    case "SIGN_OUT":
      return { ...state, account: null, role: "consumer" };
    case "SET_ROLE":
      return { ...state, role: action.role };
    case "SET_MY_SHOP":
      return { ...state, myShopId: action.shopId };
    case "UNLOCK_VERIFIER":
      return { ...state, verifierUnlocked: true };
    default:
      return state;
  }
}

// ---- combined public API (kept close to the old shape so pages barely change) ----

type CombinedState = SharedState & LocalState;
type DispatchAction = ServerAction | LocalAction;

const LOCAL_TYPES = new Set(["SIGN_IN", "SIGN_OUT", "SET_ROLE", "SET_MY_SHOP", "UNLOCK_VERIFIER"]);

interface StoreContextValue {
  state: CombinedState;
  dispatch: (action: DispatchAction) => Promise<{ error?: string; [k: string]: any }>;
  loading: boolean;
}

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [local, localDispatch] = useReducer(localReducer, initialLocal);
  const [shared, setShared] = useState<SharedState>(initialShared);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/state", { cache: "no-store" });
      if (res.ok) setShared(await res.json());
    } catch {
      // API not reachable (e.g. static export) — keep serving the seed data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      localDispatch({ type: "HYDRATE", payload: raw ? JSON.parse(raw) : {} });
    } catch {
      localDispatch({ type: "HYDRATE", payload: {} });
    }
    refresh();

    function onFocus() {
      refresh();
    }
    window.addEventListener("focus", onFocus);
    const refreshTimer = window.setInterval(refresh, 3000);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(refreshTimer);
    };
  }, [refresh]);

  useEffect(() => {
    if (!local.hydrated) return;
    try {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(local));
    } catch {
      // ignore quota errors
    }
  }, [local]);

  // Keep the signed-in shop valid locally: if a saved browser session points at a
  // shop that no longer exists (for example after the local database is reset),
  // fall back to a real shop so "I own a shop" always opens a working dashboard.
  useEffect(() => {
    if (!local.hydrated || loading) return;
    if (shared.shops.some((s) => s.id === local.myShopId)) return;
    const fallback =
      shared.shops.find((s) => s.verificationStatus === "verified") ?? shared.shops[0];
    if (fallback) localDispatch({ type: "SET_MY_SHOP", shopId: fallback.id });
  }, [local.hydrated, local.myShopId, loading, shared.shops]);

  const dispatch = useCallback(async (action: DispatchAction) => {
    if (LOCAL_TYPES.has(action.type)) {
      localDispatch(action as LocalAction);
      return {};
    }

    const res = await fetch("/api/action", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(action),
    });
    const { state: nextState, meta } = await res.json();
    if (nextState) setShared(nextState);

    if (!meta?.error) {
      if (action.type === "REGISTER_SHOP") {
        // register + sign in with the PIN chosen on the form
        if (meta?.account) localDispatch({ type: "SIGN_IN", account: meta.account });
        else localDispatch({ type: "SET_MY_SHOP", shopId: action.shop.id });
      }
    }
    return meta || {};
  }, []);

  const state: CombinedState = useMemo(() => ({ ...shared, ...local }), [shared, local]);

  const value = useMemo(() => ({ state, dispatch, loading }), [state, dispatch, loading]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

export function useShop(shopId: string | undefined) {
  const { state } = useStore();
  return state.shops.find((s) => s.id === shopId);
}

export function useGoodsForShop(shopId: string | undefined) {
  const { state } = useStore();
  return state.goods.filter((g) => g.shopId === shopId);
}
