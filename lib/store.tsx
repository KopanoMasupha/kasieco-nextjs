"use client";

import React, { createContext, useContext, useEffect, useMemo, useReducer, useState, useCallback, useRef } from "react";
import {
  Shop,
  Good,
  Pool,
  StockListing,
  CourierJob,
  ExchangeThread,
  TrainingSession,
  VerificationRequest,
  Certificate,
  Course,
  Role,
  Wholesaler,
  Driver,
  UserAccount,
  PaymentTx,
  Fee,
  Trip,
  Message,
  FundingOpportunity,
  FundingInterest,
  FundingProfile,
 Approval } from "./types";
import { ServerAction } from "./server/actions";

const LOCAL_STORAGE_KEY = "kasieco-session-v6";

// ---- shared (server) state — empty until the first /api/state response ----

interface SharedState {
  users: UserAccount[];
  wholesalers: Wholesaler[];
  drivers: Driver[];
  payments: PaymentTx[];
  fees: Fee[];
  trips: Trip[];
  messages: Message[];
  approvals: Approval[];
  shops: Shop[];
  goods: Good[];
  pools: Pool[];
  listings: StockListing[];
  threads: ExchangeThread[];
  courierJobs: CourierJob[];
  trainingSessions: TrainingSession[];
  verificationRequests: VerificationRequest[];
  certificates: Certificate[];
  courses: Course[];
  funding: FundingOpportunity[];
  fundingInterests: FundingInterest[];
  fundingProfiles: FundingProfile[];
}

const emptyShared: SharedState = {
  users: [],
  wholesalers: [],
  drivers: [],
  payments: [],
  fees: [],
  trips: [],
  messages: [],
  approvals: [],
  shops: [],
  goods: [],
  pools: [],
  listings: [],
  threads: [],
  courierJobs: [],
  trainingSessions: [],
  verificationRequests: [],
  certificates: [],
  courses: [],
  funding: [],
  fundingInterests: [],
  fundingProfiles: [],
};

// ---- local (per-browser) state ----

interface LocalState {
  role: Role;
  userId: string; // "" when signed out
  myShopId: string; // set when an owner is signed in
  myDriverId: string; // set when a driver is signed in
  hydrated: boolean;
  cart: Array<{ poolId: string; qty: number }>;
}

const initialLocal: LocalState = {
  role: "consumer",
  userId: "",
  myShopId: "",
  myDriverId: "",
  hydrated: false,
  cart: [],
};

type LocalAction =
  | { type: "HYDRATE"; payload: Partial<LocalState> }
  | { type: "SET_ROLE"; role: Role }
  | { type: "SET_MY_SHOP"; shopId: string }
  | { type: "SIGNED_IN"; userId: string; role: Role; shopId?: string; driverId?: string }
  | { type: "SIGN_OUT" }
  | { type: "ADD_TO_CART"; poolId: string; qty: number }
  | { type: "REMOVE_FROM_CART"; poolId: string }
  | { type: "CLEAR_CART" };

function localReducer(state: LocalState, action: LocalAction): LocalState {
  switch (action.type) {
    case "HYDRATE":
      return { ...state, ...action.payload, hydrated: true };
    case "SET_ROLE":
      return { ...state, role: action.role };
    case "SET_MY_SHOP":
      return { ...state, myShopId: action.shopId };
    case "SIGNED_IN":
      return { ...state, userId: action.userId, role: action.role, myShopId: action.shopId || "", myDriverId: action.driverId || "" };
    case "SIGN_OUT":
      return { ...state, userId: "", myShopId: "", myDriverId: "", role: "consumer", cart: [] };
    case "ADD_TO_CART":
      return {
        ...state,
        cart: [...state.cart, { poolId: action.poolId, qty: action.qty }],
      };
    case "REMOVE_FROM_CART":
      return {
        ...state,
        cart: state.cart.filter((item) => item.poolId !== action.poolId),
      };
    case "CLEAR_CART":
      return { ...state, cart: [] };
    default:
      return state;
  }
}

