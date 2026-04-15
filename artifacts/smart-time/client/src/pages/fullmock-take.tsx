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
  ChevronRight, Shield, Timer, Lock, Pencil, Highlighter, NotebookPen
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
import { useState, useMemo, useEffect, useRef, MutableRefObject } from "react";
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
  reading: "bg-blue-600",
  writing: "bg-blue-600",
  speaking: "bg-blue-600",
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

function MockNavBar({ items, testId, onScroll, label, startIdx = 0 }: {
  items: NavItem[];
  testId: string;
  onScroll: (id: number) => void;
  label?: string;
  startIdx?: number;
}) {
  if (items.length === 0) return null;
  const answeredCount = items.filter(i => i.answered).length;
  const unanswered = items.length - answeredCount;
  return (
    <div className="shrink-0 border-t bg-white" data-testid={`mock-nav-${testId}`}>
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
        <span className="text-xs font-semibold text-gray-600">{label || `Q${startIdx + 1}–${startIdx + items.length}`}</span>
        <span className="text-xs text-gray-500">Unanswered: <span className="font-bold text-gray-700">{unanswered}</span></span>
      </div>
      <div className="px-3 py-2.5 flex items-center gap-1.5 flex-wrap">
        {items.map((item, idx) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onScroll(item.id)}
            data-testid={`mock-q-${testId}-${startIdx + idx + 1}`}
            className={`w-8 h-8 rounded-full text-xs font-bold transition-all duration-200 border-2 cursor-pointer shrink-0 ${
              item.answered
                ? "bg-blue-600 border-blue-600 text-white"
                : "bg-rose-50 border-rose-200 text-rose-400 hover:border-blue-400 hover:text-blue-600"
            }`}
          >
            {startIdx + idx + 1}
          </button>
        ))}
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
  hideNav,
  label,
  startQNum,
}: {
  questions: ListeningQuestion[];
  testId: string;
  onAnswersChange: (answers: Record<number, number | string>) => void;
  hideNav?: boolean;
  label?: string;
  startQNum?: number;
}) {
  const [answers, setAnswers] = useState<Record<number, number | string>>({});

  const qs: ListeningQuestion[] = (questions as any[]).flatMap((q: any) => Array.isArray(q) ? q : [q]);
  const isText = (t?: string) => t === "completion" || t === "short-answer";
  const isMatch = (t?: string) => t === "matching";
  const realQs = qs.filter(q => q.type !== "text");

  const qNums: Record<number, number> = {};
  let n = startQNum ? startQNum - 1 : 0;
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
              <div key={q.id} className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
                <p className="text-sm text-amber-900 whitespace-pre-wrap leading-relaxed italic font-medium">{q.question}</p>
              </div>
            );
          }
          const userAnswer = answers[q.id];
          return (
            <div id={`mq-${testId}-${q.id}`} key={q.id} className="rounded-xl border-2 border-blue-100 bg-white overflow-hidden scroll-mt-24" data-testid={`mq-block-${testId}-${q.id}`}>
              <div className="flex items-start gap-3 px-4 pt-4 pb-3">
                <span className="shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">{qNums[q.id]}</span>
                <p className="text-sm font-medium leading-relaxed pt-0.5">{q.question}</p>
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
              {isText(q.type) ? (
                <div className="px-4 pb-4">
                  <Input
                    placeholder={q.type === "short-answer" ? "Write your answer..." : "Fill in the blank..."}
                    value={typeof userAnswer === "string" ? userAnswer : ""}
                    onChange={e => setAnswer(q.id, e.target.value)}
                    className="max-w-sm text-sm border-blue-200 focus:border-blue-400"
                  />
                </div>
              ) : isMatch(q.type) ? (
                <div className="px-4 pb-4">
                  <select
                    value={typeof userAnswer === "number" ? userAnswer.toString() : ""}
                    onChange={e => setAnswer(q.id, parseInt(e.target.value))}
                    className="w-full max-w-sm p-2.5 rounded-lg border border-blue-200 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-blue-400/40 cursor-pointer hover:border-blue-400"
                  >
                    <option value="">— Select answer —</option>
                    {q.options.map((opt, i) => <option key={i} value={i.toString()}>{opt}</option>)}
                  </select>
                </div>
              ) : (q.type === "tfng" || q.type === "ynng") ? (
                <div className="flex gap-2 px-4 pb-4 flex-wrap">
                  {(q.type === "tfng" ? ["True", "False", "Not Given"] : ["Yes", "No", "Not Given"]).map((label, optIdx) => {
                    const isSelected = userAnswer === optIdx;
                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => setAnswer(q.id, optIdx)}
                        className={`px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all duration-150 ${
                          isSelected ? "border-blue-600 bg-blue-100 text-blue-800" : "border-gray-200 text-gray-600 hover:border-blue-400 hover:bg-blue-50 cursor-pointer"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="divide-y divide-gray-100 border-t border-blue-100">
                  {q.options.map((opt, optIdx) => {
                    const isSelected = userAnswer === optIdx;
                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => setAnswer(q.id, optIdx)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-all duration-150 ${
                          isSelected ? "bg-blue-50 text-blue-900" : "hover:bg-blue-50/60 text-gray-700"
                        }`}
                        data-testid={`mq-opt-${testId}-${q.id}-${optIdx}`}
                      >
                        <span className={`shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${
                          isSelected ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300 text-gray-500"
                        }`}>{String.fromCharCode(65 + optIdx)}</span>
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
      {!hideNav && <MockNavBar items={navItems} testId={testId} onScroll={scrollTo} label={label} startIdx={startQNum ? startQNum - 1 : 0} />}
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
  label,
  startQNum,
}: {
  questions: ReadingQuestion[];
  testId: string;
  onAnswersChange: (answers: Record<number, number | string>) => void;
  label?: string;
  startQNum?: number;
}) {
  const [answers, setAnswers] = useState<Record<number, number | string>>({});

  const qs: ReadingQuestion[] = (questions as any[]).flatMap((q: any) => Array.isArray(q) ? q : [q]);
  const isText = (t?: string) => t === "completion" || t === "short-answer";
  const isMatch = (t?: string) => t === "matching";
  const realQs = qs.filter(q => q.type !== "text");

  const qNums: Record<number, number> = {};
  let n = startQNum ? startQNum - 1 : 0;
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
              <div key={q.id} className="px-4 py-3 rounded-xl bg-blue-50 border border-blue-200">
                <p className="text-sm text-blue-900 whitespace-pre-wrap leading-relaxed">{q.question}</p>
              </div>
            );
          }
          const userAnswer = answers[q.id];
          return (
            <div id={`mrq-${testId}-${q.id}`} key={q.id} className="rounded-xl border-2 border-blue-100 bg-white overflow-hidden scroll-mt-24" data-testid={`mrq-block-${testId}-${q.id}`}>
              <div className="flex items-start gap-3 px-4 pt-4 pb-3">
                <span className="shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">{qNums[q.id]}</span>
                <p className="text-sm font-medium leading-relaxed pt-0.5">{q.question}</p>
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
              {isText(q.type) ? (
                <div className="px-4 pb-4">
                  <Input
                    placeholder={q.type === "short-answer" ? "Write your answer..." : "Fill in the blank..."}
                    value={typeof userAnswer === "string" ? userAnswer : ""}
                    onChange={e => setAnswer(q.id, e.target.value)}
                    className="max-w-sm text-sm border-blue-200 focus:border-blue-400"
                  />
                </div>
              ) : isMatch(q.type) ? (
                <div className="px-4 pb-4">
                  <select
                    value={typeof userAnswer === "number" ? userAnswer.toString() : ""}
                    onChange={e => setAnswer(q.id, parseInt(e.target.value))}
                    className="w-full max-w-sm p-2.5 rounded-lg border border-blue-200 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-blue-400/40 cursor-pointer hover:border-blue-400"
                  >
                    <option value="">— Select answer —</option>
                    {q.options.map((opt, i) => <option key={i} value={i.toString()}>{opt}</option>)}
                  </select>
                </div>
              ) : (q.type === "tfng" || q.type === "ynng") ? (
                <div className="flex gap-2 px-4 pb-4 flex-wrap">
                  {(q.type === "tfng" ? ["True", "False", "Not Given"] : ["Yes", "No", "Not Given"]).map((label, optIdx) => {
                    const isSelected = userAnswer === optIdx;
                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => setAnswer(q.id, optIdx)}
                        className={`px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all duration-150 ${
                          isSelected ? "border-blue-600 bg-blue-100 text-blue-800" : "border-gray-200 text-gray-600 hover:border-blue-400 hover:bg-blue-50 cursor-pointer"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="divide-y divide-gray-100 border-t border-blue-100">
                  {q.options.map((opt, optIdx) => {
                    const isSelected = userAnswer === optIdx;
                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => setAnswer(q.id, optIdx)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm text-left transition-all duration-150 ${
                          isSelected ? "bg-blue-50 text-blue-900" : "hover:bg-blue-50/60 text-gray-700"
                        }`}
                        data-testid={`mrq-opt-${testId}-${q.id}-${optIdx}`}
                      >
                        <span className={`shrink-0 w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all ${
                          isSelected ? "border-blue-600 bg-blue-600 text-white" : "border-gray-300 text-gray-500"
                        }`}>{String.fromCharCode(65 + optIdx)}</span>
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
      <MockNavBar items={navItems} testId={testId} onScroll={scrollTo} label={label} startIdx={startQNum ? startQNum - 1 : 0} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Map / Diagram Viewer
// ─────────────────────────────────────────────────────────────────────────────

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
          <div
            className="px-3 pb-3 cursor-zoom-in"
            onClick={() => setOpen(true)}
          >
            <img
              src={mapUrl}
              alt={mapCaption || "Map"}
              className="w-full rounded-lg border border-blue-200 object-contain max-h-64 bg-white"
            />
          </div>
        )}
      </div>

      {/* Full-screen lightbox */}
      {open && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div className="relative max-w-5xl max-h-full w-full" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setOpen(false)}
              className="absolute -top-10 right-0 text-white/80 hover:text-white text-sm flex items-center gap-1"
            >
              <X className="w-5 h-5" /> Close
            </button>
            <img
              src={mapUrl}
              alt={mapCaption || "Map"}
              className="w-full max-h-[85vh] object-contain rounded-lg"
            />
            {mapCaption && (
              <p className="text-center text-white/70 text-sm mt-3 italic">{mapCaption}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Listening Section Exam
// ─────────────────────────────────────────────────────────────────────────────

function ListeningSectionExam({ test, onSubmitted, initialSeconds, onTimerChange, submitRef }: {
  test: ListeningTest;
  onSubmitted: () => void;
  initialSeconds?: number;
  onTimerChange?: (remaining: number) => void;
  submitRef?: MutableRefObject<(() => void) | null>;
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

  useEffect(() => {
    if (submitRef) submitRef.current = handleManualSubmit;
  });

  // Build part info for breadcrumb
  const sections = isMultiSection ? (test.testSections as any[]) : [{ questions: test.questions, audioUrl: test.audioUrl }];
  let globalN = 0;
  const partRanges = sections.map((sec: any) => {
    const qs = ((sec.questions as any[]) || []).flatMap((q: any) => Array.isArray(q) ? q : [q]);
    const real = qs.filter((q: any) => q.type !== "text");
    const start = globalN + 1;
    globalN += real.length;
    return { start, end: globalN };
  });

  // Build combined nav items for multi-section (all questions merged, global numbering)
  const allMultiQs: Array<{ id: number; isText: boolean; secId: string }> = isMultiSection
    ? (test.testSections as any[]).flatMap((sec: any, sIdx: number) => {
        const qs = ((sec.questions as any[]) || []).flatMap((q: any) => Array.isArray(q) ? q : [q]);
        return qs
          .filter((q: any) => q.type !== "text")
          .map((q: any) => ({ id: q.id, isText: q.type === "completion" || q.type === "short-answer", secId: `${test.id}-s${sIdx}` }));
      })
    : [];
  const totalQCount = isMultiSection ? allMultiQs.length : globalN;
  const combinedNavLabel = `Listening Q1–${totalQCount}`;

  const listeningTimerMins = Math.floor(timer.secondsLeft / 60);
  const listeningTimerSecs = timer.secondsLeft % 60;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Timer bar */}
      <div className={`shrink-0 flex items-center justify-between px-4 py-2 border-b text-sm font-semibold ${
        timer.isCritical ? "bg-red-50 border-red-200 text-red-700" :
        timer.isWarning  ? "bg-amber-50 border-amber-200 text-amber-700" :
        "bg-gray-50 border-gray-200 text-gray-700"
      }`}>
        <span className="flex items-center gap-1.5 text-xs uppercase tracking-wide font-semibold opacity-70">
          <Headphones className="w-3.5 h-3.5" /> Listening — Time Remaining
        </span>
        <span className="font-mono text-base">
          {listeningTimerMins}:{String(listeningTimerSecs).padStart(2, "0")}
        </span>
      </div>
      {isMultiSection ? (
        /* Multi-section: SmartCEFR style — breadcrumb + part heading per section */
        <>
          <div className="flex-1 overflow-y-auto bg-white">
            <div className="max-w-4xl mx-auto px-6 pb-10 space-y-10">
              {(test.testSections as any[]).map((sec: any, sIdx: number) => {
                const qs: ListeningQuestion[] = ((sec.questions as any[]) || []).flatMap((q: any) => Array.isArray(q) ? q : [q]);
                const range = partRanges[sIdx] || { start: 1, end: qs.length };
                return (
                  <div key={sIdx} className="space-y-4 pt-6">
                    {/* Part heading */}
                    <h2 className="text-xl font-bold text-gray-900">
                      Part {sIdx + 1} <span className="text-gray-400 font-normal text-base">Questions {range.start}–{range.end}</span>
                    </h2>
                    {/* Audio */}
                    {sec.audioUrl && (
                      <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
                        <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Audio</p>
                        <audio controls className="w-full h-9 rounded" src={sec.audioUrl} data-testid={`mock-audio-sec-${sIdx}`} />
                      </div>
                    )}
                    {/* Map + Questions: two-column when map exists */}
                    {sec.mapUrl ? (
                      <div className="flex gap-5 items-start">
                        <div className="w-64 shrink-0 sticky top-4 self-start">
                          <MapViewer mapUrl={sec.mapUrl} mapCaption={sec.mapCaption} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <MockListeningQuiz
                            questions={qs}
                            testId={`${test.id}-s${sIdx}`}
                            onAnswersChange={secAnswers => setAnswers(prev => ({ ...prev, ...secAnswers }))}
                            hideNav={true}
                            startQNum={range.start}
                          />
                        </div>
                      </div>
                    ) : (
                      <MockListeningQuiz
                        questions={qs}
                        testId={`${test.id}-s${sIdx}`}
                        onAnswersChange={secAnswers => setAnswers(prev => ({ ...prev, ...secAnswers }))}
                        hideNav={true}
                        startQNum={range.start}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          {/* Combined bottom nav bar across all sections */}
          <MockNavBar
            items={allMultiQs.map(q => ({
              id: q.id,
              answered: q.isText
                ? typeof answers[q.id] === "string" && (answers[q.id] as string).trim().length > 0
                : answers[q.id] !== undefined,
            }))}
            testId={test.id}
            onScroll={(id) => {
              const el = allMultiQs.find(q => q.id === id);
              if (el) document.getElementById(`mq-${el.secId}-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
            label={combinedNavLabel}
          />
        </>
      ) : (
        /* Single-section listening */
        <>
          {/* Breadcrumb + Part heading */}
          <div className="shrink-0 px-6 pt-5 pb-0 bg-white">
            <div className="max-w-2xl mx-auto space-y-1">
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <span className="uppercase tracking-widest font-semibold">Listening</span>
                <ChevronRight className="w-3 h-3" />
                <span className="text-gray-600 font-medium">Part 1 (1–{partRanges[0]?.end || "?"})</span>
              </div>
              <h2 className="text-xl font-bold text-gray-900">
                Part 1 <span className="text-gray-400 font-normal text-base">Questions 1–{partRanges[0]?.end || "?"}</span>
              </h2>
            </div>
          </div>
          {/* Audio */}
          {test.audioUrl && (
            <div className="shrink-0 px-6 py-3 bg-white">
              <div className="max-w-2xl mx-auto rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Audio — Listen carefully</p>
                <audio controls className="w-full h-9 rounded" src={test.audioUrl} data-testid={`mock-audio-${test.id}`} />
              </div>
            </div>
          )}
          <div className="flex-1 overflow-y-auto bg-white">
            <div className="max-w-2xl mx-auto px-6 py-5 space-y-5">
              {mode === "test" && test.questions.length > 0 && (
                <MockListeningQuiz questions={test.questions} testId={test.id} onAnswersChange={setAnswers} label={`Listening Q1–${partRanges[0]?.end || "?"}`} />
              )}
              {mode === "written" && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-blue-700">Listen and write your response:</p>
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
                    <p className="text-sm font-semibold text-blue-700 mb-2">Part 1 — Written response</p>
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
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Reading Section Exam — two-column layout
// ─────────────────────────────────────────────────────────────────────────────

function ReadingSectionExam({ test, onSubmitted, initialSeconds, onTimerChange, submitRef }: {
  test: ReadingTest;
  onSubmitted: () => void;
  initialSeconds?: number;
  onTimerChange?: (remaining: number) => void;
  submitRef?: MutableRefObject<(() => void) | null>;
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

  useEffect(() => {
    if (submitRef) submitRef.current = handleManualSubmit;
  });

  const mode = (test.mode as string) || "test";
  const [writtenText, setWrittenText] = useState("");
  const isMultiSection = (test.testSections as any[])?.length > 0;

  // Build question ranges per section for breadcrumb
  let globalRN = 0;
  const readingPartRanges = (isMultiSection ? (test.testSections as any[]) : [{ questions: test.questions }]).map((sec: any) => {
    const qs = ((sec.questions as any[]) || []).flatMap((q: any) => Array.isArray(q) ? q : [q]);
    const real = qs.filter((q: any) => q.type !== "text");
    const start = globalRN + 1;
    globalRN += real.length;
    return { start, end: globalRN };
  });

  const readingTimerMins = Math.floor(timer.secondsLeft / 60);
  const readingTimerSecs = timer.secondsLeft % 60;

  return (
    <div className="flex flex-col h-full min-h-0 bg-white">
      {/* Timer bar */}
      <div className={`shrink-0 flex items-center justify-between px-4 py-2 border-b text-sm font-semibold ${
        timer.isCritical ? "bg-red-50 border-red-200 text-red-700" :
        timer.isWarning  ? "bg-amber-50 border-amber-200 text-amber-700" :
        "bg-gray-50 border-gray-200 text-gray-700"
      }`}>
        <span className="flex items-center gap-1.5 text-xs uppercase tracking-wide font-semibold opacity-70">
          <BookOpen className="w-3.5 h-3.5" /> Reading — Time Remaining
        </span>
        <span className="font-mono text-base">
          {readingTimerMins}:{String(readingTimerSecs).padStart(2, "0")}
        </span>
      </div>
      {isMultiSection ? (
        /* Multi-section: SmartCEFR style per passage */
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-0">
            {(test.testSections as any[]).map((sec: any, pIdx: number) => {
              const qs: ReadingQuestion[] = ((sec.questions as any[]) || []).flatMap((q: any) => Array.isArray(q) ? q : [q]);
              const range = readingPartRanges[pIdx] || { start: 1, end: qs.length };
              return (
                <div key={pIdx} className="border-b">
                  {/* Breadcrumb + heading */}
                  <div className="px-6 pt-5 pb-3 bg-white">
                    <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                      <span className="uppercase tracking-widest font-semibold">Reading</span>
                      <ChevronRight className="w-3 h-3" />
                      <span className="text-gray-600 font-medium">Passage {pIdx + 1} ({range.start}–{range.end})</span>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">
                      Passage {pIdx + 1} <span className="text-gray-400 font-normal text-base">Questions {range.start}–{range.end}</span>
                    </h2>
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
                        label={`Reading Q${range.start}–${range.end}`}
                        startQNum={range.start}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Single passage: two-column layout */
        <>
          {/* Breadcrumb + heading */}
          <div className="shrink-0 px-6 pt-5 pb-3 bg-white border-b">
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
              <span className="uppercase tracking-widest font-semibold">Reading</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-gray-600 font-medium">Passage 1 (1–{readingPartRanges[0]?.end || "?"})</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              Passage 1 <span className="text-gray-400 font-normal text-base">Questions 1–{readingPartRanges[0]?.end || "?"}</span>
            </h2>
          </div>
          <div className="flex-1 flex overflow-hidden">
            <div className="w-1/2 overflow-y-auto p-4 md:p-6 border-r">
              <HighlightablePassage passage={test.passage} testId={test.id} />
            </div>
            <div className="w-1/2 flex flex-col min-h-0">
              {mode === "test" && test.questions.length > 0 ? (
                <MockReadingQuiz
                  questions={test.questions}
                  testId={test.id}
                  onAnswersChange={setAnswers}
                  label={`Reading Q1–${readingPartRanges[0]?.end || "?"}`}
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
        </>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Writing Section Exam — IELTS CD split-panel (task left, editor right)
// ─────────────────────────────────────────────────────────────────────────────

function WritingSectionExam({ test, onSubmitted, initialSeconds, onTimerChange, submitRef }: {
  test: WritingTest;
  onSubmitted: () => void;
  initialSeconds?: number;
  onTimerChange?: (remaining: number) => void;
  submitRef?: MutableRefObject<(() => void) | null>;
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

  useEffect(() => {
    if (submitRef) submitRef.current = handleManualSubmit;
  });

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
    <div className="flex flex-col h-full min-h-0 bg-white">
      {/* IELTS CD Split Layout: task on left, editor on right */}
      <div className="flex-1 flex overflow-hidden">

        {/* LEFT: Task description */}
        <div className="w-2/5 flex flex-col overflow-hidden border-r">
          <div className="shrink-0 px-4 py-2.5 border-b bg-blue-600">
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
          <div className="shrink-0 flex items-center gap-1 px-3 py-2 border-b bg-muted/30 flex-wrap">
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
            <div className="ml-auto flex items-center gap-3">
              <span className={`text-xs font-mono font-semibold tabular-nums ${
                wordCount === 0 ? "text-muted-foreground" :
                wordCount < minWords ? "text-amber-600" : "text-green-600"
              }`}>
                {wordCount} / {minWords}+ words
              </span>
              <div className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-bold ${
                timer.isCritical ? "bg-red-100 text-red-700" :
                timer.isWarning  ? "bg-amber-100 text-amber-700" :
                "bg-gray-100 text-gray-700"
              }`}>
                <Clock className="w-3 h-3 shrink-0" />
                {timer.formattedTime}
              </div>
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

      {/* Word count bar */}
      <div className="shrink-0 border-t bg-white px-4 py-2 flex items-center gap-2">
        <span className={`text-sm font-semibold tabular-nums ${
          wordCount === 0 ? "text-gray-400" :
          wordCount < minWords ? "text-amber-600" : "text-green-600"
        }`}>
          {wordCount} / {minWords}+ words
        </span>
        {wordCount < minWords && wordCount > 0 && (
          <span className="text-xs text-gray-400">({minWords - wordCount} more needed)</span>
        )}
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
  const warmupSec = test.warmupDuration ?? (test.prepDuration ?? 60);
  const [phase, setPhase] = useState<"warmup" | "recording">(warmupSec > 0 ? "warmup" : "recording");

  // Auto-start recording when entering recording phase
  useEffect(() => {
    if (phase !== "recording") return;
    const t = setTimeout(() => { reset(); startRecording(); }, 400);
    return () => clearTimeout(t);
  }, [phase]);

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

  const handleSubmit = () => {
    if (!window.confirm("Are you sure you want to submit this section? You cannot go back.")) return;
    if (isRecording) stopRecording();
    setTimeout(() => submitMutation.mutate(), 300);
  };

  // Warmup phase — show questions + countdown
  if (phase === "warmup") {
    return (
      <div className="flex flex-col h-full min-h-0 overflow-y-auto p-4 md:p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Badge className="bg-rose-500 text-white gap-1"><Mic className="w-3 h-3" /> Part {test.part}</Badge>
          <span className="text-sm text-muted-foreground">{test.topic}</span>
        </div>
        <div className="space-y-3">
          {test.questions.map((q: any, idx: number) => (
            <div key={idx} className="p-4 rounded-xl border">
              <div className="flex items-start gap-2">
                <span className="shrink-0 w-6 h-6 rounded-full bg-rose-500/10 text-rose-600 flex items-center justify-center text-xs font-bold">{idx + 1}</span>
                <p className="text-sm font-medium leading-relaxed">{typeof q === "string" ? q : (q.question || q.task || q.text || "")}</p>
              </div>
            </div>
          ))}
        </div>
        <SpeakingCountdown
          seconds={warmupSec}
          label="Preparation / Warm-up Time"
          color="amber"
          onDone={() => setPhase("recording")}
        />
      </div>
    );
  }

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

        {/* Recording controls */}
        <div className="rounded-xl border border-rose-200/60 bg-rose-50/30 dark:bg-rose-950/10 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-rose-600" />
              <span className="text-sm font-semibold text-rose-700 dark:text-rose-300">Record Your Answer</span>
            </div>
            {(test.duration ?? 0) > 0 && (
              <PartTimer
                key="speaking-section-timer"
                seconds={(test.duration ?? 5) * 60}
                onWarning={playWarningBeeps}
                onDone={() => { if (isRecording) stopRecording(); setTimeout(() => submitMutation.mutate(), 500); }}
              />
            )}
          </div>
          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>
          )}
          {!audioUrl ? (
            <div className="flex items-center gap-3">
              {!isRecording ? (
                <div className="flex items-center gap-2 text-sm text-rose-500 italic">
                  <Loader2 className="w-4 h-4 animate-spin" /> Запуск микрофона...
                </div>
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
  const [timerDisplay, setTimerDisplay] = useState("--:--");
  const [isTimerCritical, setIsTimerCritical] = useState(false);
  const [isTimerWarning, setIsTimerWarning] = useState(false);
  const [submitPending, setSubmitPending] = useState(false);
  const sectionSubmitRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    setSectionDone(false);
    setTimerDisplay("--:--");
    setIsTimerCritical(false);
    setIsTimerWarning(false);
    sectionSubmitRef.current = null;
  }, [step]);

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
    setLocation(`/fullmock/${id}/results`);
  };

  const handleExit = () => {
    if (window.confirm("Exit the exam? Your submitted sections are saved and you can resume later.")) {
      saveCurrentTimer();
      setLocation("/fullmock");
    }
  };

  // Unique section types in order — must be BEFORE early return (Rules of Hooks)
  const uniqueTypes = useMemo(() => {
    const seen = new Set<string>();
    const types: string[] = [];
    for (const s of activeSections) {
      if (!seen.has(s.type)) { seen.add(s.type); types.push(s.type); }
    }
    return types;
  }, [activeSections]);

  if (loadingMock || !fullMock) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const sectionLabel = currentSection
    ? getSectionLabel(currentSection.type, currentSection.sectionIndex)
    : "";

  const getSectionTypeIcon = (type: string, active: boolean) => {
    const cls = `w-3.5 h-3.5 ${active ? "text-white" : "text-gray-500"}`;
    if (type === "listening") return <Headphones className={cls} />;
    if (type === "reading") return <BookOpen className={cls} />;
    if (type === "writing") return <Pencil className={cls} />;
    if (type === "speaking") return <Mic className={cls} />;
    return <Trophy className={cls} />;
  };

  const getTypeTotalDuration = (type: string) => {
    return activeSections.filter(s => s.type === type).reduce((sum, s) => sum + (((s.testData as any)?.duration) || 0), 0);
  };

  // Compute question count for each section
  const getQCount = (section: typeof activeSections[0]): number => {
    const td = section.testData as any;
    if (!td) return 0;
    const secs = td.testSections?.length > 0 ? td.testSections : [{ questions: td.questions || [] }];
    return secs.reduce((s: number, sec: any) => {
      const qs = ((sec.questions as any[]) || []).flatMap((q: any) => Array.isArray(q) ? q : [q]);
      return s + qs.filter((q: any) => q.type !== "text").length;
    }, 0);
  };
  const totalQs = activeSections.filter(s => s.type !== "speaking").reduce((s, sec) => s + getQCount(sec), 0);

  return (
    <div
      className="fixed inset-0 z-50 bg-gray-50 flex flex-col overflow-hidden"
      data-testid="fullmock-exam-container"
    >
      {/* ── SmartCEFR-style Top Bar ──────────────────────────────── */}
      <div className="flex items-center px-4 py-2 border-b bg-white shrink-0 gap-2">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0 min-w-[110px]">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
            <Trophy className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-sm text-gray-900 hidden sm:block">Smart Time</span>
        </div>

        {/* Section TYPE tabs */}
        <div className="flex items-center gap-0.5 flex-1 justify-center overflow-x-auto">
          {uniqueTypes.map(type => {
            const isCurrent = currentSection?.type === type;
            const totalMin = getTypeTotalDuration(type);
            return (
              <div
                key={type}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                  isCurrent
                    ? "bg-blue-600 text-white"
                    : "text-gray-400"
                }`}
              >
                {getSectionTypeIcon(type, isCurrent)}
                <span className="capitalize">{type}</span>
                {totalMin > 0 && <span className={`text-[10px] ml-0.5 ${isCurrent ? "text-blue-200" : "text-gray-300"}`}>{totalMin} min</span>}
              </div>
            );
          })}
        </div>

        {/* Right tools: Highlight | Notes | Timer | Submit | Exit */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors">
            <Highlighter className="w-3.5 h-3.5" />
            <span className="hidden sm:block">Highlight</span>
          </button>
          <button className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors">
            <NotebookPen className="w-3.5 h-3.5" />
            <span className="hidden sm:block">Notes</span>
          </button>
          <div className={`flex items-center gap-1 px-2 py-1 font-mono text-sm font-bold rounded ${
            isTimerCritical ? "text-red-600 bg-red-50" :
            isTimerWarning ? "text-amber-600 bg-amber-50" :
            "text-gray-800"
          }`} data-testid="mock-top-timer">
            <Clock className="w-3.5 h-3.5" />
            <span>{timerDisplay}</span>
          </div>
          {!sectionDone && (
            <button
              onClick={() => sectionSubmitRef.current?.()}
              disabled={submitPending}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded transition-colors disabled:opacity-60"
              data-testid="button-submit-mock-section"
            >
              {submitPending ? <><Loader2 className="w-3 h-3 animate-spin" /> Submitting…</> : "Submit"}
            </button>
          )}
          <button
            onClick={handleExit}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
            data-testid="button-exit-exam"
          >
            <X className="w-3.5 h-3.5" />
            <span className="hidden sm:block">Exit</span>
          </button>
        </div>
      </div>

      {/* ── SmartCEFR-style Parts Sub-Bar ───────────────────────── */}
      <div className="shrink-0 flex items-center gap-1 px-4 py-1.5 border-b bg-white overflow-x-auto">
        <span className="text-xs text-gray-400 font-semibold shrink-0 mr-2">Parts:</span>
        {activeSections.map((section, idx) => {
          const isCurrent = idx === step;
          const isCompleted = completedSteps.includes(idx) || (sectionDone && idx === step);
          const qCount = getQCount(section);
          const label = getSectionLabel(section.type, section.sectionIndex);
          return (
            <button
              key={idx}
              onClick={() => navigateTo(idx, isCompleted || (sectionDone && idx === step))}
              data-testid={`tab-mock-section-${idx + 1}`}
              className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold whitespace-nowrap transition-all ${
                isCurrent
                  ? "text-blue-700 bg-blue-50 border border-blue-200"
                  : isCompleted
                    ? "text-green-700 border border-green-200 bg-green-50 hover:bg-green-100"
                    : "text-gray-600 border border-gray-200 bg-white hover:bg-gray-50"
              }`}
            >
              {isCompleted && !isCurrent && <CheckCircle className="w-3 h-3 shrink-0 text-green-600" />}
              <span>{label}</span>
              {qCount > 0 && (
                <span className={`text-[10px] font-normal ${isCurrent ? "text-blue-500" : isCompleted ? "text-green-500" : "text-gray-400"}`}>
                  {qCount}Q
                </span>
              )}
            </button>
          );
        })}
        {totalQs > 0 && (
          <span className="ml-auto text-xs text-gray-500 font-semibold shrink-0 pl-3 whitespace-nowrap">
            Total: {totalQs}Q
          </span>
        )}
      </div>

      {/* ── Progress bar ─────────────────────────────────────────── */}
      <div className="h-0.5 bg-gray-200 shrink-0">
        <div className="h-0.5 bg-blue-600 transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      {/* ── Section content ──────────────────────────────────────── */}
      {completedSteps.includes(step) && !sectionDone && (
        <div className="shrink-0 bg-blue-50 border-b border-blue-200 px-4 py-2 flex items-center gap-2 text-xs text-blue-800">
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
                onTimerChange={s => {
                  sectionRemainingRef.current = s;
                  const m = Math.floor(s / 60);
                  const sec = s % 60;
                  setTimerDisplay(`${m}:${String(sec).padStart(2, "0")}`);
                  const total = (currentSection.testData as any)?.duration * 60 || 0;
                  setIsTimerCritical(s <= 60);
                  setIsTimerWarning(s <= Math.min(300, total * 0.15) && s > 60);
                }}
                submitRef={sectionSubmitRef}
              />
            )}
            {currentSection.type === "reading" && (
              <ReadingSectionExam
                test={currentSection.testData as ReadingTest}
                onSubmitted={handleSectionSubmitted}
                initialSeconds={getSectionInitialSeconds(step)}
                onTimerChange={s => {
                  sectionRemainingRef.current = s;
                  const m = Math.floor(s / 60);
                  const sec = s % 60;
                  setTimerDisplay(`${m}:${String(sec).padStart(2, "0")}`);
                  const total = (currentSection.testData as any)?.duration * 60 || 0;
                  setIsTimerCritical(s <= 60);
                  setIsTimerWarning(s <= Math.min(300, total * 0.15) && s > 60);
                }}
                submitRef={sectionSubmitRef}
              />
            )}
            {currentSection.type === "writing" && (
              <WritingSectionExam
                test={currentSection.testData as WritingTest}
                onSubmitted={handleSectionSubmitted}
                initialSeconds={getSectionInitialSeconds(step)}
                onTimerChange={s => {
                  sectionRemainingRef.current = s;
                  const m = Math.floor(s / 60);
                  const sec = s % 60;
                  setTimerDisplay(`${m}:${String(sec).padStart(2, "0")}`);
                  const total = (currentSection.testData as any)?.duration * 60 || 0;
                  setIsTimerCritical(s <= 60);
                  setIsTimerWarning(s <= Math.min(300, total * 0.15) && s > 60);
                }}
                submitRef={sectionSubmitRef}
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

    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Speaking AIO Section — full speaking exam flow with timer phases
// ─────────────────────────────────────────────────────────────────────────────

type SpeakingPhase =
  | { type: "start" }
  | { type: "warmup" }
  | { type: "part_active"; partIdx: number }
  | { type: "part_prep"; partIdx: number }
  | { type: "done" };

function playWarningBeeps() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    for (let i = 0; i < 5; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = i < 4 ? 880 : 1320;
      gain.gain.setValueAtTime(0, now + i * 0.4);
      gain.gain.linearRampToValueAtTime(0.35, now + i * 0.4 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.4 + 0.35);
      osc.start(now + i * 0.4);
      osc.stop(now + i * 0.4 + 0.4);
    }
  } catch (_) {}
}

function PartTimer({ seconds, onWarning, onDone }: {
  seconds: number;
  onWarning: () => void;
  onDone: () => void;
}) {
  const [remaining, setRemaining] = useState(seconds);
  const warned = useRef(false);
  const done = useRef(false);

  useEffect(() => {
    if (seconds <= 0) { onDone(); return; }
    const id = setInterval(() => {
      setRemaining(r => {
        const next = r - 1;
        if (next <= 10 && !warned.current) { warned.current = true; onWarning(); }
        if (next <= 0) {
          clearInterval(id);
          if (!done.current) { done.current = true; setTimeout(onDone, 400); }
          return 0;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const isWarning = remaining <= 10;

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-colors ${
      isWarning ? "bg-red-100 text-red-700 animate-pulse" : "bg-gray-100 text-gray-700"
    }`}>
      <Clock className="w-3.5 h-3.5 shrink-0" />
      {mins > 0 ? `${mins}:${String(secs).padStart(2, "0")}` : `${secs}s`}
    </div>
  );
}

function SpeakingCountdown({ seconds, label, onDone, color = "blue" }: {
  seconds: number;
  label: string;
  onDone: () => void;
  color?: "rose" | "blue" | "amber";
}) {
  const [remaining, setRemaining] = useState(seconds);
  const done = useRef(false);

  useEffect(() => {
    if (seconds <= 0) { onDone(); return; }
    const id = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(id);
          if (!done.current) { done.current = true; setTimeout(onDone, 300); }
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const pct = seconds > 0 ? (remaining / seconds) * 100 : 0;
  const colorMap = {
    rose:  { ring: "stroke-rose-500",  bg: "bg-rose-50",  text: "text-rose-700",  btn: "bg-rose-600 hover:bg-rose-700" },
    blue:  { ring: "stroke-blue-500",  bg: "bg-blue-50",  text: "text-blue-700",  btn: "bg-blue-600 hover:bg-blue-700" },
    amber: { ring: "stroke-amber-500", bg: "bg-amber-50", text: "text-amber-700", btn: "bg-amber-600 hover:bg-amber-700" },
  };
  const c = colorMap[color];
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <div className={`flex flex-col items-center justify-center py-10 px-6 ${c.bg} rounded-2xl border border-opacity-30 space-y-4`}>
      <p className={`text-sm font-semibold uppercase tracking-widest ${c.text}`}>{label}</p>
      <div className="relative w-24 h-24">
        <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
          <circle cx="48" cy="48" r="40" fill="none" stroke="#e5e7eb" strokeWidth="8" />
          <circle cx="48" cy="48" r="40" fill="none" strokeWidth="8" strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 40}`}
            strokeDashoffset={`${2 * Math.PI * 40 * (1 - pct / 100)}`}
            className={c.ring}
            style={{ transition: "stroke-dashoffset 1s linear" }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-xl font-bold font-mono ${c.text}`}>
            {mins > 0 ? `${mins}:${String(secs).padStart(2, "0")}` : String(secs)}
          </span>
        </div>
      </div>
      <button onClick={() => { done.current = true; onDone(); }} className={`px-4 py-2 text-white text-xs font-semibold rounded-lg ${c.btn} transition-colors`}>
        Skip →
      </button>
    </div>
  );
}

function SpeakingAIOSection({ parts, onPartRecorded }: {
  parts: SpeakingTest[];
  onPartRecorded?: (partIdx: number, serverUrl: string) => void;
}) {
  const [phase, setPhase] = useState<SpeakingPhase>({ type: "start" });
  const { isRecording, audioBlob, audioUrl, duration: recDuration, error: recError, startRecording, stopRecording, reset: resetRec } = useAudioRecorder();
  const [recordings, setRecordings] = useState<Record<number, string>>({});
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  if (parts.length === 0) return null;

  const firstPart = parts[0];
  const warmupSec = (firstPart.warmupDuration ?? 60);
  const isLastPart = (phase.type === "part_active" || phase.type === "part_prep") && phase.partIdx >= parts.length - 1;

  const goToPartActive = (partIdx: number) => setPhase({ type: "part_active", partIdx });
  const goToPartPrep = (partIdx: number) => setPhase({ type: "part_prep", partIdx });
  const goNext = () => {
    if (phase.type !== "part_active") return;
    if (isLastPart) { setPhase({ type: "done" }); }
    else { goToPartPrep(phase.partIdx); }
  };

  // Auto-start recording when entering part_active
  const activePartKey = phase.type === "part_active" ? phase.partIdx : -1;
  useEffect(() => {
    if (phase.type !== "part_active") return;
    const t = setTimeout(() => {
      resetRec();
      startRecording();
    }, 400);
    return () => clearTimeout(t);
  }, [activePartKey]);

  // Upload blob to server as soon as recording stops
  useEffect(() => {
    if (!audioBlob || phase.type !== "part_active") return;
    const partIdx = phase.partIdx;
    const partId = parts[partIdx]?.id ?? `part-${partIdx}`;
    setUploading(true);
    setUploadError(null);
    const formData = new FormData();
    const ext = audioBlob.type.includes("webm") ? "webm" : "ogg";
    formData.append("recording", audioBlob, `speaking-aio-${partId}.${ext}`);
    fetch("/api/speaking/upload", { method: "POST", body: formData, credentials: "include" })
      .then(r => r.ok ? r.json() : Promise.reject("Upload failed"))
      .then(({ url }: { url: string }) => {
        setRecordings(prev => ({ ...prev, [partIdx]: url }));
        onPartRecorded?.(partIdx, url);
      })
      .catch(() => setUploadError("Не удалось загрузить запись. Попробуйте ещё раз."))
      .finally(() => setUploading(false));
  }, [audioBlob]);

  if (phase.type === "start") {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-6 space-y-6">
        <div className="w-16 h-16 rounded-full bg-rose-100 border-4 border-rose-300 flex items-center justify-center">
          <Mic className="w-8 h-8 text-rose-600" />
        </div>
        <div className="text-center space-y-1">
          <h3 className="text-lg font-bold text-gray-900">Speaking Exam</h3>
          <p className="text-sm text-gray-500">{parts.length} part{parts.length !== 1 ? "s" : ""} · {warmupSec > 0 ? `${warmupSec}s warm-up` : "No warm-up"}</p>
        </div>
        {firstPart.tips?.length > 0 && (
          <ul className="text-sm text-gray-600 space-y-1 max-w-sm">
            {firstPart.tips.map((t, i) => <li key={i} className="flex items-start gap-2"><span className="text-rose-400">•</span>{t}</li>)}
          </ul>
        )}
        <button
          onClick={() => warmupSec > 0 ? setPhase({ type: "warmup" }) : goToPartActive(0)}
          className="flex items-center gap-2 px-8 py-3 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-lg shadow-rose-200"
          data-testid="button-speaking-start"
        >
          <Mic className="w-4 h-4" /> Start Speaking Exam
        </button>
      </div>
    );
  }

  if (phase.type === "warmup") {
    const pt0 = parts[0];
    const pt0Images = pt0.questionImages || [];
    return (
      <div className="p-6 space-y-5">
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          {/* Timer */}
          <div className="w-full sm:w-56 shrink-0 bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3">
            <h3 className="text-center font-bold text-amber-800 text-sm">Warm-Up Time</h3>
            <p className="text-center text-xs text-amber-600">Read the questions. Part 1 starts automatically.</p>
            <SpeakingCountdown
              seconds={warmupSec}
              label="Warm-Up"
              color="amber"
              onDone={() => goToPartActive(0)}
            />
            <button
              onClick={() => goToPartActive(0)}
              className="w-full text-xs px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors"
            >
              Skip →
            </button>
          </div>
          {/* Questions */}
          <div className="flex-1 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-7 h-7 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs font-bold">{pt0.part}</div>
              <div>
                <p className="font-bold text-gray-900 text-sm">Part {pt0.part}</p>
                <p className="text-xs text-gray-500">{pt0.topic}</p>
              </div>
            </div>
            {(pt0 as any).imageUrl && (
              <div className="rounded-xl border-2 border-rose-100 bg-white overflow-hidden">
                <div className="px-4 py-2 bg-rose-50 border-b border-rose-100">
                  <span className="text-xs font-semibold text-rose-700 uppercase tracking-wide">Cue Card / Image</span>
                </div>
                <div className="p-4">
                  <img src={(pt0 as any).imageUrl} alt="Test card" className="rounded-lg border max-h-72 object-contain w-full bg-gray-50" />
                </div>
              </div>
            )}
            {pt0.questions.map((q, qi) => {
              const img = pt0Images[qi];
              return (
                <div key={qi} className="rounded-xl border-2 border-rose-100 bg-white overflow-hidden">
                  <div className="flex items-start gap-3 px-4 pt-4 pb-3">
                    <span className="shrink-0 w-7 h-7 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">{qi + 1}</span>
                    <p className="text-sm font-medium leading-relaxed pt-0.5">{q}</p>
                  </div>
                  {img?.url && (
                    <div className="px-4 pb-4">
                      <img src={img.url} alt={img.caption || `Q${qi + 1}`} className="rounded-lg border max-h-56 object-contain w-full bg-gray-50" />
                      {img.caption && <p className="text-xs text-gray-500 mt-1 text-center italic">{img.caption}</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  if (phase.type === "part_prep") {
    const prepSec = (parts[phase.partIdx + 1]?.prepDuration ?? 60);
    const nextPart = parts[phase.partIdx + 1];
    const npImages = nextPart?.questionImages || [];
    return (
      <div className="p-6 space-y-5">
        <div className="flex flex-col sm:flex-row gap-4 items-start">
          {/* Timer */}
          <div className="w-full sm:w-56 shrink-0 bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
            <h3 className="text-center font-bold text-blue-800 text-sm">Preparation Time</h3>
            <p className="text-center text-xs text-blue-600">Read Part {nextPart?.part || phase.partIdx + 2} questions. Recording starts automatically.</p>
            <SpeakingCountdown
              seconds={prepSec}
              label={`Part ${nextPart?.part || phase.partIdx + 2}`}
              color="blue"
              onDone={() => goToPartActive(phase.partIdx + 1)}
            />
            <button
              onClick={() => goToPartActive(phase.partIdx + 1)}
              className="w-full text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
            >
              Skip →
            </button>
          </div>
          {/* Questions */}
          {nextPart && (
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs font-bold">{nextPart.part}</div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">Part {nextPart.part}</p>
                  <p className="text-xs text-gray-500">{nextPart.topic}</p>
                </div>
              </div>
              {(nextPart as any).imageUrl && (
                <div className="rounded-xl border-2 border-rose-100 bg-white overflow-hidden">
                  <div className="px-4 py-2 bg-rose-50 border-b border-rose-100">
                    <span className="text-xs font-semibold text-rose-700 uppercase tracking-wide">Cue Card / Image</span>
                  </div>
                  <div className="p-4">
                    <img src={(nextPart as any).imageUrl} alt="Test card" className="rounded-lg border max-h-72 object-contain w-full bg-gray-50" />
                  </div>
                </div>
              )}
              {nextPart.questions.map((q, qi) => {
                const img = npImages[qi];
                return (
                  <div key={qi} className="rounded-xl border-2 border-rose-100 bg-white overflow-hidden">
                    <div className="flex items-start gap-3 px-4 pt-4 pb-3">
                      <span className="shrink-0 w-7 h-7 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">{qi + 1}</span>
                      <p className="text-sm font-medium leading-relaxed pt-0.5">{q}</p>
                    </div>
                    {img?.url && (
                      <div className="px-4 pb-4">
                        <img src={img.url} alt={img.caption || `Q${qi + 1}`} className="rounded-lg border max-h-56 object-contain w-full bg-gray-50" />
                        {img.caption && <p className="text-xs text-gray-500 mt-1 text-center italic">{img.caption}</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (phase.type === "done") {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-6 space-y-4">
        <div className="w-16 h-16 rounded-full bg-green-100 border-4 border-green-300 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">Speaking Complete</h3>
        <p className="text-sm text-gray-500">All {parts.length} part{parts.length !== 1 ? "s" : ""} finished.</p>
        <div className="space-y-2 w-full max-w-sm">
          {Object.entries(recordings).map(([idx, url]) => url && (
            <div key={idx} className="rounded-lg border p-3 bg-rose-50">
              <p className="text-xs font-semibold text-gray-600 mb-1">Part {parts[parseInt(idx)]?.part} Recording</p>
              <audio controls src={url} className="w-full h-8 rounded" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // part_active
  if (phase.type === "part_active") {
    const pt = parts[phase.partIdx];
    const ptImages = pt.questionImages || [];
    return (
      <div className="p-6 space-y-5">
        {/* Part header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-rose-600 text-white flex items-center justify-center text-sm font-bold">{pt.part}</div>
            <div>
              <p className="font-bold text-gray-900 text-sm">Part {pt.part}</p>
              <p className="text-xs text-gray-500">{pt.topic}</p>
            </div>
          </div>
          <div className="text-xs text-gray-400">{phase.partIdx + 1}/{parts.length}</div>
        </div>

        {/* Test-level image (cue card) */}
        {(pt as any).imageUrl && (
          <div className="rounded-xl border-2 border-rose-100 bg-white overflow-hidden">
            <div className="px-4 py-2 bg-rose-50 border-b border-rose-100 flex items-center gap-2">
              <span className="text-xs font-semibold text-rose-700 uppercase tracking-wide">Cue Card / Image</span>
            </div>
            <div className="p-4">
              <img
                src={(pt as any).imageUrl}
                alt="Test card"
                className="rounded-lg border max-h-72 object-contain w-full bg-gray-50"
              />
            </div>
          </div>
        )}

        {/* Test-level PDF */}
        {(pt as any).pdfUrl && (
          <div className="rounded-xl border-2 border-amber-100 bg-amber-50/40 p-3 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700 text-lg shrink-0">📄</div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-amber-800">Task Sheet / PDF</p>
              <p className="text-[11px] text-amber-600 truncate">{(pt as any).pdfUrl}</p>
            </div>
            <a
              href={(pt as any).pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              Open PDF
            </a>
          </div>
        )}

        {/* Questions */}
        <div className="space-y-3">
          {pt.questions.map((q, qi) => {
            const img = ptImages[qi];
            return (
              <div key={qi} className="rounded-xl border-2 border-rose-100 bg-white overflow-hidden">
                <div className="flex items-start gap-3 px-4 pt-4 pb-3">
                  <span className="shrink-0 w-7 h-7 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs font-bold shadow-sm">{qi + 1}</span>
                  <p className="text-sm font-medium leading-relaxed pt-0.5">{q}</p>
                </div>
                {img?.url && (
                  <div className="px-4 pb-4">
                    <img src={img.url} alt={img.caption || `Question ${qi + 1} image`} className="rounded-lg border max-h-56 object-contain w-full bg-gray-50" />
                    {img.caption && <p className="text-xs text-gray-500 mt-1 text-center italic">{img.caption}</p>}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Recording panel */}
        <div className="rounded-xl border-2 border-rose-200 bg-rose-50/40 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mic className="w-4 h-4 text-rose-600" />
              <span className="text-sm font-semibold text-rose-700">Record Your Answer</span>
            </div>
            {(pt.duration ?? 0) > 0 && (
              <PartTimer
                key={`pt-timer-${phase.partIdx}`}
                seconds={(pt.duration ?? 5) * 60}
                onWarning={playWarningBeeps}
                onDone={() => { if (isRecording) stopRecording(); setTimeout(goNext, 600); }}
              />
            )}
          </div>
          {recError && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{recError}</div>}
          {uploadError && <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">⚠ {uploadError}</div>}
          {!audioUrl ? (
            <div className="flex items-center gap-3 flex-wrap">
              {!isRecording ? (
                <div className="flex items-center gap-2 text-sm text-rose-500 italic">
                  <Loader2 className="w-4 h-4 animate-spin" /> Запуск микрофона...
                </div>
              ) : (
                <>
                  <motion.div className="w-3 h-3 rounded-full bg-red-500" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1, repeat: Infinity }} />
                  <span className="text-sm font-mono text-red-600 font-bold">{formatDur(recDuration)}</span>
                  <button onClick={stopRecording} className="flex items-center gap-2 px-4 py-2 border-2 border-red-300 text-red-600 hover:bg-red-50 rounded-lg text-sm font-semibold transition-colors" data-testid="aio-speaking-stop-rec">
                    <Square className="w-3 h-3 fill-current" /> Stop
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <audio controls src={audioUrl} className="w-full h-10 rounded-lg" />
              {uploading && (
                <div className="flex items-center gap-2 text-xs text-rose-600">
                  <Loader2 className="w-3 h-3 animate-spin" /> Сохранение записи...
                </div>
              )}
              {phase.type === "part_active" && recordings[phase.partIdx] && !uploading && (
                <div className="flex items-center gap-1.5 text-xs text-green-600">
                  <CheckCircle className="w-3 h-3" /> Запись сохранена
                </div>
              )}
              <button onClick={() => { resetRec(); setUploadError(null); }} className="text-xs text-gray-500 hover:text-gray-700 underline" data-testid="aio-speaking-re-record">Перезаписать</button>
            </div>
          )}
        </div>

        {/* Next / Done button */}
        <div className="flex justify-end">
          <button
            onClick={goNext}
            className="flex items-center gap-2 px-6 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-sm font-semibold transition-colors"
            data-testid="aio-speaking-next-part"
          >
            {isLastPart ? "Finish Speaking" : `Next: Part ${parts[phase.partIdx + 1]?.part}`}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// All-in-One Exam — /fullmock/:id/exam
// All sections (Listening, Reading, Writing, Speaking) on one scrollable page
// with a single global timer and a single Submit All button.
// ─────────────────────────────────────────────────────────────────────────────

export function FullMockAllInOneExam() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

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

  // Per-section answers keyed by section idx
  const [sectionAnswers, setSectionAnswers] = useState<Record<number, Record<number, number | string>>>({});
  // Writing responses keyed by section idx
  const [writingResponses, setWritingResponses] = useState<Record<number, string>>({});
  // Speaking recordings: partIdx → server URL
  const [speakingRecordings, setSpeakingRecordings] = useState<Record<number, string>>({});
  const handleSpeakingPartRecorded = (partIdx: number, serverUrl: string) => {
    setSpeakingRecordings(prev => ({ ...prev, [partIdx]: serverUrl }));
  };
  const [submitted, setSubmitted] = useState(false);
  const [zoom, setZoom] = useState(1.0);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  const totalDuration = activeSections.reduce((sum, s) => sum + ((s.testData as any)?.duration || 0), 0);

  // Collect all speaking parts in order for SpeakingAIOSection
  const allSpeakingParts = useMemo(() =>
    activeSections.filter(s => s.type === "speaking" && s.testData).map(s => s.testData as SpeakingTest),
    [activeSections]
  );
  const firstSpeakingIdx = useMemo(() =>
    activeSections.findIndex(s => s.type === "speaking"),
    [activeSections]
  );

  const submittedRef = useRef(false);

  const handleAutoSubmit = () => {
    if (!submittedRef.current) {
      submittedRef.current = true;
      setSubmitted(true);
      submitMutation.mutate();
    }
  };

  const timer = useCountdownTimer(totalDuration, handleAutoSubmit, !submitted);
  const isTimerCritical = timer.secondsLeft < 120;
  const isTimerWarning = timer.secondsLeft < 300 && !isTimerCritical;

  // Build all answerable questions across all sections for the bottom nav
  const allNavQs = useMemo(() => {
    const result: Array<{ id: number; secIdx: number; isText: boolean; elemId: string }> = [];
    activeSections.forEach((sec, secIdx) => {
      if (sec.type === "speaking" || sec.type === "writing") return;
      const td = sec.testData as any;
      if (!td) return;
      const secs = td.testSections?.length > 0 ? td.testSections : [{ questions: td.questions || [] }];
      secs.forEach((s: any, sIdx: number) => {
        const qs = ((s.questions as any[]) || []).flatMap((q: any) => Array.isArray(q) ? q : [q]);
        const prefix = sec.type === "listening"
          ? `mq-aio-${sec.testId}-${sIdx}`
          : `mrq-aio-r-${secIdx}-${sIdx}`;
        qs.filter((q: any) => q.type !== "text").forEach((q: any) => {
          result.push({
            id: q.id,
            secIdx,
            isText: q.type === "completion" || q.type === "short-answer",
            elemId: `${prefix}-${q.id}`,
          });
        });
      });
    });
    return result;
  }, [activeSections]);

  const isQAnswered = (q: { id: number; secIdx: number; isText: boolean }) => {
    const ans = sectionAnswers[q.secIdx]?.[q.id];
    if (q.isText) return typeof ans === "string" && ans.trim().length > 0;
    return ans !== undefined;
  };
  const answeredCount = allNavQs.filter(isQAnswered).length;

  const submitAll = async () => {
    setSubmitted(true);
    let anyError = false;
    for (let i = 0; i < activeSections.length; i++) {
      const sec = activeSections[i];
      if (!sec.testData) continue;
      try {
        if (sec.type === "listening" || sec.type === "reading") {
          const td = sec.testData as any;
          const qs = (td.testSections?.length > 0 ? td.testSections : [{ questions: td.questions || [] }])
            .flatMap((s: any) => ((s.questions as any[]) || []).flatMap((q: any) => Array.isArray(q) ? q : [q]))
            .filter((q: any) => q.type !== "text");
          const correct = qs.filter((q: any) => {
            const ans = sectionAnswers[i]?.[q.id];
            if (q.correctAnswer !== undefined) return parseInt(ans as string) === q.correctAnswer;
            if (q.correctText) return (ans as string)?.trim().toLowerCase() === q.correctText.toLowerCase();
            return false;
          }).length;
          await apiRequest("POST", "/api/test-results", {
            testType: sec.type,
            testId: sec.testId,
            fullmockId: id,
            score: correct,
            totalQuestions: qs.length,
            answers: Object.fromEntries(Object.entries(sectionAnswers[i] || {}).map(([k, v]) => [k, v])),
          });
        } else if (sec.type === "writing") {
          await apiRequest("POST", "/api/test-results", {
            testType: "writing",
            testId: sec.testId,
            fullmockId: id,
            answers: { response: writingResponses[i] || "" },
          });
        } else if (sec.type === "speaking") {
          // Find which speaking part index this section corresponds to
          const speakingSecIdx = activeSections.filter(s => s.type === "speaking").indexOf(sec);
          const recordingUrl = speakingRecordings[speakingSecIdx] ?? null;
          await apiRequest("POST", "/api/test-results", {
            testType: "speaking",
            testId: sec.testId,
            fullmockId: id,
            answers: recordingUrl ? { recordingUrl } : {},
          });
        }
      } catch {
        anyError = true;
      }
    }
    if (anyError) {
      toast({ title: "Some sections couldn't be saved", variant: "destructive" });
    } else {
      toast({ title: "Exam submitted!", description: `${answeredCount}/${allNavQs.length} questions answered` });
    }
  };

  const submitMutation = useMutation({
    mutationFn: submitAll,
    onSuccess: () => {
      setTimeout(() => setLocation(`/fullmock/${id}/results`), 1500);
    },
  });

  const scrollToSection = (secIdx: number) => {
    document.getElementById(`aio-sec-${secIdx}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const scrollToQ = (q: { id: number; elemId: string; secIdx: number }) => {
    const el = document.getElementById(q.elemId);
    if (el) { el.scrollIntoView({ behavior: "smooth", block: "center" }); }
    else { document.getElementById(`aio-sec-${q.secIdx}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); }
  };

  if (loadingMock || !fullMock) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (submitted && !submitMutation.isPending) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white">
        <div className="text-center space-y-4 p-8">
          <div className="w-20 h-20 rounded-full bg-green-100 border-4 border-green-400 flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Exam Submitted!</h2>
          <p className="text-gray-500">{answeredCount}/{allNavQs.length} questions answered</p>
          <p className="text-sm text-gray-400">Returning to mock exams...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col overflow-hidden" data-testid="aio-exam-container">

      {/* ── Top Bar ── */}
      <div className="shrink-0 flex items-center px-4 py-2 border-b bg-white gap-2 shadow-sm">
        {/* Brand */}
        <div className="shrink-0 flex flex-col min-w-0 leading-tight mr-1">
          <span className="font-bold text-sm text-gray-900 tracking-tight">SMART TIME</span>
          <span className="text-[9px] text-gray-400 uppercase tracking-widest">Education</span>
        </div>

        {/* Section anchor tabs */}
        <div className="flex-1 flex items-center gap-0.5 overflow-x-auto justify-center">
          {activeSections.map((sec, idx) => {
            const colors: Record<string, string> = { listening: "text-blue-600", reading: "text-green-600", writing: "text-purple-600", speaking: "text-rose-600" };
            const icons: Record<string, JSX.Element> = {
              listening: <Headphones className="w-3 h-3" />,
              reading: <BookOpen className="w-3 h-3" />,
              writing: <PenTool className="w-3 h-3" />,
              speaking: <Mic className="w-3 h-3" />,
            };
            return (
              <button
                key={idx}
                onClick={() => scrollToSection(idx)}
                className={`flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded hover:bg-gray-100 transition-colors whitespace-nowrap ${colors[sec.type] ?? "text-gray-600"}`}
                data-testid={`aio-tab-${sec.type}-${idx}`}
              >
                {icons[sec.type]}
                <span className="capitalize hidden sm:block">{sec.type}</span>
              </button>
            );
          })}
        </div>

        {/* Timer + A- A+ + Submit + Exit */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className={`font-mono text-sm font-bold px-2 py-1 rounded ${isTimerCritical ? "text-red-600 bg-red-50" : isTimerWarning ? "text-amber-600 bg-amber-50" : "text-gray-800 bg-gray-100"}`} data-testid="aio-timer">
            {timer.display}
          </div>
          <button
            onClick={() => setZoom(z => Math.max(0.7, parseFloat((z - 0.1).toFixed(1))))}
            className="w-8 h-7 flex items-center justify-center text-sm border border-gray-300 rounded hover:bg-gray-100 text-gray-700 font-bold transition-colors"
            data-testid="button-aio-font-dec"
          >A-</button>
          <span className="text-[10px] font-mono text-gray-400 select-none">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(z => Math.min(1.5, parseFloat((z + 0.1).toFixed(1))))}
            className="w-8 h-7 flex items-center justify-center text-sm border border-gray-300 rounded hover:bg-gray-100 text-gray-700 font-bold transition-colors"
            data-testid="button-aio-font-inc"
          >A+</button>
          {!submitted && (
            <button
              onClick={() => setShowSubmitConfirm(true)}
              disabled={submitMutation.isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-white text-xs font-semibold rounded transition-colors disabled:opacity-60"
              data-testid="button-aio-submit"
            >
              {submitMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
              <span className="hidden sm:block">Submit All</span>
            </button>
          )}
          <button
            onClick={() => setShowExitConfirm(true)}
            className="p-1.5 hover:bg-gray-100 rounded text-gray-500"
            data-testid="button-aio-exit"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto bg-gray-50" style={{ zoom }}>
        <div className="max-w-5xl mx-auto pb-4">
          {activeSections.map((sec, secIdx) => {
            const td = sec.testData as any;
            const secColors: Record<string, { bg: string; border: string; text: string }> = {
              listening: { bg: "bg-blue-600", border: "border-blue-200", text: "text-blue-700" },
              reading:   { bg: "bg-emerald-600", border: "border-emerald-200", text: "text-emerald-700" },
              writing:   { bg: "bg-violet-600", border: "border-violet-200", text: "text-violet-700" },
              speaking:  { bg: "bg-rose-600", border: "border-rose-200", text: "text-rose-700" },
            };
            const colors = secColors[sec.type] ?? { bg: "bg-gray-600", border: "border-gray-200", text: "text-gray-700" };
            const secIcons: Record<string, JSX.Element> = {
              listening: <Headphones className="w-4 h-4 text-white" />,
              reading: <BookOpen className="w-4 h-4 text-white" />,
              writing: <PenTool className="w-4 h-4 text-white" />,
              speaking: <Mic className="w-4 h-4 text-white" />,
            };

            return (
              <div key={secIdx} id={`aio-sec-${secIdx}`} className="scroll-mt-14">
                {/* Section divider header */}
                <div className={`flex items-center gap-3 px-6 py-3 ${colors.bg}`}>
                  {secIcons[sec.type]}
                  <span className="text-white font-bold text-sm uppercase tracking-widest">{sec.type}</span>
                  {td?.title && <span className="text-white/70 text-xs ml-1 truncate">{td.title}</span>}
                  {td?.duration && <span className="ml-auto text-white/60 text-xs">{td.duration} min</span>}
                </div>

                {/* Section content */}
                <div className="bg-white border-b">
                  {!td ? (
                    <div className="p-8 text-center text-gray-400">
                      <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-400" />
                      <p className="text-sm">No test data found for this section.</p>
                    </div>
                  ) : sec.type === "listening" ? (
                    /* ── LISTENING ── */
                    <div className="p-6 space-y-8">
                      {(td.testSections?.length > 0 ? td.testSections : [{ questions: td.questions || [], audioUrl: td.audioUrl }]).map((lSec: any, lIdx: number) => {
                        const lQs: ListeningQuestion[] = ((lSec.questions as any[]) || []).flatMap((q: any) => Array.isArray(q) ? q : [q]);
                        return (
                          <div key={lIdx} className="space-y-4">
                            <h3 className="text-base font-bold text-gray-900">Part {lIdx + 1}</h3>
                            {lSec.audioUrl && (
                              <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3">
                                <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Audio</p>
                                <audio controls className="w-full h-9 rounded" src={lSec.audioUrl} />
                              </div>
                            )}
                            {lSec.mapUrl ? (
                              <div className="flex gap-5 items-start">
                                <div className="w-64 shrink-0 sticky top-14 self-start rounded-lg border-2 border-blue-300 overflow-hidden">
                                  <div className="bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-800 border-b border-blue-200">Map</div>
                                  <img src={lSec.mapUrl} alt="Map" className="w-full object-contain bg-white" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <MockListeningQuiz
                                    questions={lQs}
                                    testId={`aio-${sec.testId}-${lIdx}`}
                                    hideNav={true}
                                    onAnswersChange={ans => setSectionAnswers(prev => ({ ...prev, [secIdx]: { ...(prev[secIdx] || {}), ...ans } }))}
                                  />
                                </div>
                              </div>
                            ) : (
                              <MockListeningQuiz
                                questions={lQs}
                                testId={`aio-${sec.testId}-${lIdx}`}
                                hideNav={true}
                                onAnswersChange={ans => setSectionAnswers(prev => ({ ...prev, [secIdx]: { ...(prev[secIdx] || {}), ...ans } }))}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : sec.type === "reading" ? (
                    /* ── READING ── */
                    <div>
                      {(td.testSections?.length > 0 ? td.testSections : [{ passage: td.passage, questions: td.questions || [] }]).map((rSec: any, rIdx: number) => {
                        const rQs: ReadingQuestion[] = ((rSec.questions as any[]) || []).flatMap((q: any) => Array.isArray(q) ? q : [q]);
                        return (
                          <div key={rIdx} className={rIdx > 0 ? "border-t" : ""}>
                            {td.testSections?.length > 1 && (
                              <div className="px-6 py-3 bg-emerald-50 border-b border-emerald-100">
                                <h3 className="text-sm font-bold text-emerald-800">Passage {rIdx + 1}</h3>
                              </div>
                            )}
                            <div className="flex min-h-[400px]">
                              <div className="w-1/2 border-r p-4 md:p-6 overflow-auto max-h-[70vh]">
                                <HighlightablePassage passage={rSec.passage || ""} testId={`aio-r-${secIdx}-${rIdx}`} />
                              </div>
                              <div className="w-1/2 overflow-auto max-h-[70vh]">
                                <MockReadingQuiz
                                  questions={rQs}
                                  testId={`aio-r-${secIdx}-${rIdx}`}
                                  onAnswersChange={ans => setSectionAnswers(prev => ({ ...prev, [secIdx]: { ...(prev[secIdx] || {}), ...ans } }))}
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : sec.type === "writing" ? (
                    /* ── WRITING ── */
                    <div className="flex min-h-[400px]">
                      <div className="w-2/5 border-r flex flex-col">
                        <div className="px-4 py-2.5 border-b bg-violet-600">
                          <p className="text-xs font-semibold text-white uppercase tracking-wide">Writing Task {td.task}</p>
                        </div>
                        <div className="flex-1 overflow-auto p-4 space-y-4">
                          <p className="text-sm leading-relaxed whitespace-pre-line text-gray-800">{td.prompt}</p>
                          {td.tips?.length > 0 && (
                            <div className="border-t pt-3 space-y-1">
                              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Guidance</p>
                              {td.tips.map((tip: string, ti: number) => (
                                <p key={ti} className="text-xs text-gray-500 leading-relaxed">• {tip}</p>
                              ))}
                            </div>
                          )}
                          <p className="text-xs text-gray-400 border-t pt-3">Write at least <span className="font-semibold text-gray-600">{td.task === 1 ? 150 : 250} words</span>.</p>
                        </div>
                      </div>
                      <div className="w-3/5 flex flex-col">
                        <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b bg-gray-50 text-xs text-gray-500">
                          <span className="font-semibold text-gray-700">
                            {(writingResponses[secIdx] || "").trim() ? (writingResponses[secIdx] || "").trim().split(/\s+/).length : 0} words
                          </span>
                          <span className="ml-auto">Target: {td.task === 1 ? 150 : 250}+</span>
                        </div>
                        <textarea
                          className="flex-1 resize-none p-4 text-sm text-gray-800 outline-none border-0 focus:ring-0 bg-white"
                          placeholder="Write your essay here..."
                          value={writingResponses[secIdx] || ""}
                          onChange={e => setWritingResponses(prev => ({ ...prev, [secIdx]: e.target.value }))}
                          data-testid={`aio-writing-${secIdx}`}
                        />
                      </div>
                    </div>
                  ) : sec.type === "speaking" ? (
                    /* ── SPEAKING ── rendered only for the first speaking section (all parts together) */
                    secIdx === firstSpeakingIdx ? (
                      <SpeakingAIOSection parts={allSpeakingParts} onPartRecorded={handleSpeakingPartRecorded} />
                    ) : null
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Bottom combined Q navigator ── */}
      {allNavQs.length > 0 && (
        <div className="shrink-0 border-t bg-white shadow-lg" data-testid="aio-bottom-nav">
          <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-100">
            <span className="text-xs font-semibold text-gray-600">All Questions Q1–{allNavQs.length}</span>
            <div className="flex items-center gap-4">
              <span className="text-xs text-gray-500">
                Answered: <span className="font-bold text-blue-600">{answeredCount}</span>
                <span className="text-gray-300 mx-1">·</span>
                Unanswered: <span className="font-bold text-rose-500">{allNavQs.length - answeredCount}</span>
              </span>
              {!submitted && (
                <button
                  onClick={() => setShowSubmitConfirm(true)}
                  disabled={submitMutation.isPending}
                  className="flex items-center gap-1.5 px-4 py-1.5 bg-gray-800 hover:bg-gray-700 text-white text-xs font-bold rounded transition-colors"
                  data-testid="button-aio-submit-bottom"
                >
                  {submitMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                  Submit All
                </button>
              )}
            </div>
          </div>
          <div className="px-3 py-2 flex flex-wrap gap-1 max-h-24 overflow-y-auto">
            {allNavQs.map((q, idx) => {
              const answered = isQAnswered(q);
              return (
                <button
                  key={`nav-${q.secIdx}-${q.id}-${idx}`}
                  type="button"
                  onClick={() => scrollToQ(q)}
                  data-testid={`aio-nav-q-${idx + 1}`}
                  className={`w-7 h-7 rounded-full text-[11px] font-bold transition-all border-2 cursor-pointer shrink-0 ${
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

      {/* ── Submit Confirm Modal ── */}
      {showSubmitConfirm && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowSubmitConfirm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 mx-4 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center shrink-0">
                <Send className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Submit All Sections?</h3>
                <p className="text-sm text-gray-500">This action cannot be undone.</p>
              </div>
            </div>
            <div className="rounded-xl bg-gray-50 border border-gray-200 px-4 py-3 mb-4 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Answered</span>
                <span className="font-bold text-blue-600">{answeredCount} / {allNavQs.length}</span>
              </div>
              {allNavQs.length - answeredCount > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Unanswered</span>
                  <span className="font-bold text-rose-500">{allNavQs.length - answeredCount}</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-1 px-4 py-2.5 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl text-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { setShowSubmitConfirm(false); submitMutation.mutate(); }}
                disabled={submitMutation.isPending}
                className="flex-1 px-4 py-2.5 bg-gray-900 hover:bg-gray-700 text-white font-semibold rounded-xl text-sm transition-colors disabled:opacity-60"
                data-testid="button-aio-submit-confirm"
              >
                {submitMutation.isPending ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Exit Confirm Modal ── */}
      {showExitConfirm && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowExitConfirm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 mx-4 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <X className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Exit Exam?</h3>
                <p className="text-sm text-gray-500">Your progress won't be saved.</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="flex-1 px-4 py-2.5 border-2 border-gray-200 text-gray-700 font-semibold rounded-xl text-sm hover:bg-gray-50 transition-colors"
              >
                Stay
              </button>
              <button
                onClick={() => { setShowExitConfirm(false); setLocation("/fullmock"); }}
                className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl text-sm transition-colors"
                data-testid="button-aio-exit-confirm"
              >
                Exit
              </button>
            </div>
          </div>
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
              <li className="flex items-start gap-2"><Layers className="w-4 h-4 mt-0.5 shrink-0" /> Each section (Listening, Reading, Writing, Speaking) is on its <strong>own page</strong> — complete one, then move to the next.</li>
              <li className="flex items-start gap-2"><Clock className="w-4 h-4 mt-0.5 shrink-0" /> Each section has its <strong>own countdown timer</strong> — submit before time runs out.</li>
              <li className="flex items-start gap-2"><X className="w-4 h-4 mt-0.5 shrink-0" /> Correct answers are <strong>not shown</strong> during the exam.</li>
              <li className="flex items-start gap-2"><Send className="w-4 h-4 mt-0.5 shrink-0" /> Click <strong>Submit</strong> at the end of each section to save your answers.</li>
              <li className="flex items-start gap-2"><CheckCircle className="w-4 h-4 mt-0.5 shrink-0" /> You can <strong>pause and resume</strong> the exam — your progress is saved between sections.</li>
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

          {/* Action button */}
          <div className="flex flex-col sm:flex-row gap-3">
            {isResumable ? (
              <>
                <Button onClick={handleResume} size="lg" className="gap-2 flex-1" data-testid="button-resume-exam">
                  <ChevronRight className="w-5 h-5" /> Resume Exam
                </Button>
                <Button onClick={handleStart} size="lg" variant="outline" className="gap-2" data-testid="button-start-exam">
                  <Trophy className="w-5 h-5" /> Start Over
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
