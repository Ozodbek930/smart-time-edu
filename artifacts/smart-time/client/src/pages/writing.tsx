import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { PenTool, ArrowLeft, Clock, ChevronDown, ChevronUp, Lightbulb, Send, CheckCircle, BookOpen, FileText, Sparkles, Loader2, TrendingUp, AlertCircle, AlertTriangle } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { useI18n } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import type { WritingTest } from "@shared/schema";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useCountdownTimer } from "@/hooks/use-countdown-timer";

interface WritingFeedback {
  overallBand: number;
  criteria: {
    taskAchievement: { band: number; feedback: string };
    coherenceCohesion: { band: number; feedback: string };
    lexicalResource: { band: number; feedback: string };
    grammaticalRange: { band: number; feedback: string };
  };
  strengths: string[];
  improvements: string[];
  summary: string;
}

function BandCircle({ band, label }: { band: number; label: string }) {
  const color =
    band >= 7.5 ? "text-green-600 border-green-500 bg-green-50" :
    band >= 6 ? "text-amber-600 border-amber-500 bg-amber-50" :
    "text-red-600 border-red-400 bg-red-50";
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`w-14 h-14 rounded-full border-2 flex items-center justify-center font-bold text-lg ${color}`}>
        {band}
      </div>
      <span className="text-xs text-center text-muted-foreground leading-tight max-w-[70px]">{label}</span>
    </div>
  );
}

