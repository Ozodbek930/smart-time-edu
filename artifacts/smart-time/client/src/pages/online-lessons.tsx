import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { motion } from "framer-motion";
import { BookOpen, Clock, CalendarClock, AlertTriangle, PlayCircle } from "lucide-react";
import type { OnlineLesson } from "@shared/schema";

function formatDeadline(deadline: string | Date) {
  const d = new Date(deadline);
  return d.toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function getStatus(deadline: string | Date) {
  const now = new Date();
  const dl = new Date(deadline);
  const diff = dl.getTime() - now.getTime();
  if (diff <= 0) return "expired";
  if (diff < 1000 * 60 * 60 * 24) return "urgent";
  return "open";
}

export default function OnlineLessons() {
  const { data: lessons = [], isLoading } = useQuery<OnlineLesson[]>({
    queryKey: ["/api/online-lessons"],
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <BookOpen className="w-8 h-8 text-primary" />
              Online Lessons
            </h1>
            <p className="text-muted-foreground mt-2">Complete each lesson test before the deadline.</p>
          </div>

          {isLoading ? (
            <div className="grid gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 rounded-2xl bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : lessons.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-lg">No online lessons available right now.</p>
              <p className="text-sm mt-1">Check back later.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {lessons.map((lesson, i) => {
                const status = getStatus(lesson.deadline);
                return (
                  <motion.div
                    key={lesson.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.07 }}
                  >
                    <Card className={`border ${status === "expired" ? "opacity-60 border-muted" : status === "urgent" ? "border-orange-400 dark:border-orange-600" : "border-border"} hover:shadow-md transition-shadow`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <CardTitle className="text-lg" data-testid={`title-lesson-${lesson.id}`}>{lesson.title}</CardTitle>
                            {lesson.description && (
                              <CardDescription className="mt-1">{lesson.description}</CardDescription>
                            )}
                          </div>
                          <div className="shrink-0 flex flex-col gap-1 items-end">
                            {status === "expired" && <Badge variant="secondary" className="text-xs">Expired</Badge>}
                            {status === "urgent" && <Badge className="bg-orange-500 text-white text-xs">Due Soon</Badge>}
                            {status === "open" && <Badge className="bg-emerald-500 text-white text-xs">Open</Badge>}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mb-4">
                          <span className="flex items-center gap-1.5">
                            <Clock className="w-4 h-4" />
                            {lesson.durationMinutes} min timer
                          </span>
                          <span className={`flex items-center gap-1.5 ${status === "expired" ? "text-destructive" : status === "urgent" ? "text-orange-500" : ""}`}>
                            {status === "expired" ? <AlertTriangle className="w-4 h-4" /> : <CalendarClock className="w-4 h-4" />}
                            Deadline: {formatDeadline(lesson.deadline)}
                          </span>
                        </div>
                        <Link href={`/online-lesson/${lesson.id}`} data-testid={`link-start-lesson-${lesson.id}`}>
                          <Button
                            disabled={status === "expired"}
                            className="gap-2"
                            size="sm"
                          >
                            <PlayCircle className="w-4 h-4" />
                            {status === "expired" ? "Deadline Passed" : "Start Test"}
                          </Button>
                        </Link>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
