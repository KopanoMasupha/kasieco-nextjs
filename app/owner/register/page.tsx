"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { ShopCategory, SHOP_CATEGORY_LABEL, GoodsCategory, COMPLIANCE_DOC_LABEL } from "@/lib/types";
import { requiredDocsForCategory } from "@/lib/compliance";
import { Plus, Trash2, Loader2, ShieldCheck } from "lucide-react";
import clsx from "clsx";

const LocationPicker = dynamic(() => import("@/components/maps/LocationPicker"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center rounded-xl2 bg-sand-100 text-sm text-ink/40">
      Loading map…
    </div>
  ),
});

const CATEGORIES: ShopCategory[] = [
  "spaza",
  "tuckshop",
  "butchery",
  "greengrocer",
  "takeaway",
  "hairdresser",
  "caterer",
  "other",
];

const TOWNSHIPS = ["Mamelodi", "Soshanguve", "Attridgeville"];

interface DraftGood {
  name: string;
  category: GoodsCategory;
  unit: string;
  price: string;
  stockQty: string;
}

export default function RegisterShopPage() {
  const { dispatch } = useStore();
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [pinConfirm, setPinConfirm] = useState("");
  const [category, setCategory] = useState<ShopCategory>("spaza");
  const [township, setTownship] = useState("Mamelodi");
  const [hours, setHours] = useState("07:00 - 19:00 every day");
  const [offersDelivery, setOffersDelivery] = useState(false);
  const [acceptsOrders, setAcceptsOrders] = useState(true);
  const [lat, setLat] = useState(-25.7069);
  const [lng, setLng] = useState(28.3765);
  const [goods, setGoods] = useState<DraftGood[]>([
    { name: "", category: "groceries", unit: "each", price: "", stockQty: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);

  function updateGood(i: number, patch: Partial<DraftGood>) {
    setGoods((g) => g.map((item, idx) => (idx === i ? { ...item, ...patch } : item)));
  }

  // the phone number + PIN below become this owner's sign-in details
  const digitsOnly = phone.replace(/[\s-]/g, "");
  // South African numbers: 0XXXXXXXXX or +27XXXXXXXXX
  const phoneValid = /^(?:\+27|0)\d{9}$/.test(digitsOnly);
  const pinNumeric = /^\d{4,}$/.test(pin.trim());
  const pinValid = pinNumeric && pin.trim() === pinConfirm.trim();
  const canContinueStep1 = !!(
    name.trim() &&
    ownerName.trim() &&
    phoneValid &&
    pinValid
  );
  const requiredDocs = requiredDocsForCategory(category);

  async function submit() {
    setSubmitting(true);
    const shopId = `shop-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24)}-${Date.now()
      .toString()
      .slice(-4)}`;
    await dispatch({
      type: "REGISTER_SHOP",
      pin: pin.trim(),
      shop: {
        id: shopId,
        ownerId: `owner-${Date.now()}`,
        name: name.trim(),
        ownerName: ownerName.trim(),
        phone: phone.trim(),
        category,
        township,
        lat,
        lng,
        hours,
        offersDelivery,
        acceptsOrders,
        verified: false,
        verificationStatus: "draft",
        verificationMethod: null,
        verifiedAt: null,
        createdAt: new Date().toISOString(),
      },
    });
    for (const [idx, g] of goods.entries()) {
      if (!g.name.trim() || !g.price) continue;
      await dispatch({
        type: "ADD_GOOD",
        good: {
          id: `${shopId}-g${idx}`,
          shopId,
          name: g.name.trim(),
          category: g.category,
          unit: g.unit || "each",
          price: parseFloat(g.price) || 0,
          stockQty: parseInt(g.stockQty || "0", 10),
          hidden: false,
        },
      });
    }
    await dispatch({ type: "SET_ROLE", role: "owner" });
    // New owners land on the verification gate — trading stays locked until
    // their shop's status is verified.
    router.push("/owner/verify-status");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-ink">Register your shop</h1>
        <p className="text-sm text-ink/50">Takes under 3 minutes. Big steps, plain words.</p>
      </div>

      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={clsx(
              "h-1.5 flex-1 rounded-full",
              s <= step ? "bg-ember" : "bg-sand-200"
            )}
          />
        ))}
      </div>

      {step === 1 && (
        <div className="card space-y-4 p-5">
          <div>
            <p className="label">Shop name</p>
            <input value={name} onChange={(e) => setName(e.target.value)} className="input" placeholder="e.g. Thandi's Spaza" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="label">Owner name</p>
              <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} className="input" placeholder="Your full name" />
            </div>
            <div>
              <p className="label">Phone number</p>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input"
                placeholder="071 234 5678"
                inputMode="tel"
              />
              {phone.trim().length > 0 && !phoneValid && (
                <p className="mt-1 text-xs font-medium text-red-500">
                  Enter a valid South African number (e.g. 071 234 5678 or +27 71 234 5678).
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="label">Choose a PIN (4+ digits)</p>
              <input
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="input"
                placeholder="e.g. 1234"
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
              />
            </div>
            <div>
              <p className="label">Confirm PIN</p>
              <input
                value={pinConfirm}
                onChange={(e) => setPinConfirm(e.target.value)}
                className="input"
                placeholder="Type it again"
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
              />
            </div>
          </div>
          <p className="text-xs text-ink/40">
            Your phone number and PIN are how you sign back in later — keep them safe.
            {pin.length > 0 && pinConfirm.length > 0 && !pinValid && (
              <span className="ml-1 font-medium text-red-500">
                {pinNumeric ? "PINs don't match." : "Use 4 or more digits (numbers only)."}
              </span>
            )}
          </p>

          <div>
            <p className="label">What kind of shop is it?</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={clsx("chip", category === c && "chip-active")}
                >
                  {SHOP_CATEGORY_LABEL[c]}
                </button>
              ))}
            </div>
          </div>

          {/* adaptive prompt: the docs the system will require for this shop type */}
          <div className="rounded-xl2 border border-ink/10 bg-sand-50 p-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-ink/70">
              <ShieldCheck size={14} className="text-leaf" />
              To get verified, a {SHOP_CATEGORY_LABEL[category].toLowerCase()} will need:
            </p>
            <ul className="mt-2 space-y-1">
              {requiredDocs.map((doc) => (
                <li key={doc} className="flex items-center gap-2 text-xs text-ink/60">
                  <span className="h-1.5 w-1.5 rounded-full bg-ember" />
                  {COMPLIANCE_DOC_LABEL[doc]}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-ink/40">
              You&apos;ll upload these (or pass the free compliance course) after registering —
              your shop stays hidden from customers until then.
            </p>
          </div>

          <div>
            <p className="label">Township / area</p>
            <div className="flex flex-wrap gap-2">
              {TOWNSHIPS.map((t) => (
                <button
                  key={t}
                  onClick={() => setTownship(t)}
                  className={clsx("chip", township === t && "chip-active")}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <button
            disabled={!canContinueStep1}
            onClick={() => setStep(2)}
            className="btn-dark w-full py-3 text-sm"
          >
            Continue
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="card space-y-4 p-5">
          <div>
            <p className="label">Drop your shop on the map</p>
            <div className="h-72 overflow-hidden rounded-xl2">
              <LocationPicker lat={lat} lng={lng} onChange={(la, ln) => { setLat(la); setLng(ln); }} />
            </div>
            <p className="mt-1.5 text-xs text-ink/40">
              {lat.toFixed(5)}, {lng.toFixed(5)}
            </p>
          </div>

          <div>
            <p className="label">Opening hours</p>
            <input value={hours} onChange={(e) => setHours(e.target.value)} className="input" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2.5 rounded-xl2 border border-ink/10 px-4 py-3 text-sm">
              <input
                type="checkbox"
                checked={offersDelivery}
                onChange={(e) => setOffersDelivery(e.target.checked)}
                className="h-4 w-4 accent-ember"
              />
              Offers delivery
            </label>
            <label className="flex items-center gap-2.5 rounded-xl2 border border-ink/10 px-4 py-3 text-sm">
              <input
                type="checkbox"
                checked={acceptsOrders}
                onChange={(e) => setAcceptsOrders(e.target.checked)}
                className="h-4 w-4 accent-ember"
              />
              Accepts online orders
            </label>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="btn-outline flex-1 py-3 text-sm">
              Back
            </button>
            <button onClick={() => setStep(3)} className="btn-dark flex-1 py-3 text-sm">
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card space-y-4 p-5">
          <div className="flex items-center justify-between">
            <p className="label !mb-0">What you sell</p>
            <button
              onClick={() =>
                setGoods((g) => [...g, { name: "", category: "groceries", unit: "each", price: "", stockQty: "" }])
              }
              className="flex items-center gap-1 text-xs font-semibold text-ember-dark"
            >
              <Plus size={13} /> Add another
            </button>
          </div>

          {goods.map((g, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 rounded-xl2 border border-ink/10 p-3">
              <input
                placeholder="Item name"
                value={g.name}
                onChange={(e) => updateGood(i, { name: e.target.value })}
                className="input col-span-12 sm:col-span-4"
              />
              <input
                placeholder="Unit (bag, loaf..)"
                value={g.unit}
                onChange={(e) => updateGood(i, { unit: e.target.value })}
                className="input col-span-6 sm:col-span-3"
              />
              <input
                placeholder="Price (R)"
                type="number"
                value={g.price}
                onChange={(e) => updateGood(i, { price: e.target.value })}
                className="input col-span-3 sm:col-span-2"
              />
              <input
                placeholder="Stock"
                type="number"
                value={g.stockQty}
                onChange={(e) => updateGood(i, { stockQty: e.target.value })}
                className="input col-span-2 sm:col-span-2"
              />
              <button
                onClick={() => setGoods((list) => list.filter((_, idx) => idx !== i))}
                className="col-span-1 flex items-center justify-center text-ink/30 hover:text-red-500"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          <p className="text-xs text-ink/40">
            You can add or edit goods any time from "My goods" after your shop is verified.
          </p>

          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="btn-outline flex-1 py-3 text-sm">
              Back
            </button>
            <button disabled={submitting} onClick={submit} className="btn-ember flex-1 py-3 text-sm">
              {submitting ? <Loader2 size={15} className="animate-spin" /> : "Register & go to verification"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
