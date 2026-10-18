"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { BookOpen, CheckCircle2, ChevronDown, GraduationCap, Loader2, RotateCcw, XCircle } from "lucide-react";
import { Course } from "@/lib/types";

/**
 * The compliance quiz every new shop must pass before it can register.
 * Grading here is only for instant feedback — the server grades again and refuses a fail.
 */
export default function RegistrationQuiz({
  course,
  busy,
  error,
  onPass,
  onBack,
}: {
  course: Course;
  busy: boolean;
  error?: string;
  onPass: (answers: Record<string, number>) => void;
  onBack: () => void;
}) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [openLesson, setOpenLesson] = useState<string | null>(course.lessons[0]?.id ?? null);
  const [failed, setFailed] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const done = course.quiz.filter((q) => answers[q.id] !== undefined).length;
  const all = done === course.quiz.length;
  const minutes = course.lessons.reduce((n, l) => n + l.minutes, 0);

  function check() {
    const score = course.quiz.filter((q) => answers[q.id] === q.correctIndex).length / course.quiz.length;
    setChecked(true);
    if (score >= course.passMark) {
      setFailed(null);
      onPass(answers);
    } else setFailed(score);
  }

  function retry() {
    setAnswers({});
    setFailed(null);
    setChecked(false);
    setOpenLesson(course.lessons[0]?.id ?? null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div className="space-y-4">
      <div className="card flex items-start gap-3 border-ember/30 p-5">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-ember text-white">
          <GraduationCap size={20} />
        </span>
        <div>
          <p className="font-semibold text-ink">Pass the compliance quiz to register</p>
          <p className="text-sm text-ink/55">
            {minutes} minutes of reading · {course.quiz.length} questions · {Math.round(course.passMark * 100)}% to pass. You get a certificate and a Verified badge.
          </p>
        </div>
      </div>

      {/* lessons */}
      <div className="card divide-y divide-ink/[0.06]">
        <p className="flex items-center gap-2 px-5 py-3.5 text-sm font-semibold text-ink">
          <BookOpen size={15} className="text-ember" /> Read first
        </p>
        {course.lessons.map((l, i) => {
          const open = openLesson === l.id;
          return (
            <div key={l.id}>
              <button type="button" onClick={() => setOpenLesson(open ? null : l.id)} className="flex w-full items-center gap-3 px-5 py-3 text-left" aria-expanded={open}>
                <span className="num flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink/[0.06] text-xs font-bold text-ink/60">{i + 1}</span>
                <span className="flex-1 text-sm font-medium text-ink">{l.title}</span>
                <span className="text-xs text-ink/40">{l.minutes} min</span>
                <ChevronDown size={15} className={clsx("text-ink/40 transition-transform", open && "rotate-180")} />
              </button>
              <AnimatePresence initial={false}>
                {open && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="space-y-2 px-5 pb-4 pl-14 text-sm leading-relaxed text-ink/65">
                      {l.body.map((p, j) => (
                        <p key={j}>{p}</p>
                      ))}
                      {i < course.lessons.length - 1 && (
                        <button type="button" onClick={() => setOpenLesson(course.lessons[i + 1].id)} className="text-xs font-semibold text-ember-dark">
                          Next lesson →
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* quiz */}
      <div className="card space-y-5 p-5">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-ink">Quiz</p>
          <p className="num text-xs text-ink/50">
            {done} / {course.quiz.length} answered
          </p>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-ink/[0.06]">
          <motion.div className="h-full rounded-full bg-ember" animate={{ width: `${(done / course.quiz.length) * 100}%` }} />
        </div>

        {course.quiz.map((q, qi) => {
          const picked = answers[q.id];
          const showResult = checked && failed !== null;
          return (
            <fieldset key={q.id}>
              <legend className="mb-2 text-sm font-semibold text-ink">
                {qi + 1}. {q.question}
              </legend>
              <div className="space-y-1.5">
                {q.options.map((o, oi) => {
                  const on = picked === oi;
                  const wrong = showResult && on && oi !== q.correctIndex;
                  const right = showResult && on && oi === q.correctIndex;
                  return (
                    <label
                      key={oi}
                      className={clsx(
                        "flex cursor-pointer items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-sm transition-colors",
                        wrong ? "border-red-300 bg-red-50" : right ? "border-leaf/40 bg-leaf/[0.06]" : on ? "border-ember bg-ember/[0.05]" : "border-ink/10 hover:bg-sand-50"
                      )}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        className="mt-0.5"
                        checked={on}
                        onChange={() => {
                          setAnswers((a) => ({ ...a, [q.id]: oi }));
                          if (failed !== null) {
                            setFailed(null);
                            setChecked(false);
                          }
                        }}
                      />
                      <span className="flex-1 text-ink/80">{o}</span>
                      {wrong && <XCircle size={15} className="mt-0.5 shrink-0 text-red-500" />}
                      {right && <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-leaf" />}
                    </label>
                  );
                })}
              </div>
            </fieldset>
          );
        })}

        <AnimatePresence>
          {failed !== null && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="rounded-xl bg-red-50 p-4 text-sm">
              <p className="font-semibold text-red-700">
                You scored {Math.round(failed * 100)}% — {Math.round(course.passMark * 100)}% needed
              </p>
              <p className="mt-0.5 text-red-700/80">Your wrong answers are marked. Change them, or read the lessons and try again.</p>
              <button type="button" onClick={retry} className="btn-outline mt-3 px-4 py-2 text-xs">
                <RotateCcw size={13} /> Start the quiz again
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <div className="flex gap-3">
          <button type="button" onClick={onBack} disabled={busy} className="btn-outline flex-1 py-3 text-sm">
            Back
          </button>
          <button type="button" onClick={check} disabled={!all || busy || failed !== null} className="btn-ember flex-[2] py-3 text-sm">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />} {all ? "Submit quiz & register" : `Answer all ${course.quiz.length} questions`}
          </button>
        </div>
      </div>
    </div>
  );
}
