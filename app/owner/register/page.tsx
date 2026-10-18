"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import RegistrationQuiz from "@/components/RegistrationQuiz";
import { ShopCategory, SHOP_CATEGORY_LABEL, GoodsCategory } from "@/lib/types";
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
  const { state, dispatch } = useStore();
  const course = state.courses.find((c) => c.id === "course-compliance-essentials") ?? state.courses[0];
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [error, setError] = useState("");
  const [category, setCategory] = useState<ShopCategory>("spaza");
  const [township, setTownship] = useState("Mamelodi");
  const [openTime, setOpenTime] = useState("07:00");
  const [closeTime, setCloseTime] = useState("19:00");
  const [openDays, setOpenDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [offersDelivery, setOffersDelivery] = useState(false);
  const [whatsapp, setWhatsapp] = useState("");
  const [facebook, setFacebook] = useState("");
  const [instagram, setInstagram] = useState("");
  const [tiktok, setTiktok] = useState("");
  const [lat, setLat] = useState(-25.7069);
  const [lng, setLng] = useState(28.3765);
  const [goods, setGoods] = useState<DraftGood[]>([
    { name: "", category: "groceries", unit: "each", price: "", stockQty: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);

  function updateGood(i: number, patch: Partial<DraftGood>) {
    setGoods((g) => g.map((item, idx) => (idx === i ? { ...item, ...patch } : item)));
  }

  const pinOk = /^\d{4}$/.test(pin) && pin === pin2;
  const phoneTaken = state.users.some((u) => u.phone.replace(/\D/g, "") === phone.replace(/\D/g, "") && phone.replace(/\D/g, "").length >= 9);
  const canContinueStep1 = name.trim() && ownerName.trim() && phone.replace(/\D/g, "").length >= 9 && pinOk && !phoneTaken;

  async function submit(answers: Record<string, number>) {
    setSubmitting(true);
    const shopId = `shop-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 24)}-${Date.now()
      .toString()
      .slice(-4)}`;
    setError("");
    const reg = await dispatch({
      type: "REGISTER_SHOP",
      pin,
      quiz: { courseId: course.id, answers },
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
        hours: `${openTime} - ${closeTime}`,
        openTime,
        closeTime,
        openDays,
        offersDelivery,
        socials: {
          whatsapp: whatsapp.trim() || undefined,
          facebook: facebook.trim() || undefined,
          instagram: instagram.trim().replace(/^@/, "") || undefined,
          tiktok: tiktok.trim().replace(/^@/, "") || undefined,
        },
        verified: false,
        verificationStatus: "draft",
        verificationMethod: null,
        verifiedAt: null,
        createdAt: new Date().toISOString(),
      },
    });
    if (reg.error) {
      setError(reg.error);
      setSubmitting(false);
      if (!/quiz/i.test(reg.error)) setStep(1);
      return;
    }
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
          soldLast7Days: 0,
          hidden: false,
        },
      });
    }
    import("canvas-confetti").then(({ default: confetti }) => confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 }, colors: ["#E85D2B", "#2F6D4F", "#F2B33D"] }));
    await dispatch({ type: "SET_ROLE", role: "owner" });
    setSubmitting(false);
    setStep(5);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="text-3xl font-bold text-ink">Register your shop</h1>
        <p className="text-sm text-ink/50">
          4 steps, ending with a short compliance quiz. Already registered?{" "}
          <Link href="/signin" className="font-semibold text-ember-dark">
            Sign in
          </Link>
        </p>
      </div>

      <div className="flex items-center gap-2">
        {[1, 2, 3, 4].map((s) => (
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
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input" type="tel" inputMode="tel" placeholder="071 234 5678" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="label">Choose a 4-digit PIN</p>
              <input
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="input tracking-[0.4em]"
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                placeholder="••••"
              />
            </div>
            <div>
              <p className="label">Type the PIN again</p>
              <input
                value={pin2}
                onChange={(e) => setPin2(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="input tracking-[0.4em]"
                type="password"
                inputMode="numeric"
                autoComplete="new-password"
                placeholder="••••"
              />
            </div>
          </div>
          <p className="-mt-2 text-xs text-ink/45">
            {phoneTaken ? "That phone number already has an account — sign in instead." : pin2.length === 4 && pin !== pin2 ? "The two PINs don't match." : "Used to sign in."}
          </p>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

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
            <p className="label">Drop your pin</p>
            <div className="h-72 overflow-hidden rounded-xl2">
              <LocationPicker lat={lat} lng={lng} onChange={(la, ln) => { setLat(la); setLng(ln); }} />
            </div>
            <p className="mt-1.5 text-xs text-ink/40">
              {lat.toFixed(5)}, {lng.toFixed(5)}
            </p>
          </div>

          <div>
            <p className="label">Opening hours</p>
            <div className="flex flex-wrap items-center gap-2">
              <input type="time" value={openTime} onChange={(e) => setOpenTime(e.target.value)} className="input w-32" aria-label="Opens at" />
              <span className="text-sm text-ink/50">to</span>
              <input type="time" value={closeTime} onChange={(e) => setCloseTime(e.target.value)} className="input w-32" aria-label="Closes at" />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d, i) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setOpenDays((days) => (days.includes(i) ? days.filter((x) => x !== i) : [...days, i].sort()))}
                  className={clsx("chip px-3 py-1.5 text-xs", openDays.includes(i) && "chip-active")}
                  aria-pressed={openDays.includes(i)}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2.5 rounded-xl2 border border-ink/10 bg-sand-50 px-4 py-3 text-sm">
            <input type="checkbox" checked={offersDelivery} onChange={(e) => setOffersDelivery(e.target.checked)} className="h-4 w-4 accent-ember" />
            I deliver to customers nearby
          </label>

          <div>
            <p className="label">Social links (optional)</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <input placeholder="WhatsApp number" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="input" />
              <input placeholder="Facebook page link" value={facebook} onChange={(e) => setFacebook(e.target.value)} className="input" />
              <input placeholder="Instagram @handle" value={instagram} onChange={(e) => setInstagram(e.target.value)} className="input" />
              <input placeholder="TikTok @handle" value={tiktok} onChange={(e) => setTiktok(e.target.value)} className="input" />
            </div>
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
            You can edit these later.
          </p>

          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="btn-outline flex-1 py-3 text-sm">
              Back
            </button>
            <button onClick={() => setStep(4)} className="btn-ember flex-1 py-3 text-sm">
              Next: compliance quiz
            </button>
          </div>
        </div>
      )}

      {step === 4 && course && (
        <RegistrationQuiz course={course} busy={submitting} error={error} onPass={submit} onBack={() => setStep(3)} />
      )}

      {step === 5 && (
        <div className="card space-y-4 p-8 text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-leaf text-white">
            <ShieldCheck size={30} />
          </span>
          <div>
            <h2 className="text-2xl font-bold text-ink">{name.trim()} is registered</h2>
            <p className="text-sm text-ink/55">Quiz passed · certificate issued · your shop is Verified.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <button onClick={() => router.push("/owner")} className="btn-ember px-6 py-3 text-sm">
              Go to my shop
            </button>
            <button onClick={() => router.push("/owner/compliance")} className="btn-outline px-5 py-3 text-sm">
              See certificate
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
