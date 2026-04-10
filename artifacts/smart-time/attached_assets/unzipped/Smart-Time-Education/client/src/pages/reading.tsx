import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { BookOpen, ArrowLeft, Clock, ChevronDown, ChevronUp, CheckCircle, XCircle, RotateCcw, FileText, Download } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { useI18n } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import type { ReadingTest, ReadingQuestion } from "@shared/schema";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const variant = difficulty === "Easy" ? "secondary" : difficulty === "Medium" ? "default" : "destructive";
  return <Badge variant={variant}>{difficulty}</Badge>;
}

function QuizSection({ questions, testId }: { questions: ReadingQuestion[]; testId: string }) {
  const { t } = useI18n();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const submitMutation = useMutation({
    mutationFn: async (data: { score: number; totalQuestions: number }) => {
      await apiRequest("POST", "/api/test-results", {
        testType: "reading",
        testId,
        score: data.score,
        totalQuestions: data.totalQuestions,
        answers,
      });
    },
  });

  const handleAnswer = (questionId: number, value: string) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [questionId]: parseInt(value) }));
  };

  const handleSubmit = () => {
    setSubmitted(true);
    const score = questions.filter((q) => answers[q.id] === q.correctAnswer).length;
    submitMutation.mutate({ score, totalQuestions: questions.length });
  };

  const handleReset = () => {
    setAnswers({});
    setSubmitted(false);
  };

  const score = submitted
    ? questions.filter((q) => answers[q.id] === q.correctAnswer).length
    : 0;

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {questions.map((q, idx) => {
        const userAnswer = answers[q.id];
        const isCorrect = submitted && userAnswer === q.correctAnswer;
        const isWrong = submitted && userAnswer !== undefined && userAnswer !== q.correctAnswer;

        return (
          <motion.div
            key={q.id}
            className={`p-4 rounded-md border transition-colors ${
              isCorrect ? "border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-900/10" :
              isWrong ? "border-red-300 dark:border-red-700 bg-red-50/50 dark:bg-red-900/10" :
              "border-border"
            }`}
            data-testid={`question-block-${testId}-${q.id}`}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.05 }}
          >
            <div className="flex items-start gap-2 mb-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center text-xs font-bold">
                {idx + 1}
              </span>
              <p className="text-sm font-medium" data-testid={`text-reading-question-${testId}-${q.id}`}>{q.question}</p>
            </div>

            <RadioGroup
              value={userAnswer?.toString()}
              onValueChange={(value) => handleAnswer(q.id, value)}
              className="space-y-2 ml-8"
            >
              {q.options.map((option, optIdx) => {
                const isThisCorrect = submitted && optIdx === q.correctAnswer;
                const isThisWrong = submitted && optIdx === userAnswer && optIdx !== q.correctAnswer;

                return (
                  <div
                    key={optIdx}
                    className={`flex items-center gap-2 p-2 rounded-md transition-colors ${
                      isThisCorrect ? "bg-green-100/60 dark:bg-green-900/20" :
                      isThisWrong ? "bg-red-100/60 dark:bg-red-900/20" : ""
                    }`}
                  >
                    <RadioGroupItem
                      value={optIdx.toString()}
                      id={`q-${testId}-${q.id}-${optIdx}`}
                      disabled={submitted}
                      data-testid={`radio-option-${testId}-${q.id}-${optIdx}`}
                    />
                    <Label
                      htmlFor={`q-${testId}-${q.id}-${optIdx}`}
                      className="text-sm cursor-pointer flex items-center gap-2 flex-1"
                    >
                      {option}
                      {isThisCorrect && <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />}
                      {isThisWrong && <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />}
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </motion.div>
        );
      })}

      <div className="flex items-center justify-between gap-4 pt-2">
        {submitted ? (
          <>
            <motion.div
              className="text-sm font-medium"
              data-testid={`text-score-${testId}`}
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              {t.reading.score}: <span className="text-emerald-600">{score}/{questions.length}</span>
              {score === questions.length && (
                <span className="ml-2 text-green-600 dark:text-green-400">{t.reading.perfect}</span>
              )}
            </motion.div>
            <Button variant="outline" size="sm" onClick={handleReset} className="gap-2" data-testid={`button-retry-${testId}`}>
              <RotateCcw className="w-4 h-4" />
              {t.reading.tryAgain}
            </Button>
          </>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={Object.keys(answers).length < questions.length}
            className="gap-2"
            data-testid={`button-check-answers-${testId}`}
          >
            <CheckCircle className="w-4 h-4" />
            {t.reading.checkAnswers}
          </Button>
        )}
      </div>
    </motion.div>
  );
}

