import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  BookOpen, ArrowLeft, ArrowRight, Clock, CheckCircle, XCircle, RotateCcw,
  FileText, Download, PenLine, Send, Loader2, Layers, X, Pencil, Play
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { useI18n } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { HighlightablePassage } from "@/components/highlightable-passage";
import type { ReadingTest, ReadingQuestion, ReadingTestSection } from "@shared/schema";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCountdownTimer } from "@/hooks/use-countdown-timer";

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const variant = difficulty === "Easy" ? "secondary" : difficulty === "Medium" ? "default" : "destructive";
  return <Badge variant={variant}>{difficulty}</Badge>;
}

type Answers = Record<number, number | string>;

function isTextType(type?: string) { return type === "completion" || type === "short-answer"; }
function isMatchType(type?: string) { return type === "matching"; }

function checkAnswer(q: ReadingQuestion, ans: number | string | undefined): boolean {
  if (ans === undefined) return false;
  if (isTextType(q.type)) return String(ans).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase();
  return ans === q.correctAnswer;
}

function isAnswered(q: ReadingQuestion, answers: Answers): boolean {
  const ans = answers[q.id];
  if (isTextType(q.type)) return typeof ans === "string" && ans.trim().length > 0;
  return ans !== undefined;
}

function QuizDisplay({
  qs, qNums, testId, answers, onAnswer, submitted,
}: {
  qs: ReadingQuestion[];
  qNums: Record<number, number>;
  testId: string;
  answers: Answers;
  onAnswer: (id: number, value: string, asText?: boolean) => void;
  submitted: boolean;
}) {
  return (
    <div className="space-y-4">
      {qs.map((q) => {
        if (q.type === "text") {
          return (
            <div key={q.id} id={`q-nav-${testId}-${q.id}`} className="px-4 py-3 rounded-md bg-sky-50/70 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800">
              <p className="text-sm text-sky-900 dark:text-sky-200 whitespace-pre-wrap leading-relaxed">{q.question}</p>
            </div>
          );
        }
        const userAnswer = answers[q.id];
        const isCorrect = submitted && checkAnswer(q, userAnswer);
        const isWrong = submitted && userAnswer !== undefined && !isCorrect;

        return (
          <div
            key={q.id}
            id={`q-nav-${testId}-${q.id}`}
            className={`p-4 rounded-md border transition-colors ${isCorrect ? "border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-900/10" : isWrong ? "border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/10" : "border-border"}`}
            data-testid={`question-block-${testId}-${q.id}`}
          >
            <div className="flex items-start gap-2 mb-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-xs font-bold">{qNums[q.id]}</span>
              <p className="text-sm font-medium" data-testid={`text-reading-question-${testId}-${q.id}`}>{q.question}</p>
            </div>

            {isTextType(q.type) ? (
              <div className="ml-8 space-y-1.5">
                <Input
                  placeholder={q.type === "short-answer" ? "Write your answer..." : "Fill in the blank..."}
                  value={typeof userAnswer === "string" ? userAnswer : ""}
                  onChange={(e) => onAnswer(q.id, e.target.value, true)}
                  disabled={submitted}
                  data-testid={`input-answer-${testId}-${q.id}`}
                  className={`max-w-sm text-sm ${submitted ? (isCorrect ? "border-green-500 bg-green-50 dark:bg-green-900/20" : isWrong ? "border-red-500 bg-red-50 dark:bg-red-900/20" : "") : ""}`}
                />
                {submitted && (
                  <p className="text-xs flex items-center gap-1 text-muted-foreground">
                    {isCorrect ? <CheckCircle className="w-3.5 h-3.5 text-green-600 dark:text-green-400 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                    {isWrong && <>Correct: <span className="font-semibold text-green-700 dark:text-green-400">{String(q.correctAnswer)}</span></>}
                    {isCorrect && <span className="text-green-700 dark:text-green-400">Correct!</span>}
                  </p>
                )}
              </div>
            ) : isMatchType(q.type) ? (
              <div className="ml-8 space-y-1.5">
                <select
                  value={typeof userAnswer === "number" ? userAnswer.toString() : ""}
                  onChange={(e) => !submitted && onAnswer(q.id, e.target.value)}
                  disabled={submitted}
                  data-testid={`select-answer-${testId}-${q.id}`}
                  className={`w-full max-w-sm p-2.5 rounded-lg border text-sm bg-background transition-colors focus:outline-none focus:ring-2 focus:ring-ring ${submitted ? (isCorrect ? "border-green-500 bg-green-50 dark:bg-green-900/20" : isWrong ? "border-red-500 bg-red-50 dark:bg-red-900/20" : "border-border") : "border-border cursor-pointer"}`}
                >
                  <option value="">— Select answer —</option>
                  {q.options.map((opt, i) => <option key={i} value={i.toString()}>{opt}</option>)}
                </select>
                {submitted && isWrong && (
                  <p className="text-xs flex items-center gap-1 text-muted-foreground">
                    <CheckCircle className="w-3.5 h-3.5 text-green-600 dark:text-green-400 shrink-0" />
                    Correct: <span className="font-semibold text-green-700 dark:text-green-400">{q.options[q.correctAnswer as number]}</span>
                  </p>
                )}
              </div>
            ) : (q.type === "tfng" || q.type === "ynng") ? (
              <div className="flex gap-2 ml-8 mt-1 flex-wrap">
                {(q.type === "tfng" ? ["True", "False", "Not Given"] : ["Yes", "No", "Not Given"]).map((label, optIdx) => {
                  const isSelected = userAnswer === optIdx;
                  const isThisCorrect = submitted && optIdx === q.correctAnswer;
                  const isThisWrong = submitted && isSelected && optIdx !== q.correctAnswer;
                  const isCorrectUnselected = submitted && optIdx === q.correctAnswer && !isSelected;
                  const colors = ["border-emerald-500 text-emerald-700 dark:text-emerald-400", "border-red-400 text-red-600 dark:text-red-400", "border-slate-400 text-slate-500 dark:text-slate-400"];
                  const selBgs = ["bg-emerald-100 dark:bg-emerald-900/30", "bg-red-100 dark:bg-red-900/30", "bg-slate-100 dark:bg-slate-800/50"];
                  let cls = "flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 text-sm font-bold transition-all duration-200 ";
                  if (isThisCorrect) cls += "bg-green-500 border-green-500 text-white";
                  else if (isThisWrong) cls += "bg-red-500 border-red-500 text-white";
                  else if (isCorrectUnselected) cls += "border-green-500 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20";
                  else if (isSelected) cls += `${colors[optIdx]} ${selBgs[optIdx]}`;
                  else cls += `${colors[optIdx]} opacity-60 hover:opacity-100 cursor-pointer`;
                  return (
                    <button key={optIdx} type="button" onClick={() => !submitted && onAnswer(q.id, optIdx.toString())} data-testid={`tfng-option-${testId}-${q.id}-${optIdx}`} className={cls}>
                      {label}
                      {isThisCorrect && <CheckCircle className="w-3.5 h-3.5" />}
                      {isThisWrong && <XCircle className="w-3.5 h-3.5" />}
                      {isCorrectUnselected && <CheckCircle className="w-3.5 h-3.5" />}
                    </button>
                  );
                })}
              </div>
            ) : (
              <RadioGroup value={userAnswer?.toString()} onValueChange={(value) => onAnswer(q.id, value)} className="space-y-2 ml-8">
                {q.options.map((option, optIdx) => {
                  const isThisCorrect = submitted && optIdx === q.correctAnswer;
                  const isThisWrong = submitted && optIdx === (userAnswer as number) && optIdx !== q.correctAnswer;
                  return (
                    <div key={optIdx} className={`flex items-center gap-2 p-2 rounded-md transition-colors ${isThisCorrect ? "bg-green-100/60 dark:bg-green-900/20" : isThisWrong ? "bg-red-100/60 dark:bg-red-900/20" : ""}`}>
                      <RadioGroupItem value={optIdx.toString()} id={`q-${testId}-${q.id}-${optIdx}`} disabled={submitted} data-testid={`radio-option-${testId}-${q.id}-${optIdx}`} />
                      <Label htmlFor={`q-${testId}-${q.id}-${optIdx}`} className="text-sm cursor-pointer flex items-center gap-2 flex-1">
                        {option}
                        {isThisCorrect && <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />}
                        {isThisWrong && <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />}
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            )}
          </div>
        );
      })}
    </div>
  );
}

function WrittenSection({ testId, testType = "reading" }: { testId: string; testType?: string }) {
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submitMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/test-results", {
        testType, testId, answers: { writtenResponse: text },
      });
    },
    onSuccess: () => { setSubmitted(true); toast({ title: "Javob yuborildi!", description: "Yozma javobingiz saqlandi." }); },
    onError: () => { setSubmitted(true); },
  });

  const handleReset = () => { setText(""); setSubmitted(false); };

  if (submitted) {
    return (
      <motion.div className="space-y-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 space-y-2">
          <div className="flex items-center gap-2 text-green-700 dark:text-green-400 font-medium">
            <CheckCircle className="w-5 h-5" /> Javob saqlandi
          </div>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{text}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleReset} className="gap-2" data-testid={`button-retry-written-${testId}`}>
          <RotateCcw className="w-4 h-4" /> Qayta yozish
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div className="space-y-3" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="flex items-center gap-2 text-sm text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/20 border border-purple-200/50 rounded-lg px-3 py-2">
        <PenLine className="w-4 h-4 shrink-0" />
        <span>Matnni o'qing va javobingizni yozing</span>
      </div>
      <Textarea placeholder="Bu yerga yozing..." className="min-h-[180px] resize-none text-sm" value={text} onChange={(e) => setText(e.target.value)} data-testid={`textarea-reading-written-${testId}`} />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{text.length} belgi</span>
        <Button onClick={() => submitMutation.mutate()} disabled={!text.trim() || submitMutation.isPending} className="gap-2 bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white" data-testid={`button-submit-reading-written-${testId}`}>
          {submitMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Yuklanmoqda...</> : <><Send className="w-4 h-4" /> Yuborish</>}
        </Button>
      </div>
    </motion.div>
  );
}

