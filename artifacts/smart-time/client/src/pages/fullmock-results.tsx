import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Loader2, CheckCircle2, XCircle, Headphones, BookOpen, PenTool, Mic, Home, ChevronLeft, Trophy, AlertCircle } from "lucide-react";
import type { TestResult } from "@shared/schema";
import { bandToCEFR, CEFR_COLORS, CEFR_DESCRIPTORS } from "@/lib/testModeConfig";
import { useModeStore } from "@/lib/useModeStore";
import { rawToIELTSBand, ieltsToCEFR, calculateOverallBand } from "@/lib/scoring";

interface Question {
  id: number;
  question: string;
  type?: string;
  options?: string[];
  correctAnswer?: number;
  correctText?: string;
  imageUrl?: string;
}

interface TestSection {
  sectionNumber?: number;
  questions: Question[];
  mapUrl?: string;
}

interface TestData {
  id: string;
  title: string;
  questions?: Question[];
  testSections?: TestSection[];
  tasks?: { title: string; description: string; task: string }[];
  questions1?: Question[];
  questions2?: Question[];
}

interface FullMockSection {
  type: "listening" | "reading" | "writing" | "speaking";
  testId: string;
}

interface FullMockTest {
  id: string;
  title: string;
  sections: FullMockSection[];
}

