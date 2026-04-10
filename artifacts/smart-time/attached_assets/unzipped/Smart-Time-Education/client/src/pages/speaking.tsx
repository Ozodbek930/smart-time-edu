import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Mic, Clock, ChevronDown, ChevronUp, Lightbulb, ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { useI18n } from "@/lib/i18n";
import type { SpeakingTest } from "@shared/schema";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const variant = difficulty === "Easy" ? "secondary" : difficulty === "Medium" ? "default" : "destructive";
  return <Badge variant={variant}>{difficulty}</Badge>;
}

function SpeakingTestCard({ test, index }: { test: SpeakingTest; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const { t } = useI18n();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
    >
      <motion.div whileHover={{ scale: 1.01 }} transition={{ type: "spring", stiffness: 300 }}>
        <Card data-testid={`card-speaking-test-${test.id}`}>
          <CardContent className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline">Part {test.part}</Badge>
                  <DifficultyBadge difficulty={test.difficulty} />
                </div>
                <h3 className="text-lg font-semibold mt-2" data-testid={`text-test-title-${test.id}`}>{test.title}</h3>
                <p className="text-sm text-muted-foreground">{test.description}</p>
              </div>
              <div className="shrink-0 flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                <span>{test.duration} min</span>
              </div>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <span className="px-2 py-0.5 rounded bg-primary/10 text-primary font-medium">{test.topic}</span>
            </div>

            <div className="space-y-2">
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 w-full justify-between"
                onClick={() => setExpanded(!expanded)}
                data-testid={`button-toggle-questions-${test.id}`}
              >
                <span className="flex items-center gap-2">
                  <Mic className="w-4 h-4" />
                  {test.questions.length} {t.speaking.questions}
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
                    <div className="space-y-2 pl-4 border-l-2 border-primary/20 ml-2 pt-1">
                      {test.questions.map((q, i) => (
                        <motion.p
                          key={i}
                          className="text-sm text-muted-foreground"
                          data-testid={`text-question-${test.id}-${i}`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                        >
                          <span className="font-medium text-foreground">{i + 1}.</span> {q}
                        </motion.p>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

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
                  {t.speaking.tipsLabel}
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

export default function Speaking() {
  const { t } = useI18n();
  const { data: tests, isLoading } = useQuery<SpeakingTest[]>({
    queryKey: ["/api/speaking-tests"],
  });

  const part1Tests = tests?.filter((t) => t.part === 1) || [];
  const part2Tests = tests?.filter((t) => t.part === 2) || [];
  const part3Tests = tests?.filter((t) => t.part === 3) || [];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <section className="relative py-12 md:py-16 border-b overflow-hidden" data-testid="section-speaking-hero">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
        <motion.div
          className="absolute top-10 right-10 w-60 h-60 bg-amber-500/10 rounded-full blur-3xl"
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
              <Mic className="w-6 h-6 text-primary-foreground" />
            </motion.div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold" data-testid="text-speaking-title">{t.speaking.title}</h1>
              <p className="text-muted-foreground">{t.speaking.subtitle}</p>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
            {[
              { count: part1Tests.length, label: `${t.speaking.part1} ${t.speaking.tests}` },
              { count: part2Tests.length, label: `${t.speaking.part2} ${t.speaking.tests}` },
              { count: part3Tests.length, label: `${t.speaking.part3} ${t.speaking.tests}` },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
              >
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-primary">{item.count}</div>
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
          <Tabs defaultValue="part1" className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="part1" data-testid="tab-part1">{t.speaking.part1}</TabsTrigger>
              <TabsTrigger value="part2" data-testid="tab-part2">{t.speaking.part2}</TabsTrigger>
              <TabsTrigger value="part3" data-testid="tab-part3">{t.speaking.part3}</TabsTrigger>
            </TabsList>

            <TabsContent value="part1" className="space-y-4" data-testid="content-part1">
              <div className="space-y-1 mb-4">
                <h2 className="text-xl font-semibold">{t.speaking.part1Title}</h2>
                <p className="text-sm text-muted-foreground">{t.speaking.part1Desc}</p>
              </div>
              {isLoading ? (
                <div className="grid gap-4">{[1, 2, 3].map((i) => <TestSkeleton key={i} />)}</div>
              ) : (
                <div className="grid gap-4">
                  {part1Tests.map((test, i) => <SpeakingTestCard key={test.id} test={test} index={i} />)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="part2" className="space-y-4" data-testid="content-part2">
              <div className="space-y-1 mb-4">
                <h2 className="text-xl font-semibold">{t.speaking.part2Title}</h2>
                <p className="text-sm text-muted-foreground">{t.speaking.part2Desc}</p>
              </div>
              {isLoading ? (
                <div className="grid gap-4">{[1, 2, 3].map((i) => <TestSkeleton key={i} />)}</div>
              ) : (
                <div className="grid gap-4">
                  {part2Tests.map((test, i) => <SpeakingTestCard key={test.id} test={test} index={i} />)}
                </div>
              )}
            </TabsContent>

            <TabsContent value="part3" className="space-y-4" data-testid="content-part3">
              <div className="space-y-1 mb-4">
                <h2 className="text-xl font-semibold">{t.speaking.part3Title}</h2>
                <p className="text-sm text-muted-foreground">{t.speaking.part3Desc}</p>
              </div>
              {isLoading ? (
                <div className="grid gap-4">{[1, 2, 3].map((i) => <TestSkeleton key={i} />)}</div>
              ) : (
                <div className="grid gap-4">
                  {part3Tests.map((test, i) => <SpeakingTestCard key={test.id} test={test} index={i} />)}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </motion.section>

      <Footer />
    </div>
  );
}
