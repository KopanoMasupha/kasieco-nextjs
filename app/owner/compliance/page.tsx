"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { statusLabel, STATUS_STYLE } from "@/lib/compliance";
import { startVerificationProcess } from "@/lib/verificationProcess";
import { ComplianceDocType, COMPLIANCE_DOC_LABEL } from "@/lib/types";
import Certificate from "@/components/Certificate";
import {
  Store,
  GraduationCap,
  UploadCloud,
  Plus,
  Trash2,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import clsx from "clsx";

const DOC_TYPES: ComplianceDocType[] = [
  "cipc-registration",
  "certificate-of-acceptability",
  "municipal-trading-licence",
  "id-document",
];

interface DraftDoc {
  docType: ComplianceDocType;
  fileName: string;
  referenceNumber: string;
}

export default function CompliancePage() {
  const { state, dispatch } = useStore();
  const router = useRouter();
  const shop = state.shops.find((s) => s.id === state.myShopId);
  const [showUpload, setShowUpload] = useState(false);
  const [docs, setDocs] = useState<DraftDoc[]>([
    { docType: "cipc-registration", fileName: "", referenceNumber: "" },
  ]);
  const [submitting, setSubmitting] = useState(false);

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

  const myRequests = state.verificationRequests
    .filter((r) => r.shopId === shop.id)
    .sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1));
  const latestRequest = myRequests[0];
  const myCertificate = state.certificates.find((c) => c.shopId === shop.id);

  async function submitDocs() {
    const valid = docs.filter((d) => d.fileName.trim());
    if (valid.length === 0) return;
    setSubmitting(true);
    await dispatch({
      type: "SUBMIT_VERIFICATION_DOCS",
      shopId: shop!.id,
      shopName: shop!.name,
      documents: valid.map((d, i) => ({
        id: `doc-${Date.now()}-${i}`,
        docType: d.docType,
        fileName: d.fileName.trim(),
        dataUrl: "",
        referenceNumber: d.referenceNumber.trim() || undefined,
      })),
    });
    setSubmitting(false);
    setShowUpload(false);
    // start the simulated CIPC / B-BBEE / Tshwane verification window
    startVerificationProcess(shop!.id, "documents");
    router.push("/owner/verify-status");
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Compliance & verification</h1>
        <p className="text-sm text-ink/50">
          Only verified shops appear to customers and can trade with other kasi shops.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="card flex items-center justify-between gap-3 p-5"
      >
        <div>
          <p className="text-xs font-medium text-ink/40">{shop.name}</p>
          <p className="mt-0.5 text-lg font-bold text-ink">Status: {statusLabel(shop.verificationStatus)}</p>
        </div>
        <span className={clsx("rounded-full px-3 py-1.5 text-xs font-semibold", STATUS_STYLE[shop.verificationStatus])}>
          {statusLabel(shop.verificationStatus)}
        </span>
      </motion.div>

      {shop.verificationStatus === "verified" && myCertificate && (
        <Certificate
          shopName={myCertificate.shopName}
          courseTitle={myCertificate.courseTitle}
          certificateNumber={myCertificate.certificateNumber}
          issuedAt={myCertificate.issuedAt}
          issuedWith={myCertificate.issuedWith}
          score={myCertificate.score}
        />
      )}

      {shop.verificationStatus === "verified" && !myCertificate && (
        <div className="card flex items-center gap-3 p-5 text-sm text-leaf">
          <ShieldCheck size={20} />
          Verified via uploaded documents{shop.verifiedAt ? ` on ${new Date(shop.verifiedAt).toLocaleDateString("en-ZA")}` : ""}.
        </div>
      )}

      {shop.verificationStatus === "pending" && latestRequest && (
        <div className="card p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-700">
            <Clock size={16} /> Submitted {new Date(latestRequest.submittedAt).toLocaleDateString("en-ZA")} — awaiting a government verifier
          </p>
          <div className="mt-3 space-y-1.5 text-sm text-ink/60">
            {latestRequest.documents.map((d) => (
              <div key={d.id} className="flex justify-between">
                <span>{COMPLIANCE_DOC_LABEL[d.docType]}</span>
                <span className="text-ink/40">{d.fileName}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {shop.verificationStatus === "rejected" && latestRequest?.note && (
        <div className="card flex items-start gap-3 border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">A verifier asked you to resubmit</p>
            <p className="mt-1 text-red-600/80">{latestRequest.note}</p>
          </div>
        </div>
      )}

      {(shop.verificationStatus === "draft" ||
        shop.verificationStatus === "rejected" ||
        shop.verificationStatus === "expired") && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Link href="/owner/learn" className="card block p-5 transition-shadow hover:shadow-md">
            <GraduationCap size={22} className="text-ember-dark" />
            <h3 className="mt-3 font-semibold text-ink">Take the free compliance course</h3>
            <p className="mt-1 text-sm text-ink/50">
              A short course on registration, food safety and by-laws. Pass the quiz and
              get verified immediately, with a certificate issued in partnership with the
              Dept. of Small Business Development pilot programme.
            </p>
            <p className="mt-3 text-xs font-semibold text-ember-dark">Start the course →</p>
          </Link>

          <button onClick={() => setShowUpload((v) => !v)} className="card block p-5 text-left transition-shadow hover:shadow-md">
            <UploadCloud size={22} className="text-leaf" />
            <h3 className="mt-3 font-semibold text-ink">I already have my documents</h3>
            <p className="mt-1 text-sm text-ink/50">
              Upload your CIPC registration, Certificate of Acceptability, or trading
              licence. A government verifier will check them before your shop goes live.
            </p>
            <p className="mt-3 text-xs font-semibold text-leaf">Upload documents →</p>
          </button>
        </div>
      )}

      {showUpload && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="card space-y-3 p-5">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-ink">Your documents</p>
            <button
              onClick={() =>
                setDocs((d) => [...d, { docType: "cipc-registration", fileName: "", referenceNumber: "" }])
              }
              className="flex items-center gap-1 text-xs font-semibold text-ember-dark"
            >
              <Plus size={13} /> Add another
            </button>
          </div>
          {docs.map((d, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 rounded-xl2 border border-ink/10 p-3">
              <select
                value={d.docType}
                onChange={(e) =>
                  setDocs((list) => list.map((x, idx) => (idx === i ? { ...x, docType: e.target.value as ComplianceDocType } : x)))
                }
                className="input col-span-12 sm:col-span-5"
              >
                {DOC_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {COMPLIANCE_DOC_LABEL[t]}
                  </option>
                ))}
              </select>
              <input
                type="file"
                onChange={(e) =>
                  setDocs((list) =>
                    list.map((x, idx) => (idx === i ? { ...x, fileName: e.target.files?.[0]?.name || "" } : x))
                  )
                }
                className="input col-span-12 py-1.5 text-xs sm:col-span-4"
              />
              <input
                placeholder="Reference no. (optional)"
                value={d.referenceNumber}
                onChange={(e) =>
                  setDocs((list) => list.map((x, idx) => (idx === i ? { ...x, referenceNumber: e.target.value } : x)))
                }
                className="input col-span-10 sm:col-span-2"
              />
              <button
                onClick={() => setDocs((list) => list.filter((_, idx) => idx !== i))}
                className="col-span-2 flex items-center justify-center text-ink/30 hover:text-red-500 sm:col-span-1"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
          <p className="text-xs text-ink/40">
            This is a hackathon prototype — file contents aren't stored, only the file name and any reference number you give.
          </p>
          <button disabled={submitting} onClick={submitDocs} className="btn-ember w-full py-2.5 text-sm">
            {submitting ? <Loader2 size={15} className="animate-spin" /> : "Submit for review"}
          </button>
        </motion.div>
      )}

      <Link href="/owner/training" className="card flex items-center justify-between p-4 text-sm hover:bg-sand-50">
        <span className="text-ink/70">Looking for in-person training instead?</span>
        <span className="font-semibold text-ember-dark">Browse SETA/Sefa sessions →</span>
      </Link>
    </div>
  );
}
