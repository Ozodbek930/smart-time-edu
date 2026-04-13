import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Mic, Headphones, BookOpen, PenTool, Star, Users, TrendingUp,
  CheckCircle, GraduationCap, Trophy, ArrowRight, Sparkles, Zap
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { useI18n } from "@/lib/i18n";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import type { User } from "@shared/schema";

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const modules = [
  {
    icon: Mic,
    label: "Speaking",
    href: "/speaking",
    color: "from-rose-500 to-pink-600",
    bg: "bg-rose-500/10 dark:bg-rose-500/15",
    ring: "ring-rose-500/20",
    text: "text-rose-600 dark:text-rose-400",
  },
  {
    icon: Headphones,
    label: "Listening",
    href: "/listening",
    color: "from-amber-400 to-yellow-500",
    bg: "bg-amber-400/10 dark:bg-amber-400/15",
    ring: "ring-amber-400/20",
    text: "text-amber-600 dark:text-amber-400",
  },
  {
    icon: BookOpen,
    label: "Reading",
    href: "/reading",
    color: "from-emerald-500 to-teal-600",
    bg: "bg-emerald-500/10 dark:bg-emerald-500/15",
    ring: "ring-emerald-500/20",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  {
    icon: PenTool,
    label: "Writing",
    href: "/writing",
    color: "from-orange-500 to-amber-600",
    bg: "bg-orange-500/10 dark:bg-orange-500/15",
    ring: "ring-orange-500/20",
    text: "text-orange-600 dark:text-orange-400",
  },
  {
    icon: Trophy,
    label: "Full Mock",
    href: "/fullmock",
    color: "from-amber-500 to-orange-600",
    bg: "bg-amber-500/10 dark:bg-amber-500/15",
    ring: "ring-amber-500/20",
    text: "text-amber-600 dark:text-amber-400",
  },
];

export default function Home() {
  const { t } = useI18n();
  const { data: user } = useQuery<User | null>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const stats = [
    { value: "50+", label: t.stats.practiceTests, icon: BookOpen },
    { value: "1000+", label: t.stats.students, icon: Users },
    { value: "7.5+", label: t.stats.avgBandScore, icon: Star },
    { value: "95%", label: t.stats.successRate, icon: TrendingUp },
  ];

  const reasons = [
    t.about.reason1,
    t.about.reason2,
    t.about.reason3,
    t.about.reason4,
    t.about.reason5,
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      {/* ── HERO ── */}
      <section className="relative overflow-hidden" data-testid="section-hero">
        <div className="hero-grid-bg absolute inset-0" />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-background" />

        <motion.div
          className="absolute -top-24 -right-24 w-[500px] h-[500px] rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, hsl(230,85%,65%), transparent 70%)" }}
          animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.25, 0.15] }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute -bottom-32 -left-32 w-[600px] h-[600px] rounded-full opacity-10 blur-3xl"
          style={{ background: "radial-gradient(circle, hsl(265,80%,62%), transparent 70%)" }}
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.08, 0.18, 0.08] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-20 md:pt-36 md:pb-28">
          <motion.div
            className="max-w-4xl mx-auto text-center space-y-7"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} transition={{ duration: 0.5 }}>
              <Badge
                variant="secondary"
                className="px-4 py-1.5 text-xs font-semibold tracking-widest uppercase gap-2 border border-primary/20 bg-primary/8"
              >
                <Sparkles className="w-3 h-3 text-primary" />
                <span className="text-primary">{t.hero.badge}</span>
              </Badge>
            </motion.div>

            <motion.h1
              className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.05]"
              data-testid="text-hero-title"
              variants={fadeInUp}
              transition={{ duration: 0.6 }}
            >
              {t.hero.title1}{" "}
              <span className="gradient-text">SMART TIME</span>
              <br />
              <span className="text-foreground/90">{t.hero.title2}</span>
            </motion.h1>

            <motion.p
              className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
              data-testid="text-hero-subtitle"
              variants={fadeInUp}
              transition={{ duration: 0.6 }}
            >
              {t.hero.subtitle}
            </motion.p>

            <motion.div
              className="flex flex-wrap justify-center gap-3 pt-2"
              variants={fadeInUp}
              transition={{ duration: 0.6 }}
            >
              {user ? (
                <Link href="/dashboard">
                  <Button size="lg" className="gap-2 text-base px-8 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all" data-testid="button-go-dashboard">
                    <GraduationCap className="w-5 h-5" />
                    {t.dashboardPage.myDashboard}
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/register">
                    <Button size="lg" className="gap-2 text-base px-8 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all" data-testid="button-get-started">
                      <GraduationCap className="w-5 h-5" />
                      {t.auth.signUp}
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button size="lg" variant="outline" className="gap-2 text-base px-8 border-border/80 hover:bg-muted/60">
                      {t.nav.login}
                    </Button>
                  </Link>
                </>
              )}
            </motion.div>
          </motion.div>

          {/* Module cards */}
          <motion.div
            className="mt-16 md:mt-20 flex flex-wrap justify-center gap-3"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            {modules.map((mod, i) => (
              <motion.div
                key={mod.label}
                variants={fadeInUp}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                whileHover={{ y: -4, scale: 1.04 }}
              >
                <Link href={mod.href}>
                  <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl border ${mod.bg} ring-1 ${mod.ring} cursor-pointer transition-all duration-200 hover:shadow-lg`}>
                    <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${mod.color} flex items-center justify-center shadow-sm`}>
                      <mod.icon className="w-4 h-4 text-white" />
                    </div>
                    <span className={`font-semibold text-sm ${mod.text}`}>{mod.label}</span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── STATS ── */}
      <motion.section
        className="py-14 border-y border-border/60 bg-muted/30"
        data-testid="section-stats"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={staggerContainer}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                className="text-center space-y-2"
                data-testid={`stat-${i}`}
                variants={fadeInUp}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <motion.div
                  className="inline-flex items-center justify-center w-11 h-11 rounded-xl bg-primary/10 text-primary mx-auto ring-1 ring-primary/15"
                  whileHover={{ scale: 1.15, rotate: 6 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <stat.icon className="w-5 h-5" />
                </motion.div>
                <div className="text-3xl md:text-4xl font-black gradient-text">{stat.value}</div>
                <div className="text-sm text-muted-foreground font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ── MODULES GRID ── */}
      <motion.section
        className="py-20 md:py-28"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        variants={staggerContainer}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-14 space-y-3" variants={fadeInUp} transition={{ duration: 0.6 }}>
            <Badge variant="secondary" className="px-3 py-1 text-xs font-semibold tracking-widest uppercase text-primary bg-primary/8 border border-primary/20">
              <Zap className="w-3 h-3 mr-1" /> {t.skills.allModules}
            </Badge>
            <h2 className="text-3xl md:text-5xl font-black tracking-tight">
              {t.skills.modulesHeading}
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{t.skills.modulesSubtitle}</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: Mic, label: "Speaking", desc: t.skills.speakingModuleDesc, color: "from-rose-500 to-pink-600", bg: "bg-rose-500/5", border: "border-rose-500/15", href: "/speaking" },
              { icon: Headphones, label: "Listening", desc: t.skills.listeningModuleDesc, color: "from-amber-400 to-yellow-500", bg: "bg-amber-400/5", border: "border-amber-400/15", href: "/listening" },
              { icon: BookOpen, label: "Reading", desc: t.skills.readingModuleDesc, color: "from-emerald-500 to-teal-600", bg: "bg-emerald-500/5", border: "border-emerald-500/15", href: "/reading" },
              { icon: PenTool, label: "Writing", desc: t.skills.writingModuleDesc, color: "from-orange-500 to-amber-600", bg: "bg-orange-500/5", border: "border-orange-500/15", href: "/writing" },
              { icon: Trophy, label: t.skills.fullmockTitle, desc: t.skills.fullmockModuleDesc, color: "from-amber-500 to-orange-600", bg: "bg-amber-500/5", border: "border-amber-500/15", href: "/fullmock" },
              { icon: Sparkles, label: t.skills.aiFeedbackLabel, desc: t.skills.aiFeedbackModuleDesc, color: "from-yellow-500 to-amber-500", bg: "bg-yellow-500/5", border: "border-yellow-500/15", href: "/writing" },
            ].map((item, i) => (
              <motion.div
                key={item.label}
                variants={fadeInUp}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                whileHover={{ y: -3 }}
              >
                <Link href={item.href}>
                  <div className={`h-full p-6 rounded-2xl border ${item.border} ${item.bg} cursor-pointer group transition-all duration-200 hover:shadow-lg hover:border-opacity-40`}>
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${item.color} flex items-center justify-center shadow-md mb-4 group-hover:scale-110 transition-transform duration-200`}>
                      <item.icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-bold text-lg mb-1.5">{item.label}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
                    <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-primary opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      {t.skills.goTo} <ArrowRight className="w-3 h-3" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* ── ABOUT ── */}
      <motion.section
        className="py-20 md:py-28 bg-muted/20 border-y border-border/60"
        data-testid="section-about"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.15 }}
        variants={staggerContainer}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
            <motion.div className="space-y-6" variants={fadeInUp} transition={{ duration: 0.7 }}>
              <Badge variant="secondary" className="px-3 py-1 text-xs font-semibold tracking-widest uppercase text-primary bg-primary/8 border border-primary/20">
                {t.about.badge}
              </Badge>
              <h2 className="text-3xl md:text-4xl font-black leading-tight" data-testid="text-about-title">
                {t.about.title}
              </h2>
              <p className="text-muted-foreground leading-relaxed text-base">{t.about.desc1}</p>
              <p className="text-muted-foreground leading-relaxed text-base">{t.about.desc2}</p>
              <Link href="/register">
                <Button className="gap-2 mt-2 shadow-md shadow-primary/20">
                  <GraduationCap className="w-4 h-4" />
                  {t.about.startFree}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
            </motion.div>

            <motion.div className="space-y-3" variants={fadeInUp} transition={{ duration: 0.7, delay: 0.1 }}>
              <h3 className="text-lg font-bold mb-5">{t.about.whyTitle}</h3>
              {reasons.map((reason, i) => (
                <motion.div
                  key={i}
                  className="flex items-start gap-3 p-4 rounded-xl bg-card border border-border/60 hover:border-primary/20 hover:shadow-sm transition-all duration-200"
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                >
                  <div className="w-6 h-6 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <span className="text-sm text-muted-foreground leading-relaxed">{reason}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* ── CTA ── */}
      <motion.section
        className="py-20 md:py-28 relative overflow-hidden"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/8 via-transparent to-violet-500/5" />
        <div className="hero-grid-bg absolute inset-0 opacity-50" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center space-y-7">
          <motion.div
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-violet-600 shadow-2xl shadow-primary/30 mx-auto"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          >
            <Trophy className="w-8 h-8 text-white" />
          </motion.div>
          <h2 className="text-3xl md:text-5xl font-black">
            {t.about.ctaTitle}
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            {t.about.ctaDesc}
          </p>
          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link href="/register">
              <Button size="lg" className="gap-2 px-10 text-base shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 transition-all" data-testid="button-cta-register">
                <GraduationCap className="w-5 h-5" />
                {t.auth.signUp}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </motion.section>

      <Footer />
    </div>
  );
}
