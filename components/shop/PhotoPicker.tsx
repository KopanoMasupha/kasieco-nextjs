"use client";

import { useRef, useState } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { compressPhoto } from "@/lib/photo";
import ProductImage from "@/components/ProductImage";

/** Take or choose a product photo. On phones this opens the camera. */
export default function PhotoPicker({ name, value, onChange, size = 72, compact }: { name: string; value?: string; onChange: (photo: string | null) => void; size?: number; compact?: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function pick(file?: File) {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      onChange(await compressPhoto(file));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={() => input.current?.click()} className="relative shrink-0" aria-label={value ? "Change photo" : "Add a photo"}>
        <ProductImage name={name || "item"} src={value} size={size} rounded="rounded-xl" />
        <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-ink text-white shadow">
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
        </span>
      </button>
      <div className={compact ? "hidden" : "min-w-0 text-xs text-ink/55"}>
        <button type="button" onClick={() => input.current?.click()} className="font-semibold text-ink underline-offset-2 hover:underline">
          {value ? "Change photo" : "Add a photo"}
        </button>
        {value && (
          <button type="button" onClick={() => onChange(null)} className="ml-3 inline-flex items-center gap-1 text-ink/45 hover:text-red-600">
            <Trash2 size={12} /> Remove
          </button>
        )}
        <p>A clear photo of the real product sells faster.</p>
        {error && <p className="text-red-600">{error}</p>}
      </div>
      <input ref={input} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  );
}
