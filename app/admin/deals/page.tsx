"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import { useStore, useLiveRefresh } from "@/lib/store";
import { DealStatus } from "@/lib/types";
import PoolCard from "@/components/pot/PoolCard";
import { CardListSkeleton } from "@/components/Skeleton";

const GROUPS: { title: string; help: string; statuses: DealStatus[] }[] = [
  { title: "Needs you", help: "", statuses: ["target-reached", "payment-confirmed", "ordered"] },
  { title: "Being delivered", help: "", statuses: ["scheduled", "out-for-delivery"] },
  { title: "Filling up", help: "", statuses: ["open"] },
  { title: "Finished", help: "", statuses: ["delivered", "cancelled"] },
];

export default function AdminDeals() {
  useLiveRefresh(4000);
  const { state, loading } = useStore();
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-ink">Deals</h1>
        </div>
        <Link href="/admin/deals/new" className="btn-ember px-5 py-3 text-sm">
          <Plus size={15} /> Publish a new deal
        </Link>
      </div>
      {loading && !state.pools.length && <CardListSkeleton rows={3} />}
      {GROUPS.map((g) => {
        const list = state.pools.filter((p) => g.statuses.includes(p.status));
        if (!list.length) return null;
        return (
          <section key={g.title}>
            <h2 className="font-semibold text-ink">
              {g.title} ({list.length})
            </h2>
            {g.help && <p className="mb-3 text-xs text-ink/50">{g.help}</p>}
            <div className="grid gap-3 lg:grid-cols-2">
              {list.map((p) => (
                <PoolCard key={p.id} pool={p} href={`/admin/deals/${p.id}`} compact={g.title === "Finished"} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
