import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Trophy, ArrowRight, ArrowLeft, CheckCircle, Headphones, Mic, BookOpen, PenTool,
  Loader2, Send, Clock, X, PenLine, Layers, Square, AlertTriangle,
  ChevronRight, Shield, Timer, Lock
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { useI18n } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useCountdownTimer } from "@/hooks/use-countdown-timer";
import { HighlightablePassage } from "@/components/highlightable-passage";
import type {
  FullMockTest, SpeakingTest, ListeningTest, ReadingTest, WritingTest,
  ListeningQuestion, ReadingQuestion
} from "@shared/schema";
import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─────────────────────────────────────────────────────────────────────────────
// localStorage helpers
// ─────────────────────────────────────────────────────────────────────────────

function getProgress(mockId: string): { step: number; completed: number[] } {
  try {
    const raw = localStorage.getItem(`fm-exam-${mockId}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { step: 0, completed: [] };
}

function saveProgress(mockId: string, step: number, completed: number[]) {
  localStorage.setItem(`fm-exam-${mockId}`, JSON.stringify({ step, completed }));
}

function clearProgress(mockId: string) {
  localStorage.removeItem(`fm-exam-${mockId}`);
}

function getSectionElapsed(mockId: string): Record<number, number> {
  try { return JSON.parse(localStorage.getItem(`fm-elapsed-${mockId}`) || "{}"); }
  catch { return {}; }
}

function saveSectionElapsed(mockId: string, stepIdx: number, elapsedSeconds: number) {
  const data = getSectionElapsed(mockId);
  data[stepIdx] = Math.max(0, elapsedSeconds);
  localStorage.setItem(`fm-elapsed-${mockId}`, JSON.stringify(data));
}

function clearSectionElapsed(mockId: string) {
  localStorage.removeItem(`fm-elapsed-${mockId}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function formatDur(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

const SECTION_COLORS: Record<string, string> = {
  listening: "bg-blue-600",
  reading: "bg-emerald-600",
  writing: "bg-purple-600",
  speaking: "bg-rose-500",
};

const SECTION_ICONS: Record<string, JSX.Element> = {
  listening: <Headphones className="w-4 h-4 text-white" />,
  reading: <BookOpen className="w-4 h-4 text-white" />,
  writing: <PenTool className="w-4 h-4 text-white" />,
  speaking: <Mic className="w-4 h-4 text-white" />,
};

function getSectionLabel(type: string, sectionIndex?: number) {
  if (type === "listening" && sectionIndex) return `Listening — Section ${sectionIndex}`;
  if (type === "reading" && sectionIndex) return `Reading — Passage ${sectionIndex}`;
  const labels: Record<string, string> = { speaking: "Speaking", writing: "Writing" };
  return labels[type] || type;
}

function getStepLabel(type: string, sectionIndex?: number) {
  if (type === "listening" && sectionIndex) return `L${sectionIndex}`;
  if (type === "reading" && sectionIndex) return `R${sectionIndex}`;
  return type.charAt(0).toUpperCase();
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Question Nav Bar — no correct/wrong, only answered state
// ─────────────────────────────────────────────────────────────────────────────

interface NavItem { id: number; answered: boolean }

function MockNavBar({ items, testId, onScroll }: {
  items: NavItem[];
  testId: string;
  onScroll: (id: number) => void;
}) {
  if (items.length === 0) return null;
  const answeredCount = items.filter(i => i.answered).length;
  return (
    <div className="shrink-0 border-t bg-background/95 backdrop-blur" data-testid={`mock-nav-${testId}`}>
      <div className="px-4 py-2.5">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs text-muted-foreground font-medium">
            <span className="font-bold text-foreground">{answeredCount}</span>/{items.length} answered
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {items.map((item, idx) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onScroll(item.id)}
              data-testid={`mock-q-${testId}-${idx + 1}`}
              className={`w-8 h-8 rounded-full text-xs font-bold transition-all duration-200 border-2 cursor-pointer shrink-0 ${
                item.answered
                  ? "bg-primary border-primary text-white"
                  : "bg-muted border-border text-muted-foreground hover:border-primary hover:text-primary"
              }`}
            >
              {idx + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Audio Recorder
// ─────────────────────────────────────────────────────────────────────────────

function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/ogg";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } catch {
      setError("Mikrofonga ruxsat berilmagan. Brauzer sozlamalarini tekshiring.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const reset = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null); setAudioUrl(null); setDuration(0); setError(null);
  };

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);
  return { isRecording, audioBlob, audioUrl, duration, error, startRecording, stopRecording, reset };
}

// ─────────────────────────────────────────────────────────────────────────────
// Section Complete Screen
// ─────────────────────────────────────────────────────────────────────────────

function SectionComplete({ label, isLast, onNext, onBack, isPending }: {
  label: string;
  isLast: boolean;
  onNext: () => void;
  onBack?: () => void;
  isPending?: boolean;
}) {
  return (
    <motion.div
      className="flex-1 flex items-center justify-center p-8"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="text-center max-w-md space-y-6">
        <motion.div
          className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-950/50 border-2 border-green-400 flex items-center justify-center mx-auto"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, delay: 0.15 }}
        >
          <CheckCircle className="w-10 h-10 text-green-600" />
        </motion.div>
        <div>
          <h2 className="text-2xl font-bold mb-2">Section Complete</h2>
          <p className="text-muted-foreground text-sm">
            <span className="font-semibold text-foreground">{label}</span> has been submitted. Your answers have been saved.
          </p>
        </div>
        <div className="rounded-xl bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800 px-4 py-3 flex items-start gap-2 text-sm text-sky-800 dark:text-sky-300">
          <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>You can navigate to other sections using the tabs above or the buttons below.</span>
        </div>
        <div className="flex items-center gap-3">
          {onBack && (
            <Button
              onClick={onBack}
              size="lg"
              variant="outline"
              className="gap-2 flex-1"
              data-testid="button-go-back"
            >
              <ArrowLeft className="w-4 h-4" /> Previous
            </Button>
          )}
          <Button
            onClick={onNext}
            size="lg"
            className="gap-2 flex-1"
            disabled={isPending}
            data-testid="button-proceed-next"
          >
            {isPending ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
            ) : isLast ? (
              <><Trophy className="w-4 h-4" /> Finish Exam</>
            ) : (
              <>Next Section <ArrowRight className="w-4 h-4" /></>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Listening Quiz — no answer checking display
// ─────────────────────────────────────────────────────────────────────────────

function MockListeningQuiz({
  questions,
  testId,
  onAnswersChange,
}: {
  questions: ListeningQuestion[];
  testId: string;
  onAnswersChange: (answers: Record<number, number | string>) => void;
}) {
  const [answers, setAnswers] = useState<Record<number, number | string>>({});

  const qs: ListeningQuestion[] = (questions as any[]).flatMap((q: any) => Array.isArray(q) ? q : [q]);
  const isText = (t?: string) => t === "completion" || t === "short-answer";
  const isMatch = (t?: string) => t === "matching";
  const realQs = qs.filter(q => q.type !== "text");

  const qNums: Record<number, number> = {};
  let n = 0;
  qs.forEach(q => { if (q.type !== "text") qNums[q.id] = ++n; });

  const setAnswer = (id: number, val: number | string) => {
    const next = { ...answers, [id]: val };
    setAnswers(next);
    onAnswersChange(next);
  };

  const navItems: NavItem[] = realQs.map(q => {
    const ans = answers[q.id];
    const answered = isText(q.type)
      ? typeof ans === "string" && ans.trim().length > 0
      : ans !== undefined;
    return { id: q.id, answered };
  });

  const scrollTo = (id: number) => {
    document.getElementById(`mq-${testId}-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="flex flex-col min-h-0">
      <div className="space-y-3 flex-1">
        {qs.map(q => {
          if (q.type === "text") {
            return (
              <div key={q.id} className="px-4 py-3 rounded-md bg-sky-50/70 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800">
                <p className="text-sm text-sky-900 dark:text-sky-200 whitespace-pre-wrap leading-relaxed">{q.question}</p>
              </div>
            );
          }
          const userAnswer = answers[q.id];
          return (
            <div id={`mq-${testId}-${q.id}`} key={q.id} className="p-4 rounded-md border border-border scroll-mt-24" data-testid={`mq-block-${testId}-${q.id}`}>
              <div className="flex items-start gap-2 mb-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center text-xs font-bold">{qNums[q.id]}</span>
                <p className="text-sm font-medium">{q.question}</p>
              </div>
              {isText(q.type) ? (
                <Input
                  placeholder={q.type === "short-answer" ? "Write your answer..." : "Fill in the blank..."}
                  value={typeof userAnswer === "string" ? userAnswer : ""}
                  onChange={e => setAnswer(q.id, e.target.value)}
                  className="max-w-sm text-sm ml-8"
                />
              ) : isMatch(q.type) ? (
                <select
                  value={typeof userAnswer === "number" ? userAnswer.toString() : ""}
                  onChange={e => setAnswer(q.id, parseInt(e.target.value))}
                  className="ml-8 w-full max-w-sm p-2.5 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">— Select answer —</option>
                  {q.options.map((opt, i) => <option key={i} value={i.toString()}>{opt}</option>)}
                </select>
              ) : (q.type === "tfng" || q.type === "ynng") ? (
                <div className="flex gap-2 ml-8 mt-1 flex-wrap">
                  {(q.type === "tfng" ? ["True", "False", "Not Given"] : ["Yes", "No", "Not Given"]).map((label, optIdx) => {
                    const isSelected = userAnswer === optIdx;
                    const colors = ["border-emerald-500 text-emerald-700", "border-red-400 text-red-600", "border-slate-400 text-slate-500"];
                    const selBgs = ["bg-emerald-100 dark:bg-emerald-900/30", "bg-red-100 dark:bg-red-900/30", "bg-slate-100 dark:bg-slate-800"];
                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => setAnswer(q.id, optIdx)}
                        className={`px-4 py-2 rounded-xl border-2 text-sm font-bold transition-all duration-150 ${
                          isSelected ? `${colors[optIdx]} ${selBgs[optIdx]}` : `${colors[optIdx]} opacity-60 hover:opacity-100 cursor-pointer`
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <RadioGroup
                  value={userAnswer?.toString()}
                  onValueChange={v => setAnswer(q.id, parseInt(v))}
                  className="space-y-2 ml-8"
                >
                  {q.options.map((opt, optIdx) => (
                    <div key={optIdx} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value={optIdx.toString()} id={`mq-${testId}-${q.id}-${optIdx}`} />
                      <Label htmlFor={`mq-${testId}-${q.id}-${optIdx}`} className="text-sm cursor-pointer flex-1">{opt}</Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
            </div>
          );
        })}
      </div>
      <MockNavBar items={navItems} testId={testId} onScroll={scrollTo} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Reading Quiz — no answer checking display
// ─────────────────────────────────────────────────────────────────────────────

function MockReadingQuiz({
  questions,
  testId,
  onAnswersChange,
}: {
  questions: ReadingQuestion[];
  testId: string;
  onAnswersChange: (answers: Record<number, number | string>) => void;
}) {
  const [answers, setAnswers] = useState<Record<number, number | string>>({});

  const qs: ReadingQuestion[] = (questions as any[]).flatMap((q: any) => Array.isArray(q) ? q : [q]);
  const isText = (t?: string) => t === "completion" || t === "short-answer";
  const isMatch = (t?: string) => t === "matching";
  const realQs = qs.filter(q => q.type !== "text");

  const qNums: Record<number, number> = {};
  let n = 0;
  qs.forEach(q => { if (q.type !== "text") qNums[q.id] = ++n; });

  const setAnswer = (id: number, val: number | string) => {
    const next = { ...answers, [id]: val };
    setAnswers(next);
    onAnswersChange(next);
  };

  const navItems: NavItem[] = realQs.map(q => {
    const ans = answers[q.id];
    const answered = isText(q.type)
      ? typeof ans === "string" && ans.trim().length > 0
      : ans !== undefined;
    return { id: q.id, answered };
  });

  const scrollTo = (id: number) => {
    document.getElementById(`mrq-${testId}-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {qs.map(q => {
          if (q.type === "text") {
            return (
              <div key={q.id} className="px-4 py-3 rounded-md bg-sky-50/70 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800">
                <p className="text-sm text-sky-900 dark:text-sky-200 whitespace-pre-wrap leading-relaxed">{q.question}</p>
              </div>
            );
          }
          const userAnswer = answers[q.id];
          return (
            <div id={`mrq-${testId}-${q.id}`} key={q.id} className="p-4 rounded-md border border-border scroll-mt-24" data-testid={`mrq-block-${testId}-${q.id}`}>
              <div className="flex items-start gap-2 mb-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-xs font-bold">{qNums[q.id]}</span>
                <p className="text-sm font-medium">{q.question}</p>
              </div>
              {isText(q.type) ? (
                <Input
                  placeholder={q.type === "short-answer" ? "Write your answer..." : "Fill in the blank..."}
                  value={typeof userAnswer === "string" ? userAnswer : ""}
                  onChange={e => setAnswer(q.id, e.target.value)}
                  className="max-w-sm text-sm ml-8"
                />
              ) : isMatch(q.type) ? (
                <select
                  value={typeof userAnswer === "number" ? userAnswer.toString() : ""}
                  onChange={e => setAnswer(q.id, parseInt(e.target.value))}
                  className="ml-8 w-full max-w-sm p-2.5 rounded-lg border border-border text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">— Select answer —</option>
                  {q.options.map((opt, i) => <option key={i} value={i.toString()}>{opt}</option>)}
                </select>
              ) : (q.type === "tfng" || q.type === "ynng") ? (
                <div className="flex gap-2 ml-8 mt-1 flex-wrap">
                  {(q.type === "tfng" ? ["True", "False", "Not Given"] : ["Yes", "No", "Not Given"]).map((label, optIdx) => {
                    const isSelected = userAnswer === optIdx;
                    const colors = ["border-emerald-500 text-emerald-700", "border-red-400 text-red-600", "border-slate-400 text-slate-500"];
                    const selBgs = ["bg-emerald-100 dark:bg-emerald-900/30", "bg-red-100 dark:bg-red-900/30", "bg-slate-100 dark:bg-slate-800"];
                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => setAnswer(q.id, optIdx)}
                        className={`px-4 py-2 rounded-xl border-2 text-sm font-bold transition-all duration-150 ${
                          isSelected ? `${colors[optIdx]} ${selBgs[optIdx]}` : `${colors[optIdx]} opacity-60 hover:opacity-100 cursor-pointer`
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <RadioGroup
                  value={userAnswer?.toString()}
                  onValueChange={v => setAnswer(q.id, parseInt(v))}
                  className="space-y-2 ml-8"
                >
                  {q.options.map((opt, optIdx) => (
                    <div key={optIdx} className="flex items-center gap-2 p-2 rounded-md hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value={optIdx.toString()} id={`mrq-${testId}-${q.id}-${optIdx}`} />
                      <Label htmlFor={`mrq-${testId}-${q.id}-${optIdx}`} className="text-sm cursor-pointer flex-1">{opt}</Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
            </div>
          );
        })}
      </div>
      <MockNavBar items={navItems} testId={testId} onScroll={scrollTo} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Listening Section Exam
// ─────────────────────────────────────────────────────────────────────────────

function ListeningSectionExam({ test, onSubmitted, initialSeconds, onTimerChange }: {
  test: ListeningTest;
  onSubmitted: () => void;
  initialSeconds?: number;
  onTimerChange?: (remaining: number) => void;
}) {
  const { toast } = useToast();
  const [answers, setAnswers] = useState<Record<number, number | string>>({});
  const [timerDone, setTimerDone] = useState(false);

  const timer = useCountdownTimer(test.duration, () => {
    setTimerDone(true);
    submitMutation.mutate();
  }, !timerDone, initialSeconds);

  useEffect(() => { onTimerChange?.(timer.secondsLeft); }, [timer.secondsLeft]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/test-results", {
        testType: "listening",
        testId: test.id,
        answers,
      });
    },
    onSuccess: () => { onSubmitted(); },
    onError: () => { toast({ title: "Error saving answers. Please try again.", variant: "destructive" }); },
  });

  const mode = (test.mode as string) || "test";
  const [writtenText, setWrittenText] = useState("");
  const isMultiSection = (test.testSections as any[])?.length > 0;

  const handleManualSubmit = () => {
    if (!window.confirm("Are you sure you want to submit this section? You cannot go back.")) return;
    submitMutation.mutate();
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Sub-header with section info and timer */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Badge className="bg-blue-600 text-white gap-1 text-xs">
            <Headphones className="w-3 h-3" />
            {isMultiSection ? `Listening — ${(test.testSections as any[]).length} Sections` : test.section ? `Section ${test.section}` : "Listening"}
          </Badge>
          <span className="text-xs text-muted-foreground hidden sm:block truncate max-w-[200px]">{test.topic}</span>
        </div>
        <Badge
          variant={timer.isCritical ? "destructive" : timer.isWarning ? "default" : "secondary"}
          className={`gap-1.5 py-1 px-3 font-mono font-bold ${timer.isWarning && !timer.isCritical ? "animate-pulse" : ""}`}
          data-testid="mock-listening-timer"
        >
          <Clock className="w-3.5 h-3.5" />{timer.formattedTime}
        </Badge>
      </div>

      {isMultiSection ? (
        /* Multi-section: stack all sections */
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-8 pb-24">
            {(test.testSections as any[]).map((sec: any, sIdx: number) => {
              const qs: ListeningQuestion[] = ((sec.questions as any[]) || []).flatMap((q: any) => Array.isArray(q) ? q : [q]);
              return (
                <div key={sIdx} className="rounded-xl border overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-600">
                    <Headphones className="w-4 h-4 text-white" />
                    <span className="text-xs font-semibold text-white uppercase tracking-wide">Section {sIdx + 1}</span>
                  </div>
                  {sec.audioUrl && (
                    <div className="border-b bg-blue-50/60 dark:bg-blue-950/20 px-4 py-3">
                      <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">Audio — Listen carefully</p>
                      <audio controls className="w-full h-9 rounded" src={sec.audioUrl} data-testid={`mock-audio-sec-${sIdx}`} />
                    </div>
                  )}
                  <div className="p-4">
                    <MockListeningQuiz
                      questions={qs}
                      testId={`${test.id}-s${sIdx}`}
                      onAnswersChange={secAnswers => setAnswers(prev => ({ ...prev, ...secAnswers }))}
                    />
                  </div>
                </div>
              );
            })}
            <div className="flex justify-center pt-4 border-t">
              <Button onClick={handleManualSubmit} disabled={submitMutation.isPending} className="gap-2 px-8 bg-blue-600 hover:bg-blue-700 text-white" data-testid="button-submit-mock-section">
                {submitMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : <><Send className="w-4 h-4" /> Submit Section</>}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* Single-section listening */
        <>
          {test.audioUrl && (
            <div className="shrink-0 border-b bg-blue-50/60 dark:bg-blue-950/20 px-4 py-3">
              <div className="flex items-center gap-3 max-w-3xl mx-auto">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0">
                  <Headphones className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 mb-1">Audio — Listen carefully</p>
                  <audio controls className="w-full h-9 rounded" src={test.audioUrl} data-testid={`mock-audio-${test.id}`} />
                </div>
              </div>
            </div>
          )}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 py-5 space-y-5">
              {mode === "test" && test.questions.length > 0 && (
                <MockListeningQuiz questions={test.questions} testId={test.id} onAnswersChange={setAnswers} />
              )}
              {mode === "written" && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-purple-700 dark:text-purple-300">Listen and write your response:</p>
                  <Textarea
                    className="min-h-[220px] resize-none text-sm"
                    placeholder="Write your answer here..."
                    value={writtenText}
                    onChange={e => setWrittenText(e.target.value)}
                    data-testid={`mock-written-listening-${test.id}`}
                  />
                </div>
              )}
              {mode === "mixed" && (
                <div className="space-y-6">
                  <div>
                    <p className="text-sm font-semibold text-purple-700 mb-2">Part 1 — Written response</p>
                    <Textarea className="min-h-[160px] resize-none text-sm" placeholder="Write your answer here..." value={writtenText} onChange={e => setWrittenText(e.target.value)} />
                  </div>
                  {test.questions.length > 0 && (
                    <div className="border-t pt-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Part 2 — Questions</p>
                      <MockListeningQuiz questions={test.questions} testId={test.id} onAnswersChange={setAnswers} />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="shrink-0 border-t bg-background/95 backdrop-blur px-4 py-3">
            <Button onClick={handleManualSubmit} disabled={submitMutation.isPending} className="gap-2 w-full sm:w-auto ml-auto flex bg-blue-600 hover:bg-blue-700 text-white" data-testid="button-submit-mock-section">
              {submitMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : <><Send className="w-4 h-4" /> Submit Section</>}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Reading Section Exam — two-column layout
// ─────────────────────────────────────────────────────────────────────────────

function ReadingSectionExam({ test, onSubmitted, initialSeconds, onTimerChange }: {
  test: ReadingTest;
  onSubmitted: () => void;
  initialSeconds?: number;
  onTimerChange?: (remaining: number) => void;
}) {
  const { toast } = useToast();
  const [answers, setAnswers] = useState<Record<number, number | string>>({});
  const [timerDone, setTimerDone] = useState(false);

  const timer = useCountdownTimer(test.duration, () => {
    setTimerDone(true);
    submitMutation.mutate();
  }, !timerDone, initialSeconds);

  useEffect(() => { onTimerChange?.(timer.secondsLeft); }, [timer.secondsLeft]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/test-results", {
        testType: "reading",
        testId: test.id,
        answers,
      });
    },
    onSuccess: () => { onSubmitted(); },
    onError: () => { toast({ title: "Error saving answers. Please try again.", variant: "destructive" }); },
  });

  const handleManualSubmit = () => {
    if (!window.confirm("Are you sure you want to submit this section? You cannot go back.")) return;
    submitMutation.mutate();
  };

  const mode = (test.mode as string) || "test";
  const [writtenText, setWrittenText] = useState("");
  const isMultiSection = (test.testSections as any[])?.length > 0;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Timer bar */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {isMultiSection ? `Reading — ${(test.testSections as any[]).length} Passages` : "Reading Passage"}
        </span>
        <Badge
          variant={timer.isCritical ? "destructive" : timer.isWarning ? "default" : "secondary"}
          className={`gap-1.5 py-1 px-3 font-mono font-bold ${timer.isWarning && !timer.isCritical ? "animate-pulse" : ""}`}
          data-testid="mock-reading-timer"
        >
          <Clock className="w-3.5 h-3.5" />{timer.formattedTime}
        </Badge>
      </div>

      {isMultiSection ? (
        /* Multi-section: continuous scroll of all passages */
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 py-6 space-y-8 pb-24">
            {(test.testSections as any[]).map((sec: any, pIdx: number) => {
              const qs: ReadingQuestion[] = ((sec.questions as any[]) || []).flatMap((q: any) => Array.isArray(q) ? q : [q]);
              const secKey = `sec-${pIdx}`;
              return (
                <div key={secKey} className="rounded-xl border overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600">
                    <BookOpen className="w-4 h-4 text-white" />
                    <span className="text-xs font-semibold text-white uppercase tracking-wide">Passage {pIdx + 1}</span>
                  </div>
                  <div className="flex min-h-[350px]">
                    <div className="w-1/2 border-r p-4 md:p-6 overflow-auto max-h-[65vh]">
                      <HighlightablePassage passage={sec.passage || ""} testId={`${test.id}-s${pIdx}`} />
                    </div>
                    <div className="w-1/2 p-4 overflow-auto max-h-[65vh]">
                      <MockReadingQuiz
                        questions={qs}
                        testId={`${test.id}-s${pIdx}`}
                        onAnswersChange={secAnswers => {
                          setAnswers(prev => ({ ...prev, ...secAnswers }));
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            <div className="flex justify-center pt-4 border-t">
              <Button
                onClick={handleManualSubmit}
                disabled={submitMutation.isPending}
                className="gap-2 px-8 bg-emerald-600 hover:bg-emerald-700 text-white"
                data-testid="button-submit-mock-section"
              >
                {submitMutation.isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                  : <><Send className="w-4 h-4" /> Submit Section</>}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* Single passage: two-column layout */
        <>
          <div className="flex-1 flex overflow-hidden">
            <div className="w-1/2 overflow-y-auto p-4 md:p-6 border-r">
              <h4 className="text-xs font-semibold text-emerald-600 uppercase tracking-wide mb-3">Reading Passage</h4>
              <HighlightablePassage passage={test.passage} testId={test.id} />
            </div>
            <div className="w-1/2 flex flex-col min-h-0">
              {mode === "test" && test.questions.length > 0 ? (
                <MockReadingQuiz
                  questions={test.questions}
                  testId={test.id}
                  onAnswersChange={setAnswers}
                />
              ) : (mode === "written" || mode === "mixed") ? (
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Your Response</p>
                  <Textarea
                    className="min-h-[300px] resize-none text-sm"
                    placeholder="Write your response here..."
                    value={writtenText}
                    onChange={e => setWrittenText(e.target.value)}
                    data-testid={`mock-reading-written-${test.id}`}
                  />
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">No questions available</div>
              )}
            </div>
          </div>
          <div className="shrink-0 border-t bg-background/95 backdrop-blur px-4 py-3">
            <Button
              onClick={handleManualSubmit}
              disabled={submitMutation.isPending}
              className="gap-2 w-full sm:w-auto ml-auto flex bg-emerald-600 hover:bg-emerald-700 text-white"
              data-testid="button-submit-mock-section"
            >
              {submitMutation.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
                : <><Send className="w-4 h-4" /> Submit Section</>}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Writing Section Exam — IELTS CD split-panel (task left, editor right)
// ─────────────────────────────────────────────────────────────────────────────

function WritingSectionExam({ test, onSubmitted, initialSeconds, onTimerChange }: {
  test: WritingTest;
  onSubmitted: () => void;
  initialSeconds?: number;
  onTimerChange?: (remaining: number) => void;
}) {
  const { toast } = useToast();
  const [response, setResponse] = useState("");
  const [timerDone, setTimerDone] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const timer = useCountdownTimer(test.duration, () => {
    setTimerDone(true);
    submitMutation.mutate();
  }, !timerDone, initialSeconds);

  useEffect(() => { onTimerChange?.(timer.secondsLeft); }, [timer.secondsLeft]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/test-results", {
        testType: "writing",
        testId: test.id,
        answers: { response },
      });
    },
    onSuccess: () => { onSubmitted(); },
    onError: () => { toast({ title: "Error saving essay. Please try again.", variant: "destructive" }); },
  });

  const wordCount = response.trim() ? response.trim().split(/\s+/).length : 0;
  const minWords = test.task === 1 ? 150 : 250;

  const handleManualSubmit = () => {
    if (!window.confirm("Are you sure you want to submit this section? You cannot go back.")) return;
    submitMutation.mutate();
  };

  const execCmd = (cmd: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    if (cmd === "cut") {
      if (start !== end) {
        navigator.clipboard.writeText(response.slice(start, end)).catch(() => {});
        setResponse(response.slice(0, start) + response.slice(end));
      }
    } else if (cmd === "copy") {
      if (start !== end) {
        navigator.clipboard.writeText(response.slice(start, end)).catch(() => {});
      }
    } else if (cmd === "paste") {
      navigator.clipboard.readText().then(text => {
        setResponse(response.slice(0, start) + text + response.slice(end));
      }).catch(() => {});
    } else if (cmd === "undo") {
      document.execCommand("undo");
    }
    setTimeout(() => ta.focus(), 50);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Sub-header with task info and timer */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Badge className="bg-purple-600 text-white text-xs">Task {test.task}</Badge>
          <span className="text-xs text-muted-foreground hidden sm:block truncate max-w-[200px]">{test.title}</span>
        </div>
        <Badge
          variant={timer.isCritical ? "destructive" : timer.isWarning ? "default" : "secondary"}
          className={`gap-1.5 py-1 px-3 font-mono font-bold ${timer.isWarning && !timer.isCritical ? "animate-pulse" : ""}`}
          data-testid="mock-writing-timer"
        >
          <Clock className="w-3.5 h-3.5" />{timer.formattedTime}
        </Badge>
      </div>

      {/* IELTS CD Split Layout: task on left, editor on right */}
      <div className="flex-1 flex overflow-hidden">

        {/* LEFT: Task description */}
        <div className="w-2/5 flex flex-col overflow-hidden border-r">
          <div className="shrink-0 px-4 py-2.5 border-b bg-purple-600">
            <p className="text-xs font-semibold text-white uppercase tracking-wide">
              Writing Task {test.task}
            </p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <p className="text-sm leading-relaxed whitespace-pre-line text-foreground">{test.prompt}</p>

            {test.tips && test.tips.length > 0 && (
              <div className="border-t pt-4 space-y-1.5">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2">Guidance</p>
                {test.tips.map((tip, i) => (
                  <p key={i} className="text-xs text-muted-foreground leading-relaxed">• {tip}</p>
                ))}
              </div>
            )}

            <div className="border-t pt-4">
              <p className="text-xs text-muted-foreground">
                Write at least <span className="font-semibold text-foreground">{minWords} words</span>.
              </p>
            </div>
          </div>
        </div>

        {/* RIGHT: Writing editor */}
        <div className="w-3/5 flex flex-col overflow-hidden bg-background">
          {/* Toolbar row — mimics IELTS CD editor toolbar */}
          <div className="shrink-0 flex items-center gap-1 px-3 py-2 border-b bg-muted/30">
            <button
              type="button"
              onClick={() => execCmd("cut")}
              className="px-2.5 py-1 text-xs font-medium rounded border bg-background hover:bg-muted transition-colors"
              title="Cut"
            >Cut</button>
            <button
              type="button"
              onClick={() => execCmd("copy")}
              className="px-2.5 py-1 text-xs font-medium rounded border bg-background hover:bg-muted transition-colors"
              title="Copy"
            >Copy</button>
            <button
              type="button"
              onClick={() => execCmd("paste")}
              className="px-2.5 py-1 text-xs font-medium rounded border bg-background hover:bg-muted transition-colors"
              title="Paste"
            >Paste</button>
            <button
              type="button"
              onClick={() => execCmd("undo")}
              className="px-2.5 py-1 text-xs font-medium rounded border bg-background hover:bg-muted transition-colors"
              title="Undo"
            >Undo</button>
            <div className="ml-auto flex items-center gap-1.5">
              <span className={`text-xs font-mono font-semibold tabular-nums ${
                wordCount === 0 ? "text-muted-foreground" :
                wordCount < minWords ? "text-amber-600" : "text-green-600"
              }`}>
                {wordCount} / {minWords}+ words
              </span>
            </div>
          </div>

          {/* Text area fills remaining height */}
          <textarea
            ref={textareaRef}
            placeholder={`Begin writing here...\n\nYou must write at least ${minWords} words.`}
            className="flex-1 resize-none text-sm p-4 bg-white dark:bg-slate-900 text-foreground leading-relaxed focus:outline-none focus:ring-0 border-0"
            value={response}
            onChange={e => setResponse(e.target.value)}
            spellCheck
            data-testid={`mock-writing-textarea-${test.id}`}
          />
        </div>
      </div>

      {/* Submit bar */}
      <div className="shrink-0 border-t bg-background/95 backdrop-blur px-4 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-semibold tabular-nums ${
            wordCount < minWords ? "text-amber-600" : "text-green-600"
          }`}>
            {wordCount} words
          </span>
          {wordCount < minWords && (
            <span className="text-xs text-muted-foreground">(need {minWords - wordCount} more)</span>
          )}
        </div>
        <Button
          onClick={handleManualSubmit}
          disabled={!response.trim() || submitMutation.isPending}
          className="gap-2 bg-purple-600 hover:bg-purple-700 text-white"
          data-testid="button-submit-mock-section"
        >
          {submitMutation.isPending
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
            : <><Send className="w-4 h-4" /> Submit Essay</>}
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Speaking Section Exam
// ─────────────────────────────────────────────────────────────────────────────

function SpeakingSectionExam({ test, onSubmitted, initialSeconds, onTimerChange }: {
  test: SpeakingTest;
  onSubmitted: () => void;
  initialSeconds?: number;
  onTimerChange?: (remaining: number) => void;
}) {
  const { toast } = useToast();
  const { isRecording, audioBlob, audioUrl, duration, error, startRecording, stopRecording, reset } = useAudioRecorder();
  const [prepTime, setPrepTime] = useState(test.part === 2 ? 60 : 0);
  const [prepDone, setPrepDone] = useState(test.part !== 2);

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (audioBlob) {
        const ext = audioBlob.type.includes("webm") ? "webm" : "ogg";
        const formData = new FormData();
        formData.append("recording", audioBlob, `speaking-mock-${test.id}.${ext}`);
        const uploadRes = await fetch("/api/speaking/upload", { method: "POST", body: formData, credentials: "include" });
        if (!uploadRes.ok) throw new Error("Upload failed");
        const { url } = await uploadRes.json();
        await apiRequest("POST", "/api/test-results", { testType: "speaking", testId: test.id, answers: { recordingUrl: url } });
      } else {
        await apiRequest("POST", "/api/test-results", { testType: "speaking", testId: test.id, answers: {} });
      }
    },
    onSuccess: () => { onSubmitted(); },
    onError: () => { toast({ title: "Error saving recording. Please try again.", variant: "destructive" }); },
  });

  useEffect(() => {
    if (prepTime > 0 && !prepDone) {
      const t = setInterval(() => setPrepTime(p => {
        if (p <= 1) { clearInterval(t); setPrepDone(true); return 0; }
        return p - 1;
      }), 1000);
      return () => clearInterval(t);
    }
  }, [prepDone]);

  const handleSubmit = () => {
    if (!window.confirm("Are you sure you want to submit this section? You cannot go back.")) return;
    submitMutation.mutate();
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5">
        {/* Part label */}
        <div className="flex items-center gap-2">
          <Badge className="bg-rose-500 text-white gap-1"><Mic className="w-3 h-3" /> Part {test.part}</Badge>
          <span className="text-sm text-muted-foreground">{test.topic}</span>
        </div>

        {/* Questions */}
        <div className="space-y-3">
          {test.questions.map((q: any, idx: number) => (
            <div key={idx} className="p-4 rounded-xl border space-y-1">
              <div className="flex items-start gap-2">
                <span className="shrink-0 w-6 h-6 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                <p className="text-sm font-medium leading-relaxed">
                  {typeof q === "string" ? q : (q.question || q.task || q.text || "")}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Preparation time (Part 2) */}
        {test.part === 2 && !prepDone && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 p-4 flex items-center gap-3">
            <Timer className="w-5 h-5 text-amber-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-700">Preparation Time</p>
              <p className="text-2xl font-mono font-bold text-amber-600">{formatDur(prepTime)}</p>
            </div>
          </div>
        )}

        {/* Recording controls */}
        {prepDone && (
          <div className="rounded-xl border border-rose-200/60 bg-rose-50/30 dark:bg-rose-950/10 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-rose-600" />
              <span className="text-sm font-semibold text-rose-700 dark:text-rose-300">Record Your Answer</span>
            </div>
            {error && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>
            )}
            {!audioUrl ? (
              <div className="flex items-center gap-3">
                {!isRecording ? (
                  <Button onClick={startRecording} className="gap-2 bg-red-500 hover:bg-red-600 text-white" size="sm" data-testid="button-start-recording">
                    <Mic className="w-4 h-4" /> Start Recording
                  </Button>
                ) : (
                  <>
                    <motion.div className="w-3 h-3 rounded-full bg-red-500" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }} />
                    <span className="text-sm font-mono text-red-600 font-bold">{formatDur(duration)}</span>
                    <Button onClick={stopRecording} variant="outline" size="sm" className="gap-2 border-red-300 text-red-600 hover:bg-red-50" data-testid="button-stop-recording">
                      <Square className="w-3 h-3 fill-current" /> Stop Recording
                    </Button>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <audio controls src={audioUrl} className="w-full h-10 rounded-lg" />
                <Button variant="outline" size="sm" onClick={reset} className="gap-2 text-xs" data-testid="button-re-record">
                  Re-record
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Submit bar */}
      <div className="shrink-0 border-t bg-background/95 backdrop-blur px-4 py-3">
        <Button
          onClick={handleSubmit}
          disabled={submitMutation.isPending || isRecording}
          className="gap-2 w-full sm:w-auto ml-auto flex bg-rose-500 hover:bg-rose-600 text-white"
          data-testid="button-submit-mock-section"
        >
          {submitMutation.isPending
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
            : <><Send className="w-4 h-4" /> Submit Section</>}
        </Button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Section Exam Page — /fullmock/:id/section/:step
// ─────────────────────────────────────────────────────────────────────────────

export function FullMockSection() {
  const { id, step: stepStr } = useParams<{ id: string; step: string }>();
  const [, setLocation] = useLocation();
  const step = parseInt(stepStr ?? "0", 10);
  const [sectionDone, setSectionDone] = useState(false);
  const sectionRemainingRef = useRef<number>(0);

  useEffect(() => { setSectionDone(false); }, [step]);

  const { data: fullMock, isLoading: loadingMock } = useQuery<FullMockTest>({
    queryKey: ["/api/fullmock-tests"],
    select: (tests: any) => Array.isArray(tests) ? tests.find((t: any) => t.id === id) : undefined,
  });

  const { data: speakingTests } = useQuery<SpeakingTest[]>({ queryKey: ["/api/speaking-tests"], enabled: !!fullMock });
  const { data: listeningTests } = useQuery<ListeningTest[]>({ queryKey: ["/api/listening-tests"], enabled: !!fullMock });
  const { data: readingTests } = useQuery<ReadingTest[]>({ queryKey: ["/api/reading-tests"], enabled: !!fullMock });
  const { data: writingTests } = useQuery<WritingTest[]>({ queryKey: ["/api/writing-tests"], enabled: !!fullMock });

  const activeSections = useMemo(() => {
    if (!fullMock) return [];
    return fullMock.sections.map(s => {
      let testData: any = null;
      if (s.type === "speaking") testData = speakingTests?.find(t => t.id === s.testId);
      if (s.type === "listening") testData = listeningTests?.find(t => t.id === s.testId);
      if (s.type === "reading") testData = readingTests?.find(t => t.id === s.testId);
      if (s.type === "writing") testData = writingTests?.find(t => t.id === s.testId);
      return { ...s, testData };
    });
  }, [fullMock, speakingTests, listeningTests, readingTests, writingTests]);

  const currentSection = activeSections[step];
  const isLastStep = step === activeSections.length - 1;
  const progress = activeSections.length > 0 ? ((step + 1) / activeSections.length) * 100 : 0;
  const completedSteps: number[] = getProgress(id ?? "").completed;

  const getSectionInitialSeconds = (stepIdx: number): number | undefined => {
    const section = activeSections[stepIdx];
    if (!section?.testData) return undefined;
    const durationSec = (section.testData as any).duration * 60;
    const elapsed = getSectionElapsed(id ?? "")[stepIdx] || 0;
    const remaining = Math.max(0, durationSec - elapsed);
    return remaining > 0 ? remaining : undefined;
  };

  const saveCurrentTimer = () => {
    if (!id || !currentSection?.testData) return;
    const durationSec = (currentSection.testData as any).duration * 60;
    const elapsed = durationSec - sectionRemainingRef.current;
    saveSectionElapsed(id, step, elapsed);
  };

  const navigateTo = (targetStep: number, skipConfirm = false) => {
    if (targetStep < 0 || targetStep >= activeSections.length) return;
    if (!sectionDone && !completedSteps.includes(step) && !skipConfirm) {
      if (!window.confirm("This section hasn't been submitted. Navigate away? Your progress in this section won't be saved.")) return;
    }
    saveCurrentTimer();
    setLocation(`/fullmock/${id}/section/${targetStep}`);
  };

  const handleSectionSubmitted = () => {
    const prog = getProgress(id ?? "");
    const newCompleted = [...new Set([...prog.completed, step])];
    saveProgress(id ?? "", step + 1, newCompleted);
    setSectionDone(true);
  };

  const handleFinish = () => {
    clearProgress(id ?? "");
    clearSectionElapsed(id ?? "");
    setLocation("/fullmock");
  };

  const handleExit = () => {
    if (window.confirm("Exit the exam? Your submitted sections are saved and you can resume later.")) {
      saveCurrentTimer();
      setLocation("/fullmock");
    }
  };

  if (loadingMock || !fullMock) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const sectionType = currentSection?.type ?? "listening";
  const iconBg = SECTION_COLORS[sectionType] ?? "bg-primary";
  const sectionIcon = SECTION_ICONS[sectionType] ?? <Trophy className="w-4 h-4 text-white" />;
  const sectionLabel = currentSection
    ? getSectionLabel(currentSection.type, currentSection.sectionIndex)
    : "";

  return (
    <div
      className="fixed inset-0 z-50 bg-background flex flex-col overflow-hidden"
      data-testid="fullmock-exam-container"
    >
      {/* ── Top Header ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b bg-background/95 backdrop-blur shrink-0 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-8 h-8 rounded-md ${iconBg} flex items-center justify-center shrink-0`}>
            {sectionIcon}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate max-w-[140px] sm:max-w-xs">
              {fullMock.title}
            </p>
            <p className="text-xs text-muted-foreground">
              {sectionLabel} · Section {step + 1} of {activeSections.length}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleExit}
          className="gap-1.5 shrink-0"
          data-testid="button-exit-exam"
        >
          <X className="w-4 h-4" /> Exit
        </Button>
      </div>

      {/* ── Section Navigation Tabs ───────────────────────────────── */}
      <div className="shrink-0 flex items-center gap-1 px-3 py-2 border-b bg-muted/20 overflow-x-auto">
        {activeSections.map((section, idx) => {
          const isCurrent = idx === step;
          const isCompleted = completedSteps.includes(idx) || (sectionDone && idx === step);
          const color = SECTION_COLORS[section.type] ?? "bg-primary";
          return (
            <button
              key={idx}
              onClick={() => navigateTo(idx, isCompleted || (sectionDone && idx === step))}
              data-testid={`tab-mock-section-${idx + 1}`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-all ${
                isCurrent
                  ? `${color} text-white shadow-sm`
                  : isCompleted
                    ? "bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-700 hover:bg-green-200"
                    : "bg-background border hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {isCompleted && !isCurrent
                ? <CheckCircle className="w-3 h-3 shrink-0" />
                : <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${isCurrent ? "bg-white/25" : "bg-foreground/10"}`}>{idx + 1}</span>
              }
              {getSectionLabel(section.type, section.sectionIndex)}
            </button>
          );
        })}
      </div>

      {/* ── Progress bar ─────────────────────────────────────────── */}
      <div className="h-0.5 bg-muted shrink-0">
        <div className="h-0.5 bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      {/* ── Section content ──────────────────────────────────────── */}
      {completedSteps.includes(step) && !sectionDone && (
        <div className="shrink-0 bg-amber-50 dark:bg-amber-950/20 border-b border-amber-200 dark:border-amber-800 px-4 py-2 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300">
          <CheckCircle className="w-3.5 h-3.5 shrink-0" />
          This section was already submitted. You can review content or navigate to another section.
        </div>
      )}

      <AnimatePresence mode="wait">
        {sectionDone ? (
          <SectionComplete
            key="done"
            label={sectionLabel}
            isLast={isLastStep}
            onBack={step > 0 ? () => navigateTo(step - 1, true) : undefined}
            onNext={isLastStep ? handleFinish : () => navigateTo(step + 1, true)}
          />
        ) : currentSection?.testData ? (
          <motion.div
            key={`section-${step}`}
            className="flex-1 flex flex-col min-h-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {currentSection.type === "listening" && (
              <ListeningSectionExam
                test={currentSection.testData as ListeningTest}
                onSubmitted={handleSectionSubmitted}
                initialSeconds={getSectionInitialSeconds(step)}
                onTimerChange={s => { sectionRemainingRef.current = s; }}
              />
            )}
            {currentSection.type === "reading" && (
              <ReadingSectionExam
                test={currentSection.testData as ReadingTest}
                onSubmitted={handleSectionSubmitted}
                initialSeconds={getSectionInitialSeconds(step)}
                onTimerChange={s => { sectionRemainingRef.current = s; }}
              />
            )}
            {currentSection.type === "writing" && (
              <WritingSectionExam
                test={currentSection.testData as WritingTest}
                onSubmitted={handleSectionSubmitted}
                initialSeconds={getSectionInitialSeconds(step)}
                onTimerChange={s => { sectionRemainingRef.current = s; }}
              />
            )}
            {currentSection.type === "speaking" && (
              <SpeakingSectionExam
                test={currentSection.testData as SpeakingTest}
                onSubmitted={handleSectionSubmitted}
              />
            )}
          </motion.div>
        ) : (
          <motion.div
            key="missing"
            className="flex-1 flex items-center justify-center p-8 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="space-y-4">
              <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto" />
              <p className="text-muted-foreground">No test data found for this section.</p>
              <Button onClick={handleSectionSubmitted} data-testid="button-skip-section">Skip Section</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Footer Navigation ─────────────────────────────────────── */}
      {!sectionDone && (
        <div className="shrink-0 border-t bg-background/95 backdrop-blur px-4 py-2.5 flex items-center justify-between gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={step === 0}
            onClick={() => navigateTo(step - 1)}
            className="gap-1.5 min-w-[90px]"
            data-testid="button-prev-section-nav"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </Button>

          <div className="text-center min-w-0">
            <p className="text-xs text-muted-foreground tabular-nums font-medium">
              {step + 1} / {activeSections.length}
            </p>
            <p className="text-[11px] text-muted-foreground truncate max-w-[160px]">{sectionLabel}</p>
          </div>

          <Button
            variant="outline"
            size="sm"
            disabled={isLastStep}
            onClick={() => navigateTo(step + 1)}
            className="gap-1.5 min-w-[90px]"
            data-testid="button-next-section-nav"
          >
            Next <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Overview / Intro Page — /fullmock/:id
// ─────────────────────────────────────────────────────────────────────────────

export default function FullMockTake() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();

  const { data: fullMock, isLoading } = useQuery<FullMockTest>({
    queryKey: ["/api/fullmock-tests"],
    select: (tests: any) => Array.isArray(tests) ? tests.find((t: any) => t.id === id) : undefined,
  });

  const { data: speakingTests } = useQuery<SpeakingTest[]>({ queryKey: ["/api/speaking-tests"], enabled: !!fullMock });
  const { data: listeningTests } = useQuery<ListeningTest[]>({ queryKey: ["/api/listening-tests"], enabled: !!fullMock });
  const { data: readingTests } = useQuery<ReadingTest[]>({ queryKey: ["/api/reading-tests"], enabled: !!fullMock });
  const { data: writingTests } = useQuery<WritingTest[]>({ queryKey: ["/api/writing-tests"], enabled: !!fullMock });

  const activeSections = useMemo(() => {
    if (!fullMock) return [];
    return fullMock.sections.map(s => {
      let testData: any = null;
      if (s.type === "speaking") testData = speakingTests?.find(t => t.id === s.testId);
      if (s.type === "listening") testData = listeningTests?.find(t => t.id === s.testId);
      if (s.type === "reading") testData = readingTests?.find(t => t.id === s.testId);
      if (s.type === "writing") testData = writingTests?.find(t => t.id === s.testId);
      return { ...s, testData };
    });
  }, [fullMock, speakingTests, listeningTests, readingTests, writingTests]);

  const savedProgress = id ? getProgress(id) : { step: 0, completed: [] };
  const isResumable = savedProgress.completed.length > 0 || savedProgress.step > 0;

  const handleStart = () => {
    if (id) {
      clearProgress(id);
      saveProgress(id, 0, []);
      setLocation(`/fullmock/${id}/section/0`);
    }
  };

  const handleResume = () => {
    if (id) {
      setLocation(`/fullmock/${id}/section/${savedProgress.step}`);
    }
  };

  if (isLoading || !fullMock) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
        <Footer />
      </div>
    );
  }

  const totalDuration = activeSections.reduce((sum, s) => sum + ((s.testData as any)?.duration || 0), 0);
  const typeCounts: Record<string, number> = {};
  activeSections.forEach(s => { typeCounts[s.type] = (typeCounts[s.type] || 0) + 1; });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 max-w-3xl mx-auto px-4 sm:px-6 py-10 w-full">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>

          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{fullMock.title}</h1>
                <p className="text-sm text-muted-foreground">{fullMock.description}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 mt-3">
              <Badge variant="secondary" className="gap-1.5">
                <Timer className="w-3.5 h-3.5" /> ~{totalDuration} minutes
              </Badge>
              <Badge variant="secondary" className="gap-1.5">
                <ChevronRight className="w-3.5 h-3.5" /> {activeSections.length} sections
              </Badge>
              {Object.entries(typeCounts).map(([type, count]) => (
                <Badge key={type} variant="outline" className="gap-1.5 capitalize">
                  {SECTION_ICONS[type]} {count > 1 ? `${count}× ` : ""}{type}
                </Badge>
              ))}
            </div>
          </div>

          {/* Exam rules */}
          <div className="rounded-xl border border-sky-200 bg-sky-50 dark:bg-sky-950/20 dark:border-sky-800 p-5 mb-6 space-y-3">
            <div className="flex items-center gap-2 font-semibold text-sky-800 dark:text-sky-300">
              <Shield className="w-5 h-5" /> Exam Rules
            </div>
            <ul className="space-y-2 text-sm text-sky-900 dark:text-sky-200">
              <li className="flex items-start gap-2"><ArrowLeft className="w-4 h-4 mt-0.5 shrink-0" /> Use the <strong>Back</strong> and <strong>Next</strong> buttons or the section tabs to navigate between sections freely.</li>
              <li className="flex items-start gap-2"><X className="w-4 h-4 mt-0.5 shrink-0" /> Correct answers are <strong>not shown</strong> during the exam.</li>
              <li className="flex items-start gap-2"><Clock className="w-4 h-4 mt-0.5 shrink-0" /> Each section has its own <strong>countdown timer</strong> that <strong>pauses</strong> when you navigate away and resumes when you return.</li>
              <li className="flex items-start gap-2"><Send className="w-4 h-4 mt-0.5 shrink-0" /> Submit each section when you're ready — you can still navigate back to review submitted sections.</li>
              <li className="flex items-start gap-2"><Trophy className="w-4 h-4 mt-0.5 shrink-0" /> Click <strong>Finish Exam</strong> when all sections are complete.</li>
            </ul>
          </div>

          {/* Sections list */}
          <div className="space-y-3 mb-8">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Sections</h2>
            {activeSections.map((section, idx) => {
              const isCompleted = savedProgress.completed.includes(idx);
              const isCurrent = savedProgress.step === idx && isResumable;
              const iconBg = SECTION_COLORS[section.type] ?? "bg-primary";
              return (
                <div
                  key={idx}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
                    isCompleted ? "bg-green-50/50 dark:bg-green-950/20 border-green-200 dark:border-green-800" :
                    isCurrent ? "bg-primary/5 border-primary/30" :
                    "bg-muted/30 border-border"
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg ${iconBg} flex items-center justify-center shrink-0`}>
                    {SECTION_ICONS[section.type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{getSectionLabel(section.type, section.sectionIndex)}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {section.testData?.title ?? "—"} · {(section.testData as any)?.duration ?? "?"} min
                    </p>
                  </div>
                  <div className="shrink-0">
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : isCurrent ? (
                      <Badge variant="default" className="text-xs">Current</Badge>
                    ) : idx < savedProgress.step ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <span className="text-xs text-muted-foreground font-mono">#{idx + 1}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            {isResumable && savedProgress.step < activeSections.length ? (
              <>
                <Button onClick={handleResume} size="lg" className="gap-2 flex-1" data-testid="button-resume-exam">
                  <ChevronRight className="w-5 h-5" />
                  Resume Exam — Section {savedProgress.step + 1}
                </Button>
                <Button
                  onClick={handleStart}
                  variant="outline"
                  size="lg"
                  className="gap-2"
                  data-testid="button-start-exam"
                >
                  Restart Exam
                </Button>
              </>
            ) : (
              <Button onClick={handleStart} size="lg" className="gap-2 flex-1" data-testid="button-start-exam">
                <Trophy className="w-5 h-5" /> Start Full Mock Exam
              </Button>
            )}
          </div>

        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
