import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen, UserPlus, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/lib/i18n";
import { motion } from "framer-motion";

export default function Register() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [form, setForm] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    parentPhone: "",
  });

  const registerMutation = useMutation({
    mutationFn: async () => {
      if (form.password !== form.confirmPassword) {
        throw new Error(t.auth.passwordMismatch);
      }
      const res = await apiRequest("POST", "/api/auth/register", {
        username: form.username,
        password: form.password,
        fullName: form.fullName,
        parentPhone: form.parentPhone,
        email: form.email,
      });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: t.auth.registerSuccess });
      setLocation("/login");
    },
    onError: (err: Error) => {
      toast({ title: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate();
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
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

      <div className="relative flex-1 flex items-center justify-center px-4 py-12">
        <motion.div
          className="w-full max-w-md space-y-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center">
            <Link href="/">
              <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back">
                <ArrowLeft className="w-4 h-4" />
                {t.common.back}
              </Button>
            </Link>
          </div>

          <div className="text-center space-y-2">
            <Link href="/" className="inline-flex items-center gap-2 mb-4" data-testid="link-register-logo">
              <motion.div
                className="w-12 h-12 rounded-md bg-primary flex items-center justify-center"
                whileHover={{ rotate: 10, scale: 1.1 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <BookOpen className="w-6 h-6 text-primary-foreground" />
              </motion.div>
              <div className="flex flex-col leading-tight text-left">
                <span className="font-bold tracking-wide">SMART TIME</span>
                <span className="text-xs text-muted-foreground tracking-widest">EDUCATION</span>
              </div>
            </Link>
            <h1 className="text-2xl font-bold" data-testid="text-register-title">{t.auth.createAccount}</h1>
            <p className="text-sm text-muted-foreground">{t.auth.createAccountDesc}</p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card>
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">{t.auth.fullName}</Label>
                    <Input
                      id="fullName"
                      value={form.fullName}
                      onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                      placeholder={t.auth.fullNamePlaceholder}
                      required
                      data-testid="input-fullname"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="username">{t.auth.username}</Label>
                    <Input
                      id="username"
                      value={form.username}
                      onChange={(e) => setForm({ ...form, username: e.target.value })}
                      placeholder={t.auth.usernamePlaceholder}
                      required
                      data-testid="input-username"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="example@gmail.com"
                      required
                      data-testid="input-email"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="parentPhone">{t.auth.parentPhone}</Label>
                    <Input
                      id="parentPhone"
                      type="tel"
                      value={form.parentPhone}
                      onChange={(e) => setForm({ ...form, parentPhone: e.target.value })}
                      placeholder={t.auth.parentPhonePlaceholder}
                      required
                      data-testid="input-parent-phone"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">{t.auth.password}</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        placeholder={t.auth.passwordPlaceholder}
                        required
                        data-testid="input-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0"
                        onClick={() => setShowPassword(!showPassword)}
                        data-testid="button-toggle-password"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">{t.auth.confirmPassword}</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirm ? "text" : "password"}
                        value={form.confirmPassword}
                        onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                        placeholder={t.auth.confirmPasswordPlaceholder}
                        required
                        data-testid="input-confirm-password"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0"
                        onClick={() => setShowConfirm(!showConfirm)}
                        data-testid="button-toggle-confirm"
                      >
                        {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full gap-2"
                    disabled={registerMutation.isPending}
                    data-testid="button-register-submit"
                  >
                    {registerMutation.isPending ? (
                      t.auth.signingUp
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4" />
                        {t.auth.signUp}
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>

          <p className="text-center text-sm text-muted-foreground" data-testid="text-has-account">
            {t.auth.hasAccount}{" "}
            <Link href="/login" className="text-primary font-medium hover:underline" data-testid="link-to-login">
              {t.auth.signIn}
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
