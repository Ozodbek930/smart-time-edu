import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Mic, MicOff, Clock, ChevronDown, ChevronUp, Lightbulb, ArrowLeft, Send, CheckCircle, Play, Square, RotateCcw, Loader2, AlertTriangle } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { useI18n } from "@/lib/i18n";
import { apiRequest } from "@/lib/queryClient";
import type { SpeakingTest } from "@shared/schema";
import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { useCountdownTimer } from "@/hooks/use-countdown-timer";

function DifficultyBadge({ difficulty }: { difficulty: string }) {
  const variant = difficulty === "Easy" ? "secondary" : difficulty === "Medium" ? "default" : "destructive";
  return <Badge variant={variant}>{difficulty}</Badge>;
}

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
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setDuration(0);
      timerRef.current = setInterval(() => setDuration((d) => d + 1), 1000);
    } catch {
      setError("Нет доступа к микрофону. Разрешите доступ в браузере.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const reset = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setError(null);
  };

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  return { isRecording, audioBlob, audioUrl, duration, error, startRecording, stopRecording, reset };
}

function formatDuration(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

function RecordingSection({ 
  test, 
  timer 
}: { 
  test: SpeakingTest;
  timer: ReturnType<typeof useCountdownTimer>;
}) {
  const { toast } = useToast();
  const { isRecording, audioBlob, audioUrl, duration, error, startRecording, stopRecording, reset } = useAudioRecorder();
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    if (timer.isExpired && isRecording) {
      stopRecording();
      toast({ title: "Время вышло! Запись остановлена.", variant: "destructive" });
    }
  }, [timer.isExpired, isRecording]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!audioBlob) throw new Error("No recording");
      const ext = audioBlob.type.includes("webm") ? "webm" : "ogg";
      const formData = new FormData();
      formData.append("recording", audioBlob, `speaking-${test.id}.${ext}`);
      const uploadRes = await fetch("/api/speaking/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!uploadRes.ok) throw new Error("Upload failed");
      const { url } = await uploadRes.json();
      await apiRequest("POST", "/api/test-results", {
        testType: "speaking",
        testId: test.id,
        answers: { recordingUrl: url },
      });
    },
    onSuccess: () => {
      setIsSubmitted(true);
      toast({ title: "Запись отправлена преподавателю!" });
    },
    onError: () => {
      toast({ title: "Ошибка при отправке. Попробуйте ещё раз.", variant: "destructive" });
    },
  });

  if (isSubmitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="mt-4 flex items-center gap-2 text-green-600 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm font-medium"
        data-testid={`text-recording-submitted-${test.id}`}
      >
        <CheckCircle className="w-4 h-4 shrink-0" />
        Запись отправлена преподавателю!
      </motion.div>
    );
  }

  return (
    <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mic className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-primary">Запишите свой ответ</span>
        </div>
        {!isSubmitted && (
          <Badge 
            variant={timer.isCritical ? "destructive" : timer.isWarning ? "default" : "secondary"}
            className={`gap-1.5 py-1 px-3 ${timer.isWarning ? "animate-pulse" : ""}`}
            data-testid={`timer-speaking-${test.id}`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span className="font-mono font-bold">{timer.formattedTime}</span>
          </Badge>
        )}
      </div>

      {error && (
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</div>
      )}

      {!audioUrl ? (
        <div className="flex items-center gap-3">
          {!isRecording ? (
            <Button
              onClick={startRecording}
              className="gap-2 bg-red-500 hover:bg-red-600 text-white"
              size="sm"
              data-testid={`button-start-record-${test.id}`}
            >
              <Mic className="w-4 h-4" />
              Начать запись
            </Button>
          ) : (
            <>
              <motion.div
                className="w-3 h-3 rounded-full bg-red-500"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <span className="text-sm font-mono text-red-600 font-semibold">{formatDuration(duration)}</span>
              <Button
                onClick={stopRecording}
                variant="outline"
                size="sm"
                className="gap-2 border-red-300 text-red-600 hover:bg-red-50"
                data-testid={`button-stop-record-${test.id}`}
              >
                <Square className="w-3 h-3 fill-current" />
                Остановить
              </Button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <audio
            controls
            src={audioUrl}
            className="w-full h-10 rounded-lg"
            data-testid={`audio-preview-${test.id}`}
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={reset}
              className="gap-2"
              data-testid={`button-re-record-${test.id}`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Перезаписать
            </Button>
            <Button
              size="sm"
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending}
              className="gap-2 flex-1"
              data-testid={`button-submit-recording-${test.id}`}
            >
              {submitMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Отправка...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  Отправить преподавателю
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function SpeakingTestCard({ test, index }: { test: SpeakingTest; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const { t } = useI18n();

  const timer = useCountdownTimer(
    test.duration,
    () => {
      setIsFinished(true);
    },
    expanded && !isFinished
  );

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
                    <RecordingSection test={test} timer={timer} />
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
            <TabsList className="flex gap-1.5 p-1.5 rounded-2xl border border-border/60 bg-muted/40 w-fit h-auto shadow-sm">
              <TabsTrigger value="part1" data-testid="tab-part1" className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-primary/30 hover:bg-primary/10 hover:text-primary border border-transparent data-[state=active]:border-transparent">
                <span className="flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold bg-current/10 data-[state=active]:bg-white/20">1</span>
                <span>{t.speaking.part1}</span>
              </TabsTrigger>
              <TabsTrigger value="part2" data-testid="tab-part2" className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 data-[state=active]:bg-violet-600 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-violet-500/30 hover:bg-violet-50 hover:text-violet-600 dark:hover:bg-violet-950/40 dark:hover:text-violet-400 border border-transparent data-[state=active]:border-transparent">
                <span className="flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold">2</span>
                <span>{t.speaking.part2}</span>
              </TabsTrigger>
              <TabsTrigger value="part3" data-testid="tab-part3" className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 data-[state=active]:bg-rose-500 data-[state=active]:text-white data-[state=active]:shadow-md data-[state=active]:shadow-rose-500/30 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 border border-transparent data-[state=active]:border-transparent">
                <span className="flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold">3</span>
                <span>{t.speaking.part3}</span>
              </TabsTrigger>
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
