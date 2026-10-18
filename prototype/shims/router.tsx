import React, { useSyncExternalStore } from "react";

let current = "/";
const listeners = new Set<() => void>();
export function navigate(to: string) {
  if (to === current) return;
  current = to;
  listeners.forEach((l) => l());
  try { window.scrollTo({ top: 0 }); } catch {}
}
function subscribe(l: () => void) { listeners.add(l); return () => listeners.delete(l); }
export function useLocation() { return useSyncExternalStore(subscribe, () => current, () => current); }

export class NotFoundError extends Error {}
export function notFound(): never { throw new NotFoundError("not found"); }
export function usePathname() { return useLocation().split("?")[0]; }
export function useSearchParams() { const loc = useLocation(); return new URLSearchParams(loc.split("?")[1] || ""); }
export function useRouter() {
  return { push: navigate, replace: navigate, back: () => navigate("/"), refresh: () => {}, prefetch: () => {} };
}