function ReadingTestCard({ test, index }: { test: ReadingTest; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const { t } = useI18n();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
    >
      <motion.div whileHover={{ scale: 1.01 }} transition={{ type: "spring", stiffness: 300 }}>
        <Card data-testid={`card-reading-test-${test.id}`}>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <DifficultyBadge difficulty={test.difficulty} />
                  <Badge variant="outline">{test.questions.length} {t.reading.questionsCount}</Badge>
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
              variant="ghost"
              size="sm"
              className="gap-1 w-full justify-between"
              onClick={() => setExpanded(!expanded)}
              data-testid={`button-toggle-passage-${test.id}`}
            >
              <span className="flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                {expanded ? t.reading.hidePassage : t.reading.showPassage}
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
                  <div className="space-y-6">
                    {test.pdfUrl && (
                      <div className="p-4 rounded-lg bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/50">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <FileText className="w-5 h-5 text-emerald-600" />
                            <div>
                              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">{t.reading.pdfAvailable || "PDF Material Available"}</p>
                              <p className="text-xs text-muted-foreground">{t.reading.downloadPdf || "Download the reading material"}</p>
                            </div>
                          </div>
                          <a href={test.pdfUrl} target="_blank" rel="noopener noreferrer" data-testid={`link-pdf-${test.id}`}>
                            <Button variant="outline" size="sm" className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:text-emerald-400">
                              <Download className="w-4 h-4" />
                              PDF
                            </Button>
                          </a>
                        </div>
                      </div>
                    )}

                    <div className="space-y-3">
                      <h4 className="text-sm font-semibold text-emerald-600">{t.reading.passage}</h4>
                      <p className="text-sm text-muted-foreground italic mb-2">{t.reading.readPassage}</p>
                      <div className="p-4 rounded-md border border-emerald-200/40 dark:border-emerald-800/40 bg-emerald-50/30 dark:bg-emerald-900/10">
                        <p className="text-sm leading-relaxed whitespace-pre-line" data-testid={`text-passage-${test.id}`}>
                          {test.passage}
                        </p>
                      </div>
                    </div>

                    <QuizSection questions={test.questions} testId={test.id} />
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
          <Skeleton className="h-5 w-20" />
        </div>
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-9 w-full" />
      </CardContent>
    </Card>
  );
}

export default function Reading() {
  const { t } = useI18n();
  const { data: tests, isLoading } = useQuery<ReadingTest[]>({
    queryKey: ["/api/reading-tests"],
  });

  const totalTests = tests?.length || 0;

  return (
    <div className="min-h-screen flex flex-col bg-background">
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
              className="w-12 h-12 rounded-md bg-emerald-600 flex items-center justify-center"
              whileHover={{ rotate: 10, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <BookOpen className="w-6 h-6 text-white" />
            </motion.div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold" data-testid="text-reading-title">{t.reading.title}</h1>
              <p className="text-muted-foreground">{t.reading.subtitle}</p>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 max-w-md">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <Card>
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-600" data-testid="text-total-tests">{totalTests}</div>
                  <div className="text-sm text-muted-foreground">{t.reading.totalTests}</div>
                </CardContent>
              </Card>
            </motion.div>
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
          {isLoading ? (
            <div className="grid gap-4">{[1, 2, 3].map((i) => <TestSkeleton key={i} />)}</div>
          ) : tests && tests.length > 0 ? (
            <div className="grid gap-4">
              {tests.map((test, i) => <ReadingTestCard key={test.id} test={test} index={i} />)}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>{t.reading.noTests}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </motion.section>

      <Footer />
    </div>
  );
}
