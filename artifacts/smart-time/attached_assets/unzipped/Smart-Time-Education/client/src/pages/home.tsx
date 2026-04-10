import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, Headphones, BookOpen, Star, Users, TrendingUp, CheckCircle, GraduationCap } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { useI18n } from "@/lib/i18n";
import { motion } from "framer-motion";

const fadeInUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0 },
};

const fadeInLeft = {
  hidden: { opacity: 0, x: -40 },
  visible: { opacity: 1, x: 0 },
};

const fadeInRight = {
  hidden: { opacity: 0, x: 40 },
  visible: { opacity: 1, x: 0 },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { opacity: 1, scale: 1 },
};

const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.15,
    },
  },
};

export default function Home() {
  const { t } = useI18n();

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

      <section className="relative overflow-hidden" data-testid="section-hero">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5" />
        <motion.div
          className="absolute top-20 right-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-10 left-10 w-96 h-96 bg-primary/5 rounded-full blur-3xl"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <motion.div
            className="max-w-3xl mx-auto text-center space-y-6"
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            <motion.div variants={fadeInUp} transition={{ duration: 0.5 }}>
              <Badge variant="secondary" className="px-4 py-1.5 text-sm">
                {t.hero.badge}
              </Badge>
            </motion.div>

            <motion.h1
              className="text-4xl md:text-6xl font-bold tracking-tight leading-tight"
              data-testid="text-hero-title"
              variants={fadeInUp}
              transition={{ duration: 0.6 }}
            >
              {t.hero.title1}{" "}
              <motion.span
                className="text-primary inline-block"
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                SMART TIME
              </motion.span>
              <br />
              {t.hero.title2}
            </motion.h1>

            <motion.p
              className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto"
              data-testid="text-hero-subtitle"
              variants={fadeInUp}
              transition={{ duration: 0.6 }}
            >
              {t.hero.subtitle}
            </motion.p>

            <motion.div
              className="flex flex-wrap justify-center gap-3 pt-4"
              variants={fadeInUp}
              transition={{ duration: 0.6 }}
            >
              <Link href="/register">
                <Button size="lg" className="gap-2 text-base" data-testid="button-get-started">
                  <GraduationCap className="w-5 h-5" />
                  {t.auth.signUp}
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      <motion.section
        className="py-12 border-y bg-card/50"
        data-testid="section-stats"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={staggerContainer}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                className="text-center space-y-2"
                data-testid={`stat-${stat.label.toLowerCase().replace(/\s+/g, "-")}`}
                variants={scaleIn}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <motion.div
                  className="inline-flex items-center justify-center w-10 h-10 rounded-md bg-primary/10 text-primary mx-auto"
                  whileHover={{ scale: 1.2, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <stat.icon className="w-5 h-5" />
                </motion.div>
                <div className="text-2xl md:text-3xl font-bold">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      <motion.section
        className="py-16 md:py-24"
        data-testid="section-about"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div className="space-y-6" variants={fadeInLeft} transition={{ duration: 0.7 }}>
              <h2 className="text-3xl md:text-4xl font-bold" data-testid="text-about-title">{t.about.title}</h2>
              <p className="text-muted-foreground leading-relaxed">{t.about.desc1}</p>
              <p className="text-muted-foreground leading-relaxed">{t.about.desc2}</p>
            </motion.div>

            <motion.div
              className="space-y-4"
              variants={fadeInRight}
              transition={{ duration: 0.7 }}
            >
              <h3 className="text-xl font-semibold mb-4">{t.about.whyTitle}</h3>
              {reasons.map((reason, i) => (
                <motion.div
                  key={i}
                  className="flex items-start gap-3"
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.1 }}
                >
                  <CheckCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{reason}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </motion.section>

      <motion.section
        className="py-16 md:py-24"
        data-testid="section-tips"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={staggerContainer}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div className="text-center mb-12 space-y-3" variants={fadeInUp} transition={{ duration: 0.6 }}>
            <h2 className="text-3xl md:text-4xl font-bold">{t.tips.title}</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{t.tips.subtitle}</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              { title: t.tips.speakingTip, content: t.tips.speakingContent, icon: Mic },
              { title: t.tips.listeningTip, content: t.tips.listeningContent, icon: Headphones },
              { title: t.tips.timeManagement, content: t.tips.timeContent, icon: Star },
              { title: t.tips.bandScore, content: t.tips.bandContent, icon: TrendingUp },
            ].map((tip, i) => (
              <motion.div
                key={tip.title}
                variants={fadeInUp}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              >
                <motion.div whileHover={{ scale: 1.02 }} transition={{ type: "spring", stiffness: 300 }}>
                  <Card className="h-full" data-testid={`card-tip-${i}`}>
                    <CardContent className="p-6 flex gap-4">
                      <motion.div
                        className="shrink-0 w-10 h-10 rounded-md bg-primary/10 text-primary flex items-center justify-center"
                        whileHover={{ rotate: 360 }}
                        transition={{ duration: 0.6 }}
                      >
                        <tip.icon className="w-5 h-5" />
                      </motion.div>
                      <div className="space-y-1.5">
                        <h3 className="font-semibold">{tip.title}</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">{tip.content}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      <Footer />
    </div>
  );
}