const SECTION_CONFIG = {
  listening: { label: "Listening", icon: Headphones, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200", badge: "bg-blue-100 text-blue-700" },
  reading:   { label: "Reading",   icon: BookOpen,   color: "text-green-600", bg: "bg-green-50", border: "border-green-200", badge: "bg-green-100 text-green-700" },
  writing:   { label: "Writing",   icon: PenTool,    color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200", badge: "bg-purple-100 text-purple-700" },
  speaking:  { label: "Speaking",  icon: Mic,        color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-200", badge: "bg-rose-100 text-rose-700" },
};

function ScoreRing({ score, total }: { score: number; total: number }) {
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const band = total > 0 ? ((score / total) * 9).toFixed(1) : "—";
  const r = 38;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = pct >= 70 ? "#16a34a" : pct >= 50 ? "#d97706" : "#dc2626";
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="96" height="96" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle
          cx="48" cy="48" r={r} fill="none"
          stroke={color} strokeWidth="8"
          strokeDasharray={`${dash} ${circ - dash}`}
          strokeLinecap="round"
          transform="rotate(-90 48 48)"
          style={{ transition: "stroke-dasharray 0.6s ease" }}
        />
        <text x="48" y="44" textAnchor="middle" dominantBaseline="middle" fontSize="14" fontWeight="700" fill="#111827">{score}/{total}</text>
        <text x="48" y="58" textAnchor="middle" dominantBaseline="middle" fontSize="10" fill="#6b7280">Band {band}</text>
      </svg>
      <span className="text-xs font-medium text-gray-500">{pct}% correct</span>
    </div>
  );
}

function QuestionRow({ q, idx, userAnswer, flatOffset }: { q: Question; idx: number; userAnswer: string | number | undefined; flatOffset: number }) {
  if (q.type === "text") return null;

  const globalIdx = flatOffset + idx + 1;
  let isCorrect = false;
  let correctLabel = "";
  let userLabel = "";

  if (q.correctAnswer !== undefined && q.options) {
    const ua = parseInt(String(userAnswer));
    isCorrect = ua === q.correctAnswer;
    correctLabel = q.options[q.correctAnswer] ?? `Option ${q.correctAnswer + 1}`;
    userLabel = !isNaN(ua) && q.options[ua] ? q.options[ua] : (userAnswer !== undefined ? "?" : "—");
  } else if (q.correctText) {
    isCorrect = String(userAnswer ?? "").trim().toLowerCase() === q.correctText.toLowerCase();
    correctLabel = q.correctText;
    userLabel = String(userAnswer ?? "—");
  }

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${isCorrect ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
      <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold ${isCorrect ? "bg-green-500" : "bg-red-500"}`}>
        {isCorrect ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-gray-500 mb-0.5">Q{globalIdx}</p>
        <p className="text-sm text-gray-800 mb-1.5">{q.question || `Question ${globalIdx}`}</p>
        {q.imageUrl && <img src={q.imageUrl} alt="question" className="max-h-28 rounded mb-1.5 border" />}
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
          <span className={`font-medium ${isCorrect ? "text-green-700" : "text-red-600"}`}>
            Your answer: {userLabel}
          </span>
          {!isCorrect && (
            <span className="font-medium text-green-700">
              Correct: {correctLabel}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function ListeningReadingPanel({ result, testData }: { result: TestResult; testData: TestData | undefined }) {
  if (!testData) return <div className="text-sm text-gray-400 py-6 text-center">Test data not available</div>;

  const answers = result.answers as Record<string, any> ?? {};

  const allSections: TestSection[] = testData.testSections?.length
    ? testData.testSections
    : [{ questions: testData.questions ?? [] }];

  let globalOffset = 0;
  return (
    <div className="space-y-4">
      {allSections.map((sec, si) => {
        const qs = (sec.questions || []).flatMap((q: any) => Array.isArray(q) ? q : [q]);
        const panel = (
          <div key={si} className="space-y-2">
            {sec.mapUrl && <img src={sec.mapUrl} alt="map" className="w-full max-h-48 object-contain rounded-lg border mb-2" />}
            {qs.map((q, qi) => {
              const row = <QuestionRow key={q.id ?? qi} q={q} idx={qi} userAnswer={answers[q.id]} flatOffset={globalOffset} />;
              return row;
            })}
          </div>
        );
        globalOffset += qs.filter(q => q.type !== "text").length;
        return panel;
      })}
    </div>
  );
}

function WritingPanel({ result, testData }: { result: TestResult; testData: TestData | undefined }) {
  const response = (result.answers as any)?.response ?? "";
  const wordCount = response.trim() ? response.trim().split(/\s+/).length : 0;
  return (
    <div className="space-y-4">
      {testData && (
        <div className="bg-gray-50 rounded-lg border p-4 space-y-2">
          {(testData.tasks || []).map((task: any, i: number) => (
            <div key={i}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Task {i + 1}: {task.title}</p>
              <p className="text-sm text-gray-700 mt-1">{task.task || task.description}</p>
            </div>
          ))}
        </div>
      )}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-gray-700">Your Response</p>
          <span className="text-xs text-gray-400">{wordCount} words</span>
        </div>
        {response ? (
          <div className="bg-white border rounded-lg p-4 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed min-h-[120px]">
            {response}
          </div>
        ) : (
          <div className="bg-gray-50 border border-dashed rounded-lg p-6 text-center text-sm text-gray-400">
            No response submitted
          </div>
        )}
      </div>
    </div>
  );
}

function SpeakingPanel({ result }: { result: TestResult }) {
  const recordingUrl = (result.answers as any)?.recordingUrl as string | undefined;
  return (
    <div className="flex flex-col items-center justify-center py-8 gap-4 text-center">
      <div className="w-16 h-16 rounded-full bg-rose-100 flex items-center justify-center">
        <Mic className="w-8 h-8 text-rose-500" />
      </div>
      <p className="text-sm font-semibold text-gray-700">Speaking section completed</p>
      {recordingUrl ? (
        <div className="w-full max-w-sm space-y-2">
          <p className="text-xs text-gray-500">Your recorded response:</p>
          <audio controls src={recordingUrl} className="w-full rounded-lg" />
        </div>
      ) : (
        <p className="text-xs text-gray-400 max-w-xs">No recording saved. An instructor will review and provide feedback.</p>
      )}
    </div>
  );
}

export default function FullMockResults() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState(0);
  const { mode } = useModeStore();

  const { data: fullMock, isLoading: loadingMock } = useQuery<FullMockTest>({
    queryKey: ["/api/fullmock-tests"],
    select: (tests: any) => Array.isArray(tests) ? tests.find((t: any) => t.id === id) : undefined,
  });

  const { data: results, isLoading: loadingResults } = useQuery<TestResult[]>({
    queryKey: [`/api/fullmock-results/${id}`],
    enabled: !!id,
  });

  const { data: listeningTests } = useQuery<TestData[]>({ queryKey: ["/api/listening-tests"], enabled: !!fullMock });
  const { data: readingTests } = useQuery<TestData[]>({ queryKey: ["/api/reading-tests"], enabled: !!fullMock });
  const { data: writingTests } = useQuery<TestData[]>({ queryKey: ["/api/writing-tests"], enabled: !!fullMock });

  const isLoading = loadingMock || loadingResults;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!fullMock) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-gray-400 mx-auto" />
          <p className="text-gray-600">Exam not found</p>
          <button onClick={() => setLocation("/fullmock")} className="text-blue-600 text-sm underline">← Back</button>
        </div>
      </div>
    );
  }

  if (!results || results.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center space-y-4 max-w-sm mx-auto p-8">
          <AlertCircle className="w-12 h-12 text-amber-400 mx-auto" />
          <h2 className="text-xl font-bold text-gray-800">No results yet</h2>
          <p className="text-sm text-gray-500">Complete the exam first to see your results here.</p>
          <button
            onClick={() => setLocation(`/fullmock/${id}/section/0`)}
            className="px-5 py-2 bg-amber-500 text-white text-sm font-semibold rounded-lg hover:bg-amber-600 transition-colors"
          >
            Start Exam
          </button>
        </div>
      </div>
    );
  }

  const resultByType = results.reduce<Record<string, TestResult>>((acc, r) => {
    if (!acc[r.testType] || new Date(r.completedAt) > new Date(acc[r.testType].completedAt)) {
      acc[r.testType] = r;
    }
    return acc;
  }, {});

  const sectionOrder = fullMock.sections.map(s => s.type);
  const uniqueTypes = Array.from(new Set(sectionOrder));

  const scoredSections = ["listening", "reading"] as const;
  const totalScore = scoredSections.reduce((sum, t) => sum + (resultByType[t]?.score ?? 0), 0);
  const totalQs = scoredSections.reduce((sum, t) => sum + (resultByType[t]?.totalQuestions ?? 0), 0);

  const sectionsBands = uniqueTypes.map(type => {
    const res = resultByType[type];
    if (!res) return null;
    if (type === "writing" || type === "speaking") return res.bandScoreIELTS;
    return rawToIELTSBand(res.score ?? 0, res.totalQuestions || 40);
  });

  const overallBand = calculateOverallBand(sectionsBands);
  const overallCEFR = overallBand !== "0.0" && overallBand !== "0" ? ieltsToCEFR(overallBand) : null;
  const showCEFR = mode === "CEFR" || mode === "BOTH";
  const showBand = mode === "IELTS" || mode === "BOTH";

  const tabs = uniqueTypes.map(type => {
    const cfg = SECTION_CONFIG[type as keyof typeof SECTION_CONFIG] ?? SECTION_CONFIG.listening;
    const res = resultByType[type];
    return { type, cfg, res };
  });

  const activeTabData = tabs[activeTab];

  const getTestData = (type: string, testId: string): TestData | undefined => {
    if (type === "listening") return listeningTests?.find(t => t.id === testId);
    if (type === "reading") return readingTests?.find(t => t.id === testId);
    if (type === "writing") return writingTests?.find(t => t.id === testId);
    return undefined;
  };

  const activeTestId = fullMock.sections.find(s => s.type === activeTabData?.type)?.testId ?? "";
  const activeTestData = getTestData(activeTabData?.type ?? "", activeTestId);
  const activeResult = activeTabData?.res;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => setLocation("/fullmock")}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold">Full Mock Results</p>
            <h1 className="text-base font-bold text-gray-900 truncate">{fullMock.title}</h1>
          </div>
          <button
            onClick={() => setLocation("/dashboard")}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            Dashboard
          </button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Overall Score Card */}
        <div className="bg-white rounded-2xl border shadow-sm p-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="flex items-center justify-center w-20 h-20 rounded-full bg-amber-100 border-4 border-amber-400 shrink-0">
              <Trophy className="w-9 h-9 text-amber-600" />
            </div>
            <div className="text-center sm:text-left flex-1">
              <p className="text-sm text-gray-500 font-medium">Exam Completed</p>
              <div className="flex flex-wrap items-center gap-3 mt-0.5">
                {showBand && (
                  <h2 className="text-2xl font-bold text-gray-900">
                    Band: <span className="text-amber-600">{overallBand}</span>
                  </h2>
                )}
                {showCEFR && overallCEFR && (() => {
                  const col = CEFR_COLORS[overallCEFR];
                  return (
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold border ${col.bg} ${col.text} ${col.border}`}>
                      {overallCEFR}
                      <span className="text-xs font-normal opacity-75">CEFR</span>
                    </span>
                  );
                })()}
              </div>
              {showCEFR && overallCEFR && (
                <p className="text-xs text-gray-400 mt-1 max-w-xs">{CEFR_DESCRIPTORS[overallCEFR]}</p>
              )}
              <p className="text-sm text-gray-500 mt-1">
                Listening + Reading: {totalScore}/{totalQs} questions correct
              </p>
            </div>
            <div className="hidden sm:grid grid-cols-2 gap-3 shrink-0">
               {uniqueTypes.map(type => {
                 const res = resultByType[type];
                 if (!res) return null;
                 const cfg = SECTION_CONFIG[type as keyof typeof SECTION_CONFIG];
                 const band = (type === "writing" || type === "speaking")
                   ? res.bandScoreIELTS
                   : rawToIELTSBand(res.score ?? 0, res.totalQuestions || 40);

                 return (
                   <div key={type} className={`text-center px-4 py-2 rounded-xl border ${cfg.border} ${cfg.bg}`}>
                     <div className="flex items-center gap-2 mb-1 justify-center">
                        <cfg.icon className={`w-3 h-3 ${cfg.color}`} />
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">{cfg.label}</span>
                     </div>
                     <p className={`text-sm font-black ${cfg.color}`}>
                       {band ? `IELTS ${band}` : "Grading…"}
                     </p>
                   </div>
                 );
               })}
            </div>
          </div>
        </div>

        {/* Score rings row for L+R */}
        <div className="grid grid-cols-2 sm:hidden gap-3">
          {(["listening", "reading"] as const).map(type => {
            const res = resultByType[type];
            if (!res) return null;
            const cfg = SECTION_CONFIG[type];
            return (
              <div key={type} className={`bg-white border ${cfg.border} rounded-xl p-4 flex flex-col items-center gap-1`}>
                <cfg.icon className={`w-5 h-5 ${cfg.color}`} />
                <p className={`text-xl font-bold ${cfg.color}`}>{res.score ?? 0}/{res.totalQuestions ?? 0}</p>
                <p className="text-xs text-gray-500">{cfg.label}</p>
              </div>
            );
          })}
        </div>

        {/* Section Tabs */}
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="flex border-b overflow-x-auto">
            {tabs.map((tab, i) => {
              const Icon = tab.cfg.icon;
              const hasResult = !!tab.res;
              return (
                <button
                  key={tab.type}
                  onClick={() => setActiveTab(i)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === i
                      ? `${tab.cfg.color} border-current`
                      : "text-gray-500 border-transparent hover:text-gray-700"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.cfg.label}
                  {hasResult && tab.res && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${tab.cfg.badge}`}>
                      {tab.type === "writing" || tab.type === "speaking"
                        ? (tab.res.bandScoreIELTS ? `Band ${tab.res.bandScoreIELTS}` : "Reviewing")
                        : `Band ${rawToIELTSBand(tab.res.score ?? 0, tab.res.totalQuestions || 40)}`}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="p-5">
            {!activeResult ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
                No result saved for this section
              </div>
            ) : activeTabData.type === "speaking" ? (
              <SpeakingPanel result={activeResult} />
            ) : activeTabData.type === "writing" ? (
              <WritingPanel result={activeResult} testData={activeTestData} />
            ) : (
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-gray-700">{activeTabData.cfg.label} — Question Review</h3>
                  <span className={`text-sm font-bold ${activeTabData.cfg.color}`}>
                    {activeResult.score ?? 0} / {activeResult.totalQuestions ?? 0} correct
                  </span>
                </div>
                <ListeningReadingPanel result={activeResult} testData={activeTestData} />
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-center pb-6">
          <button
            onClick={() => setLocation("/fullmock")}
            className="px-5 py-2.5 border border-gray-300 text-gray-700 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
          >
            ← Back to Exams
          </button>
          <button
            onClick={() => setLocation("/dashboard")}
            className="px-5 py-2.5 bg-amber-500 text-white text-sm font-semibold rounded-xl hover:bg-amber-600 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
