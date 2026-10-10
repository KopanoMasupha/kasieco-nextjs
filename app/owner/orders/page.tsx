"use client";

import { useStore } from "@/lib/store";
import { ConsumerOrder, OrderStatus } from "@/lib/types";
import { Store, Phone, Clock, ChevronRight } from "lucide-react";
import Link from "next/link";
import clsx from "clsx";

const NEXT_ACTION: Partial<Record<OrderStatus, { label: string; next: OrderStatus }>> = {
  placed: { label: "Accept order", next: "accepted" },
  accepted: { label: "Mark ready", next: "ready" },
  ready: { label: "Mark collected", next: "collected" },
};

const STATUS_STYLE: Record<OrderStatus, string> = {
  placed: "bg-ember/10 text-ember-dark",
  accepted: "bg-blue-100 text-blue-700",
  ready: "bg-leaf/10 text-leaf",
  collected: "bg-sand-100 text-ink/50",
  rejected: "bg-red-100 text-red-600",
};

/** Active orders the shop still needs to fulfil. */
const UPCOMING_STATUSES: OrderStatus[] = ["placed", "accepted", "ready"];
/** Completed or cancelled orders — the purchase history. */
const PAST_STATUSES: OrderStatus[] = ["collected", "rejected"];

function placedAt(iso: string) {
  return new Date(iso).toLocaleString("en-ZA", { dateStyle: "medium", timeStyle: "short" });
}

function OrderCard({ order }: { order: ConsumerOrder }) {
  const { dispatch } = useStore();
  const action = NEXT_ACTION[order.status];

  return (
    <div className="card p-5">
      {/* the card body links to the full purchase record; the action buttons
          stay outside the link so they remain separate controls */}
      <Link href={`/owner/orders/${order.id}`} className="block">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-ink">{order.consumerName}</p>
            {order.consumerPhone && (
              <p className="flex items-center gap-1 text-xs text-ink/45">
                <Phone size={11} /> {order.consumerPhone}
              </p>
            )}
            <p className="mt-1 flex items-center gap-1 text-xs text-ink/40">
              <Clock size={11} /> {placedAt(order.createdAt)} · {order.items.length}{" "}
              item{order.items.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            <span
              className={clsx(
                "rounded-full px-2.5 py-1 text-xs font-semibold capitalize",
                STATUS_STYLE[order.status]
              )}
            >
              {order.status}
            </span>
            <ChevronRight size={16} className="text-ink/25" />
          </div>
        </div>

        <div className="mt-3 space-y-1 border-t border-ink/5 pt-3 text-sm text-ink/65">
          {order.items.slice(0, 3).map((it) => (
            <div key={it.goodId} className="flex justify-between">
              <span>{it.qty} × {it.name}</span>
              <span>R{(it.qty * it.price).toFixed(2)}</span>
            </div>
          ))}
          {order.items.length > 3 && (
            <p className="text-xs text-ink/40">
              + {order.items.length - 3} more — tap for the full record
            </p>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between text-xs font-medium text-ink/45">
          <span>
            {order.fulfilment === "pickup" ? "Pickup" : "Delivery"} ·{" "}
            {order.payment === "cash" ? "Cash" : "Paid online"}
          </span>
          <span className="text-sm font-bold text-ink">R{order.total.toFixed(2)}</span>
        </div>
      </Link>

      {action && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => dispatch({ type: "SET_ORDER_STATUS", orderId: order.id, status: action.next })}
            className="btn-dark flex-1 py-2.5 text-sm"
          >
            {action.label}
          </button>
          {order.status === "placed" && (
            <button
              onClick={() => dispatch({ type: "SET_ORDER_STATUS", orderId: order.id, status: "rejected" })}
              className="btn-outline px-4 py-2.5 text-sm"
            >
              Reject
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function OwnerOrdersPage() {
  const { state, dispatch } = useStore();
  const shop = state.shops.find((s) => s.id === state.myShopId);

  if (!shop) {
    return (
      <div className="mx-auto max-w-md py-14 text-center">
        <Store size={30} className="mx-auto text-ink/25" />
        <h1 className="mt-3 text-lg font-semibold text-ink">Register your shop first</h1>
        <Link href="/owner/register" className="btn-dark mt-5 inline-flex px-5 py-3 text-sm">
          Register my shop
        </Link>
      </div>
    );
  }

  const myOrders = state.orders
    .filter((o) => o.shopId === shop.id)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const upcoming = myOrders.filter((o) => UPCOMING_STATUSES.includes(o.status));
  const past = myOrders.filter((o) => PAST_STATUSES.includes(o.status));

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Orders</h1>
        <p className="text-sm text-ink/50">
          New orders arrive here as customers check out — tap one for the full purchase record.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-ink/35">
          Upcoming · {upcoming.length}
        </h2>
        {upcoming.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
        {upcoming.length === 0 && (
          <div className="card p-6 text-center text-sm text-ink/45">
            No upcoming orders right now — new ones land here the moment a customer checks out.
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-ink/35">
          Past · {past.length}
        </h2>
        {past.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
        {past.length === 0 && (
          <div className="card p-6 text-center text-sm text-ink/45">
            Collected and rejected orders will be kept here as your purchase history.
          </div>
        )}
      </section>
    </div>
  );
}
