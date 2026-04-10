import { Link, useLocation } from "wouter";
import { BookOpen, LayoutDashboard, Menu, X, LogIn, UserPlus, LogOut, Settings } from "lucide-react";
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
    ] : []),
    ...(user?.isAdmin ? [
      { href: "/admin", label: "Admin", icon: Settings, testId: "admin" },
    ] : []),
  ];

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b" data-testid="navbar">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 h-16">
          <Link href="/" className="flex items-center gap-2 shrink-0" data-testid="link-home-logo">
            <motion.div
              className="w-10 h-10 rounded-md bg-primary flex items-center justify-center"
              whileHover={{ rotate: 10, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <BookOpen className="w-5 h-5 text-primary-foreground" />
            </motion.div>
            <div className="flex flex-col leading-tight">
              <span className="font-bold text-sm tracking-wide">SMART TIME</span>
              <span className="text-xs text-muted-foreground font-medium tracking-widest">EDUCATION</span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href} data-testid={`link-nav-${item.testId}`}>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    size="sm"
                    className="gap-2"
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </div>

          <div className="hidden md:flex items-center gap-1">
            <LanguageSwitcher />
            {user ? (
              <>
                <span className="text-sm text-muted-foreground px-2" data-testid="text-user-name">
                  {user.fullName}
                </span>
                <Button variant="ghost" size="sm" className="gap-2" onClick={handleLogout} data-testid="button-logout">
                  <LogOut className="w-4 h-4" />
                  {t.nav.logout}
                </Button>
              </>
            ) : (
              <>
                <Link href="/login" data-testid="link-nav-login">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <LogIn className="w-4 h-4" />
                    {t.nav.login}
                  </Button>
                </Link>
                <Link href="/register" data-testid="link-nav-register">
                  <Button size="sm" className="gap-2">
                    <UserPlus className="w-4 h-4" />
                    {t.nav.register}
                  </Button>
                </Link>
              </>
            )}
          </div>

          <div className="md:hidden flex items-center gap-1">
            <LanguageSwitcher />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(!mobileOpen)}
              data-testid="button-mobile-menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="md:hidden border-t bg-background/95 backdrop-blur-md"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="px-4 py-3 space-y-1">
              {navItems.map((item, i) => {
                const isActive = location === item.href;
                return (
                  <motion.div
                    key={item.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <Link href={item.href} data-testid={`link-mobile-nav-${item.testId}`}>
                      <Button
                        variant={isActive ? "default" : "ghost"}
                        className="w-full justify-start gap-2"
                        onClick={() => setMobileOpen(false)}
                      >
                        <item.icon className="w-4 h-4" />
                        {item.label}
                      </Button>
                    </Link>
                  </motion.div>
                );
              })}
              <div className="border-t pt-2 mt-2 space-y-1">
                {user ? (
                  <>
                    <div className="px-3 py-2 text-sm text-muted-foreground" data-testid="text-mobile-user-name">
                      {user.fullName}
                    </div>
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-2"
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
                      <Button
                        variant="ghost"
                        className="w-full justify-start gap-2"
                        onClick={() => setMobileOpen(false)}
                        data-testid="link-mobile-login"
                      >
                        <LogIn className="w-4 h-4" />
                        {t.nav.login}
                      </Button>
                    </Link>
                    <Link href="/register">
                      <Button
                        className="w-full justify-start gap-2"
                        onClick={() => setMobileOpen(false)}
                        data-testid="link-mobile-register"
                      >
                        <UserPlus className="w-4 h-4" />
                        {t.nav.register}
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