function ReadingTestCard({ test, index }: { test: ReadingTest; index: number }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [answers, setAnswers] = useState<Answers>({});
  const [submitted, setSubmitted] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(test.duration);
  const [editingTimer, setEditingTimer] = useState(false);
  const [timerInputVal, setTimerInputVal] = useState(String(test.duration));
  const mode = (test.mode as "test" | "written" | "mixed") || "test";

  const qs: ReadingQuestion[] = ((test.questions as any[]) || []).flatMap((q: any) => Array.isArray(q) ? q : [q]);
  const realQs = qs.filter(q => q.type !== "text");
  const qNums: Record<number, number> = {};
  let qn = 0;
  qs.forEach(q => { if (q.type !== "text") qNums[q.id] = ++qn; });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const score = realQs.filter(q => checkAnswer(q, answers[q.id])).length;
      await apiRequest("POST", "/api/test-results", {
        testType: "reading", testId: test.id,
        score, totalQuestions: realQs.length, answers,
      });
    },
    onSuccess: () => toast({ title: "Javoblar yuborildi!", description: `${realQs.filter(q => checkAnswer(q, answers[q.id])).length}/${realQs.length} to'g'ri` }),
  });

  const handleAutoSubmit = useCallback(() => {
    if (!submitted) {
      setSubmitted(true);
      submitMutation.mutate();
    }
  }, [submitted]);

  const timer = useCountdownTimer(timerMinutes, handleAutoSubmit, isFullScreen && !submitted && mode !== "written");

  useEffect(() => {
    if (isFullScreen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [isFullScreen]);

  const handleAnswer = (id: number, value: string, asText = false) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [id]: asText ? value : parseInt(value) }));
  };

  const handleManualSubmit = () => {
    if (submitted) return;
    setSubmitted(true);
    submitMutation.mutate();
  };

  const handleReset = () => { setAnswers({}); setSubmitted(false); setTimerMinutes(test.duration); setTimerInputVal(String(test.duration)); };

  const handleTimerConfirm = () => {
    const val = parseInt(timerInputVal);
    if (!isNaN(val) && val > 0) setTimerMinutes(val);
    setEditingTimer(false);
  };

  const scrollToQuestion = (qId: number) => {
    document.getElementById(`q-nav-${test.id}-${qId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const answeredCount = realQs.filter(q => isAnswered(q, answers)).length;
  const score = submitted ? realQs.filter(q => checkAnswer(q, answers[q.id])).length : 0;

  return (
    <>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: index * 0.08 }}>
        <motion.div whileHover={{ scale: 1.005 }} transition={{ type: "spring", stiffness: 300 }}>
          <Card data-testid={`card-reading-test-${test.id}`}>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <DifficultyBadge difficulty={test.difficulty} />
                    {mode === "written" ? (
                      <Badge className="gap-1 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 hover:bg-purple-100" variant="outline">
                        <PenLine className="w-3 h-3" /> Письменный
                      </Badge>
                    ) : mode === "mixed" ? (
                      <Badge className="gap-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-blue-200 hover:bg-blue-100" variant="outline">
                        <Layers className="w-3 h-3" /> Смешанный
                      </Badge>
                    ) : (
                      <Badge variant="outline">{realQs.length} {t.reading.questionsCount}</Badge>
                    )}
                  </div>
                  <h3 className="text-lg font-semibold mt-2" data-testid={`text-reading-title-${test.id}`}>{test.title}</h3>
                  <p className="text-sm text-muted-foreground">{test.description}</p>
                </div>
                <div className="shrink-0 flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>{test.duration} min</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-medium">{test.topic}</span>
              </div>

              <Button
                className="gap-2 w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
                onClick={() => setIsFullScreen(true)}
                data-testid={`button-start-test-${test.id}`}
              >
                <Play className="w-4 h-4" />
                {mode === "written" ? "O'qish va yozish" : mode === "mixed" ? "Boshlash" : t.reading.showPassage}
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      <AnimatePresence>
        {isFullScreen && (
          <motion.div
            className="fixed inset-0 z-50 bg-background flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            data-testid={`fullscreen-${test.id}`}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur shrink-0 gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-md bg-emerald-600 flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{test.title}</p>
                  <p className="text-xs text-muted-foreground">{test.topic}</p>
                </div>
              </div>

              {mode !== "written" && (
                <div className="flex items-center gap-2 shrink-0">
                  {!submitted && (
                    editingTimer ? (
                      <div className="flex items-center gap-1.5">
                        <Input
                          type="number"
                          min="1"
                          max="120"
                          value={timerInputVal}
                          onChange={e => setTimerInputVal(e.target.value)}
                          onKeyDown={e => e.key === "Enter" && handleTimerConfirm()}
                          className="w-16 h-7 text-center text-sm font-mono"
                          data-testid="input-timer-minutes"
                          autoFocus
                        />
                        <span className="text-xs text-muted-foreground">min</span>
                        <Button size="sm" className="h-7 text-xs px-2" onClick={handleTimerConfirm}>OK</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={() => setEditingTimer(false)}>✕</Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <Badge
                          variant={timer.isCritical ? "destructive" : timer.isWarning ? "default" : "secondary"}
                          className={`gap-1.5 py-1 px-3 text-sm font-mono font-bold ${timer.isWarning && !timer.isCritical ? "animate-pulse" : ""}`}
                          data-testid={`timer-reading-${test.id}`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          {timer.formattedTime}
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                          onClick={() => { setTimerInputVal(String(timerMinutes)); setEditingTimer(true); }}
                          title="Vaqtni o'zgartirish"
                          data-testid="button-edit-timer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    )
                  )}
                </div>
              )}

              <div className="flex items-center gap-2 shrink-0">
                {!submitted && mode !== "written" && (
                  <Button
                    size="sm"
                    className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={handleManualSubmit}
                    disabled={submitMutation.isPending}
                    data-testid={`button-submit-exam-${test.id}`}
                  >
                    <Send className="w-3.5 h-3.5" /> Topshirish
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5"
                  onClick={() => { if (submitted || window.confirm("Testdan chiqmoqchimisiz?")) setIsFullScreen(false); }}
                  data-testid={`button-exit-fullscreen-${test.id}`}
                >
                  <X className="w-4 h-4" /> Chiqish
                </Button>
              </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
              <div className="w-1/2 overflow-y-auto p-4 md:p-6 border-r">
                <h4 className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-3">{t.reading.passage}</h4>
                {test.pdfUrl && (
                  <div className="p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/50 mb-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-emerald-600" />
                        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">PDF Material</p>
                      </div>
                      <a href={test.pdfUrl} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm" className="gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:text-emerald-400">
                          <Download className="w-3.5 h-3.5" /> PDF
                        </Button>
                      </a>
                    </div>
                  </div>
                )}
                <p className="text-xs text-muted-foreground italic mb-3">{t.reading.readPassage}</p>
                <HighlightablePassage passage={test.passage} testId={test.id} />
              </div>

              <div className="w-1/2 overflow-y-auto p-4 md:p-6">
                <h4 className="text-xs font-semibold text-primary uppercase tracking-wide mb-3">
                  {mode === "written" ? "Javob" : "Savollar"}
                </h4>

                {submitted && mode !== "written" && (
                  <div className="mb-4 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                        {t.reading.score}: {score}/{realQs.length}
                        {score === realQs.length && <span className="ml-2">{t.reading.perfect}</span>}
                      </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleReset} className="gap-2 shrink-0" data-testid={`button-retry-${test.id}`}>
                      <RotateCcw className="w-4 h-4" /> {t.reading.tryAgain}
                    </Button>
                  </div>
                )}

                {mode === "written" ? (
                  <WrittenSection testId={test.id} testType="reading" />
                ) : mode === "mixed" ? (
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-purple-700 dark:text-purple-300">
                        <PenLine className="w-4 h-4" /> 1-qism — Yozma javob
                      </div>
                      <WrittenSection testId={test.id} testType="reading" />
                    </div>
                    <div className="border-t pt-5">
                      <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                        <BookOpen className="w-4 h-4" /> 2-qism — Savollar
                      </div>
                      <QuizDisplay qs={qs} qNums={qNums} testId={test.id} answers={answers} onAnswer={handleAnswer} submitted={submitted} />
                    </div>
                  </div>
                ) : (
                  <QuizDisplay qs={qs} qNums={qNums} testId={test.id} answers={answers} onAnswer={handleAnswer} submitted={submitted} />
                )}
              </div>
            </div>

            {mode !== "written" && (
              <div className="shrink-0 bg-background/95 backdrop-blur border-t" data-testid={`question-nav-${test.id}`}>
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs text-muted-foreground font-medium">
                      {answeredCount}/{realQs.length} javob berildi
                    </span>
                    {submitted && (
                      <span className="text-xs font-semibold text-emerald-600">{score} to'g'ri</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {realQs.map(q => {
                      const answered = isAnswered(q, answers);
                      const correct = submitted && checkAnswer(q, answers[q.id]);
                      const wrong = submitted && answers[q.id] !== undefined && !correct;
                      let cls = "w-8 h-8 rounded-full text-xs font-bold transition-all duration-200 border-2 cursor-pointer shrink-0 ";
                      if (submitted) cls += correct ? "bg-green-500 border-green-500 text-white" : wrong ? "bg-red-500 border-red-500 text-white" : "bg-muted border-border text-muted-foreground";
                      else cls += answered ? "bg-green-500 border-green-500 text-white" : "bg-muted border-border text-muted-foreground hover:border-primary hover:text-primary";
                      return (
                        <button
                          key={q.id}
                          onClick={() => scrollToQuestion(q.id)}
                          className={cls}
                          data-testid={`nav-q-${test.id}-${qNums[q.id]}`}
                        >
                          {qNums[q.id]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Multi-Section Single Test Exam — one reading test with multiple sections
// ─────────────────────────────────────────────────────────────────────────────

function MultiSectionReadingExam({ test, onClose }: { test: ReadingTest; onClose: () => void }) {
  const { toast } = useToast();
  const secs = ((test as any).testSections as ReadingTestSection[] | null | undefined) || [];

  const [answers, setAnswers] = useState<Record<number, Record<number, number | string>>>({});
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  let qCounter = 0;
  const globalQNums: Record<number, Record<number, number>> = {};
  const allRealQs: Array<ReadingQuestion & { sIdx: number }> = [];
  secs.forEach((sec, sIdx) => {
    const qs: ReadingQuestion[] = ((sec.questions as any[]) || []).flatMap((q: any) => Array.isArray(q) ? q : [q]);
    globalQNums[sIdx] = {};
    qs.forEach(q => {
      if (q.type !== "text") {
        globalQNums[sIdx][q.id] = ++qCounter;
        allRealQs.push({ ...q, sIdx });
      }
    });
  });
  const totalQs = allRealQs.length;
  const answeredCount = allRealQs.filter(q => {
    const ans = answers[q.sIdx]?.[q.id];
    if (isTextType(q.type)) return typeof ans === "string" && ans.trim().length > 0;
    return ans !== undefined;
  }).length;

  const handleAutoSubmit = useCallback(() => {
    if (!submitted) { setSubmitted(true); doSubmit(); }
  }, [submitted]);

  const timer = useCountdownTimer(test.duration, handleAutoSubmit, !submitted);

  const doSubmit = async () => {
    const allAnswers: Record<string, any> = {};
    secs.forEach((_, sIdx) => {
      const sectionAnswers = answers[sIdx] || {};
      Object.entries(sectionAnswers).forEach(([k, v]) => { allAnswers[`s${sIdx}_q${k}`] = v; });
    });
    const score = allRealQs.filter(q => checkAnswer(q, answers[q.sIdx]?.[q.id])).length;
    await apiRequest("POST", "/api/test-results", {
      testType: "reading", testId: test.id,
      score, totalQuestions: totalQs, answers: allAnswers,
    });
  };

  const submitMutation = useMutation({
    mutationFn: doSubmit,
    onSuccess: () => {
      setSubmitted(true);
      toast({ title: "Test submitted!", description: `${answeredCount}/${totalQs} questions answered` });
    },
  });

  const handleAnswer = (sIdx: number, id: number, value: string, asText = false) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [sIdx]: { ...(prev[sIdx] || {}), [id]: asText ? value : parseInt(value) } }));
  };

  return (
    <motion.div className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} data-testid="multi-section-reading-exam">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-background/95 backdrop-blur shrink-0 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-md bg-emerald-600 flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate max-w-[200px] sm:max-w-sm">{test.title}</p>
            <p className="text-xs text-muted-foreground">{secs.length} passages · {totalQs} questions · {answeredCount} answered</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-sm font-mono font-bold ${timer.secondsLeft < 120 ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400" : "bg-muted text-foreground"}`}>
            <Clock className="w-3.5 h-3.5" />
            {timer.display}
          </div>
          {!submitted && (
            <Button size="sm" onClick={() => { if (window.confirm("Submit the test?")) submitMutation.mutate(); }} disabled={submitMutation.isPending} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white" data-testid="button-submit-multi-reading">
              <Send className="w-3.5 h-3.5" /> Submit
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => { if (submitted || window.confirm("Exit? Your answers won't be saved.")) onClose(); }} className="gap-1.5" data-testid="button-close-multi-reading">
            <X className="w-4 h-4" /> Exit
          </Button>
        </div>
      </div>
      <div className="h-1 bg-muted shrink-0">
        <div className="h-1 bg-emerald-500 transition-all duration-500" style={{ width: `${totalQs > 0 ? (answeredCount / totalQs) * 100 : 0}%` }} />
      </div>

      {submitted ? (
        <div className="flex-1 flex items-center justify-center p-8 text-center">
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-950/50 border-2 border-green-400 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold">Test Submitted!</h2>
            <p className="text-muted-foreground text-sm">Score: {allRealQs.filter(q => checkAnswer(q, answers[q.sIdx]?.[q.id])).length} / {totalQs}</p>
            <Button onClick={onClose} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"><RotateCcw className="w-4 h-4" /> Done</Button>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto p-6 space-y-12">
            {secs.map((sec, sIdx) => {
              const qs: ReadingQuestion[] = ((sec.questions as any[]) || []).flatMap((q: any) => Array.isArray(q) ? q : [q]);
              const secAnswers = answers[sIdx] || {};
              return (
                <div key={sIdx} className="space-y-0 rounded-xl border overflow-hidden" data-testid={`ms-reading-passage-${sIdx + 1}`}>
                  {/* Passage header */}
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600">
                    <BookOpen className="w-4 h-4 text-white" />
                    <span className="text-xs font-semibold text-white uppercase tracking-wide">Passage {sec.sectionNumber}</span>
                    {sec.pdfUrl && (
                      <a href={sec.pdfUrl} target="_blank" rel="noopener noreferrer" className="ml-auto flex items-center gap-1 text-xs text-white/80 hover:text-white">
                        <Download className="w-3.5 h-3.5" /> PDF
                      </a>
                    )}
                  </div>
                  {/* Split: passage left, questions right */}
                  <div className="flex min-h-0 border-t-0">
                    <div className="w-1/2 border-r p-5 overflow-auto max-h-[70vh]">
                      {sec.passage ? (
                        <HighlightablePassage text={sec.passage} className="text-sm leading-relaxed" />
                      ) : (
                        <p className="text-sm text-muted-foreground italic">No passage text for this section.</p>
                      )}
                    </div>
                    <div className="w-1/2 p-5 space-y-4 overflow-auto max-h-[70vh]">
                      {qs.map((q) => {
                        if (q.type === "text") {
                          return (
                            <div key={q.id} className="px-4 py-3 rounded-md bg-sky-50/70 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800">
                              <p className="text-sm text-sky-900 dark:text-sky-200 whitespace-pre-wrap leading-relaxed">{q.question}</p>
                            </div>
                          );
                        }
                        const userAnswer = secAnswers[q.id];
                        const answered = isAnswered(q, secAnswers);
                        return (
                          <div key={q.id} className={`p-4 rounded-md border transition-colors ${answered ? "border-primary/40" : "border-border"}`}>
                            <div className="flex items-start gap-2 mb-3">
                              <span className="shrink-0 w-7 h-7 rounded-full bg-emerald-600/10 text-emerald-700 flex items-center justify-center text-xs font-bold">{globalQNums[sIdx]?.[q.id]}</span>
                              <p className="text-sm leading-relaxed">{q.question}</p>
                            </div>
                            {isTextType(q.type) ? (
                              <Input placeholder="Write your answer..." className="text-sm" value={(userAnswer as string) || ""} onChange={e => handleAnswer(sIdx, q.id, e.target.value, true)} />
                            ) : (
                              <RadioGroup value={userAnswer?.toString()} onValueChange={v => handleAnswer(sIdx, q.id, v)} className="space-y-2 ml-9">
                                {q.options.map((opt, i) => (
                                  <div key={i} className="flex items-center gap-2 p-2 rounded-md">
                                    <RadioGroupItem value={i.toString()} id={`ms-r-${sIdx}-${q.id}-${i}`} />
                                    <Label htmlFor={`ms-r-${sIdx}-${q.id}-${i}`} className="text-sm cursor-pointer">{opt}</Label>
                                  </div>
                                ))}
                              </RadioGroup>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="pt-4 pb-8 flex justify-center border-t">
              <Button onClick={() => { if (window.confirm("Submit the test?")) submitMutation.mutate(); }} disabled={submitMutation.isPending} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8" data-testid="button-submit-multi-reading-bottom">
                <Send className="w-4 h-4" /> Submit Test ({answeredCount}/{totalQs} answered)
              </Button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Full Reading Exam — all passages on one page
// ─────────────────────────────────────────────────────────────────────────────

function FullReadingExam({ tests, onClose }: { tests: ReadingTest[]; onClose: () => void }) {
  const { toast } = useToast();

  const passages = tests.filter(t => (t.mode as string) === "test" && t.passage);
  const totalDuration = passages.reduce((sum, t) => sum + t.duration, 0) || 60;

  const [answers, setAnswers] = useState<Record<string, Record<number, number | string>>>({});
  const [submitted, setSubmitted] = useState(false);

  // Build global question numbering
  let qCounter = 0;
  const globalQNums: Record<string, Record<number, number>> = {};
  const allRealQs: Array<ReadingQuestion & { testId: string }> = [];
  passages.forEach(test => {
    const qs: ReadingQuestion[] = ((test.questions as any[]) || []).flatMap((q: any) => Array.isArray(q) ? q : [q]);
    globalQNums[test.id] = {};
    qs.forEach(q => {
      if (q.type !== "text") {
        globalQNums[test.id][q.id] = ++qCounter;
        allRealQs.push({ ...q, testId: test.id });
      }
    });
  });
  const totalQs = allRealQs.length;
  const answeredCount = allRealQs.filter(q => {
    const ans = answers[q.testId]?.[q.id];
    if (isTextType(q.type)) return typeof ans === "string" && ans.trim().length > 0;
    return ans !== undefined;
  }).length;

  const submitAll = useCallback(async () => {
    await Promise.all(passages.map(test => {
      const qs: ReadingQuestion[] = ((test.questions as any[]) || []).flatMap((q: any) => Array.isArray(q) ? q : [q]);
      const realQs = qs.filter(q => q.type !== "text");
      const testAnswers = answers[test.id] || {};
      const score = realQs.filter(q => checkAnswer(q, testAnswers[q.id])).length;
      return apiRequest("POST", "/api/test-results", {
        testType: "reading", testId: test.id,
        score, totalQuestions: realQs.length, answers: testAnswers,
      });
    }));
  }, [passages, answers]);

  const submitMutation = useMutation({
    mutationFn: submitAll,
    onSuccess: () => {
      setSubmitted(true);
      toast({ title: "Test topshirildi!", description: `${answeredCount}/${totalQs} savol javoblandi` });
    },
  });

  const handleAutoSubmit = useCallback(() => {
    if (!submitted) { setSubmitted(true); submitMutation.mutate(); }
  }, [submitted]);

  const timer = useCountdownTimer(totalDuration, handleAutoSubmit, !submitted);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleAnswer = (testId: string, id: number, value: string, asText = false) => {
    if (submitted) return;
    setAnswers(prev => ({ ...prev, [testId]: { ...(prev[testId] || {}), [id]: asText ? value : parseInt(value) } }));
  };

  const handleSubmitConfirm = () => {
    if (window.confirm("Testni topshirishni tasdiqlaysizmi?")) submitMutation.mutate();
  };

  const goToQ = (testId: string, qId: number) => {
    setTimeout(() => {
      document.getElementById(`fr-q-${testId}-${qId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-background flex flex-col"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      data-testid="full-reading-exam"
    >
      {/* Header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-md bg-emerald-600 flex items-center justify-center shrink-0">
            <BookOpen className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm">IELTS Reading — To'liq Test</p>
            <p className="text-xs text-muted-foreground">{passages.length} matn · {totalQs} savol</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!submitted && (
            <Badge
              variant={timer.isCritical ? "destructive" : timer.isWarning ? "default" : "secondary"}
              className={`gap-1.5 py-1 px-3 font-mono font-bold ${timer.isWarning && !timer.isCritical ? "animate-pulse" : ""}`}
              data-testid="full-reading-timer"
            >
              <Clock className="w-3.5 h-3.5" />{timer.formattedTime}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground tabular-nums">{answeredCount}/{totalQs}</span>
          {!submitted && (
            <Button size="sm" className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSubmitConfirm} disabled={submitMutation.isPending} data-testid="button-submit-full-reading">
              {submitMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Topshirish
            </Button>
          )}
          <Button size="sm" variant="outline" className="gap-1.5" onClick={onClose} data-testid="button-exit-full-reading">
            <X className="w-4 h-4" /> Chiqish
          </Button>
        </div>
      </div>

      {/* Continuous scroll — all passages stacked */}
      <div className="flex-1 overflow-y-auto pb-28">
        <div className="max-w-7xl mx-auto px-4 py-6 space-y-10">
          {passages.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>To'liq test uchun matn qo'shing.</p>
            </div>
          ) : passages.map((test, pIdx) => {
            const qs: ReadingQuestion[] = ((test.questions as any[]) || []).flatMap((q: any) => Array.isArray(q) ? q : [q]);
            const realQs = qs.filter(q => q.type !== "text");
            const qNums = globalQNums[test.id];
            const testAnswers = answers[test.id] || {};
            const sectionScore = submitted ? realQs.filter(q => checkAnswer(q, testAnswers[q.id])).length : 0;
            return (
              <div key={test.id} className="rounded-xl border overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600">
                  <BookOpen className="w-4 h-4 text-white" />
                  <span className="text-xs font-semibold text-white uppercase tracking-wide">Matn {pIdx + 1} — {test.topic}</span>
                  {submitted && <Badge className="ml-auto bg-white/20 text-white text-xs">{sectionScore}/{realQs.length} to'g'ri</Badge>}
                </div>
                <div className="flex min-h-[400px]">
                  <div className="w-1/2 border-r p-4 md:p-6 overflow-auto max-h-[70vh]">
                    <HighlightablePassage passage={test.passage} testId={test.id} />
                  </div>
                  <div className="w-1/2 p-4 space-y-4 overflow-auto max-h-[70vh]">
                    {qs.map((q) => {
                      if (q.type === "text") {
                        return (
                          <div key={q.id} className="px-4 py-3 rounded-md bg-sky-50/70 dark:bg-sky-950/20 border border-sky-200">
                            <p className="text-sm text-sky-900 dark:text-sky-200 whitespace-pre-wrap leading-relaxed">{q.question}</p>
                          </div>
                        );
                      }
                      const userAnswer = testAnswers[q.id];
                      const isCorrect = submitted && checkAnswer(q, userAnswer);
                      const isWrong = submitted && userAnswer !== undefined && !isCorrect;
                      const answered = isAnswered(q, testAnswers);
                      return (
                        <div
                          key={q.id}
                          id={`fr-q-${test.id}-${q.id}`}
                          className={`p-4 rounded-md border transition-colors ${isCorrect ? "border-green-300 bg-green-50/50 dark:bg-green-900/10" : isWrong ? "border-red-300 bg-red-50/50 dark:bg-red-900/10" : answered ? "border-primary/40" : "border-border"}`}
                        >
                          <div className="flex items-start gap-2 mb-3">
                            <span className="shrink-0 w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-xs font-bold">{qNums[q.id]}</span>
                            <p className="text-sm leading-relaxed">{q.question}</p>
                          </div>
                          {isTextType(q.type) ? (
                            <Input placeholder="Javobingizni yozing..." className="text-sm" value={(userAnswer as string) || ""} onChange={e => handleAnswer(test.id, q.id, e.target.value, true)} disabled={submitted} />
                          ) : (
                            <RadioGroup value={userAnswer?.toString()} onValueChange={v => handleAnswer(test.id, q.id, v)} className="space-y-2 ml-9">
                              {q.options.map((opt, i) => (
                                <div key={i} className={`flex items-center gap-2 p-2 rounded-md ${submitted && i === q.correctAnswer ? "bg-green-100/60 dark:bg-green-900/20" : submitted && i === userAnswer && i !== q.correctAnswer ? "bg-red-100/60 dark:bg-red-900/20" : ""}`}>
                                  <RadioGroupItem value={i.toString()} id={`fr-${test.id}-${q.id}-${i}`} disabled={submitted} />
                                  <Label htmlFor={`fr-${test.id}-${q.id}-${i}`} className="text-sm cursor-pointer flex gap-2 flex-1">
                                    {opt}
                                    {submitted && i === q.correctAnswer && <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />}
                                    {submitted && i === (userAnswer as number) && i !== q.correctAnswer && <XCircle className="w-4 h-4 text-red-600 shrink-0" />}
                                  </Label>
                                </div>
                              ))}
                            </RadioGroup>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
          {!submitted && passages.length > 0 && (
            <div className="pt-4 pb-4 flex justify-center border-t">
              <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8" onClick={handleSubmitConfirm} disabled={submitMutation.isPending} data-testid="button-submit-full-reading-bottom">
                {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Testni topshirish ({answeredCount}/{totalQs})
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom nav bar */}
      {allRealQs.length > 0 && (
        <div className="shrink-0 fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t z-10" data-testid="full-reading-nav-bar">
          <div className="px-4 py-3">
            <div className="flex items-center gap-2 mb-2 justify-between">
              <span className="text-xs text-muted-foreground font-medium">{answeredCount}/{totalQs} javob berildi</span>
              {submitted && <span className="text-xs font-semibold text-emerald-600">{allRealQs.filter(q => checkAnswer(q, (answers[q.testId] || {})[q.id])).length} to'g'ri</span>}
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {allRealQs.map((q) => {
                const testAnswers = answers[q.testId] || {};
                const answered = isAnswered(q, testAnswers);
                const correct = submitted && checkAnswer(q, testAnswers[q.id]);
                const wrong = submitted && testAnswers[q.id] !== undefined && !correct;
                let cls = "w-7 h-7 rounded-full text-[11px] font-bold border-2 cursor-pointer shrink-0 transition-all ";
                if (submitted) cls += correct ? "bg-green-500 border-green-500 text-white" : wrong ? "bg-red-500 border-red-500 text-white" : "bg-muted border-border text-muted-foreground";
                else cls += answered ? "bg-emerald-500 border-emerald-500 text-white" : "bg-muted border-border text-muted-foreground hover:border-emerald-400";
                return (
                  <button
                    key={`${q.testId}-${q.id}`}
                    className={cls}
                    onClick={() => goToQ(q.testId, q.id)}
                    data-testid={`full-nav-rq-${globalQNums[q.testId][q.id]}`}
                  >
                    {globalQNums[q.testId][q.id]}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function TestSkeleton() {
  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex gap-2"><Skeleton className="h-5 w-16" /><Skeleton className="h-5 w-20" /></div>
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-9 w-full" />
      </CardContent>
    </Card>
  );
}

function isMultiSectionReadingTest(test: ReadingTest): boolean {
  const ts = (test as any).testSections as ReadingTestSection[] | null | undefined;
  return !!(ts && ts.length > 0);
}

function MultiSectionReadingTestCard({ test }: { test: ReadingTest }) {
  const [showExam, setShowExam] = useState(false);
  const secs = ((test as any).testSections as ReadingTestSection[]) || [];
  const totalQs = secs.reduce((sum, s) => {
    const qs = ((s.questions as any[]) || []).flatMap((q: any) => Array.isArray(q) ? q : [q]).filter((q: any) => q.type !== "text");
    return sum + qs.length;
  }, 0);
  return (
    <>
      {showExam && (
        <AnimatePresence>
          <MultiSectionReadingExam test={test} onClose={() => setShowExam(false)} />
        </AnimatePresence>
      )}
      <Card className="border hover:border-primary/30 transition-colors" data-testid={`card-ms-reading-${test.id}`}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge variant="secondary" className="text-xs">{secs.length} passages</Badge>
                <Badge variant="outline" className="text-xs">{test.duration} min</Badge>
                <Badge variant={test.difficulty === "Easy" ? "secondary" : test.difficulty === "Medium" ? "default" : "destructive"} className="text-xs">{test.difficulty}</Badge>
              </div>
              <h3 className="font-semibold text-base mb-0.5 truncate">{test.title}</h3>
              <p className="text-xs text-muted-foreground">{test.topic} · {totalQs} questions · shared timer</p>
              {test.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{test.description}</p>}
            </div>
            <Button size="sm" onClick={() => setShowExam(true)} className="shrink-0 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white" data-testid={`button-start-ms-reading-${test.id}`}>
              <Play className="w-3.5 h-3.5" /> Start
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

export default function Reading() {
  const { t } = useI18n();
  const { data: tests, isLoading } = useQuery<ReadingTest[]>({ queryKey: ["/api/reading-tests"] });
  const [showFullExam, setShowFullExam] = useState(false);

  const multiSectionTests = tests?.filter(isMultiSectionReadingTest) || [];
  const singleTests = tests?.filter(t => !isMultiSectionReadingTest(t)) || [];
  const totalTests = tests?.length || 0;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {showFullExam && tests && (
        <AnimatePresence>
          <FullReadingExam tests={singleTests} onClose={() => setShowFullExam(false)} />
        </AnimatePresence>
      )}
      <Navbar />

      <section className="relative py-12 md:py-16 border-b overflow-hidden" data-testid="section-reading-hero">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent" />
        <motion.div
          className="absolute top-10 right-10 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2 mb-6" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />{t.common.back}
              </Button>
            </Link>
          </motion.div>

          <motion.div className="flex items-center gap-3 mb-4" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <motion.div className="w-12 h-12 rounded-md bg-emerald-600 flex items-center justify-center" whileHover={{ rotate: 10, scale: 1.1 }} transition={{ type: "spring", stiffness: 300 }}>
              <BookOpen className="w-6 h-6 text-white" />
            </motion.div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{t.reading.title}</h1>
              <p className="text-muted-foreground mt-1">{t.reading.subtitle}</p>
            </div>
          </motion.div>

          <motion.div className="flex flex-wrap items-center gap-4 mt-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
            {[
              { label: t.reading.totalTests, value: totalTests },
              { label: t.reading.practiceTime, value: `${tests?.reduce((a, t) => a + t.duration, 0) || 0} min` },
            ].map((stat, i) => (
              <motion.div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background/60 border text-sm" whileHover={{ scale: 1.02 }}>
                <span className="text-muted-foreground">{stat.label}:</span>
                <span className="font-semibold">{stat.value}</span>
              </motion.div>
            ))}
            <Button
              onClick={() => setShowFullExam(true)}
              disabled={isLoading || !singleTests.length}
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              data-testid="button-start-full-reading"
            >
              <Play className="w-4 h-4" /> To'liq Reading Testi
            </Button>
          </motion.div>
        </div>
      </section>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="main-reading">
        {isLoading ? (
          <div className="grid gap-4">{[1, 2, 3].map((i) => <TestSkeleton key={i} />)}</div>
        ) : totalTests === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p>{t.reading.noTests}</p>
          </div>
        ) : (
          <div className="space-y-8">
            {multiSectionTests.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-1">Full Reading Tests</h2>
                <p className="text-sm text-muted-foreground mb-4">Multi-section tests with one shared timer across all passages</p>
                <div className="grid gap-4">
                  {multiSectionTests.map(test => <MultiSectionReadingTestCard key={test.id} test={test} />)}
                </div>
              </div>
            )}
            {singleTests.length > 0 && (
              <div>
                {multiSectionTests.length > 0 && <h2 className="text-lg font-semibold mb-4">Practice Tests</h2>}
                <div className="grid gap-4">
                  {singleTests.map((test, i) => <ReadingTestCard key={test.id} test={test} index={i} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
