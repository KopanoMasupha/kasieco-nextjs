"use client";

import { useState } from "react";
import { notFound, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useStore } from "@/lib/store";
import Certificate from "@/components/Certificate";
import { ArrowLeft, ArrowRight, CheckCircle2, XCircle, Loader2, Store } from "lucide-react";
import clsx from "clsx";

type Stage = "lessons" | "quiz" | "result";

export default function CoursePage({ params }: { params: { courseId: string } }) {
  const { state, dispatch } = useStore();
  const router = useRouter();
  const course = state.courses.find((c) => c.id === params.courseId);
  const shop = state.shops.find((s) => s.id === state.myShopId);

  const [stage, setStage] = useState<Stage>("lessons");
  const [lessonIndex, setLessonIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ passed: boolean; score: number; certificateId?: string } | null>(null);

  if (!course) return notFound();

  if (!shop) {
    return (
      <div className="mx-auto max-w-md py-14 text-center">
        <Store size={30} className="mx-auto text-ink/25" />
        <h1 className="mt-3 text-lg font-semibold text-ink">Register your shop first</h1>
      </div>
    );
  }

  const lesson = course.lessons[lessonIndex];
  const allAnswered = course.quiz.every((q) => answers[q.id] !== undefined);

  async function submitQuiz() {
    setSubmitting(true);
    const correct = course!.quiz.filter((q) => answers[q.id] === q.correctIndex).length;
    const score = correct / course!.quiz.length;
    const meta = await dispatch({
      type: "COMPLETE_COURSE",
      shopId: shop!.id,
      shopName: shop!.name,
      courseId: course!.id,
      courseTitle: course!.title,
      score,
      passMark: course!.passMark,
      issuedWith: course!.issuedWith,
    });
    setResult({ passed: !!meta.passed, score, certificateId: meta.certificateId });
    setSubmitting(false);
    setStage("result");

    if (meta.passed) {
      import("canvas-confetti").then(({ default: confetti }) => {
        confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 }, colors: ["#E85D2B", "#2F6D4F", "#171310"] });
      });
    }
  }

  const certificate = result?.certificateId
    ? state.certificates.find((c) => c.id === result.certificateId)
    : undefined;

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div>
        <h1 className="text-xl font-bold text-ink">{course.title}</h1>
        <p className="text-sm text-ink/50">{course.summary}</p>
      </div>

      <AnimatePresence mode="wait">
        {stage === "lessons" && (
          <motion.div
            key={lesson.id}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -12 }}
            className="card p-6"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-ember-dark">
              Lesson {lessonIndex + 1} of {course.lessons.length}
            </p>
            <h2 className="mt-1 text-lg font-bold text-ink">{lesson.title}</h2>
            <div className="mt-3 space-y-3 text-sm leading-relaxed text-ink/70">
              {lesson.body.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>

            <div className="mt-6 flex items-center gap-2">
              {course.lessons.map((_, i) => (
                <div key={i} className={clsx("h-1.5 flex-1 rounded-full", i <= lessonIndex ? "bg-ember" : "bg-sand-200")} />
              ))}
            </div>

            <div className="mt-5 flex gap-3">
              {lessonIndex > 0 && (
                <button onClick={() => setLessonIndex((i) => i - 1)} className="btn-outline flex-1 py-2.5 text-sm">
                  <ArrowLeft size={14} /> Back
                </button>
              )}
              <button
                onClick={() =>
                  lessonIndex < course.lessons.length - 1 ? setLessonIndex((i) => i + 1) : setStage("quiz")
                }
                className="btn-dark flex-1 py-2.5 text-sm"
              >
                {lessonIndex < course.lessons.length - 1 ? "Next lesson" : "Start quiz"} <ArrowRight size={14} />
              </button>
            </div>
          </motion.div>
        )}

        {stage === "quiz" && (
          <motion.div key="quiz" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card space-y-5 p-6">
            {course.quiz.map((q, qi) => (
              <div key={q.id}>
                <p className="text-sm font-semibold text-ink">
                  {qi + 1}. {q.question}
                </p>
                <div className="mt-2 space-y-1.5">
                  {q.options.map((opt, oi) => (
                    <button
                      key={oi}
                      onClick={() => setAnswers((a) => ({ ...a, [q.id]: oi }))}
                      className={clsx(
                        "block w-full rounded-xl2 border px-3.5 py-2.5 text-left text-sm",
                        answers[q.id] === oi ? "border-ember bg-ember/5 font-medium text-ink" : "border-ink/10 text-ink/70 hover:bg-sand-50"
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <button disabled={!allAnswered || submitting} onClick={submitQuiz} className="btn-ember w-full py-3 text-sm">
              {submitting ? <Loader2 size={15} className="animate-spin" /> : "Submit quiz"}
            </button>
          </motion.div>
        )}

        {stage === "result" && result && (
          <motion.div key="result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
            {result.passed && certificate ? (
              <>
                <Certificate
                  shopName={certificate.shopName}
                  courseTitle={certificate.courseTitle}
                  certificateNumber={certificate.certificateNumber}
                  issuedAt={certificate.issuedAt}
                  issuedWith={certificate.issuedWith}
                  score={certificate.score}
                />
                <div className="card flex items-center gap-2 p-4 text-sm font-medium text-leaf">
                  <CheckCircle2 size={16} /> {shop.name} is now verified — customers can find you and you can trade with other shops.
                </div>
                <button onClick={() => router.push("/owner")} className="btn-dark w-full py-3 text-sm">
                  Go to my dashboard
                </button>
              </>
            ) : (
              <div className="card p-6 text-center">
                <XCircle size={30} className="mx-auto text-red-400" />
                <h2 className="mt-3 font-bold text-ink">
                  You scored {Math.round(result.score * 100)}% — {Math.round(course.passMark * 100)}% needed
                </h2>
                <p className="mt-1 text-sm text-ink/50">No shame in it — have another look at the lessons and try again.</p>
                <button
                  onClick={() => {
                    setStage("lessons");
                    setLessonIndex(0);
                    setAnswers({});
                    setResult(null);
                  }}
                  className="btn-dark mt-4 px-5 py-2.5 text-sm"
                >
                  Review lessons again
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
