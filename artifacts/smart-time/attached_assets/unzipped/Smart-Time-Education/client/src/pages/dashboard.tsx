import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, Headphones, BookOpen, PenTool, ChevronRight, Award, Clock, FileCheck, LogOut } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import type { User, TestResult } from "@shared/schema";
import { useEffect } from "react";

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12 },
  },
};

export default function Dashboard() {
  const { t } = useI18n();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn<User | null>({ on401: "returnNull" }),
    retry: false,
  });

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/login");
    }
  }, [user, isLoading, setLocation]);

  if (!isLoading && !user) {
    return null;
  }

  const handleLogout = async () => {
    await apiRequest("POST", "/api/auth/logout");
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    setLocation("/");
  };

  const skills = [
    {
      icon: Mic,
      title: t.skills.speakingTitle,
      description: t.skills.speakingDesc,
      href: "/speaking",
      gradient: "from-amber-500 to-orange-600",
      bgColor: "bg-amber-50 dark:bg-amber-950/40",
      borderColor: "border-amber-200 dark:border-amber-800",
      iconBg: "bg-amber-500",
      hoverShadow: "hover:shadow-amber-200/50 dark:hover:shadow-amber-900/30",
    },
    {
      icon: Headphones,
      title: t.skills.listeningTitle,
      description: t.skills.listeningDesc,
      href: "/listening",
      gradient: "from-blue-500 to-cyan-600",
      bgColor: "bg-blue-50 dark:bg-blue-950/40",
      borderColor: "border-blue-200 dark:border-blue-800",
      iconBg: "bg-blue-500",
      hoverShadow: "hover:shadow-blue-200/50 dark:hover:shadow-blue-900/30",
    },
    {
      icon: BookOpen,
      title: t.skills.readingTitle,
      description: t.skills.readingDesc,
      href: "/reading",
      gradient: "from-emerald-500 to-teal-600",
      bgColor: "bg-emerald-50 dark:bg-emerald-950/40",
      borderColor: "border-emerald-200 dark:border-emerald-800",
      iconBg: "bg-emerald-500",
      hoverShadow: "hover:shadow-emerald-200/50 dark:hover:shadow-emerald-900/30",
    },
    {
      icon: PenTool,
      title: t.skills.writingTitle,
      description: t.skills.writingDesc,
      href: "/writing",
      gradient: "from-purple-500 to-pink-600",
      bgColor: "bg-purple-50 dark:bg-purple-950/40",
      borderColor: "border-purple-200 dark:border-purple-800",
      iconBg: "bg-purple-500",
      hoverShadow: "hover:shadow-purple-200/50 dark:hover:shadow-purple-900/30",
    },
  ];

  const { data: myResults } = useQuery<TestResult[]>({
    queryKey: ["/api/test-results/my"],
    enabled: !!user,
  });

  const testsCompleted = myResults?.length || 0;
  const scoredResults = myResults?.filter(r => r.score != null && r.totalQuestions && r.totalQuestions > 0) || [];
  const avgScore = scoredResults.length > 0
    ? Math.round(scoredResults.reduce((sum, r) => sum + ((r.score! / r.totalQuestions!) * 9), 0) / scoredResults.length * 10) / 10
    : 0;

  const progressStats = [
    { icon: FileCheck, value: String(testsCompleted), label: t.dashboardPage.testsCompleted, color: "text-amber-600" },
    { icon: Clock, value: String(testsCompleted > 0 ? Math.round(testsCompleted * 0.5) : 0), label: t.dashboardPage.practiceHours, color: "text-blue-600" },
    { icon: Award, value: avgScore > 0 ? String(avgScore) : "—", label: t.dashboardPage.currentBand, color: "text-emerald-600" },
  ];

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
        <motion.div
          className="w-12 h-12 rounded-xl bg-primary"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200 dark:border-slate-800" data-testid="dashboard-header">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2" data-testid="link-dashboard-logo">
              <motion.div
                className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20"
                whileHover={{ rotate: 10, scale: 1.1 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <BookOpen className="w-4.5 h-4.5 text-white" />
              </motion.div>
              <div className="flex flex-col leading-tight">
                <span className="font-bold text-sm tracking-wide">SMART TIME</span>
                <span className="text-[10px] text-muted-foreground font-medium tracking-widest">EDUCATION</span>
              </div>
            </Link>

            <div className="flex items-center gap-3">
              <LanguageSwitcher />
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xs font-bold">
                  {user.fullName.charAt(0).toUpperCase()}
                </div>
                <span className="text-sm font-medium" data-testid="text-dashboard-user">{user.fullName}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground hover:text-foreground"
                onClick={handleLogout}
                data-testid="button-dashboard-logout"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">{t.nav.logout}</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="space-y-10"
        >
          <motion.div variants={fadeInUp} transition={{ duration: 0.5 }} className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold" data-testid="text-dashboard-welcome">
              {t.dashboardPage.welcome}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600">{user.fullName.split(" ")[0]}</span>!
            </h1>
            <p className="text-muted-foreground text-lg">{t.dashboardPage.subtitle}</p>
          </motion.div>

          <motion.div variants={fadeInUp} transition={{ duration: 0.5 }}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {progressStats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
                >
                  <Card className="border-slate-200 dark:border-slate-800">
                    <CardContent className="p-5 flex items-center gap-4">
                      <div className={`w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center ${stat.color}`}>
                        <stat.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold">{stat.value}</div>
                        <div className="text-xs text-muted-foreground">{stat.label}</div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </motion.div>

          <motion.div variants={fadeInUp} transition={{ duration: 0.5 }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {skills.map((skill, i) => (
                <motion.div
                  key={skill.title}
                  variants={fadeInUp}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                >
                  <Link href={skill.href}>
                    <motion.div
                      whileHover={{ y: -6, scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 400, damping: 25 }}
                    >
                      <Card
                        className={`cursor-pointer overflow-hidden ${skill.bgColor} ${skill.borderColor} border-2 ${skill.hoverShadow} hover:shadow-xl transition-shadow duration-300`}
                        data-testid={`card-dashboard-${skill.title.toLowerCase()}`}
                      >
                        <CardContent className="p-0">
                          <div className="flex items-stretch">
                            <div className={`w-24 sm:w-28 flex items-center justify-center bg-gradient-to-br ${skill.gradient} shrink-0`}>
                              <motion.div
                                whileHover={{ rotate: [0, -15, 15, 0], scale: 1.15 }}
                                transition={{ duration: 0.5 }}
                              >
                                <skill.icon className="w-10 h-10 text-white" />
                              </motion.div>
                            </div>
                            <div className="flex-1 p-5 space-y-2">
                              <h3 className="text-xl font-bold">{skill.title}</h3>
                              <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{skill.description}</p>
                              <div className="flex items-center gap-1 text-sm font-semibold pt-1 opacity-70 group-hover:opacity-100">
                                {t.skills.start}
                                <ChevronRight className="w-4 h-4" />
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