function AIFeedbackPanel({ feedback }: { feedback: WritingFeedback }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mt-4 rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/30 dark:to-slate-900 overflow-hidden"
    >
      <div className="px-4 py-3 bg-purple-600 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-white" />
        <span className="text-white font-semibold text-sm">AI IELTS Feedback</span>
      </div>

      <div className="p-4 space-y-5">
        <div className="flex flex-col items-center gap-1">
          <div className="text-5xl font-black text-purple-700 dark:text-purple-400">{feedback.overallBand}</div>
          <div className="text-sm font-semibold text-purple-600">Overall Band Score</div>
          <div className="text-xs text-muted-foreground">{feedback.summary}</div>
        </div>

        <div className="flex flex-wrap justify-center gap-4">
          <BandCircle band={feedback.criteria.taskAchievement.band} label="Task Achievement" />
          <BandCircle band={feedback.criteria.coherenceCohesion.band} label="Coherence & Cohesion" />
          <BandCircle band={feedback.criteria.lexicalResource.band} label="Lexical Resource" />
          <BandCircle band={feedback.criteria.grammaticalRange.band} label="Grammatical Range" />
        </div>

        <div className="space-y-3">
          {[
            { key: "taskAchievement", label: "Task Achievement" },
            { key: "coherenceCohesion", label: "Coherence & Cohesion" },
            { key: "lexicalResource", label: "Lexical Resource" },
            { key: "grammaticalRange", label: "Grammatical Range & Accuracy" },
          ].map(({ key, label }) => {
            const item = feedback.criteria[key as keyof typeof feedback.criteria];
            return (
              <div key={key} className="rounded-lg border bg-white dark:bg-slate-800/50 p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{label}</span>
                  <span className={`text-sm font-bold ${item.band >= 7 ? "text-green-600" : item.band >= 6 ? "text-amber-600" : "text-red-500"}`}>
                    Band {item.band}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{item.feedback}</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <CheckCircle className="w-3.5 h-3.5 text-green-600" />
              <span className="text-xs font-semibold text-green-700">Strengths</span>
            </div>
            <ul className="space-y-1">
              {feedback.strengths.map((s, i) => (
                <li key={i} className="text-xs text-green-800 dark:text-green-300">• {s}</li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
              <span className="text-xs font-semibold text-amber-700">Areas to Improve</span>
            </div>
            <ul className="space-y-1">
              {feedback.improvements.map((s, i) => (
                <li key={i} className="text-xs text-amber-800 dark:text-amber-300">• {s}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const variant = difficulty === "Easy" ? "secondary" : difficulty === "Medium" ? "default" : "destructive";
  return <Badge variant={variant}>{difficulty}</Badge>;
}

function WritingTestCard({ test, index }: { test: WritingTest; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [showSample, setShowSample] = useState(false);
  const [response, setResponse] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<WritingFeedback | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const { t } = useI18n();

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!response.trim() && !isSubmitted) {
         setIsSubmitted(true);
         return;
      }
      await apiRequest("POST", "/api/test-results", {
        testType: "writing",
        testId: test.id,
        answers: { response },
      });
    },
    onSuccess: () => {
      setIsSubmitted(true);
    },
  });

  const timer = useCountdownTimer(
    test.duration,
    () => {
      if (!isSubmitted) {
        submitMutation.mutate();
      }
    },
    expanded && !isSubmitted
  );

  const evaluateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/writing/evaluate", {
        task: test.task,
        prompt: test.prompt,
        essay: response,
      });
      return res.json() as Promise<WritingFeedback>;
    },
    onSuccess: (data) => {
      setAiFeedback(data);
      setAiError(null);
    },
    onError: (err: any) => {
      let msg = "AI evaluation failed. Please try again.";
      try {
        const match = String(err?.message || "").match(/^\d+: (.+)$/s);
        if (match) {
          const parsed = JSON.parse(match[1]);
          if (parsed?.message) msg = parsed.message;
        }
      } catch {}
      setAiError(msg);
    },
  });

  const wordCount = response.trim() ? response.trim().split(/\s+/).length : 0;
  const canEvaluate = wordCount >= 50;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
    >
      <motion.div whileHover={{ scale: 1.01 }} transition={{ type: "spring", stiffness: 300 }}>
        <Card data-testid={`card-writing-test-${test.id}`}>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline">Task {test.task}</Badge>
                  <DifficultyBadge difficulty={test.difficulty} />
                </div>
                <h3 className="text-lg font-semibold mt-2" data-testid={`text-writing-title-${test.id}`}>{test.title}</h3>
                <p className="text-sm text-muted-foreground">{test.description}</p>
              </div>
              <div className="shrink-0 flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>{test.duration} min</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 font-medium">{test.topic}</span>
            </div>

            <Button
              variant="ghost"
              size="sm"
              className="gap-1 w-full justify-between"
              onClick={() => setExpanded(!expanded)}
              data-testid={`button-toggle-prompt-${test.id}`}
            >
              <span className="flex items-center gap-2">
                <PenTool className="w-4 h-4" />
                {expanded ? t.writing.hidePrompt : t.writing.showPrompt}
              </span>
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>

            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-4">
                    {!isSubmitted && (
                      <div className="flex justify-end">
                        <Badge 
                          variant={timer.isCritical ? "destructive" : timer.isWarning ? "default" : "secondary"}
                          className={`gap-1.5 py-1 px-3 ${timer.isWarning ? "animate-pulse" : ""}`}
                          data-testid={`timer-writing-${test.id}`}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          <span className="font-mono font-bold">{timer.formattedTime}</span>
                        </Badge>
                      </div>
                    )}

                    <div className="p-4 rounded-md border border-purple-200/40 dark:border-purple-800/40 bg-purple-50/30 dark:bg-purple-900/10">
                      <p className="text-sm leading-relaxed whitespace-pre-line" data-testid={`text-prompt-${test.id}`}>
                        {test.prompt}
                      </p>
                    </div>

                    {test.pdfUrl && (
                      <a
                        href={test.pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2.5 rounded-md border border-purple-200/50 dark:border-purple-800/50 bg-purple-50/50 dark:bg-purple-900/10 text-sm font-medium text-purple-700 dark:text-purple-300 w-full"
                        data-testid={`link-pdf-${test.id}`}
                      >
                        <FileText className="w-4 h-4 shrink-0" />
                        <span>Open PDF</span>
                      </a>
                    )}

                    <div className="space-y-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1 w-full justify-between"
                        onClick={() => setShowTips(!showTips)}
                        data-testid={`button-toggle-tips-${test.id}`}
                      >
                        <span className="flex items-center gap-2">
                          <Lightbulb className="w-4 h-4" />
                          {t.writing.tipsLabel}
                        </span>
                        {showTips ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </Button>

                      <AnimatePresence>
                        {showTips && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="space-y-2 pl-4 border-l-2 border-amber-300/40 dark:border-amber-700/40 ml-2 pt-1">
                              {test.tips.map((tip, i) => (
                                <motion.p
                                  key={i}
                                  className="text-sm text-muted-foreground"
                                  data-testid={`text-tip-${test.id}-${i}`}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: i * 0.05 }}
                                >
                                  {tip}
                                </motion.p>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {test.sampleAnswer && (
                      <div className="space-y-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 w-full justify-between"
                          onClick={() => setShowSample(!showSample)}
                          data-testid={`button-toggle-sample-${test.id}`}
                        >
                          <span className="flex items-center gap-2">
                            <BookOpen className="w-4 h-4" />
                            {t.writing.sampleAnswer}
                          </span>
                          {showSample ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </Button>

                        <AnimatePresence>
                          {showSample && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.3 }}
                              className="overflow-hidden"
                            >
                              <div className="p-4 rounded-md border border-purple-200/40 dark:border-purple-800/40 bg-purple-50/20 dark:bg-purple-900/5">
                                <p className="text-sm leading-relaxed whitespace-pre-line" data-testid={`text-sample-${test.id}`}>
                                  {test.sampleAnswer}
                                </p>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    <div className="space-y-3 pt-2">
                      <h4 className="text-sm font-semibold text-purple-600">{t.writing.yourResponse}</h4>
                      <Textarea
                        value={response}
                        onChange={(e) => setResponse(e.target.value)}
                        placeholder={t.writing.responsePlaceholder}
                        className="min-h-[200px] resize-y"
                        disabled={isSubmitted}
                        data-testid={`textarea-response-${test.id}`}
                      />
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-xs text-muted-foreground" data-testid={`text-word-count-${test.id}`}>
                          {t.writing.wordCount}: {wordCount}
                        </span>
                        {isSubmitted ? (
                          <motion.div
                            className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400"
                            initial={{ scale: 0.8 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 300 }}
                            data-testid={`text-submitted-${test.id}`}
                          >
                            <CheckCircle className="w-4 h-4" />
                            {t.writing.submitted}
                          </motion.div>
                        ) : (
                          <Button
                            onClick={() => submitMutation.mutate()}
                            disabled={response.trim().length === 0 || submitMutation.isPending}
                            className="gap-2"
                            data-testid={`button-submit-${test.id}`}
                          >
                            <Send className="w-4 h-4" />
                            {t.writing.submit}
                          </Button>
                        )}
                      </div>

                      {isSubmitted && !aiFeedback && (
                        <div className="pt-2 space-y-2">
                          {!canEvaluate && (
                            <div className="flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              Напишите минимум 50 слов чтобы AI мог оценить ваш ответ (сейчас: {wordCount} сл.)
                            </div>
                          )}
                          <Button
                            onClick={() => evaluateMutation.mutate()}
                            disabled={evaluateMutation.isPending || !canEvaluate}
                            className="w-full gap-2 bg-purple-600 hover:bg-purple-700 text-white disabled:opacity-50"
                            data-testid={`button-ai-evaluate-${test.id}`}
                          >
                            {evaluateMutation.isPending ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                AI оценивает эссе...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4" />
                                Проверить с AI (IELTS 9-Band)
                              </>
                            )}
                          </Button>
                          {aiError && (
                            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                              <AlertCircle className="w-4 h-4 shrink-0" />
                              {aiError}
                            </div>
                          )}
                        </div>
                      )}

                      {aiFeedback && <AIFeedbackPanel feedback={aiFeedback} />}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}

function TestSkeleton() {
  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-9 w-full" />
      </CardContent>
    </Card>
  );
}

export default function Writing() {
  const { t } = useI18n();
  const { data: tests, isLoading } = useQuery<WritingTest[]>({
    queryKey: ["/api/writing-tests"],
  });

  const task1Tests = tests?.filter((t) => t.task === 1) || [];
  const task2Tests = tests?.filter((t) => t.task === 2) || [];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <section className="relative py-12 md:py-16 border-b overflow-hidden" data-testid="section-writing-hero">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-transparent" />
        <motion.div
          className="absolute top-10 right-10 w-60 h-60 bg-purple-500/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2 mb-6" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
                {t.common.back}
              </Button>
            </Link>
          </motion.div>

          <motion.div
            className="flex items-center gap-3 mb-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              className="w-12 h-12 rounded-md bg-purple-600 flex items-center justify-center"
              whileHover={{ rotate: 10, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <PenTool className="w-6 h-6 text-white" />
            </motion.div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold" data-testid="text-writing-title">{t.writing.title}</h1>
              <p className="text-muted-foreground">{t.writing.subtitle}</p>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 max-w-md">
            {[
              { count: task1Tests.length, label: `${t.writing.task1} ${t.writing.tests}` },
              { count: task2Tests.length, label: `${t.writing.task2} ${t.writing.tests}` },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
              >
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-purple-600">{item.count}</div>
                    <div className="text-sm text-muted-foreground">{item.label}</div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <motion.section
        className="flex-1 py-8 md:py-12"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Tabs defaultValue="task1" className="space-y-6">
            <TabsList className="flex gap-1.5 p-1.5 rounded-2xl border border-border/60 bg-muted/40 w-fit h-auto shadow-sm">
              <TabsTrigger value="task1" data-testid="tab-task1" className="flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-violet-500/30 hover:bg-violet-50 hover:text-violet-600 dark:hover:bg-violet-950/40 dark:hover:text-violet-400 border border-transparent data-[state=active]:border-transparent">
                <FileText className="w-4 h-4 shrink-0" />
                <span>{t.writing.task1}</span>
              </TabsTrigger>
              <TabsTrigger value="task2" data-testid="tab-task2" className="flex items-center gap-2.5 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-primary/30 hover:bg-primary/10 hover:text-primary border border-transparent data-[state=active]:border-transparent">
                <PenTool className="w-4 h-4 shrink-0" />
                <span>{t.writing.task2}</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="task1" className="space-y-4" data-testid="content-task1">
              <div className="space-y-1 mb-4">
                <h2 className="text-xl font-semibold">{t.writing.task1Title}</h2>
                <p className="text-sm text-muted-foreground">{t.writing.task1Desc}</p>
              </div>
              {isLoading ? (
                <div className="grid gap-4">{[1, 2].map((i) => <TestSkeleton key={i} />)}</div>
              ) : task1Tests.length > 0 ? (
                <div className="grid gap-4">
                  {task1Tests.map((test, i) => <WritingTestCard key={test.id} test={test} index={i} />)}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <PenTool className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p>{t.writing.noTests}</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="task2" className="space-y-4" data-testid="content-task2">
              <div className="space-y-1 mb-4">
                <h2 className="text-xl font-semibold">{t.writing.task2Title}</h2>
                <p className="text-sm text-muted-foreground">{t.writing.task2Desc}</p>
              </div>
              {isLoading ? (
                <div className="grid gap-4">{[1, 2].map((i) => <TestSkeleton key={i} />)}</div>
              ) : task2Tests.length > 0 ? (
                <div className="grid gap-4">
                  {task2Tests.map((test, i) => <WritingTestCard key={test.id} test={test} index={i} />)}
                </div>
              ) : (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <PenTool className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p>{t.writing.noTests}</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </motion.section>

      <Footer />
    </div>
  );
}