type CombinedState = SharedState & LocalState;
type DispatchAction = ServerAction | Exclude<LocalAction, { type: "HYDRATE" }>;

const LOCAL_TYPES = new Set(["SET_ROLE", "SET_MY_SHOP", "SIGN_OUT"]);

interface StoreContextValue {
  state: CombinedState;
  dispatch: (action: DispatchAction) => Promise<{ error?: string; [k: string]: any }>;
  loading: boolean;
  refresh: () => Promise<void>;
}

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [local, localDispatch] = useReducer(localReducer, initialLocal);
  const [shared, setShared] = useState<SharedState>(emptyShared);
  const [loading, setLoading] = useState(true);
  const sharedVersion = useRef(0);
  const refreshRequest = useRef(0);
  const pendingActions = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++refreshRequest.current;
    const version = sharedVersion.current;
    try {
      const res = await fetch("/api/state", { cache: "no-store" });
      if (res.ok) {
        const nextState = await res.json();
        if (
          requestId === refreshRequest.current &&
          version === sharedVersion.current &&
          pendingActions.current === 0
        ) {
          setShared(nextState);
        }
      }
    } catch {
      // offline — keep what we have
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
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  useEffect(() => {
    if (!local.hydrated) return;
    try {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(local));
    } catch {
      // storage blocked — the session simply won't be remembered
    }
  }, [local]);

  const dispatch = useCallback(async (action: DispatchAction) => {
    if (LOCAL_TYPES.has(action.type)) {
      localDispatch(action as LocalAction);
      return {};
    }

    pendingActions.current++;
    sharedVersion.current++;
    try {
      const res = await fetch("/api/action", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(action),
      });
      const response = await res.json();
      if (!res.ok) {
        return { error: response.error || "Couldn't save this change. Please try again." };
      }
      const { meta } = response;
      if (!meta?.error && (action.type === "REGISTER_SHOP" || action.type === "SIGN_IN") && meta?.userId) {
        localDispatch({ type: "SIGNED_IN", userId: meta.userId, role: meta.role, shopId: meta.shopId, driverId: meta.driverId });
      }
      return meta || {};
    } catch {
      return { error: "Couldn't reach the server — check your connection and try again." };
    } finally {
      pendingActions.current--;
      sharedVersion.current++;
      if (pendingActions.current === 0) void refresh();
    }
  }, [refresh]);

  const state: CombinedState = useMemo(() => ({ ...shared, ...local }), [shared, local]);
  const value = useMemo(() => ({ state, dispatch, loading, refresh }), [state, dispatch, loading, refresh]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

/** Re-fetch shared state every `ms` while the component is mounted (live pot feed). */
export function useLiveRefresh(ms = 3000) {
  const { refresh } = useStore();
  const ref = useRef(refresh);
  ref.current = refresh;
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") ref.current();
    }, ms);
    return () => clearInterval(id);
  }, [ms]);
}

export function useMyShop() {
  const { state } = useStore();
  return state.shops.find((s) => s.id === state.myShopId);
}

export function useMe() {
  const { state } = useStore();
  return state.users.find((u) => u.id === state.userId);
}

export function useMyDriver() {
  const { state } = useStore();
  return state.drivers.find((d) => d.id === state.myDriverId);
}

/** Inbox for whoever is signed in. */
export function useInbox() {
  const { state } = useStore();
  const me = state.users.find((u) => u.id === state.userId);
  if (!me) return { list: [] as Message[], unread: 0, toRole: undefined, toId: undefined };
  const toId = me.role === "owner" ? me.shopId! : me.role === "driver" ? me.driverId! : me.role === "admin" ? "admin" : "verifier";
  const list = state.messages.filter((m) => m.toRole === me.role && m.toId === toId).slice().reverse();
  return { list, unread: list.filter((m) => !m.read).length, toRole: me.role, toId };
}
