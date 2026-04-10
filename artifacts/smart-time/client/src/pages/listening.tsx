import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Headphones, Clock, CheckCircle, XCircle, RotateCcw, ArrowLeft, ArrowRight,
  PenLine, Send, Loader2, Layers, X, Pencil, Play
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { useI18n } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ListeningTest, ListeningQuestion, ListeningTestSection } from "@shared/schema";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCountdownTimer } from "@/hooks/use-countdown-timer";

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const variant = difficulty === "Easy" ? "secondary" : difficulty === "Medium" ? "default" : "destructive";
  return <Badge variant={variant}>{difficulty}</Badge>;
}

function MapViewer({ mapUrl, mapCaption }: { mapUrl: string; mapCaption?: string }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  return (
    <>
      <div className="rounded-xl border-2 border-blue-200 bg-blue-50/50 overflow-hidden">
        <div
          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-blue-100/60 transition-colors cursor-pointer"
          onClick={() => setCollapsed(c => !c)}
        >
          <div className="flex items-center gap-2 text-sm font-semibold text-blue-800">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
            Map / Diagram
            {mapCaption && <span className="font-normal text-blue-600 truncate max-w-[200px]">{mapCaption}</span>}
          </div>
          <div className="flex items-center gap-2">
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); setOpen(true); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); setOpen(true); } }}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded-md hover:bg-blue-200 transition-colors"
            >
              Full screen
            </span>
            <svg className={`w-4 h-4 text-blue-500 transition-transform ${collapsed ? "-rotate-90" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </div>
        </div>
        {!collapsed && (
          <div className="px-3 pb-3 cursor-zoom-in" onClick={() => setOpen(true)}>
            <img src={mapUrl} alt={mapCaption || "Map"} className="w-full rounded-lg border border-blue-200 object-contain max-h-64 bg-white" />
          </div>
        )}
      </div>
      {open && (
        <div className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="relative max-w-5xl max-h-full w-full" onClick={e => e.stopPropagation()}>
            <button type="button" onClick={() => setOpen(false)} className="absolute -top-10 right-0 text-white/80 hover:text-white text-sm flex items-center gap-1">
              <X className="w-5 h-5" /> Close
            </button>
            <img src={mapUrl} alt={mapCaption || "Map"} className="w-full max-h-[85vh] object-contain rounded-lg" />
            {mapCaption && <p className="text-center text-white/70 text-sm mt-3 italic">{mapCaption}</p>}
          </div>
        </div>
      )}
    </>
  );
}

type Answers = Record<number, number | string>;

function isTextType(type?: string) { return type === "completion" || type === "short-answer"; }
function isMatchType(type?: string) { return type === "matching"; }

function checkAnswer(q: ListeningQuestion, ans: number | string | undefined): boolean {
  if (ans === undefined) return false;
  if (isTextType(q.type)) return String(ans).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase();
  return ans === q.correctAnswer;
}

function isAnswered(q: ListeningQuestion, answers: Answers): boolean {
  const ans = answers[q.id];
  if (isTextType(q.type)) return typeof ans === "string" && ans.trim().length > 0;
  return ans !== undefined;
}

function QuizDisplay({
  qs, qNums, testId, answers, onAnswer, submitted,
}: {
  qs: ListeningQuestion[];
  qNums: Record<number, number>;
  testId: string;
  answers: Answers;
  onAnswer: (id: number, value: string, asText?: boolean) => void;
  submitted: boolean;
}) {
  return (
    <div className="space-y-4">
      {qs.map((q, idx) => {
        if (q.type === "text") {
          return (
            <div key={q.id} id={`q-nav-${testId}-${q.id}`} className="px-4 py-3 rounded-xl bg-blue-50 border border-blue-200">
              <p className="text-sm text-blue-900 whitespace-pre-wrap leading-relaxed">{q.question}</p>
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
            className={`rounded-xl border-2 transition-colors overflow-hidden ${isCorrect ? "border-green-400 bg-green-50/40" : isWrong ? "border-red-300 bg-red-50/30" : "border-blue-100 bg-white"}`}
            data-testid={`question-block-${testId}-${q.id}`}
          >
            <div className="flex items-start gap-3 px-4 pt-4 pb-3">
              <span className="shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">{qNums[q.id]}</span>
              <p className="text-sm font-medium leading-relaxed pt-0.5" data-testid={`text-listening-question-${testId}-${q.id}`}>{q.question}</p>
            </div>
            {(q as any).imageUrl && (
              <div className="px-4 pb-3">
                <img
                  src={(q as any).imageUrl}
                  alt={(q as any).imageCaption || "Question image"}
                  className="rounded-lg border max-h-64 object-contain w-full bg-gray-50"
                />
                {(q as any).imageCaption && (
                  <p className="text-xs text-muted-foreground mt-1 text-center italic">{(q as any).imageCaption}</p>
                )}
              </div>
            )}

            {isTextType(q.type) ? (
              <div className="px-4 pb-4 space-y-1.5">
                <Input
                  placeholder={q.type === "short-answer" ? "Write your answer..." : "Fill in the blank..."}
                  value={typeof userAnswer === "string" ? userAnswer : ""}
                  onChange={(e) => onAnswer(q.id, e.target.value, true)}
                  disabled={submitted}
                  data-testid={`input-answer-${testId}-${q.id}`}
                  className={`max-w-sm text-sm ${submitted ? (isCorrect ? "border-green-500 bg-green-50" : isWrong ? "border-red-500 bg-red-50" : "") : ""}`}
                />
                {submitted && (
                  <p className="text-xs flex items-center gap-1 text-muted-foreground">
                    {isCorrect ? <CheckCircle className="w-3.5 h-3.5 text-green-600 shrink-0" /> : <XCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                    {isWrong && <>Correct: <span className="font-semibold text-green-700">{String(q.correctAnswer)}</span></>}
                    {isCorrect && <span className="text-green-700">Correct!</span>}
                  </p>
                )}
              </div>
            ) : isMatchType(q.type) ? (
              <div className="px-4 pb-4 space-y-1.5">
                <select
                  value={typeof userAnswer === "number" ? userAnswer.toString() : ""}
                  onChange={(e) => !submitted && onAnswer(q.id, e.target.value)}
                  disabled={submitted}
                  data-testid={`select-answer-${testId}-${q.id}`}
                  className={`w-full max-w-sm p-2.5 rounded-lg border text-sm bg-background transition-colors focus:outline-none focus:ring-2 focus:ring-blue-400/40 ${submitted ? (isCorrect ? "border-green-500 bg-green-50" : isWrong ? "border-red-500 bg-red-50" : "border-border") : "border-blue-200 cursor-pointer hover:border-blue-400"}`}
                >
                  <option value="">— Select answer —</option>
                  {q.options.map((opt, i) => <option key={i} value={i.toString()}>{opt}</option>)}
                </select>
                {submitted && isWrong && (
                  <p className="text-xs flex items-center gap-1 text-muted-foreground">
                    <CheckCircle className="w-3.5 h-3.5 text-green-600 shrink-0" />
                    Correct: <span className="font-semibold text-green-700">{q.options[q.correctAnswer as number]}</span>
                  </p>
                )}
              </div>
            ) : (q.type === "tfng" || q.type === "ynng") ? (
              <div className="flex gap-2 px-4 pb-4 mt-1 flex-wrap">
                {(q.type === "tfng" ? ["True", "False", "Not Given"] : ["Yes", "No", "Not Given"]).map((label, optIdx) => {
                  const isSelected = userAnswer === optIdx;
                  const isThisCorrect = submitted && optIdx === q.correctAnswer;
                  const isThisWrong = submitted && isSelected && optIdx !== q.correctAnswer;
                  const isCorrectUnselected = submitted && optIdx === q.correctAnswer && !isSelected;
                  let cls = "flex items-center gap-1.5 px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all duration-200 ";
                  if (isThisCorrect) cls += "bg-green-500 border-green-500 text-white";
                  else if (isThisWrong) cls += "bg-red-500 border-red-500 text-white";
                  else if (isCorrectUnselected) cls += "border-green-500 text-green-700 bg-green-50";
                  else if (isSelected) cls += "border-blue-600 bg-blue-100 text-blue-800";
                  else cls += "border-gray-200 text-gray-600 hover:border-blue-400 hover:bg-blue-50 cursor-pointer";
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
              <div className="divide-y divide-gray-100 border-t border-blue-100">
                {q.options.map((option, optIdx) => {
                  const isThisCorrect = submitted && optIdx === q.correctAnswer;
                  const isThisWrong = submitted && optIdx === (userAnswer as number) && optIdx !== q.correctAnswer;
                  const isSelected = userAnswer === optIdx;
                  let rowCls = "flex items-center gap-3 px-4 py-3 text-sm cursor-pointer transition-all duration-150 ";
                  if (isThisCorrect) rowCls += "bg-green-50 text-green-800";
                  else if (isThisWrong) rowCls += "bg-red-50 text-red-800";
                  else if (isSelected) rowCls += "bg-blue-50 text-blue-900";
                  else rowCls += "hover:bg-blue-50/60 text-gray-700";
                  const letterCls = `shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${
                    isThisCorrect ? "border-green-500 bg-green-500 text-white" :
                    isThisWrong ? "border-red-500 bg-red-500 text-white" :
                    isSelected ? "border-blue-600 bg-blue-600 text-white" :
                    "border-gray-300 text-gray-500"
                  }`;
                  return (
                    <button
                      key={optIdx}
                      type="button"
                      className={rowCls}
                      onClick={() => !submitted && onAnswer(q.id, optIdx.toString())}
                      data-testid={`radio-option-${testId}-${q.id}-${optIdx}`}
                    >
                      <span className={letterCls}>{String.fromCharCode(65 + optIdx)}</span>
                      <span className="flex-1 text-left leading-snug">{option}</span>
                      {isThisCorrect && <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />}
                      {isThisWrong && <XCircle className="w-4 h-4 text-red-600 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function WrittenSection({ testId }: { testId: string }) {
  const { toast } = useToast();
  const [text, setText] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submitMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/test-results", {
        testType: "listening", testId, answers: { writtenResponse: text },
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
        <span>Audio tinglang va javobingizni yozing</span>
      </div>
      <Textarea placeholder="Bu yerga yozing..." className="min-h-[160px] resize-none text-sm" value={text} onChange={(e) => setText(e.target.value)} data-testid={`textarea-written-${testId}`} />
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{text.length} belgi</span>
        <Button onClick={() => submitMutation.mutate()} disabled={!text.trim() || submitMutation.isPending} className="gap-2 bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white" data-testid={`button-submit-written-${testId}`}>
          {submitMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Yuklanmoqda...</> : <><Send className="w-4 h-4" /> Yuborish</>}
        </Button>
      </div>
    </motion.div>
  );
}

function ListeningTestCard({ test, index }: { test: ListeningTest; index: number }) {
  const { t } = useI18n();
  const { toast } = useToast();
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [answers, setAnswers] = useState<Answers>({});
  const [submitted, setSubmitted] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(test.duration);
  const [editingTimer, setEditingTimer] = useState(false);
  const [timerInputVal, setTimerInputVal] = useState(String(test.duration));
  const mode = (test.mode as "test" | "written" | "mixed") || "test";

  const qs: ListeningQuestion[] = ((test.questions as any[]) || []).flatMap((q: any) => Array.isArray(q) ? q : [q]);
  const realQs = qs.filter(q => q.type !== "text");
  const qNums: Record<number, number> = {};
  let qn = 0;
  qs.forEach(q => { if (q.type !== "text") qNums[q.id] = ++qn; });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const score = realQs.filter(q => checkAnswer(q, answers[q.id])).length;
      await apiRequest("POST", "/api/test-results", {
        testType: "listening", testId: test.id,
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
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && isFullScreen && submitted) setIsFullScreen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isFullScreen, submitted]);

  useEffect(() => {
    if (isFullScreen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
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
        <motion.div whileHover={{ scale: 1.01 }} transition={{ type: "spring", stiffness: 300 }}>
          <Card data-testid={`card-listening-test-${test.id}`}>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline">{t.listening.section} {test.section}</Badge>
                    <DifficultyBadge difficulty={test.difficulty} />
                  </div>
                  <h3 className="text-lg font-semibold mt-2" data-testid={`text-listening-title-${test.id}`}>{test.title}</h3>
                  <p className="text-sm text-muted-foreground">{test.description}</p>
                </div>
                <div className="shrink-0 flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>{test.duration} min</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm flex-wrap">
                <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">{test.topic}</span>
                {mode === "written" ? (
                  <Badge className="gap-1 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border-purple-200 dark:border-purple-800 hover:bg-purple-100" variant="outline">
                    <PenLine className="w-3 h-3" /> Письменный
                  </Badge>
                ) : mode === "mixed" ? (
                  <Badge className="gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100" variant="outline">
                    <Layers className="w-3 h-3" /> Смешанный
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">{realQs.length} {t.listening.questionsCount}</span>
                )}
              </div>

              <Button
                className="gap-2 w-full bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-700 text-white"
                onClick={() => setIsFullScreen(true)}
                data-testid={`button-start-test-${test.id}`}
              >
                <Play className="w-4 h-4" />
                {mode === "written" ? t.listening.writeMode : mode === "mixed" ? t.listening.startMode : t.listening.startPractice}
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
            <div className="flex items-center justify-between px-4 py-3 border-b bg-blue-50 shrink-0 gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-md bg-blue-600 flex items-center justify-center shrink-0">
                  <Headphones className="w-4 h-4 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{test.title}</p>
                  <p className="text-xs text-muted-foreground">{test.topic} · Section {test.section}</p>
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
                          data-testid={`timer-listening-${test.id}`}
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
                    className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
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

            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto px-4 py-6 pb-28">
                {test.audioUrl && (
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 mb-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Headphones className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-medium text-blue-700">{t.listening.audioLabel || "Listen to the audio"}</span>
                    </div>
                    <audio controls className="w-full rounded-lg" src={test.audioUrl} data-testid={`audio-player-${test.id}`}>
                      Your browser does not support audio playback.
                    </audio>
                  </div>
                )}

                {submitted && mode !== "written" && (
                  <div className="mb-5 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                        Natija: {score}/{realQs.length}
                        {score === realQs.length && <span className="ml-2">{t.listening.perfect}</span>}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">Javoblar tekshirildi</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleReset} className="gap-2 shrink-0" data-testid={`button-retry-${test.id}`}>
                      <RotateCcw className="w-4 h-4" /> Qayta urinish
                    </Button>
                  </div>
                )}

                {mode === "written" ? (
                  <WrittenSection testId={test.id} />
                ) : mode === "mixed" ? (
                  <div className="space-y-6">
                    <div>
                      <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-purple-700 dark:text-purple-300">
                        <PenLine className="w-4 h-4" /> 1-qism — Yozma javob
                      </div>
                      <WrittenSection testId={test.id} />
                    </div>
                    <div className="border-t pt-5">
                      <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-blue-700 dark:text-blue-300">
                        <Headphones className="w-4 h-4" /> 2-qism — Savollar
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
              <div className="fixed bottom-0 left-0 right-0 z-10 bg-background/95 backdrop-blur border-t" data-testid={`question-nav-${test.id}`}>
                <div className="max-w-3xl mx-auto px-4 py-3">
                  <div className="flex items-center gap-2 justify-between mb-2">
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
                      else cls += answered ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-gray-200 text-gray-500 hover:border-blue-400 hover:text-blue-600";
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
// Multi-Section Single Test Exam — one test with multiple sections, one timer
// ─────────────────────────────────────────────────────────────────────────────

function MultiSectionListeningExam({ test, onClose }: { test: ListeningTest; onClose: () => void }) {
  const { toast } = useToast();
  const secs = ((test as any).testSections as ListeningTestSection[] | null | undefined) || [];

  const [answers, setAnswers] = useState<Record<number, Record<number, number | string>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [fontSize, setFontSize] = useState(14);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  let qCounter = 0;
  const globalQNums: Record<number, Record<number, number>> = {};
  const allRealQs: Array<ListeningQuestion & { sIdx: number }> = [];
  const partQRanges: Array<{ start: number; end: number }> = [];
  secs.forEach((sec, sIdx) => {
    const qs: ListeningQuestion[] = ((sec.questions as any[]) || []).flatMap((q: any) => Array.isArray(q) ? q : [q]);
    globalQNums[sIdx] = {};
    const rangeStart = qCounter + 1;
    qs.forEach(q => {
      if (q.type !== "text") {
        globalQNums[sIdx][q.id] = ++qCounter;
        allRealQs.push({ ...q, sIdx });
      }
    });
    partQRanges.push({ start: rangeStart, end: qCounter });
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
  const isTimerCritical = timer.secondsLeft < 120;
  const isTimerWarning = timer.secondsLeft < 300 && !isTimerCritical;

  const doSubmit = async () => {
    const allAnswers: Record<string, any> = {};
    secs.forEach((_, sIdx) => {
      const sectionAnswers = answers[sIdx] || {};
      Object.entries(sectionAnswers).forEach(([k, v]) => { allAnswers[`s${sIdx}_q${k}`] = v; });
    });
    const score = allRealQs.filter(q => checkAnswer(q, answers[q.sIdx]?.[q.id])).length;
    await apiRequest("POST", "/api/test-results", {
      testType: "listening", testId: test.id,
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

  const scrollToQ = (qId: number) => {
    document.getElementById(`ms-q-${qId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <motion.div className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} data-testid="multi-section-listening-exam">

      {/* ── SmartCEFR-style Top Bar ── */}
      <div className="flex items-center px-4 py-2 border-b bg-white shrink-0 gap-2">
        {/* Left: Brand */}
        <div className="flex flex-col shrink-0 min-w-0">
          <span className="font-bold text-sm text-gray-900 leading-tight tracking-tight">SMART TIME</span>
          <span className="text-[10px] text-gray-400 leading-tight uppercase tracking-widest">Education</span>
        </div>

        {/* Center: LISTENING + Timer + Controls */}
        <div className="flex items-center gap-2 flex-1 justify-center flex-wrap">
          <div className={`flex items-center gap-2 rounded px-3 py-1.5 ${isTimerCritical ? "bg-red-100" : "bg-gray-100"}`}>
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest hidden sm:block">LISTENING</span>
            <span className={`font-mono text-sm font-bold ${isTimerCritical ? "text-red-600" : isTimerWarning ? "text-amber-600" : "text-gray-800"}`}>
              {timer.display}
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-1">
            <button
              onClick={() => setFontSize(s => Math.max(12, s - 1))}
              className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 text-gray-600 font-semibold"
            >A-</button>
            <button
              onClick={() => setFontSize(s => Math.min(20, s + 1))}
              className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100 text-gray-600 font-semibold"
            >A+</button>
          </div>
        </div>

        {/* Right: Submit + Exit */}
        <div className="flex items-center gap-2 shrink-0">
          {!submitted && (
            <button
              onClick={() => { if (window.confirm("Submit the test?")) submitMutation.mutate(); }}
              disabled={submitMutation.isPending}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold rounded transition-colors disabled:opacity-60"
              data-testid="button-submit-multi-listening"
            >
              {submitMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              Submit
            </button>
          )}
          <button
            onClick={() => { if (submitted || window.confirm("Exit? Your answers won't be saved.")) onClose(); }}
            className="p-1.5 hover:bg-gray-100 rounded text-gray-500 transition-colors"
            data-testid="button-close-multi-listening"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {submitted ? (
        <div className="flex-1 flex items-center justify-center p-8 text-center">
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-full bg-green-100 border-2 border-green-400 flex items-center justify-center mx-auto">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold">Test Submitted!</h2>
            <p className="text-gray-500 text-sm">Score: {allRealQs.filter(q => checkAnswer(q, answers[q.sIdx]?.[q.id])).length} / {totalQs}</p>
            <button onClick={onClose} className="flex items-center gap-2 mx-auto px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700">
              <RotateCcw className="w-4 h-4" /> Done
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto bg-white">
            <div className="max-w-5xl mx-auto p-6 space-y-10" style={{ fontSize: `${fontSize}px` }}>
              {secs.map((sec, sIdx) => {
                const qs: ListeningQuestion[] = ((sec.questions as any[]) || []).flatMap((q: any) => Array.isArray(q) ? q : [q]);
                const secAnswers = answers[sIdx] || {};
                const range = partQRanges[sIdx] || { start: 1, end: qs.filter(q => q.type !== "text").length };
                const partNum = (sec as any).sectionNumber || (sIdx + 1);
                const hasMap = !!(sec as any).mapUrl;
                return (
                  <div key={sIdx} className="space-y-4" data-testid={`ms-listening-section-${sIdx + 1}`}>
                    {/* SmartCEFR-style Part heading */}
                    <h2 className="text-xl font-bold text-gray-900">
                      Part {partNum}
                      {range.start <= range.end && (
                        <span className="text-gray-400 font-normal text-base ml-2">Questions {range.start}–{range.end}</span>
                      )}
                    </h2>
                    {/* Audio player */}
                    {sec.audioUrl && (
                      <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
                        <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Audio — Listen carefully</p>
                        <audio controls className="w-full h-9 rounded" src={sec.audioUrl} data-testid={`multi-audio-${sIdx}`} />
                      </div>
                    )}
                    {/* Map + Questions: two-column when map exists */}
                    {hasMap ? (
                      <div className="flex gap-5 items-start">
                        {/* Map panel */}
                        <div className="w-72 shrink-0 sticky top-4 self-start rounded-lg border-2 border-blue-300 overflow-hidden">
                          <div className="bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800 border-b border-blue-200">Map</div>
                          <img
                            src={(sec as any).mapUrl}
                            alt={(sec as any).mapCaption || "Map"}
                            className="w-full object-contain bg-white"
                          />
                        </div>
                        {/* Questions panel */}
                        <div className="flex-1 min-w-0">
                          <div className="rounded-lg border border-gray-200 overflow-hidden">
                            <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200">
                              <span className="text-sm font-semibold text-gray-700">Questions {range.start}–{range.end}</span>
                            </div>
                            <div className="p-3 space-y-3">
                              {qs.filter(q => q.type !== "text").map((q) => {
                                const userAnswer = secAnswers[q.id];
                                const qLabel = `Q${globalQNums[sIdx]?.[q.id]} ${q.question}`;
                                return (
                                  <div key={q.id} id={`ms-q-${q.id}`} className="scroll-mt-20">
                                    <p className="text-sm font-medium text-gray-700 mb-1.5">{qLabel}</p>
                                    {isTextType(q.type) ? (
                                      <Input
                                        placeholder="Write your answer..."
                                        value={typeof userAnswer === "string" ? userAnswer : ""}
                                        onChange={e => handleAnswer(sIdx, q.id, e.target.value, true)}
                                        className="text-sm max-w-sm"
                                      />
                                    ) : (
                                      <select
                                        value={userAnswer !== undefined ? userAnswer.toString() : ""}
                                        onChange={e => handleAnswer(sIdx, q.id, e.target.value)}
                                        className="w-full max-w-sm p-2.5 rounded-lg border border-gray-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/40 cursor-pointer"
                                      >
                                        <option value="">Select</option>
                                        {q.options.map((opt, i) => (
                                          <option key={i} value={i.toString()}>{opt}</option>
                                        ))}
                                      </select>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* No map: full-width questions */
                      <div className="space-y-3">
                        {qs.map((q) => {
                          if (q.type === "text") {
                            return (
                              <div key={q.id} className="px-4 py-3 rounded-lg bg-amber-50 border border-amber-200">
                                <p className="text-sm text-amber-900 whitespace-pre-wrap leading-relaxed italic font-medium">{q.question}</p>
                              </div>
                            );
                          }
                          const userAnswer = secAnswers[q.id];
                          const answered = isAnswered(q, secAnswers);
                          return (
                            <div
                              key={q.id}
                              id={`ms-q-${q.id}`}
                              className={`rounded-xl border-2 overflow-hidden scroll-mt-20 transition-colors ${answered ? "border-blue-200" : "border-gray-100"} bg-white`}
                              data-testid={`ms-q-block-${q.id}`}
                            >
                              <div className="flex items-start gap-3 px-4 pt-4 pb-3">
                                <span className="shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">
                                  {globalQNums[sIdx]?.[q.id]}
                                </span>
                                <p className="text-sm font-medium leading-relaxed pt-0.5">{q.question}</p>
                              </div>
                              {(q as any).imageUrl && (
                                <div className="px-4 pb-3">
                                  <img src={(q as any).imageUrl} alt={(q as any).imageCaption || "Question image"} className="rounded-lg border max-h-56 object-contain w-full bg-gray-50" />
                                  {(q as any).imageCaption && <p className="text-xs text-gray-500 mt-1 text-center italic">{(q as any).imageCaption}</p>}
                                </div>
                              )}
                              {isTextType(q.type) ? (
                                <div className="px-4 pb-4">
                                  <Input placeholder="Write your answer..." className="text-sm max-w-sm" value={(userAnswer as string) || ""} onChange={e => handleAnswer(sIdx, q.id, e.target.value, true)} />
                                </div>
                              ) : isMatchType(q.type) ? (
                                <div className="px-4 pb-4">
                                  <select
                                    value={userAnswer !== undefined ? userAnswer.toString() : ""}
                                    onChange={e => handleAnswer(sIdx, q.id, e.target.value)}
                                    className="w-full max-w-sm p-2.5 rounded-lg border border-gray-300 text-sm bg-white cursor-pointer hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/40"
                                  >
                                    <option value="">Select</option>
                                    {q.options.map((opt, i) => <option key={i} value={i.toString()}>{opt}</option>)}
                                  </select>
                                </div>
                              ) : (q.type === "tfng" || q.type === "ynng") ? (
                                <div className="flex gap-2 px-4 pb-4 flex-wrap">
                                  {(q.type === "tfng" ? ["True", "False", "Not Given"] : ["Yes", "No", "Not Given"]).map((lbl, optIdx) => {
                                    const isSelected = userAnswer === optIdx;
                                    return (
                                      <button key={optIdx} type="button" onClick={() => handleAnswer(sIdx, q.id, optIdx.toString())} className={`px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${isSelected ? "border-blue-600 bg-blue-100 text-blue-800" : "border-gray-200 text-gray-600 hover:border-blue-400 hover:bg-blue-50"}`}>
                                        {lbl}
                                      </button>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="divide-y divide-gray-100 border-t border-gray-100">
                                  {q.options.map((opt, optIdx) => {
                                    const isSelected = userAnswer === optIdx;
                                    return (
                                      <button key={optIdx} type="button" onClick={() => handleAnswer(sIdx, q.id, optIdx.toString())} className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-all ${isSelected ? "bg-blue-50 text-blue-900" : "hover:bg-gray-50 text-gray-700"}`}>
                                        <span className={`shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${isSelected ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300 text-gray-500"}`}>{String.fromCharCode(65 + optIdx)}</span>
                                        <span className="flex-1 leading-snug">{opt}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── SmartCEFR-style Bottom Question Navigator ── */}
          {allRealQs.length > 0 && (
            <div className="shrink-0 border-t bg-white" data-testid="ms-listening-bottom-nav">
              <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
                <span className="text-xs font-semibold text-gray-600">Listening Q1–{totalQs}</span>
                <span className="text-xs text-gray-500">Unanswered: <span className="font-bold text-gray-700">{totalQs - answeredCount}</span></span>
              </div>
              <div className="px-3 py-2.5 flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                {allRealQs.map((q, idx) => {
                  const ans = answers[q.sIdx]?.[q.id];
                  const answered = isTextType(q.type) ? typeof ans === "string" && ans.trim().length > 0 : ans !== undefined;
                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => scrollToQ(q.id)}
                      data-testid={`ms-nav-q-${idx + 1}`}
                      className={`w-8 h-8 rounded-full text-xs font-bold transition-all duration-200 border-2 cursor-pointer shrink-0 ${
                        answered
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "bg-rose-50 border-rose-200 text-rose-400 hover:border-blue-400 hover:text-blue-600"
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </motion.div>
  );
}

// Full Listening Exam — all 4 sections on one page
// ─────────────────────────────────────────────────────────────────────────────

function FullListeningExam({ tests, onClose }: { tests: ListeningTest[]; onClose: () => void }) {
  const { toast } = useToast();

  // One test per section, ordered 1→4
  const sections = [1, 2, 3, 4].flatMap(n => tests.filter(t => t.section === n && (t.mode as string) === "test")).slice(0, 4);
  const totalDuration = sections.reduce((sum, t) => sum + t.duration, 0) || 30;

  const [answers, setAnswers] = useState<Record<string, Record<number, number | string>>>({});
  const [submitted, setSubmitted] = useState(false);

  // Build global question numbering across all sections
  let qCounter = 0;
  const globalQNums: Record<string, Record<number, number>> = {};
  const allRealQs: Array<ListeningQuestion & { testId: string }> = [];
  sections.forEach(test => {
    const qs: ListeningQuestion[] = ((test.questions as any[]) || []).flatMap((q: any) => Array.isArray(q) ? q : [q]);
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
    await Promise.all(sections.map(test => {
      const qs: ListeningQuestion[] = ((test.questions as any[]) || []).flatMap((q: any) => Array.isArray(q) ? q : [q]);
      const realQs = qs.filter(q => q.type !== "text");
      const testAnswers = answers[test.id] || {};
      const score = realQs.filter(q => checkAnswer(q, testAnswers[q.id])).length;
      return apiRequest("POST", "/api/test-results", {
        testType: "listening", testId: test.id,
        score, totalQuestions: realQs.length, answers: testAnswers,
      });
    }));
  }, [sections, answers]);

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
      document.getElementById(`full-q-${testId}-${qId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
  };

  const renderSectionContent = (test: ListeningTest) => {
    const qs: ListeningQuestion[] = ((test.questions as any[]) || []).flatMap((q: any) => Array.isArray(q) ? q : [q]);
    const realQs = qs.filter(q => q.type !== "text");
    const qNums = globalQNums[test.id];
    const testAnswers = answers[test.id] || {};
    const sectionScore = submitted ? realQs.filter(q => checkAnswer(q, testAnswers[q.id])).length : 0;

    return (
      <div className="space-y-4">
        {/* Section meta */}
        <div className="flex items-center gap-3 pb-3 border-b-2 border-blue-500">
          <div className="w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
            {test.section}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold">{test.section}-Bo'lim</p>
            <p className="text-xs text-muted-foreground truncate">{test.title} · {test.topic}</p>
          </div>
          <Badge variant="outline" className="text-xs shrink-0">{realQs.length} savol</Badge>
          {submitted && (
            <Badge className="bg-emerald-600 text-white text-xs shrink-0">{sectionScore}/{realQs.length}</Badge>
          )}
        </div>

        {/* Audio player */}
        {test.audioUrl && (
          <div className="rounded-xl border bg-blue-50/60 dark:bg-blue-950/20 overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-blue-200/60 bg-blue-600">
              <Headphones className="w-4 h-4 text-white" />
              <span className="text-xs font-semibold text-white">Audio yozuvi — diqqat bilan tinglang</span>
            </div>
            <div className="p-4">
              <audio controls className="w-full rounded" src={test.audioUrl} data-testid={`full-audio-${test.id}`} />
            </div>
          </div>
        )}

        {/* Questions */}
        {qs.length > 0 ? (
          <div className="space-y-4">
            {qs.map((q) => {
              if (q.type === "text") {
                return (
                  <div key={q.id} className="px-4 py-3 rounded-md bg-sky-50/70 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800">
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
                  id={`full-q-${test.id}-${q.id}`}
                  className={`p-4 rounded-md border transition-colors ${isCorrect ? "border-green-300 bg-green-50/50 dark:bg-green-900/10" : isWrong ? "border-red-300 bg-red-50/50 dark:bg-red-900/10" : answered ? "border-primary/40" : "border-border"}`}
                >
                  <div className="flex items-start gap-2 mb-3">
                    <span className="shrink-0 w-7 h-7 rounded-full bg-blue-600/10 text-blue-600 flex items-center justify-center text-xs font-bold">{qNums?.[q.id]}</span>
                    <p className="text-sm leading-relaxed">{q.question}</p>
                  </div>
                  {isTextType(q.type) ? (
                    <Input
                      placeholder="Javobingizni yozing..."
                      className="text-sm"
                      value={(userAnswer as string) || ""}
                      onChange={e => handleAnswer(test.id, q.id, e.target.value, true)}
                      disabled={submitted}
                    />
                  ) : isMatchType(q.type) ? (
                    <RadioGroup value={userAnswer?.toString()} onValueChange={v => handleAnswer(test.id, q.id, v)} className="space-y-2 ml-9">
                      {q.options.map((opt, i) => (
                        <div key={i} className={`flex items-center gap-2 p-2 rounded-md ${submitted && i === q.correctAnswer ? "bg-green-100/60 dark:bg-green-900/20" : submitted && i === userAnswer && i !== q.correctAnswer ? "bg-red-100/60 dark:bg-red-900/20" : ""}`}>
                          <RadioGroupItem value={i.toString()} id={`fl-${test.id}-${q.id}-${i}`} disabled={submitted} />
                          <Label htmlFor={`fl-${test.id}-${q.id}-${i}`} className="text-sm cursor-pointer">{opt}</Label>
                        </div>
                      ))}
                    </RadioGroup>
                  ) : (
                    <RadioGroup value={userAnswer?.toString()} onValueChange={v => handleAnswer(test.id, q.id, v)} className="space-y-2 ml-9">
                      {q.options.map((opt, i) => (
                        <div key={i} className={`flex items-center gap-2 p-2 rounded-md ${submitted && i === q.correctAnswer ? "bg-green-100/60 dark:bg-green-900/20" : submitted && i === userAnswer && i !== q.correctAnswer ? "bg-red-100/60 dark:bg-red-900/20" : ""}`}>
                          <RadioGroupItem value={i.toString()} id={`fl-${test.id}-${q.id}-${i}`} disabled={submitted} />
                          <Label htmlFor={`fl-${test.id}-${q.id}-${i}`} className="text-sm cursor-pointer flex gap-2 flex-1">
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
        ) : (
          <p className="text-sm text-muted-foreground italic">Bu bo'limda savol yo'q.</p>
        )}
      </div>
    );
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 bg-background flex flex-col"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      data-testid="full-listening-exam"
    >
      {/* Top header */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-md bg-blue-600 flex items-center justify-center shrink-0">
            <Headphones className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm">IELTS Listening — To'liq Test</p>
            <p className="text-xs text-muted-foreground">{sections.length} bo'lim · {totalQs} savol</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!submitted && (
            <Badge
              variant={timer.isCritical ? "destructive" : timer.isWarning ? "default" : "secondary"}
              className={`gap-1.5 py-1 px-3 font-mono font-bold ${timer.isWarning && !timer.isCritical ? "animate-pulse" : ""}`}
              data-testid="full-listening-timer"
            >
              <Clock className="w-3.5 h-3.5" />{timer.formattedTime}
            </Badge>
          )}
          <span className="text-xs text-muted-foreground tabular-nums">{answeredCount}/{totalQs}</span>
          {!submitted && (
            <Button size="sm" className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white" onClick={handleSubmitConfirm} disabled={submitMutation.isPending} data-testid="button-submit-full-listening">
              {submitMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              Topshirish
            </Button>
          )}
          <Button size="sm" variant="outline" className="gap-1.5" onClick={onClose} data-testid="button-exit-full-listening">
            <X className="w-4 h-4" /> Chiqish
          </Button>
        </div>
      </div>

      {/* Continuous scroll — all sections stacked */}
      <div className="flex-1 overflow-y-auto pb-28">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-10">
          {sections.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Headphones className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>To'liq test uchun har bir bo'limga test qo'shing.</p>
            </div>
          ) : (
            sections.map(test => renderSectionContent(test))
          )}
          {!submitted && sections.length > 0 && (
            <div className="pt-4 pb-4 flex justify-center border-t">
              <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8" onClick={handleSubmitConfirm} disabled={submitMutation.isPending} data-testid="button-submit-full-listening-bottom">
                {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Testni topshirish ({answeredCount}/{totalQs})
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom nav bar — shows current section's questions */}
      {allRealQs.length > 0 && (
        <div className="shrink-0 fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur border-t z-10" data-testid="full-listening-nav-bar">
          <div className="max-w-3xl mx-auto px-4 py-3">
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
                else cls += answered ? "bg-blue-500 border-blue-500 text-white" : "bg-muted border-border text-muted-foreground hover:border-blue-400";
                return (
                  <button key={`${q.testId}-${q.id}`} className={cls} onClick={() => goToQ(q.testId, q.id)} data-testid={`full-nav-q-${globalQNums[q.testId][q.id]}`}>
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
        <div className="flex gap-2"><Skeleton className="h-5 w-20" /><Skeleton className="h-5 w-16" /></div>
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-9 w-full" />
      </CardContent>
    </Card>
  );
}

function isMultiSectionTest(test: ListeningTest): boolean {
  const ts = (test as any).testSections as ListeningTestSection[] | null | undefined;
  return !!(ts && ts.length > 0);
}

function MultiSectionTestCard({ test }: { test: ListeningTest }) {
  const [showExam, setShowExam] = useState(false);
  const secs = ((test as any).testSections as ListeningTestSection[]) || [];
  const totalQs = secs.reduce((sum, s) => {
    const qs = ((s.questions as any[]) || []).flatMap((q: any) => Array.isArray(q) ? q : [q]).filter((q: any) => q.type !== "text");
    return sum + qs.length;
  }, 0);
  return (
    <>
      {showExam && (
        <AnimatePresence>
          <MultiSectionListeningExam test={test} onClose={() => setShowExam(false)} />
        </AnimatePresence>
      )}
      <Card className="border hover:border-primary/30 transition-colors" data-testid={`card-ms-listening-${test.id}`}>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <Badge variant="secondary" className="text-xs">{secs.length} sections</Badge>
                <Badge variant="outline" className="text-xs">{test.duration} min</Badge>
                <Badge variant={test.difficulty === "Easy" ? "secondary" : test.difficulty === "Medium" ? "default" : "destructive"} className="text-xs">{test.difficulty}</Badge>
              </div>
              <h3 className="font-semibold text-base mb-0.5 truncate">{test.title}</h3>
              <p className="text-xs text-muted-foreground">{test.topic} · {totalQs} questions · shared timer</p>
              {test.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{test.description}</p>}
            </div>
            <Button size="sm" onClick={() => setShowExam(true)} className="shrink-0 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white" data-testid={`button-start-ms-${test.id}`}>
              <Play className="w-3.5 h-3.5" /> Start
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

export default function Listening() {
  const { t } = useI18n();
  const { data: tests, isLoading } = useQuery<ListeningTest[]>({ queryKey: ["/api/listening-tests"] });
  const [showFullExam, setShowFullExam] = useState(false);

  const multiSectionTests = tests?.filter(isMultiSectionTest) || [];
  const singleTests = tests?.filter(t => !isMultiSectionTest(t)) || [];

  const section1 = singleTests?.filter((t) => t.section === 1) || [];
  const section2 = singleTests?.filter((t) => t.section === 2) || [];
  const section3 = singleTests?.filter((t) => t.section === 3) || [];
  const section4 = singleTests?.filter((t) => t.section === 4) || [];

  const sections = [
    { key: "section1", num: 1, tests: section1, title: t.listening.section1Title, desc: t.listening.section1Desc },
    { key: "section2", num: 2, tests: section2, title: t.listening.section2Title, desc: t.listening.section2Desc },
    { key: "section3", num: 3, tests: section3, title: t.listening.section3Title, desc: t.listening.section3Desc },
    { key: "section4", num: 4, tests: section4, title: t.listening.section4Title, desc: t.listening.section4Desc },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {showFullExam && tests && (
        <AnimatePresence>
          <FullListeningExam tests={tests} onClose={() => setShowFullExam(false)} />
        </AnimatePresence>
      )}
      <Navbar />

      <section className="relative py-12 md:py-16 border-b overflow-hidden" data-testid="section-listening-hero">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
        <motion.div
          className="absolute top-10 right-10 w-60 h-60 bg-blue-500/10 rounded-full blur-3xl"
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
            <motion.div className="w-12 h-12 rounded-md bg-primary flex items-center justify-center" whileHover={{ rotate: 10, scale: 1.1 }} transition={{ type: "spring", stiffness: 300 }}>
              <Headphones className="w-6 h-6 text-white" />
            </motion.div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{t.listening.title}</h1>
              <p className="text-muted-foreground mt-1">{t.listening.subtitle}</p>
            </div>
          </motion.div>

          <motion.div className="flex flex-wrap items-center gap-4 mt-6" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
            {[
              { label: t.listening.totalTests, value: tests?.length || 0 },
              { label: t.listening.sections, value: 4 },
              { label: t.listening.practiceTime, value: `${tests?.reduce((a, t) => a + t.duration, 0) || 0} min` },
            ].map((stat, i) => (
              <motion.div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background/60 border text-sm" whileHover={{ scale: 1.02 }}>
                <span className="text-muted-foreground">{stat.label}:</span>
                <span className="font-semibold">{stat.value}</span>
              </motion.div>
            ))}
            <Button
              onClick={() => setShowFullExam(true)}
              disabled={isLoading || !tests?.length}
              className="gap-2 bg-primary hover:bg-primary/90 text-white"
              data-testid="button-start-full-listening"
            >
              <Play className="w-4 h-4" /> To'liq Listening Testi
            </Button>
          </motion.div>
        </div>
      </section>

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" data-testid="main-listening">
        {isLoading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => <TestSkeleton key={i} />)}
          </div>
        ) : (
          <Tabs defaultValue={multiSectionTests.length > 0 ? "full-tests" : "section1"}>
            <TabsList className="mb-6 flex-wrap h-auto gap-1">
              {multiSectionTests.length > 0 && (
                <TabsTrigger value="full-tests" data-testid="tab-full-tests">
                  Full Tests <span className="ml-1.5 text-xs opacity-70">({multiSectionTests.length})</span>
                </TabsTrigger>
              )}
              {sections.map((s) => (
                <TabsTrigger key={s.key} value={s.key} data-testid={`tab-section-${s.num}`}>
                  {t.listening.section} {s.num} <span className="ml-1.5 text-xs opacity-70">({s.tests.length})</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {multiSectionTests.length > 0 && (
              <TabsContent value="full-tests">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold">Full Listening Tests</h2>
                  <p className="text-sm text-muted-foreground">Multi-section tests with one shared timer across all sections</p>
                </div>
                <div className="grid gap-4">
                  {multiSectionTests.map(test => <MultiSectionTestCard key={test.id} test={test} />)}
                </div>
              </TabsContent>
            )}

            {sections.map((s) => (
              <TabsContent key={s.key} value={s.key}>
                <div className="mb-4">
                  <h2 className="text-lg font-semibold">{s.title}</h2>
                  <p className="text-sm text-muted-foreground">{s.desc}</p>
                </div>
                {s.tests.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <Headphones className="w-12 h-12 mx-auto mb-4 opacity-30" />
                    <p>{t.listening.noTests}</p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {s.tests.map((test, i) => <ListeningTestCard key={test.id} test={test} index={i} />)}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </main>
      <Footer />
    </div>
  );
}
