import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Headphones, Clock, ChevronDown, ChevronUp, CheckCircle, XCircle, RotateCcw, ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { useI18n } from "@/lib/i18n";
import type { ListeningTest, ListeningQuestion } from "@shared/schema";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const variant = difficulty === "Easy" ? "secondary" : difficulty === "Medium" ? "default" : "destructive";
  return <Badge variant={variant}>{difficulty}</Badge>;
}

function QuizSection({ questions, testId }: { questions: ListeningQuestion[]; testId: string }) {
  const { t } = useI18n();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const handleAnswer = (questionId: number, value: string) => {
    if (submitted) return;
    setAnswers((prev) => ({ ...prev, [questionId]: parseInt(value) }));
  };

  const handleSubmit = () => setSubmitted(true);

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
              <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                {idx + 1}
              </span>
              <p className="text-sm font-medium" data-testid={`text-listening-question-${testId}-${q.id}`}>{q.question}</p>
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
              {t.listening.score}: <span className="text-primary">{score}/{questions.length}</span>
              {score === questions.length && (
                <span className="ml-2 text-green-600 dark:text-green-400">{t.listening.perfect}</span>
              )}
            </motion.div>
            <Button variant="outline" size="sm" onClick={handleReset} className="gap-2" data-testid={`button-retry-${testId}`}>
              <RotateCcw className="w-4 h-4" />
              {t.listening.tryAgain}
            </Button>
          </>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={Object.keys(answers).length < questions.length}
            className="gap-2"
            data-testid={`button-submit-${testId}`}
          >
            <CheckCircle className="w-4 h-4" />
            {t.listening.checkAnswers}
          </Button>
        )}
      </div>
    </motion.div>
  );
}

function ListeningTestCard({ test, index }: { test: ListeningTest; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const { t } = useI18n();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
    >
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

            <div className="flex items-center gap-2 text-sm">
              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">{test.topic}</span>
              <span className="text-muted-foreground">{test.questions.length} {t.listening.questionsCount}</span>
            </div>

            {test.audioUrl && (
              <div className="p-3 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-800/50">
                <div className="flex items-center gap-2 mb-2">
                  <Headphones className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-400">{t.listening.audioLabel || "Listen to the audio"}</span>
                </div>
                <audio controls className="w-full rounded-lg" src={test.audioUrl} data-testid={`audio-player-${test.id}`}>
                  Your browser does not support audio playback.
                </audio>
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="gap-1 w-full justify-between"
              onClick={() => setExpanded(!expanded)}
              data-testid={`button-toggle-quiz-${test.id}`}
            >
              <span className="flex items-center gap-2">
                <Headphones className="w-4 h-4" />
                {expanded ? t.listening.hideQuestions : t.listening.startPractice}
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
                  <QuizSection questions={test.questions} testId={test.id} />
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
          <Skeleton className="h-5 w-20" />
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

export default function Listening() {
  const { t } = useI18n();
  const { data: tests, isLoading } = useQuery<ListeningTest[]>({
    queryKey: ["/api/listening-tests"],
  });

  const section1 = tests?.filter((t) => t.section === 1) || [];
  const section2 = tests?.filter((t) => t.section === 2) || [];
  const section3 = tests?.filter((t) => t.section === 3) || [];
  const section4 = tests?.filter((t) => t.section === 4) || [];

  const sections = [
    { key: "section1", num: 1, tests: section1, title: t.listening.section1Title, desc: t.listening.section1Desc },
    { key: "section2", num: 2, tests: section2, title: t.listening.section2Title, desc: t.listening.section2Desc },
    { key: "section3", num: 3, tests: section3, title: t.listening.section3Title, desc: t.listening.section3Desc },
    { key: "section4", num: 4, tests: section4, title: t.listening.section4Title, desc: t.listening.section4Desc },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
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
              className="w-12 h-12 rounded-md bg-primary flex items-center justify-center"
              whileHover={{ rotate: 10, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Headphones className="w-6 h-6 text-primary-foreground" />
            </motion.div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold" data-testid="text-listening-title">{t.listening.title}</h1>
              <p className="text-muted-foreground">{t.listening.subtitle}</p>
            </div>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8">
            {sections.map((s, i) => (
              <motion.div
                key={s.key}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
              >
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-primary">{s.tests.length}</div>
                    <div className="text-sm text-muted-foreground">{t.listening.section} {s.num}</div>
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
          <Tabs defaultValue="section1" className="space-y-6">
            <TabsList className="grid w-full max-w-lg grid-cols-4">
              {sections.map((s) => (
                <TabsTrigger key={s.key} value={s.key} data-testid={`tab-${s.key}`}>
                  {t.listening.section} {s.num}
                </TabsTrigger>
              ))}
            </TabsList>

            {sections.map((section) => (
              <TabsContent key={section.key} value={section.key} className="space-y-4" data-testid={`content-${section.key}`}>
                <div className="space-y-1 mb-4">
                  <h2 className="text-xl font-semibold">{section.title}</h2>
                  <p className="text-sm text-muted-foreground">{section.desc}</p>
                </div>
                {isLoading ? (
                  <div className="grid gap-4">{[1, 2].map((i) => <TestSkeleton key={i} />)}</div>
                ) : (
                  <div className="grid gap-4">
                    {section.tests.map((test, i) => <ListeningTestCard key={test.id} test={test} index={i} />)}
                    {section.tests.length === 0 && (
                      <Card>
                        <CardContent className="p-8 text-center text-muted-foreground">
                          <Headphones className="w-10 h-10 mx-auto mb-3 opacity-40" />
                          <p>{t.listening.noTests}</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </motion.section>

      <Footer />
    </div>
  );
}
