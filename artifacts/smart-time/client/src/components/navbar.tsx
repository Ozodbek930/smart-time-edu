import { Link, useLocation } from "wouter";
import { BookOpen, LayoutDashboard, Menu, X, LogIn, UserPlus, LogOut, Settings, Video } from "lucide-react";
import logoImg from "@assets/image_1772783424448.jpg";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import type { User } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";

export function Navbar() {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const { data: user } = useQuery<User | null>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn<User | null>({ on401: "returnNull" }),
    retry: false,
  });

  const handleLogout = async () => {
    await apiRequest("POST", "/api/auth/logout");
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
  };

  const navItems = [
    { href: "/", label: t.nav.home, icon: BookOpen, testId: "home" },
    ...(user ? [
      { href: "/dashboard", label: t.nav.dashboard, icon: LayoutDashboard, testId: "dashboard" },
      { href: "/online-lessons", label: "Online Lessons", icon: Video, testId: "online-lessons" },
    ] : []),
    ...(user?.isAdmin ? [
      { href: "/admin", label: "Admin", icon: Settings, testId: "admin" },
    ] : []),
  ];

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/60" data-testid="navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16 gap-4">

          <Link href="/" className="flex items-center gap-3 shrink-0 group" data-testid="link-home-logo">
            <div className="relative">
              <motion.img
                src={logoImg}
                alt="Smart Time Education"
                className="h-9 w-9 object-cover rounded-xl shadow-sm"
                whileHover={{ scale: 1.1, rotate: 3 }}
                transition={{ type: "spring", stiffness: 400 }}
              />
              <div className="absolute inset-0 rounded-xl ring-2 ring-primary/0 group-hover:ring-primary/30 transition-all duration-200" />
            </div>
            <span className="hidden sm:block font-bold text-sm tracking-wide text-foreground/90">
              SMART TIME
            </span>
          </Link>

          <div className="flex-1 hidden md:flex justify-center items-center gap-0.5">
            {navItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href} data-testid={`link-nav-${item.testId}`}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`gap-2 font-medium text-sm transition-all ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-foreground/70 hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </div>

          <div className="hidden md:flex items-center gap-2 ml-auto">
            <LanguageSwitcher />
            {user ? (
              <>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted/60">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                    {user.fullName.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-foreground/80" data-testid="text-user-name">
                    {user.fullName}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-2 text-foreground/60 hover:text-foreground hover:bg-muted"
                  onClick={handleLogout}
                  data-testid="button-logout"
                >
                  <LogOut className="w-4 h-4" />
                  {t.nav.logout}
                </Button>
              </>
            ) : (
              <>
                <Link href="/login" data-testid="link-nav-login">
                  <Button variant="ghost" size="sm" className="gap-2 text-foreground/70 hover:text-foreground">
                    <LogIn className="w-4 h-4" />
                    {t.nav.login}
                  </Button>
                </Link>
                <Link href="/register" data-testid="link-nav-register">
                  <Button size="sm" className="gap-2 shadow-sm">
                    <UserPlus className="w-4 h-4" />
                    {t.nav.register}
                  </Button>
                </Link>
              </>
            )}
          </div>

          <div className="md:hidden flex items-center gap-2 ml-auto">
            <LanguageSwitcher />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(!mobileOpen)}
              data-testid="button-mobile-menu"
              className="text-foreground/70"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="md:hidden border-t border-border/60 bg-background/95 backdrop-blur-xl"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="px-4 py-3 space-y-1">
              {navItems.map((item, i) => {
                const isActive = location === item.href;
                return (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <Link href={item.href} data-testid={`link-mobile-nav-${item.testId}`}>
                      <Button
                        variant="ghost"
                        className={`w-full justify-start gap-2 font-medium ${isActive ? "bg-primary/10 text-primary" : "text-foreground/70"}`}
                        onClick={() => setMobileOpen(false)}
                      >
                        <item.icon className="w-4 h-4" />
                        {item.label}
                      </Button>
                    </Link>
                  </motion.div>
                );
              })}
              <div className="border-t border-border/60 pt-2 mt-2 space-y-1">
                {user ? (
                  <>
                    <div className="flex items-center gap-2 px-3 py-2">
                      <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                        {user.fullName.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium" data-testid="text-mobile-user-name">{user.fullName}</span>
                    </div>
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-2 text-foreground/70"
                      onClick={() => { handleLogout(); setMobileOpen(false); }}
                      data-testid="button-mobile-logout"
                    >
                      <LogOut className="w-4 h-4" />
                      {t.nav.logout}
                    </Button>
                  </>
                ) : (
                  <>
                    <Link href="/login">
                      <Button variant="ghost" className="w-full justify-start gap-2 text-foreground/70" onClick={() => setMobileOpen(false)} data-testid="link-mobile-login">
                        <LogIn className="w-4 h-4" />{t.nav.login}
                      </Button>
                    </Link>
                    <Link href="/register">
                      <Button className="w-full justify-start gap-2" onClick={() => setMobileOpen(false)} data-testid="link-mobile-register">
                        <UserPlus className="w-4 h-4" />{t.nav.register}
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
