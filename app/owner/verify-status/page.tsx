"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useStore } from "@/lib/store";
import { requiredDocsForCategory, STATUS_STYLE } from "@/lib/compliance";
import { COMPLIANCE_DOC_LABEL } from "@/lib/types";
import VerificationProgressBar from "@/components/VerificationProgressBar";
import { clearVerificationProcess, getVerificationProcess } from "@/lib/verificationProcess";
import {
  ShieldCheck,
  ShieldAlert,
  Clock,
  GraduationCap,
  UploadCloud,
  FileWarning,
  RefreshCw,
  Store,
  Lock,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import clsx from "clsx";

/**
 * The verification gate. Unverified owners are routed here instead of the
 * dashboard — the prompt adapts to the shop's current verification status
 * (draft / pending / rejected / expired / verified) so the owner always knows
 * exactly what the system needs from them next.
 */
export default function VerifyStatusPage() {
  const { state, dispatch } = useStore();
  const router = useRouter();
  const shop = state.shops.find((s) => s.id === state.myShopId);

  const myRequest = state.verificationRequests
    .filter((r) => r.shopId === shop?.id)
    .sort((a, b) => (a.submittedAt < b.submittedAt ? 1 : -1))[0];

  const status = shop?.verificationStatus ?? "draft";
  const verified = status === "verified";

  // ---- simulated CIPC / B-BBEE / Tshwane verification pipeline ----
  const [, setTick] = useState(0);
  const decidingRef = useRef(false);
  const process = shop ? getVerificationProcess(shop.id) : null;
  // A human verifier approving uploaded documents ends the wait immediately.
  const humanApproved = status === "verified" && shop?.verificationMethod === "document";
  const showPipeline = !!process && !process.done && !humanApproved;

  // tick every second while the pipeline runs so the bar stays live
  useEffect(() => {
    if (!showPipeline) return;
    const timer = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(timer);
  }, [showPipeline]);

  // a human verifier approving documents overrides the simulated wait
  useEffect(() => {
    if (process && !process.done && humanApproved) clearVerificationProcess(shop!.id);
  }, [process, humanApproved, shop]);

  // when the pipeline finishes, finalise the verification
  useEffect(() => {
    if (!process?.done || decidingRef.current || !shop) return;
    decidingRef.current = true;
    (async () => {
      // documents path: the shop is "pending" until the checks conclude
      if (process.method === "documents" && myRequest && shop.verificationStatus === "pending") {
        await dispatch({
          type: "DECIDE_VERIFICATION",
          requestId: myRequest.id,
          decision: "approved",
          note: "Auto-approved — CIPC, B-BBEE black-ownership and Tshwane permit checks passed.",
          decidedBy: "CIPC / B-BBEE / Tshwane checks",
        });
      }
      clearVerificationProcess(shop.id);
      decidingRef.current = false;
    })();
  }, [process?.done, shop, myRequest, dispatch]);


  // Verified owners have no business on this page.
  useEffect(() => {
    if (state.hydrated && verified) router.replace("/owner");
  }, [state.hydrated, verified, router]);

  if (!shop) {
    return (
      <div className="mx-auto max-w-md py-14 text-center">
        <Store size={30} className="mx-auto text-ink/25" />
        <h1 className="mt-3 text-lg font-semibold text-ink">Register your shop first</h1>
        <p className="mt-1 text-sm text-ink/50">
          Verification is per shop — tell us about your shop before we can check your status.
        </p>
        <Link href="/owner/register" className="btn-dark mt-5 inline-flex px-5 py-3 text-sm">
          Register my shop
        </Link>
      </div>
    );
  }

  const requiredDocs = requiredDocsForCategory(shop.category);
  const steps = [
    { label: "Register", done: true },
    { label: "Get verified", done: verified, current: !verified },
    { label: "Trade & sell", done: false, locked: !verified },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* progress timeline */}
      <div className="card flex items-center p-3 sm:p-4">
        {steps.map((s, i) => (
          <div key={s.label} className="flex flex-1 items-center">
            {i > 0 && <div className={clsx("mx-1 sm:mx-2 h-px flex-1", s.done || s.current ? "bg-ember" : "bg-ink/15")} />}
            <div className="flex items-center gap-1 sm:gap-1.5 whitespace-nowrap">
              <span
                className={clsx(
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                  s.done ? "bg-leaf text-white" : s.current ? "bg-ember text-white" : "bg-ink/10 text-ink/40"
                )}
              >
                {s.done ? <CheckCircle2 size={12} /> : i + 1}
              </span>
              <span className={clsx("text-[11px] font-medium sm:text-xs", s.done || s.current ? "text-ink" : "text-ink/40")}>
                {s.label}
                {s.locked && <Lock size={9} className="ml-0.5 inline" />}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* status banner — the prompt adapts to the current status */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="card flex items-start gap-3 p-5"
      >
        <span
          className={clsx(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
            verified ? "bg-leaf/10 text-leaf" : "bg-ember/10 text-ember-dark"
          )}
        >
          {status === "pending" ? (
            <Clock size={20} />
          ) : status === "rejected" || status === "expired" ? (
            <FileWarning size={20} />
          ) : verified ? (
            <ShieldCheck size={20} />
          ) : (
            <ShieldAlert size={20} />
          )}
        </span>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-bold text-ink">
              {showPipeline ? "Verification in progress" : statusHeadline(status)}
            </h1>
            <span
              className={clsx(
                "rounded-full px-2.5 py-1 text-xs font-semibold",
                showPipeline ? "bg-ember/10 text-ember-dark" : STATUS_STYLE[status]
              )}
            >
              {showPipeline ? "Under verification" : statusLabelFallback(status)}
            </span>
          </div>
          <p className="mt-1.5 text-sm text-ink/55">
            {showPipeline
              ? `Kasi-Connect is verifying ${shop.name} against CIPC, the B-BBEE commission and the City of Tshwane. Trading stays locked until every check passes.`
              : statusBody(shop.name, status)}
          </p>
        </div>
      </motion.div>

      {/* live verification pipeline */}
      {showPipeline && <VerificationProgressBar shopId={shop.id} />}

      {/* reviewer note for rejected / expired shops */}
      {(status === "rejected" || status === "expired") && myRequest?.note && (
        <div className="card flex items-start gap-3 border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <FileWarning size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Verifier&apos;s note</p>
            <p className="mt-0.5">{myRequest.note}</p>
          </div>
        </div>
      )}

      {/* what the system requires, adapted to what this shop sells */}
      {!verified && !showPipeline && (
        <div className="card p-5">
          <p className="font-semibold text-ink">Documents required for {shop.name}</p>
          <p className="mt-0.5 text-xs text-ink/40">
            Based on your shop type — {shop.category === "other" ? "general retail" : shop.category}.
          </p>
          <ul className="mt-3 space-y-2">
            {requiredDocs.map((doc) => {
              const submitted = myRequest?.documents.some((d) => d.docType === doc);
              return (
                <li key={doc} className="flex items-center gap-2 text-sm">
                  {submitted ? (
                    <CheckCircle2 size={15} className="shrink-0 text-leaf" />
                  ) : (
                    <span className="h-[15px] w-[15px] shrink-0 rounded-full border-2 border-ink/20" />
                  )}
                  <span className={submitted ? "text-ink/45 line-through" : "text-ink/70"}>
                    {COMPLIANCE_DOC_LABEL[doc]}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* draft: two verification paths (hidden while the pipeline is running) */}
      {status === "draft" && !showPipeline && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Link href="/owner/compliance" className="card block p-5 transition-shadow hover:shadow-md">
            <UploadCloud size={22} className="text-ember-dark" />
            <h3 className="mt-3 font-semibold text-ink">I have my documents</h3>
            <p className="mt-1 text-sm text-ink/50">
              Upload your compliance documents and a government verifier will review them.
            </p>
            <p className="mt-3 text-xs font-semibold text-ember-dark">Upload documents →</p>
          </Link>
          <Link href="/owner/learn" className="card block p-5 transition-shadow hover:shadow-md">
            <GraduationCap size={22} className="text-leaf" />
            <h3 className="mt-3 font-semibold text-ink">I need help getting compliant</h3>
            <p className="mt-1 text-sm text-ink/50">
              Take the free compliance course — pass the quiz (70%+) and your shop is verified instantly.
            </p>
            <p className="mt-3 text-xs font-semibold text-leaf">Start the free course →</p>
          </Link>
        </div>
      )}

      {/* pending: awaiting the verifier (hidden while the pipeline is running) */}
      {status === "pending" && myRequest && !showPipeline && (
        <div className="card p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-amber-700">
            <Clock size={15} /> Submitted for review{" "}
            {new Date(myRequest.submittedAt).toLocaleString("en-ZA", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
          <div className="mt-3 space-y-1.5 border-t border-ink/5 pt-3 text-sm text-ink/65">
            {myRequest.documents.map((d) => (
              <div key={d.id} className="flex items-center justify-between">
                <span>{COMPLIANCE_DOC_LABEL[d.docType]}</span>
                <span className="text-xs text-ink/40">
                  {d.fileName}
                  {d.referenceNumber ? ` · Ref: ${d.referenceNumber}` : ""}
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-ink/40">
            Reviews usually take 2–3 business days. You&apos;ll see the decision here — no need to follow up.
          </p>
        </div>
      )}

      {/* rejected / expired: resubmit paths (hidden while the pipeline is running) */}
      {(status === "rejected" || status === "expired") && !showPipeline && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Link href="/owner/compliance" className="card block p-5 transition-shadow hover:shadow-md">
            <RefreshCw size={22} className="text-ember-dark" />
            <h3 className="mt-3 font-semibold text-ink">Resubmit documents</h3>
            <p className="mt-1 text-sm text-ink/50">
              Fix what the verifier flagged and upload your documents again.
            </p>
            <p className="mt-3 text-xs font-semibold text-ember-dark">Go to uploads →</p>
          </Link>
          <Link href="/owner/learn" className="card block p-5 transition-shadow hover:shadow-md">
            <GraduationCap size={22} className="text-leaf" />
            <h3 className="mt-3 font-semibold text-ink">Take the course instead</h3>
            <p className="mt-1 text-sm text-ink/50">
              Pass the free compliance quiz (70%+) to get verified without documents.
            </p>
            <p className="mt-3 text-xs font-semibold text-leaf">Start the course →</p>
          </Link>
        </div>
      )}

      {/* verified: brief confirmation while the redirect kicks in */}
      {verified && (
        <div className="card flex items-center gap-3 p-5 text-sm text-leaf">
          <Loader2 size={16} className="animate-spin" />
          You&apos;re verified — taking you to your dashboard…
        </div>
      )}

      <p className="text-center text-xs text-ink/35">
        While your shop is unverified it stays hidden from customers, and trading features
        (goods, orders, group buying and the exchange) stay locked.
      </p>
    </div>
  );
}

function statusHeadline(status: string): string {
  switch (status) {
    case "draft":
      return "Verify your shop to continue";
    case "pending":
      return "Your verification is under review";
    case "rejected":
      return "Your documents were declined";
    case "expired":
      return "Your compliance has expired";
    default:
      return "Your shop is verified";
  }
}

function statusBody(shopName: string, status: string): string {
  switch (status) {
    case "draft":
      return `${shopName} isn't verified yet. Until then the rest of the platform stays locked — choose one of the options below to get verified.`;
    case "pending":
      return `A government verifier is checking ${shopName}'s documents. This page updates the moment a decision is made.`;
    case "rejected":
      return `${shopName} can't be verified with the documents submitted. See the verifier's note below, fix the issue, and resubmit.`;
    case "expired":
      return `One or more of ${shopName}'s compliance documents has lapsed. Renew them and resubmit to keep trading.`;
    default:
      return `${shopName} is fully verified and visible to customers.`;
  }
}

function statusLabelFallback(status: string): string {
  switch (status) {
    case "draft":
      return "Unverified";
    case "pending":
      return "Under review";
    case "rejected":
      return "Rejected";
    case "expired":
      return "Expired";
    default:
      return "Verified";
  }
}
