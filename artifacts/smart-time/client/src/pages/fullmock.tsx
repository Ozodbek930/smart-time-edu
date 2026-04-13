import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Clock, ArrowRight, BookOpen, Headphones, Mic, PenTool, BarChart2 } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { useI18n } from "@/lib/i18n";
import type { FullMockTest, TestResult, User } from "@shared/schema";
import { motion } from "framer-motion";
import { getQueryFn } from "@/lib/queryClient";

export default function FullMock() {
  const { t } = useI18n();
  const { data: tests, isLoading } = useQuery<FullMockTest[]>({
    queryKey: ["/api/fullmock-tests"],
  });
  const { data: user } = useQuery<User | null>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn<User | null>({ on401: "returnNull" }),
    retry: false,
  });
  const { data: myResults } = useQuery<TestResult[]>({
    queryKey: ["/api/test-results/my"],
    enabled: !!user,
  });

  const completedFullmockIds = new Set(
    (myResults ?? []).filter(r => r.fullmockId).map(r => r.fullmockId!)
  );

  const getSectionLabel = (type: string, sectionIndex?: number) => {
    if (type === "listening" && sectionIndex) return `Listening ${sectionIndex}`;
    if (type === "reading" && sectionIndex) return `Reading ${sectionIndex}`;
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "speaking": return <Mic className="w-4 h-4" />;
      case "listening": return <Headphones className="w-4 h-4" />;
      case "reading": return <BookOpen className="w-4 h-4" />;
      case "writing": return <PenTool className="w-4 h-4" />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <section className="relative py-12 md:py-20 border-b overflow-hidden" data-testid="section-fullmock-hero">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
        <motion.div
          className="absolute top-10 right-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col items-center"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-6 shadow-lg shadow-primary/20">
              <Trophy className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4" data-testid="text-fullmock-title">
              Full Mock Exam
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Test your skills with a complete IELTS-style examination covering all four sections.
            </p>
          </motion.div>
        </div>
      </section>

      <main className="flex-1 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="overflow-hidden">
                  <CardHeader className="gap-2">
                    <Skeleton className="h-6 w-2/3" />
                    <Skeleton className="h-4 w-full" />
                  </CardHeader>
                  <CardContent className="gap-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-8 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : tests && tests.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tests.map((test, i) => (
                <motion.div
                  key={test.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                >
                  <Card className="h-full flex flex-col hover-elevate transition-all duration-300" data-testid={`card-fullmock-test-${test.id}`}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between gap-2">
                        <span className="break-words min-w-0 line-clamp-2">{test.title}</span>
                        <Badge variant="secondary" className="shrink-0 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {test.totalDuration}m
                        </Badge>
                      </CardTitle>
                      <CardDescription className="line-clamp-2">
                        {test.description || "No description provided."}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1">
                      <div className="flex flex-wrap gap-2 mt-2">
                        {test.sections.map((section, idx) => (
                          <Badge key={idx} variant="outline" className="gap-1">
                            {getIcon(section.type)}
                            {getSectionLabel(section.type, section.sectionIndex)}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                    <CardFooter className="pt-0 flex gap-2">
                      <Link href={`/fullmock/${test.id}`} className="flex-1">
                        <Button className="w-full gap-2" data-testid={`button-start-exam-${test.id}`}>
                          {completedFullmockIds.has(test.id) ? "Retake" : "Start Exam"}
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </Link>
                      {completedFullmockIds.has(test.id) && (
                        <Link href={`/fullmock/${test.id}/results`}>
                          <Button variant="outline" className="gap-1.5 shrink-0" data-testid={`button-view-results-${test.id}`}>
                            <BarChart2 className="w-4 h-4" />
                            Results
                          </Button>
                        </Link>
                      )}
                    </CardFooter>
                  </Card>
                </motion.div>
              ))}
            </div>
          ) : (
            <Card className="bg-muted/50 border-dashed">
              <CardContent className="p-12 text-center">
                <Trophy className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <h3 className="text-lg font-semibold mb-2">No Full Mock Exams Available</h3>
                <p className="text-muted-foreground">Check back later for new examination papers.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
