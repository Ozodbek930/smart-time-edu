import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";
import { Clock, CheckCircle2, AlertTriangle, Send, Timer, FileText, Link2, Download, ExternalLink as ExternalLinkIcon } from "lucide-react";
import type { OnlineLesson, OnlineLessonQuestion, LessonAttachment } from "@shared/schema";

type LessonWithQuestions = OnlineLesson & { questions: Omit<OnlineLessonQuestion, "correctAnswer">[] };

function pad(n: number) { return String(n).padStart(2, "0"); }

function formatSeconds(s: number) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${pad(m)}:${pad(sec)}`;
}

export default function OnlineLessonPage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [result, setResult] = useState<{ score: number; totalQuestions: number } | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [started, setStarted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSubmitRef = useRef(false);

  const { data: lesson, isLoading, isError } = useQuery<LessonWithQuestions>({
    queryKey: ["/api/online-lessons", id],
    queryFn: async () => {
      const res = await fetch(`/api/online-lessons/${id}`);
      if (!res.ok) throw new Error("Not found");
      return res.json();
    },
  });

  const submitMutation = useMutation({
    mutationFn: (payload: { answers: Record<string, string>; timedOut: boolean }) =>
      apiRequest("POST", `/api/online-lessons/${id}/submit`, payload),
    onSuccess: async (res) => {
      const data = await res.json();
      setResult({ score: data.score ?? 0, totalQuestions: data.totalQuestions ?? 0 });
      setSubmitted(true);
    },
  });

  const handleAutoSubmit = useCallback((isTimeout: boolean) => {
    if (autoSubmitRef.current) return;
    autoSubmitRef.current = true;
    if (timerRef.current) clearInterval(timerRef.current);
    if (isTimeout) setTimedOut(true);
    submitMutation.mutate({ answers, timedOut: isTimeout });
  }, [answers, submitMutation]);

  useEffect(() => {
    if (!lesson || !started || submitted) return;

    const now = new Date().getTime();
    const deadlineMs = new Date(lesson.deadline).getTime();
    const timerMs = lesson.durationMinutes * 60 * 1000;
    const timeUntilDeadline = deadlineMs - now;

    const effectiveMs = Math.min(timerMs, Math.max(0, timeUntilDeadline));
    setSecondsLeft(Math.floor(effectiveMs / 1000));

    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleAutoSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [lesson, started, submitted, handleAutoSubmit]);

  const handleSubmit = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    autoSubmitRef.current = true;
    submitMutation.mutate({ answers, timedOut: false });
  };

  const setAnswer = (qId: string, val: string) => {
    setAnswers((prev) => ({ ...prev, [qId]: val }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (isError || !lesson) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <AlertTriangle className="w-12 h-12 mx-auto text-destructive mb-4" />
          <h2 className="text-xl font-bold mb-2">Lesson not found</h2>
          <Button onClick={() => navigate("/online-lessons")}>Back to Lessons</Button>
        </div>
      </div>
    );
  }

  const isPastDeadline = new Date(lesson.deadline) < new Date();

  if (!started && !submitted) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-16">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <Card className="shadow-lg">
              <CardHeader className="text-center pb-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Timer className="w-8 h-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">{lesson.title}</CardTitle>
                {lesson.description && (
                  <p className="text-muted-foreground text-sm mt-2">{lesson.description}</p>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-muted/40 rounded-xl p-3 text-center">
                    <p className="text-muted-foreground text-xs mb-1">Timer</p>
                    <p className="font-bold text-lg">{lesson.durationMinutes} min</p>
                  </div>
                  <div className="bg-muted/40 rounded-xl p-3 text-center">
                    <p className="text-muted-foreground text-xs mb-1">Questions</p>
                    <p className="font-bold text-lg">{lesson.questions.length}</p>
                  </div>
                </div>
                <div className={`flex items-center gap-2 rounded-xl p-3 text-sm ${isPastDeadline ? "bg-destructive/10 text-destructive" : "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400"}`}>
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>Deadline: {new Date(lesson.deadline).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                </div>
                {isPastDeadline ? (
                  <div className="text-center py-2">
                    <Badge variant="secondary" className="text-sm px-4 py-1.5">This lesson has expired</Badge>
                    <div className="mt-4">
                      <Button variant="outline" onClick={() => navigate("/online-lessons")}>Back to Lessons</Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground text-center">
                      Once you start, the timer will begin immediately. Submit before time runs out — the test auto-submits when the timer reaches zero.
                    </p>
                    <Button
                      className="w-full gap-2 py-6 text-base font-semibold"
                      onClick={() => setStarted(true)}
                      data-testid="button-start-test"
                    >
                      <Timer className="w-5 h-5" />
                      Start Test Now
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  if (submitted && result !== null) {
    const mcqQuestions = lesson.questions.filter((q) => q.type === "mcq");
    const pct = mcqQuestions.length > 0 ? Math.round((result.score / mcqQuestions.length) * 100) : null;
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="max-w-2xl mx-auto px-4 py-16">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
            <Card className="shadow-lg text-center">
              <CardContent className="pt-10 pb-10 space-y-6">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto ${timedOut ? "bg-orange-100 dark:bg-orange-950/30" : "bg-emerald-100 dark:bg-emerald-950/30"}`}>
                  {timedOut ? (
                    <Clock className="w-10 h-10 text-orange-500" />
                  ) : (
                    <CheckCircle2 className="w-10 h-10 text-emerald-500" />
                  )}
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-2" data-testid="text-result-title">
                    {timedOut ? "Test Finished" : "Test Submitted"}
                  </h2>
                  {timedOut && (
                    <p className="text-muted-foreground text-sm mb-3">Time ran out — your answers were automatically submitted.</p>
                  )}
                  <p className="text-muted-foreground">{lesson.title}</p>
                </div>
                {mcqQuestions.length > 0 && (
                  <div className="bg-muted/40 rounded-2xl p-6 space-y-2">
                    <p className="text-3xl font-bold text-primary" data-testid="text-score">{result.score} / {mcqQuestions.length}</p>
                    {pct !== null && (
                      <p className="text-muted-foreground text-sm">{pct}% correct</p>
                    )}
                  </div>
                )}
                <Button
                  className="gap-2"
                  onClick={() => navigate("/online-lessons")}
                  data-testid="button-back-lessons"
                >
                  Back to Lessons
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    );
  }

  const urgent = secondsLeft !== null && secondsLeft < 60;
  const answeredCount = Object.keys(answers).length;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="sticky top-16 z-40 bg-background/90 backdrop-blur border-b border-border/60 shadow-sm">
        <div className="max-w-3xl mx-auto px-4 py-2 flex items-center justify-between">
          <span className="font-semibold text-sm text-foreground/80 truncate max-w-xs">{lesson.title}</span>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">{answeredCount}/{lesson.questions.length} answered</span>
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full font-mono text-sm font-bold ${urgent ? "bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 animate-pulse" : "bg-muted text-foreground"}`}
              data-testid="timer-display"
            >
              <Clock className="w-4 h-4" />
              {secondsLeft !== null ? formatSeconds(secondsLeft) : `${lesson.durationMinutes}:00`}
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <AnimatePresence>
          {timedOut && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-orange-100 dark:bg-orange-950/30 border border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-400 rounded-xl px-4 py-3 flex items-center gap-2"
            >
              <Clock className="w-5 h-5 shrink-0" />
              <span className="font-semibold">Test Finished — submitting your answers...</span>
            </motion.div>
          )}
        </AnimatePresence>

        {(lesson.attachments as LessonAttachment[] ?? []).length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader className="pb-3 pt-4">
                <CardTitle className="text-sm flex items-center gap-2 text-primary">
                  <FileText className="w-4 h-4" />
                  Lesson Materials
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 pb-4">
                <div className="grid gap-2 sm:grid-cols-2">
                  {(lesson.attachments as LessonAttachment[]).map((att, idx) => (
                    <a
                      key={idx}
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-2.5 rounded-xl border border-border hover:border-primary/40 hover:bg-background transition-all group"
                      data-testid={`material-item-${idx}`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${att.type === "file" ? "bg-blue-100 dark:bg-blue-950/30" : "bg-green-100 dark:bg-green-950/30"}`}>
                        {att.type === "file"
                          ? <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                          : <Link2 className="w-4 h-4 text-green-600 dark:text-green-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{att.name}</p>
                        <p className="text-xs text-muted-foreground">{att.type === "file" ? "Download file" : "Open link"}</p>
                      </div>
                      <ExternalLinkIcon className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {lesson.questions.map((q, idx) => (
          <motion.div
            key={q.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.04 }}
          >
            <Card className={`border ${answers[q.id] ? "border-primary/40 bg-primary/5" : "border-border"} transition-colors`} data-testid={`card-question-${q.id}`}>
              <CardContent className="pt-5 pb-5">
                <div className="flex gap-3">
                  <span className="shrink-0 w-7 h-7 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                  <div className="flex-1 space-y-3">
                    <p className="font-medium text-foreground leading-relaxed">{q.questionText}</p>
                    {q.type === "mcq" && q.options && q.options.length > 0 ? (
                      <div className="space-y-2">
                        {q.options.map((opt, oi) => {
                          const optVal = String(oi);
                          const selected = answers[q.id] === optVal;
                          return (
                            <button
                              key={oi}
                              data-testid={`option-${q.id}-${oi}`}
                              onClick={() => setAnswer(q.id, optVal)}
                              className={`w-full text-left px-4 py-2.5 rounded-xl border text-sm transition-all ${selected ? "border-primary bg-primary/10 text-primary font-medium" : "border-border hover:border-primary/40 hover:bg-muted/50"}`}
                            >
                              <span className="font-semibold mr-2">{String.fromCharCode(65 + oi)}.</span>
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <Textarea
                        data-testid={`textarea-${q.id}`}
                        placeholder="Type your answer here..."
                        value={answers[q.id] || ""}
                        onChange={(e) => setAnswer(q.id, e.target.value)}
                        className="min-h-[80px] resize-none"
                      />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}

        <div className="flex justify-end pt-2 pb-8">
          <Button
            size="lg"
            className="gap-2 px-8 py-6 text-base font-semibold shadow-lg"
            onClick={handleSubmit}
            disabled={submitMutation.isPending || submitted}
            data-testid="button-submit-test"
          >
            {submitMutation.isPending ? (
              <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Submitting...</>
            ) : (
              <><Send className="w-5 h-5" />Submit Test</>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}
