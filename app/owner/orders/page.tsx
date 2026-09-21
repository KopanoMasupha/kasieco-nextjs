"use client";

import { useStore } from "@/lib/store";
import { OrderStatus } from "@/lib/types";
import { Store, Phone } from "lucide-react";
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

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-bold text-ink">Orders</h1>
        <p className="text-sm text-ink/50">New orders arrive here as customers check out.</p>
      </div>

      {myOrders.map((order) => {
        const action = NEXT_ACTION[order.status];
        return (
          <div key={order.id} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-ink">{order.consumerName}</p>
                {order.consumerPhone && (
                  <p className="flex items-center gap-1 text-xs text-ink/45">
                    <Phone size={11} /> {order.consumerPhone}
                  </p>
                )}
              </div>
              <span className={clsx("rounded-full px-2.5 py-1 text-xs font-semibold capitalize", STATUS_STYLE[order.status])}>
                {order.status}
              </span>
            </div>

            <div className="mt-3 space-y-1 border-t border-ink/5 pt-3 text-sm text-ink/65">
              {order.items.map((it) => (
                <div key={it.goodId} className="flex justify-between">
                  <span>{it.qty} × {it.name}</span>
                  <span>R{(it.qty * it.price).toFixed(2)}</span>
                </div>
              ))}
            </div>
            {order.note && (
              <p className="mt-2 rounded-lg bg-sand-50 px-3 py-2 text-xs text-ink/60">
                Note: {order.note}
              </p>
            )}

            <div className="mt-3 flex items-center justify-between text-xs font-medium text-ink/45">
              <span>{order.fulfilment === "pickup" ? "Pickup" : "Delivery"} · {order.payment === "cash" ? "Cash" : "Paid online"}</span>
              <span className="text-sm font-bold text-ink">R{order.total.toFixed(2)}</span>
            </div>

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
      })}

      {myOrders.length === 0 && (
        <div className="card p-6 text-center text-sm text-ink/45">No orders yet today.</div>
      )}
    </div>
  );
}
