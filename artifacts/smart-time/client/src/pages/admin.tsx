import { useState, useRef, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useI18n } from "@/lib/i18n";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, ArrowLeft, LogOut, Plus, Pencil, Trash2,
  Upload, Music, FileText, Users, BarChart3, Settings,
  Trophy, Link2, Eye, EyeOff, CalendarClock, GraduationCap,
  ClipboardList, ChevronRight, ChevronUp,
  Mic, Headphones, PenTool, Layers, Home as HomeIcon, X, Check, CheckCircle, ChevronDown
} from "lucide-react";
import { QuestionBuilder, type BuilderQuestion } from "@/components/question-builder";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import type {
  User,
  SpeakingTest,
  ListeningTest,
  ReadingTest,
  WritingTest,
  SiteContent,
  TestResult,
  ListeningQuestion,
  ReadingQuestion,
  FullMockTest,
  ListeningTestSection,
  ReadingTestSection,
  OnlineLesson,
  OnlineLessonQuestion,
  OnlineLessonResult,
} from "@shared/schema";

type TestType = "speaking" | "listening" | "reading" | "writing";

export default function Admin() {
  const [, setLocation] = useLocation();
  const { t } = useI18n();

  const { data: user, isLoading: userLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn<User | null>({ on401: "returnNull" }),
    retry: false,
  });

  useEffect(() => {
    if (!userLoading && (!user || !user.isAdmin)) {
      setLocation("/");
    }
  }, [user, userLoading, setLocation]);

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-amber-50 via-white to-orange-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <motion.div
          className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  if (!user || !user.isAdmin) {
    return null;
  }

  return <AdminDashboard user={user} />;
}

function AdminDashboard({ user }: { user: User }) {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleLogout = async () => {
    await apiRequest("POST", "/api/auth/logout");
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50/50 via-white to-orange-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-amber-200/50 dark:border-slate-800" data-testid="admin-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <motion.div
                className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/20"
                whileHover={{ rotate: 10, scale: 1.1 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <Settings className="w-5 h-5 text-white" />
              </motion.div>
              <div>
                <h1 className="font-bold text-lg" data-testid="text-admin-title">Admin Panel</h1>
                <p className="text-xs text-muted-foreground">SMART TIME EDUCATION</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link href="/dashboard">
                <Button variant="outline" size="sm" className="gap-2" data-testid="button-back-dashboard">
                  <ArrowLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </Button>
              </Link>
              <Button variant="ghost" size="sm" className="gap-2" onClick={handleLogout} data-testid="button-admin-logout">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Tabs defaultValue="homepage" data-testid="admin-tabs">
            <div className="mb-6 overflow-x-auto pb-2">
              <TabsList className="flex gap-2 min-w-max p-1.5 rounded-2xl h-auto bg-muted/40 border border-border/60 shadow-sm" data-testid="admin-tabs-list">
                <TabsTrigger value="homepage" data-testid="tab-homepage" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-transparent text-muted-foreground transition-all duration-200 data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-primary/30 data-[state=active]:border-transparent hover:bg-primary/10 hover:text-primary">
                  <HomeIcon className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">Homepage</span>
                </TabsTrigger>
                <TabsTrigger value="speaking" data-testid="tab-speaking" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-transparent text-muted-foreground transition-all duration-200 data-[state=active]:bg-rose-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-rose-500/30 data-[state=active]:border-transparent hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400">
                  <Mic className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">Speaking</span>
                </TabsTrigger>
                <TabsTrigger value="listening" data-testid="tab-listening" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-transparent text-muted-foreground transition-all duration-200 data-[state=active]:bg-blue-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-blue-500/30 data-[state=active]:border-transparent hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/40 dark:hover:text-blue-400">
                  <Headphones className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">Listening</span>
                </TabsTrigger>
                <TabsTrigger value="reading" data-testid="tab-reading" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-transparent text-muted-foreground transition-all duration-200 data-[state=active]:bg-emerald-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-emerald-500/30 data-[state=active]:border-transparent hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-400">
                  <BookOpen className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">Reading</span>
                </TabsTrigger>
                <TabsTrigger value="writing" data-testid="tab-writing" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-transparent text-muted-foreground transition-all duration-200 data-[state=active]:bg-violet-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-violet-500/30 data-[state=active]:border-transparent hover:bg-violet-50 hover:text-violet-600 dark:hover:bg-violet-950/40 dark:hover:text-violet-400">
                  <PenTool className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">Writing</span>
                </TabsTrigger>
                <TabsTrigger value="fullmock" data-testid="tab-fullmock" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-transparent text-muted-foreground transition-all duration-200 data-[state=active]:bg-amber-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-amber-500/30 data-[state=active]:border-transparent hover:bg-amber-50 hover:text-amber-600 dark:hover:bg-amber-950/40 dark:hover:text-amber-400">
                  <Trophy className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">Full Mock</span>
                </TabsTrigger>
                <TabsTrigger value="users" data-testid="tab-users" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-transparent text-muted-foreground transition-all duration-200 data-[state=active]:bg-cyan-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-cyan-500/30 data-[state=active]:border-transparent hover:bg-cyan-50 hover:text-cyan-600 dark:hover:bg-cyan-950/40 dark:hover:text-cyan-400">
                  <Users className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">Users</span>
                </TabsTrigger>
                <TabsTrigger value="results" data-testid="tab-results" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-transparent text-muted-foreground transition-all duration-200 data-[state=active]:bg-orange-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-orange-500/30 data-[state=active]:border-transparent hover:bg-orange-50 hover:text-orange-600 dark:hover:bg-orange-950/40 dark:hover:text-orange-400">
                  <BarChart3 className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">Results</span>
                </TabsTrigger>
                <TabsTrigger value="onlinelessons" data-testid="tab-onlinelessons" className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-transparent text-muted-foreground transition-all duration-200 data-[state=active]:bg-teal-500 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=active]:shadow-teal-500/30 data-[state=active]:border-transparent hover:bg-teal-50 hover:text-teal-600 dark:hover:bg-teal-950/40 dark:hover:text-teal-400">
                  <BookOpen className="w-4 h-4 shrink-0" />
                  <span className="hidden sm:inline">Online Lessons</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="homepage"><HomepageContentTab /></TabsContent>
            <TabsContent value="speaking"><SpeakingTestsTab /></TabsContent>
            <TabsContent value="listening"><ListeningTestsTab /></TabsContent>
            <TabsContent value="reading"><ReadingTestsTab /></TabsContent>
            <TabsContent value="writing"><WritingTestsTab /></TabsContent>
            <TabsContent value="fullmock"><FullMockTab /></TabsContent>
            <TabsContent value="users"><UsersTab /></TabsContent>
            <TabsContent value="results"><TestResultsTab /></TabsContent>
            <TabsContent value="onlinelessons"><OnlineLessonsTab /></TabsContent>
          </Tabs>
        </motion.div>
      </main>
    </div>
  );
}

function FileUploadButton({ onUploaded, accept, label, icon: Icon }: {
  onUploaded: (url: string) => void;
  accept: string;
  label: string;
  icon: typeof Upload;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Upload failed");
      }
      const data = await res.json();
      onUploaded(data.url);
      toast({ title: `File "${data.filename}" uploaded` });
    } catch (err: any) {
      toast({ title: "Upload error", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div>
      <input ref={fileRef} type="file" accept={accept} onChange={handleUpload} className="hidden" data-testid="input-file-upload" />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="gap-2"
        data-testid="button-upload-file"
      >
        <Icon className="w-4 h-4" />
        {uploading ? "Uploading..." : label}
      </Button>
    </div>
  );
}

function HomepageContentTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: content, isLoading } = useQuery<SiteContent[]>({
    queryKey: ["/api/admin/site-content"],
    queryFn: getQueryFn<SiteContent[]>({ on401: "throw" }),
  });

  const defaultKeys = [
    { key: "hero_title", label: "Hero Title" },
    { key: "hero_subtitle", label: "Hero Subtitle" },
    { key: "about_text", label: "About Text" },
    { key: "features_title", label: "Features Title" },
    { key: "contact_email", label: "Contact Email" },
    { key: "footer_text", label: "Footer Text" },
  ];

  const updateMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      await apiRequest("PUT", "/api/admin/site-content", { key, value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/site-content"] });
      toast({ title: "Content updated successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const getValueForKey = (key: string) => content?.find((c) => c.key === key)?.value || "";

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  }

  return (
    <Card className="border-amber-200/50 dark:border-slate-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><HomeIcon className="w-5 h-5 text-amber-600" /> Homepage Content</CardTitle>
        <CardDescription>Edit the text content displayed on the homepage</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {defaultKeys.map((item) => (
          <ContentRow
            key={item.key}
            label={item.label}
            contentKey={item.key}
            value={getValueForKey(item.key)}
            onSave={(value) => updateMutation.mutate({ key: item.key, value })}
            isPending={updateMutation.isPending}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function ContentRow({ label, contentKey, value, onSave, isPending }: {
  label: string;
  contentKey: string;
  value: string;
  onSave: (value: string) => void;
  isPending: boolean;
}) {
  const [editValue, setEditValue] = useState(value);

  return (
    <div className="space-y-2" data-testid={`content-row-${contentKey}`}>
      <label className="text-sm font-medium text-foreground">{label}</label>
      <div className="flex gap-2">
        <Textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          className="flex-1 min-h-[60px]"
          data-testid={`input-content-${contentKey}`}
        />
        <Button
          size="sm"
          onClick={() => onSave(editValue)}
          disabled={isPending || editValue === value}
          className="shrink-0 self-end gap-1"
          data-testid={`button-save-${contentKey}`}
        >
          <Check className="w-3 h-3" />
          Save
        </Button>
      </div>
    </div>
  );
}

function TestListItem({ title, subtitle, onEdit, onDelete, testId, badge }: {
  title: string;
  subtitle: string;
  onEdit: () => void;
  onDelete: () => void;
  testId: string;
  badge?: string;
}) {
  return (
    <motion.div
      className="flex items-center justify-between gap-4 p-4 bg-white dark:bg-slate-800/50 border rounded-xl hover:border-amber-300 dark:hover:border-amber-700 transition-colors"
      data-testid={testId}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.005 }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="font-medium truncate">{title}</p>
          {badge && <Badge variant="secondary" className="text-xs">{badge}</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onEdit}
          className="h-9 w-9 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/30"
          data-testid={`button-edit-${testId}`}
        >
          <Pencil className="w-4 h-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="h-9 w-9 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600"
          data-testid={`button-delete-${testId}`}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </motion.div>
  );
}

function SpeakingTestsTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<SpeakingTest | null>(null);

  const { data: tests, isLoading } = useQuery<SpeakingTest[]>({
    queryKey: ["/api/speaking-tests"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/speaking-tests/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/speaking-tests"] });
      toast({ title: "Test deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: { id?: string; body: any }) => {
      if (data.id) {
        await apiRequest("PUT", `/api/admin/speaking-tests/${data.id}`, data.body);
      } else {
        await apiRequest("POST", "/api/admin/speaking-tests", data.body);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/speaking-tests"] });
      setDialogOpen(false);
      setEditingTest(null);
      toast({ title: editingTest ? "Test updated" : "Test created" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Card className="border-amber-200/50 dark:border-slate-800">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2"><Mic className="w-5 h-5 text-amber-600" /> Speaking Tests</CardTitle>
          <CardDescription>{tests?.length || 0} tests available</CardDescription>
        </div>
        <Button
          onClick={() => { setEditingTest(null); setDialogOpen(true); }}
          className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md"
          data-testid="button-add-speaking-test"
        >
          <Plus className="w-4 h-4" />
          Add Test
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : !tests?.length ? (
          <div className="text-center py-12 text-muted-foreground">No speaking tests yet. Add your first test!</div>
        ) : (
          <div className="space-y-3">
            {tests.map((test) => (
              <TestListItem
                key={test.id}
                title={test.title}
                subtitle={`Part ${test.part} - ${test.difficulty} - ${test.duration}min - ${test.questions.length} questions`}
                onEdit={() => { setEditingTest(test); setDialogOpen(true); }}
                onDelete={() => deleteMutation.mutate(test.id)}
                testId={`speaking-test-${test.id}`}
                badge={`Part ${test.part}`}
              />
            ))}
          </div>
        )}
      </CardContent>

      <SpeakingTestDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        test={editingTest}
        onSave={(body) => saveMutation.mutate({ id: editingTest?.id, body })}
        isPending={saveMutation.isPending}
      />
    </Card>
  );
}

// ─── Reusable file-upload + URL field ────────────────────────────────────────
function FileUploadField({
  label,
  value,
  onChange,
  accept,
  hint,
  testId,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  accept: string;
  hint?: string;
  testId?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const { toast } = useToast();

  const handleFile = async (file: File) => {
    setError("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || "Upload failed");
      }
      const data = await res.json();
      onChange(data.url || data.fileUrl || "");
      toast({ title: "Uploaded", description: file.name });
    } catch (e: any) {
      setError(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const isImage = accept.includes("image");
  const isPdf = accept.includes("pdf");

  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</label>
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          data-testid={testId}
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) await handleFile(file);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors shrink-0"
        >
          {uploading ? (
            <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <Upload className="w-3.5 h-3.5" />
          )}
          {uploading ? "Uploading..." : "Upload file"}
        </button>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={isPdf ? "https://... or upload above" : "https://... or upload above"}
          className="flex-1 text-xs h-8"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="shrink-0 text-gray-400 hover:text-red-500 transition-colors"
            title="Clear"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {hint && <p className="text-[11px] text-gray-400">{hint}</p>}
      {error && <p className="text-[11px] text-red-500">{error}</p>}
      {/* Preview */}
      {value && isImage && (
        <img
          src={value}
          alt="preview"
          className="mt-1 max-h-40 rounded-lg border object-contain bg-gray-50 w-full"
          onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
        />
      )}
      {value && isPdf && (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
        >
          📄 Preview PDF
        </a>
      )}
    </div>
  );
}

type SpeakingQEntry = { text: string; imageUrl: string; imageCaption: string };

function SpeakingTestDialog({ open, onOpenChange, test, onSave, isPending }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  test: SpeakingTest | null;
  onSave: (body: any) => void;
  isPending: boolean;
}) {
  const [title, setTitle] = useState("");
  const [part, setPart] = useState("1");
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [qEntries, setQEntries] = useState<SpeakingQEntry[]>([{ text: "", imageUrl: "", imageCaption: "" }]);
  const [tips, setTips] = useState("");
  const [difficulty, setDifficulty] = useState("Easy");
  const [duration, setDuration] = useState("5");
  const [warmupDuration, setWarmupDuration] = useState("60");
  const [prepDuration, setPrepDuration] = useState("60");
  const [imageUrl, setImageUrl] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [expandedImg, setExpandedImg] = useState<number | null>(null);

  const resetForm = () => {
    if (test) {
      setTitle(test.title);
      setPart(String(test.part));
      setTopic(test.topic);
      setDescription(test.description);
      const imgs: Array<{ url?: string; caption?: string } | null> = (test as any).questionImages || [];
      setQEntries((test.questions.length > 0 ? test.questions : [""]).map((q, i) => ({
        text: q,
        imageUrl: imgs[i]?.url || "",
        imageCaption: imgs[i]?.caption || "",
      })));
      setTips(test.tips.join("\n"));
      setDifficulty(test.difficulty);
      setDuration(String(test.duration));
      setWarmupDuration(String((test as any).warmupDuration ?? 60));
      setPrepDuration(String((test as any).prepDuration ?? 60));
      setImageUrl((test as any).imageUrl || "");
      setPdfUrl((test as any).pdfUrl || "");
    } else {
      setTitle(""); setPart("1"); setTopic(""); setDescription("");
      setQEntries([{ text: "", imageUrl: "", imageCaption: "" }]);
      setTips(""); setDifficulty("Easy"); setDuration("5");
      setWarmupDuration("60"); setPrepDuration("60");
      setImageUrl(""); setPdfUrl("");
    }
    setExpandedImg(null);
  };

  const addQuestion = () => setQEntries(prev => [...prev, { text: "", imageUrl: "", imageCaption: "" }]);
  const removeQuestion = (i: number) => setQEntries(prev => prev.filter((_, idx) => idx !== i));
  const updateQ = (i: number, field: keyof SpeakingQEntry, val: string) =>
    setQEntries(prev => prev.map((q, idx) => idx === i ? { ...q, [field]: val } : q));

  const handleSave = () => {
    const questionTexts = qEntries.map(q => q.text).filter(Boolean);
    const questionImages = qEntries.map(q => q.imageUrl ? { url: q.imageUrl, caption: q.imageCaption } : null);
    onSave({
      title, part: parseInt(part), topic, description,
      questions: questionTexts,
      questionImages,
      imageUrl: imageUrl.trim() || null,
      pdfUrl: pdfUrl.trim() || null,
      tips: tips.split("\n").filter(Boolean),
      difficulty, duration: parseInt(duration),
      warmupDuration: parseInt(warmupDuration) || 60,
      prepDuration: parseInt(prepDuration) || 60,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (v) resetForm(); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-xl" data-testid="dialog-speaking-test">
        <DialogHeader>
          <DialogTitle>{test ? "Edit Speaking Test" : "Add Speaking Test"}</DialogTitle>
          <DialogDescription>Configure speaking test details, questions with optional images, and timing</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {/* Title + Part */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} data-testid="input-speaking-title" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Part</label>
              <Select value={part} onValueChange={setPart}>
                <SelectTrigger data-testid="select-speaking-part"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Part 1</SelectItem>
                  <SelectItem value="2">Part 2</SelectItem>
                  <SelectItem value="3">Part 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Topic + Difficulty */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Topic</label>
              <Input value={topic} onChange={(e) => setTopic(e.target.value)} data-testid="input-speaking-topic" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Difficulty</label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger data-testid="select-speaking-difficulty"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Easy">Easy</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} data-testid="input-speaking-description" />
          </div>

          {/* ── Questions with optional image ── */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Questions</label>
              <Button type="button" variant="outline" size="sm" onClick={addQuestion} className="h-7 text-xs">+ Add Question</Button>
            </div>
            <div className="space-y-3">
              {qEntries.map((q, i) => (
                <div key={i} className="rounded-xl border border-rose-100 bg-rose-50/40 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center text-xs font-bold">{i + 1}</span>
                    <Input
                      value={q.text}
                      onChange={(e) => updateQ(i, "text", e.target.value)}
                      placeholder="Question text..."
                      className="flex-1 text-sm h-8"
                      data-testid={`input-speaking-q-${i}`}
                    />
                    <button
                      type="button"
                      onClick={() => setExpandedImg(expandedImg === i ? null : i)}
                      className={`shrink-0 px-2 py-1 text-xs rounded border transition-colors ${q.imageUrl ? "border-rose-400 bg-rose-100 text-rose-700" : "border-gray-300 text-gray-500 hover:border-rose-300"}`}
                      title="Toggle image"
                    >
                      🖼
                    </button>
                    {qEntries.length > 1 && (
                      <button type="button" onClick={() => removeQuestion(i)} className="shrink-0 text-gray-400 hover:text-red-500 text-xs px-1">✕</button>
                    )}
                  </div>
                  {expandedImg === i && (
                    <div className="space-y-2 pt-1">
                      <FileUploadField
                        label={`Question ${i + 1} Image`}
                        value={q.imageUrl}
                        onChange={(url) => updateQ(i, "imageUrl", url)}
                        accept="image/*"
                        hint="Optional: JPG, PNG, WebP — shown with this question"
                        testId={`input-speaking-img-upload-${i}`}
                      />
                      <div className="space-y-1">
                        <label className="text-[11px] text-gray-500 font-medium uppercase tracking-wide">Caption</label>
                        <Input
                          value={q.imageCaption}
                          onChange={(e) => updateQ(i, "imageCaption", e.target.value)}
                          placeholder="Optional caption..."
                          className="text-xs h-7"
                          data-testid={`input-speaking-img-caption-${i}`}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ── Test-level image & PDF ── */}
          <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-4 space-y-3">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">🖼 Cue Card / Task Sheet (optional)</p>
            <FileUploadField
              label="Image (cue card, map, diagram)"
              value={imageUrl}
              onChange={setImageUrl}
              accept="image/*"
              hint="Supported: JPG, PNG, WebP, GIF — max 50 MB"
              testId="input-speaking-image-upload"
            />
            <FileUploadField
              label="PDF (task sheet, supplementary)"
              value={pdfUrl}
              onChange={setPdfUrl}
              accept="application/pdf,.pdf"
              hint="PDF — max 50 MB"
              testId="input-speaking-pdf-upload"
            />
          </div>

          {/* Tips */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Tips (one per line)</label>
            <Textarea value={tips} onChange={(e) => setTips(e.target.value)} data-testid="input-speaking-tips" />
          </div>

          {/* Duration + Timing */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Duration (min)</label>
              <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} data-testid="input-speaking-duration" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Warm-Up (sec)</label>
              <Input type="number" value={warmupDuration} onChange={(e) => setWarmupDuration(e.target.value)} placeholder="60" data-testid="input-speaking-warmup" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Prep Time (sec)</label>
              <Input type="number" value={prepDuration} onChange={(e) => setPrepDuration(e.target.value)} placeholder="60" data-testid="input-speaking-prep" />
            </div>
          </div>
          <p className="text-[11px] text-gray-500">Warm-Up = training time before Part 1. Prep Time = countdown between parts.</p>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-speaking">Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={isPending || !title.trim()}
            className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
            data-testid="button-save-speaking"
          >
            {isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ListeningTestsTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<ListeningTest | null>(null);

  const { data: tests, isLoading } = useQuery<ListeningTest[]>({
    queryKey: ["/api/listening-tests"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/listening-tests/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/listening-tests"] });
      toast({ title: "Test deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: { id?: string; body: any }) => {
      if (data.id) {
        await apiRequest("PUT", `/api/admin/listening-tests/${data.id}`, data.body);
      } else {
        await apiRequest("POST", "/api/admin/listening-tests", data.body);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/listening-tests"] });
      setDialogOpen(false);
      setEditingTest(null);
      toast({ title: editingTest ? "Test updated" : "Test created" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Card className="border-amber-200/50 dark:border-slate-800">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2"><Headphones className="w-5 h-5 text-blue-600" /> Listening Tests</CardTitle>
          <CardDescription>{tests?.length || 0} tests available - Upload MP3 audio files</CardDescription>
        </div>
        <Button
          onClick={() => { setEditingTest(null); setDialogOpen(true); }}
          className="gap-2 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white shadow-md"
          data-testid="button-add-listening-test"
        >
          <Plus className="w-4 h-4" />
          Add Test
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : !tests?.length ? (
          <div className="text-center py-12 text-muted-foreground">No listening tests yet. Add your first test!</div>
        ) : (
          <div className="space-y-3">
            {tests.map((test) => (
              <TestListItem
                key={test.id}
                title={test.title}
                subtitle={`Section ${test.section} - ${test.difficulty} - ${test.duration}min${test.audioUrl ? " - Has audio" : ""}`}
                onEdit={() => { setEditingTest(test); setDialogOpen(true); }}
                onDelete={() => deleteMutation.mutate(test.id)}
                testId={`listening-test-${test.id}`}
                badge={test.audioUrl ? "MP3" : undefined}
              />
            ))}
          </div>
        )}
      </CardContent>

      <ListeningTestDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        test={editingTest}
        onSave={(body) => saveMutation.mutate({ id: editingTest?.id, body })}
        isPending={saveMutation.isPending}
      />
    </Card>
  );
}

type ListeningSectionState = { audioUrl: string; mapUrl?: string; mapCaption?: string; questions: BuilderQuestion[] };

function emptyListeningSection(sectionNumber: number): ListeningSectionState {
  return { audioUrl: "", mapUrl: "", mapCaption: "", questions: [{ id: 1, question: "", options: ["", "", "", ""], correctAnswer: 0 }] };
}

function ListeningTestDialog({ open, onOpenChange, test, onSave, isPending }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  test: ListeningTest | null;
  onSave: (body: any) => void;
  isPending: boolean;
}) {
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState("Easy");
  const [duration, setDuration] = useState("10");
  const [mode, setMode] = useState<"test" | "written" | "mixed">("test");
  const [numSections, setNumSections] = useState(1);
  const [sections, setSections] = useState<ListeningSectionState[]>([emptyListeningSection(1)]);
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);

  const resetForm = () => {
    if (test) {
      setTitle(test.title);
      setTopic(test.topic);
      setDescription(test.description);
      setDifficulty(test.difficulty);
      setDuration(String(test.duration));
      setMode((test.mode as "test" | "written" | "mixed") || "test");
      const ts = (test as any).testSections as ListeningTestSection[] | null | undefined;
      if (ts && ts.length > 0) {
        setNumSections(ts.length);
        setSections(ts.map(s => ({
          audioUrl: s.audioUrl || "",
          mapUrl: (s as any).mapUrl || "",
          mapCaption: (s as any).mapCaption || "",
          questions: (s.questions as BuilderQuestion[]).length > 0 ? s.questions as BuilderQuestion[] : [{ id: 1, question: "", options: ["", "", "", ""], correctAnswer: 0 }],
        })));
      } else {
        const flat = ((test.questions as any[]) || []).flatMap((q: any) => Array.isArray(q) ? q : [q]) as BuilderQuestion[];
        setNumSections(1);
        setSections([{ audioUrl: test.audioUrl || "", mapUrl: "", mapCaption: "", questions: flat.length > 0 ? flat : [{ id: 1, question: "", options: ["", "", "", ""], correctAnswer: 0 }] }]);
      }
    } else {
      setTitle(""); setTopic(""); setDescription(""); setDifficulty("Easy"); setDuration("10"); setMode("test");
      setNumSections(1);
      setSections([emptyListeningSection(1)]);
    }
    setActiveSectionIdx(0);
  };

  useEffect(() => { if (open) resetForm(); }, [open]);

  const handleNumSectionsChange = (n: number) => {
    setNumSections(n);
    setSections(prev => {
      if (n > prev.length) {
        return [...prev, ...Array.from({ length: n - prev.length }, (_, i) => emptyListeningSection(prev.length + i + 1))];
      }
      return prev.slice(0, n);
    });
    if (activeSectionIdx >= n) setActiveSectionIdx(n - 1);
  };

  const updateSection = (idx: number, patch: Partial<ListeningSectionState>) => {
    setSections(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto max-w-2xl" data-testid="dialog-listening-test">
        <DialogHeader>
          <DialogTitle>{test ? "Edit Listening Test" : "Add Listening Test"}</DialogTitle>
          <DialogDescription>Set up sections, questions, and one shared timer for the test</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">

          {/* Mode */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Test Mode</label>
            <div className="grid grid-cols-3 gap-2">
              {([["test", "Test", "Questions only", CheckCircle, "blue"],
                ["written", "Written", "Open response", PenTool, "purple"],
                ["mixed", "Mixed", "Response + questions", Layers, "emerald"]] as const).map(([val, label, sub, Icon, color]) => (
                <button key={val} type="button" onClick={() => setMode(val as any)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${mode === val ? `border-${color}-500 bg-${color}-50 dark:bg-${color}-950/30 text-${color}-700 dark:text-${color}-300` : "border-border hover:border-muted-foreground/30 text-muted-foreground"}`}
                  data-testid={`button-mode-${val}`}>
                  <Icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{label}</span>
                  <span className="text-xs opacity-70">{sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Basic info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} data-testid="input-listening-title" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Topic</label>
              <Input value={topic} onChange={(e) => setTopic(e.target.value)} data-testid="input-listening-topic" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Difficulty</label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger data-testid="select-listening-difficulty"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Easy">Easy</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Total Duration (minutes, shared across all sections)</label>
              <Input type="number" min="1" value={duration} onChange={(e) => setDuration(e.target.value)} data-testid="input-listening-duration" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} data-testid="input-listening-description" rows={2} />
          </div>

          {/* Number of sections */}
          <div className="space-y-2">
            <label className="text-sm font-semibold">Sections <span className="text-xs text-muted-foreground font-normal ml-1">— one shared timer for all</span></label>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => handleNumSectionsChange(Math.max(1, numSections - 1))} className="w-8 h-8 rounded-md border font-bold text-lg leading-none hover:bg-muted disabled:opacity-40" disabled={numSections <= 1} data-testid="button-num-sections-minus">−</button>
              <span className="w-8 text-center font-bold text-sm" data-testid="text-num-sections">{numSections}</span>
              <button type="button" onClick={() => handleNumSectionsChange(numSections + 1)} className="w-8 h-8 rounded-md border font-bold text-lg leading-none hover:bg-muted" data-testid="button-num-sections-plus">+</button>
            </div>
          </div>

          {/* Section tabs */}
          <div className="space-y-3">
            <div className="flex gap-1 border-b pb-1 overflow-x-auto">
              {sections.map((_, idx) => (
                <button key={idx} type="button" onClick={() => setActiveSectionIdx(idx)}
                  className={`px-3 py-1.5 text-sm font-semibold rounded-t-md transition-all whitespace-nowrap ${activeSectionIdx === idx ? "bg-blue-600 text-white" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
                  data-testid={`tab-listening-section-${idx + 1}`}>
                  Section {idx + 1}
                </button>
              ))}
            </div>

            {sections.map((sec, idx) => idx !== activeSectionIdx ? null : (
              <div key={idx} className="space-y-4 p-4 rounded-xl border bg-muted/20">
                {/* Audio upload */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Audio File (MP3)</label>
                  <div className="flex items-center gap-3">
                    <FileUploadButton
                      onUploaded={(url) => updateSection(idx, { audioUrl: url })}
                      accept=".mp3,.wav,.ogg,.m4a"
                      label="Upload MP3"
                      icon={Music}
                    />
                    {sec.audioUrl && (
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Badge variant="secondary" className="gap-1 max-w-full truncate">
                          <Music className="w-3 h-3 shrink-0" />
                          <span className="truncate">{sec.audioUrl.split("/").pop()}</span>
                        </Badge>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => updateSection(idx, { audioUrl: "" })}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {sec.audioUrl && (
                    <audio controls className="w-full rounded-lg" src={sec.audioUrl} data-testid={`audio-preview-${idx}`}>
                      Your browser does not support audio playback.
                    </audio>
                  )}
                </div>

                {/* Map / Diagram image upload */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1.5">
                    <span>Map / Diagram Image</span>
                    <span className="text-xs text-muted-foreground font-normal">(optional — shown to student during exam)</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <FileUploadButton
                      onUploaded={(url) => updateSection(idx, { mapUrl: url })}
                      accept="image/*"
                      label="Upload Map"
                      icon={Eye}
                    />
                    {sec.mapUrl && (
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Badge variant="secondary" className="gap-1 max-w-full truncate">
                          <Eye className="w-3 h-3 shrink-0" />
                          <span className="truncate">{sec.mapUrl.split("/").pop()}</span>
                        </Badge>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => updateSection(idx, { mapUrl: "", mapCaption: "" })}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {sec.mapUrl && (
                    <div className="space-y-2">
                      <img src={sec.mapUrl} alt="Map preview" className="w-full max-h-48 object-contain rounded-lg border bg-gray-50" />
                      <Input
                        value={sec.mapCaption || ""}
                        onChange={(e) => updateSection(idx, { mapCaption: e.target.value })}
                        placeholder="Map caption / instructions (optional)..."
                        className="text-xs"
                      />
                    </div>
                  )}
                </div>

                {/* Questions */}
                {(mode === "test" || mode === "mixed") && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">
                      Questions for Section {idx + 1}
                      {mode === "mixed" && <span className="text-xs text-emerald-600 dark:text-emerald-400 font-normal ml-2">— shown after written response</span>}
                    </label>
                    <QuestionBuilder questions={sec.questions} onChange={(qs) => updateSection(idx, { questions: qs })} />
                  </div>
                )}
                {mode === "written" && (
                  <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200/50 text-sm text-purple-700 dark:text-purple-300">
                    <p className="font-medium flex items-center gap-1.5"><PenTool className="w-4 h-4" /> Written mode — student writes a free-form response after listening</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-listening">Cancel</Button>
          <Button
            onClick={() => {
              const testSections: ListeningTestSection[] = sections.map((s, i) => ({
                sectionNumber: i + 1,
                audioUrl: s.audioUrl || null,
                mapUrl: s.mapUrl || null,
                mapCaption: s.mapCaption || "",
                questions: (mode === "test" || mode === "mixed") ? s.questions : [],
              }));
              onSave({
                title, section: 1, topic, description,
                questions: [],
                audioUrl: null,
                difficulty, duration: parseInt(duration), mode,
                testSections,
              });
            }}
            disabled={isPending || !title.trim()}
            className="bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white"
            data-testid="button-save-listening"
          >
            {isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ReadingTestsTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<ReadingTest | null>(null);

  const { data: tests, isLoading } = useQuery<ReadingTest[]>({
    queryKey: ["/api/reading-tests"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/reading-tests/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reading-tests"] });
      toast({ title: "Test deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: { id?: string; body: any }) => {
      if (data.id) {
        await apiRequest("PUT", `/api/admin/reading-tests/${data.id}`, data.body);
      } else {
        await apiRequest("POST", "/api/admin/reading-tests", data.body);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reading-tests"] });
      setDialogOpen(false);
      setEditingTest(null);
      toast({ title: editingTest ? "Test updated" : "Test created" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Card className="border-amber-200/50 dark:border-slate-800">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2"><BookOpen className="w-5 h-5 text-emerald-600" /> Reading Tests</CardTitle>
          <CardDescription>{tests?.length || 0} tests available - Upload PDF reading materials</CardDescription>
        </div>
        <Button
          onClick={() => { setEditingTest(null); setDialogOpen(true); }}
          className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md"
          data-testid="button-add-reading-test"
        >
          <Plus className="w-4 h-4" />
          Add Test
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : !tests?.length ? (
          <div className="text-center py-12 text-muted-foreground">No reading tests yet. Add your first test!</div>
        ) : (
          <div className="space-y-3">
            {tests.map((test) => (
              <TestListItem
                key={test.id}
                title={test.title}
                subtitle={`${test.topic} - ${test.difficulty} - ${test.duration}min${test.pdfUrl ? " - Has PDF" : ""}`}
                onEdit={() => { setEditingTest(test); setDialogOpen(true); }}
                onDelete={() => deleteMutation.mutate(test.id)}
                testId={`reading-test-${test.id}`}
                badge={test.pdfUrl ? "PDF" : undefined}
              />
            ))}
          </div>
        )}
      </CardContent>

      <ReadingTestDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        test={editingTest}
        onSave={(body) => saveMutation.mutate({ id: editingTest?.id, body })}
        isPending={saveMutation.isPending}
      />
    </Card>
  );
}

type ReadingSectionState = { passage: string; pdfUrl: string; questions: BuilderQuestion[] };

function emptyReadingSection(sectionNumber: number): ReadingSectionState {
  return { passage: "", pdfUrl: "", questions: [{ id: 1, question: "", options: ["", "", "", ""], correctAnswer: 0 }] };
}

function ReadingTestDialog({ open, onOpenChange, test, onSave, isPending }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  test: ReadingTest | null;
  onSave: (body: any) => void;
  isPending: boolean;
}) {
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [difficulty, setDifficulty] = useState("Easy");
  const [duration, setDuration] = useState("20");
  const [mode, setMode] = useState<"test" | "written" | "mixed">("test");
  const [numSections, setNumSections] = useState(1);
  const [sections, setSections] = useState<ReadingSectionState[]>([emptyReadingSection(1)]);
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);

  const resetForm = () => {
    if (test) {
      setTitle(test.title);
      setTopic(test.topic);
      setDescription(test.description);
      setDifficulty(test.difficulty);
      setDuration(String(test.duration));
      setMode((test.mode as "test" | "written" | "mixed") || "test");
      const ts = (test as any).testSections as ReadingTestSection[] | null | undefined;
      if (ts && ts.length > 0) {
        setNumSections(ts.length);
        setSections(ts.map(s => ({
          passage: s.passage || "",
          pdfUrl: s.pdfUrl || "",
          questions: (s.questions as BuilderQuestion[]).length > 0 ? s.questions as BuilderQuestion[] : [{ id: 1, question: "", options: ["", "", "", ""], correctAnswer: 0 }],
        })));
      } else {
        const flat = ((test.questions as any[]) || []).flatMap((q: any) => Array.isArray(q) ? q : [q]) as BuilderQuestion[];
        setNumSections(1);
        setSections([{ passage: test.passage || "", pdfUrl: test.pdfUrl || "", questions: flat.length > 0 ? flat : [{ id: 1, question: "", options: ["", "", "", ""], correctAnswer: 0 }] }]);
      }
    } else {
      setTitle(""); setTopic(""); setDescription(""); setDifficulty("Easy"); setDuration("20"); setMode("test");
      setNumSections(1);
      setSections([emptyReadingSection(1)]);
    }
    setActiveSectionIdx(0);
  };

  useEffect(() => { if (open) resetForm(); }, [open]);

  const handleNumSectionsChange = (n: number) => {
    setNumSections(n);
    setSections(prev => {
      if (n > prev.length) {
        return [...prev, ...Array.from({ length: n - prev.length }, (_, i) => emptyReadingSection(prev.length + i + 1))];
      }
      return prev.slice(0, n);
    });
    if (activeSectionIdx >= n) setActiveSectionIdx(n - 1);
  };

  const updateSection = (idx: number, patch: Partial<ReadingSectionState>) => {
    setSections(prev => prev.map((s, i) => i === idx ? { ...s, ...patch } : s));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto max-w-2xl" data-testid="dialog-reading-test">
        <DialogHeader>
          <DialogTitle>{test ? "Edit Reading Test" : "Add Reading Test"}</DialogTitle>
          <DialogDescription>Set up sections, passages, questions, and one shared timer</DialogDescription>
        </DialogHeader>
        <div className="space-y-5">

          {/* Mode */}
          <div className="space-y-1.5">
            <label className="text-sm font-semibold">Test Mode</label>
            <div className="grid grid-cols-3 gap-2">
              {([["test", "Test", "Questions only", CheckCircle, "emerald"],
                ["written", "Written", "Open response", PenTool, "purple"],
                ["mixed", "Mixed", "Response + questions", Layers, "blue"]] as const).map(([val, label, sub, Icon, color]) => (
                <button key={val} type="button" onClick={() => setMode(val as any)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all ${mode === val ? `border-${color}-500 bg-${color}-50 dark:bg-${color}-950/30 text-${color}-700 dark:text-${color}-300` : "border-border hover:border-muted-foreground/30 text-muted-foreground"}`}
                  data-testid={`button-reading-mode-${val}`}>
                  <Icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{label}</span>
                  <span className="text-xs opacity-70">{sub}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Basic info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} data-testid="input-reading-title" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Topic</label>
              <Input value={topic} onChange={(e) => setTopic(e.target.value)} data-testid="input-reading-topic" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Difficulty</label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger data-testid="select-reading-difficulty"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Easy">Easy</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Total Duration (minutes, shared across all sections)</label>
              <Input type="number" min="1" value={duration} onChange={(e) => setDuration(e.target.value)} data-testid="input-reading-duration" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} data-testid="input-reading-description" rows={2} />
          </div>

          {/* Number of sections */}
          <div className="space-y-2">
            <label className="text-sm font-semibold">Passages <span className="text-xs text-muted-foreground font-normal ml-1">— one shared timer for all</span></label>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => handleNumSectionsChange(Math.max(1, numSections - 1))} className="w-8 h-8 rounded-md border font-bold text-lg leading-none hover:bg-muted disabled:opacity-40" disabled={numSections <= 1} data-testid="button-reading-num-sections-minus">−</button>
              <span className="w-8 text-center font-bold text-sm" data-testid="text-reading-num-sections">{numSections}</span>
              <button type="button" onClick={() => handleNumSectionsChange(numSections + 1)} className="w-8 h-8 rounded-md border font-bold text-lg leading-none hover:bg-muted" data-testid="button-reading-num-sections-plus">+</button>
            </div>
          </div>

          {/* Section tabs */}
          <div className="space-y-3">
            <div className="flex gap-1 border-b pb-1 overflow-x-auto">
              {sections.map((_, idx) => (
                <button key={idx} type="button" onClick={() => setActiveSectionIdx(idx)}
                  className={`px-3 py-1.5 text-sm font-semibold rounded-t-md transition-all whitespace-nowrap ${activeSectionIdx === idx ? "bg-emerald-600 text-white" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
                  data-testid={`tab-reading-section-${idx + 1}`}>
                  Section {idx + 1}
                </button>
              ))}
            </div>

            {sections.map((sec, idx) => idx !== activeSectionIdx ? null : (
              <div key={idx} className="space-y-4 p-4 rounded-xl border bg-muted/20">
                {/* PDF upload */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">PDF File (optional)</label>
                  <div className="flex items-center gap-3">
                    <FileUploadButton onUploaded={(url) => updateSection(idx, { pdfUrl: url })} accept=".pdf" label="Upload PDF" icon={FileText} />
                    {sec.pdfUrl && (
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Badge variant="secondary" className="gap-1 max-w-full truncate">
                          <FileText className="w-3 h-3 shrink-0" />
                          <span className="truncate">{sec.pdfUrl.split("/").pop()}</span>
                        </Badge>
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => updateSection(idx, { pdfUrl: "" })}>
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
                {/* Passage */}
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Passage (text)</label>
                  <Textarea
                    value={sec.passage}
                    onChange={(e) => updateSection(idx, { passage: e.target.value })}
                    className="min-h-[120px]"
                    placeholder="Enter the reading passage text for this section..."
                    data-testid={`input-reading-passage-${idx}`}
                  />
                </div>
                {/* Questions */}
                {(mode === "test" || mode === "mixed") && (
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">
                      Questions for Section {idx + 1}
                      {mode === "mixed" && <span className="text-xs text-blue-600 dark:text-blue-400 font-normal ml-2">— shown after written response</span>}
                    </label>
                    <QuestionBuilder questions={sec.questions} onChange={(qs) => updateSection(idx, { questions: qs })} />
                  </div>
                )}
                {mode === "written" && (
                  <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/20 border border-purple-200/50 text-sm text-purple-700 dark:text-purple-300">
                    <p className="font-medium flex items-center gap-1.5"><PenTool className="w-4 h-4" /> Written mode — student writes a free-form response after reading</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <DialogFooter className="gap-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-reading">Cancel</Button>
          <Button
            onClick={() => {
              const testSections: ReadingTestSection[] = sections.map((s, i) => ({
                sectionNumber: i + 1,
                passage: s.passage,
                pdfUrl: s.pdfUrl || null,
                questions: (mode === "test" || mode === "mixed") ? s.questions : [],
              }));
              onSave({
                title, passage: sections[0]?.passage || "", pdfUrl: sections[0]?.pdfUrl || null,
                topic, description,
                questions: [],
                difficulty, duration: parseInt(duration), mode,
                testSections,
              });
            }}
            disabled={isPending || !title.trim()}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white"
            data-testid="button-save-reading"
          >
            {isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function WritingTestsTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<WritingTest | null>(null);

  const { data: tests, isLoading } = useQuery<WritingTest[]>({
    queryKey: ["/api/writing-tests"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/writing-tests/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/writing-tests"] });
      toast({ title: "Test deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: { id?: string; body: any }) => {
      if (data.id) {
        await apiRequest("PUT", `/api/admin/writing-tests/${data.id}`, data.body);
      } else {
        await apiRequest("POST", "/api/admin/writing-tests", data.body);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/writing-tests"] });
      setDialogOpen(false);
      setEditingTest(null);
      toast({ title: editingTest ? "Test updated" : "Test created" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Card className="border-amber-200/50 dark:border-slate-800">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2"><PenTool className="w-5 h-5 text-purple-600" /> Writing Tests</CardTitle>
          <CardDescription>{tests?.length || 0} tests available</CardDescription>
        </div>
        <Button
          onClick={() => { setEditingTest(null); setDialogOpen(true); }}
          className="gap-2 bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white shadow-md"
          data-testid="button-add-writing-test"
        >
          <Plus className="w-4 h-4" />
          Add Test
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : !tests?.length ? (
          <div className="text-center py-12 text-muted-foreground">No writing tests yet. Add your first test!</div>
        ) : (
          <div className="space-y-3">
            {tests.map((test) => (
              <TestListItem
                key={test.id}
                title={test.title}
                subtitle={`Task ${test.task} - ${test.difficulty} - ${test.duration}min${test.pdfUrl ? " - Has PDF" : ""}`}
                onEdit={() => { setEditingTest(test); setDialogOpen(true); }}
                onDelete={() => deleteMutation.mutate(test.id)}
                testId={`writing-test-${test.id}`}
                badge={test.pdfUrl ? "PDF" : `Task ${test.task}`}
              />
            ))}
          </div>
        )}
      </CardContent>

      <WritingTestDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        test={editingTest}
        onSave={(body) => saveMutation.mutate({ id: editingTest?.id, body })}
        isPending={saveMutation.isPending}
      />
    </Card>
  );
}

function WritingTestDialog({ open, onOpenChange, test, onSave, isPending }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  test: WritingTest | null;
  onSave: (body: any) => void;
  isPending: boolean;
}) {
  const [title, setTitle] = useState("");
  const [task, setTask] = useState("1");
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [prompt, setPrompt] = useState("");
  const [tips, setTips] = useState("");
  const [sampleAnswer, setSampleAnswer] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [difficulty, setDifficulty] = useState("Medium");
  const [duration, setDuration] = useState("20");

  const resetForm = () => {
    if (test) {
      setTitle(test.title);
      setTask(String(test.task));
      setTopic(test.topic);
      setDescription(test.description);
      setPrompt(test.prompt);
      setTips(test.tips.join("\n"));
      setSampleAnswer(test.sampleAnswer || "");
      setPdfUrl(test.pdfUrl || "");
      setDifficulty(test.difficulty);
      setDuration(String(test.duration));
    } else {
      setTitle(""); setTask("1"); setTopic(""); setDescription("");
      setPrompt(""); setTips(""); setSampleAnswer(""); setPdfUrl(""); setDifficulty("Medium"); setDuration("20");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (v) resetForm(); }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto max-w-lg" data-testid="dialog-writing-test">
        <DialogHeader>
          <DialogTitle>{test ? "Edit Writing Test" : "Add Writing Test"}</DialogTitle>
          <DialogDescription>Create a writing task with prompt and tips</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} data-testid="input-writing-title" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Task</label>
              <Select value={task} onValueChange={setTask}>
                <SelectTrigger data-testid="select-writing-task"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Task 1</SelectItem>
                  <SelectItem value="2">Task 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Topic</label>
              <Input value={topic} onChange={(e) => setTopic(e.target.value)} data-testid="input-writing-topic" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Difficulty</label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger data-testid="select-writing-difficulty"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Easy">Easy</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="Hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} data-testid="input-writing-description" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Prompt</label>
            <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} className="min-h-[100px]" data-testid="input-writing-prompt" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Tips (one per line)</label>
            <Textarea value={tips} onChange={(e) => setTips(e.target.value)} data-testid="input-writing-tips" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">PDF File (optional)</label>
            <div className="flex items-center gap-3">
              <FileUploadButton
                onUploaded={(url) => setPdfUrl(url)}
                accept=".pdf"
                label="Upload PDF"
                icon={FileText}
              />
              {pdfUrl && (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Badge variant="secondary" className="gap-1 max-w-full truncate">
                    <FileText className="w-3 h-3 shrink-0" />
                    <span className="truncate">{pdfUrl.split("/").pop()}</span>
                  </Badge>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setPdfUrl("")}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Sample Answer (optional)</label>
            <Textarea value={sampleAnswer} onChange={(e) => setSampleAnswer(e.target.value)} className="min-h-[80px]" data-testid="input-writing-sample" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Duration (minutes)</label>
            <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} data-testid="input-writing-duration" />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-writing">Cancel</Button>
          <Button
            onClick={() => onSave({
              title, task: parseInt(task), topic, description, prompt,
              tips: tips.split("\n").filter(Boolean),
              sampleAnswer: sampleAnswer || null,
              pdfUrl: pdfUrl || null,
              difficulty, duration: parseInt(duration),
            })}
            disabled={isPending || !title.trim()}
            className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white"
            data-testid="button-save-writing"
          >
            {isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UsersTab() {
  const { toast } = useToast();
  const { data: users, isLoading } = useQuery<Omit<User, "password">[]>({
    queryKey: ["/api/admin/users"],
    queryFn: getQueryFn<Omit<User, "password">[]>({ on401: "throw" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User deleted" });
    },
    onError: async (err: any) => {
      let msg = "Error deleting user";
      try { const j = await err?.response?.json(); if (j?.message) msg = j.message; } catch {}
      toast({ title: msg, variant: "destructive" });
    },
  });

  const handleDelete = (u: Omit<User, "password">) => {
    if (!confirm(`Delete account "${u.username}" (${u.fullName})?`)) return;
    deleteMutation.mutate(u.id);
  };

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  }

  return (
    <Card className="border-amber-200/50 dark:border-slate-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Users className="w-5 h-5 text-amber-600" /> Users</CardTitle>
        <CardDescription>{users?.length || 0} registered users</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-lg border">
          <Table data-testid="table-users">
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                <TableHead className="font-semibold">Username</TableHead>
                <TableHead className="font-semibold">Full Name</TableHead>
                <TableHead className="font-semibold">Parent Phone</TableHead>
                <TableHead className="font-semibold">Role</TableHead>
                <TableHead className="font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users?.map((u) => (
                <TableRow key={u.id} data-testid={`row-user-${u.id}`}>
                  <TableCell className="font-medium">{u.username}</TableCell>
                  <TableCell>{u.fullName}</TableCell>
                  <TableCell className="font-mono text-sm">{u.parentPhone}</TableCell>
                  <TableCell>
                    <Badge variant={u.isAdmin ? "default" : "secondary"}>
                      {u.isAdmin ? "Admin" : "Student"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {!u.isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDelete(u)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-user-${u.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!users?.length && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">No users found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function ResultDetail({ result, listeningTests, readingTests, writingTests, speakingTests: spTests }: {
  result: TestResult;
  listeningTests?: ListeningTest[];
  readingTests?: ReadingTest[];
  writingTests?: WritingTest[];
  speakingTests?: SpeakingTest[];
}) {
  const answers = (result.answers as Record<string, any>) ?? {};

  // ── Speaking ──────────────────────────────────────────────────────────────
  if (result.testType === "speaking") {
    const spTest = spTests?.find(t => t.id === result.testId);
    return (
      <div className="mt-2 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200/50 space-y-2">
        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-2">
          <Mic className="w-3.5 h-3.5" />
          {spTest ? spTest.title : "Speaking"} — completed during exam
        </p>
        {answers.recordingUrl ? (
          <audio controls src={answers.recordingUrl} className="w-full h-9 rounded" />
        ) : (
          <p className="text-xs text-amber-600/70">Recording not saved (performed live)</p>
        )}
        {spTest && (
          <div className="text-xs text-slate-500 space-y-0.5">
            {(spTest.questions ?? []).map((q, i) => (
              <p key={i}>• Part {i + 1}: {q}</p>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── Writing ───────────────────────────────────────────────────────────────
  if (result.testType === "writing") {
    const wTest = writingTests?.find(t => t.id === result.testId);
    const response = answers.response ?? "";
    const wordCount = response.trim() ? response.trim().split(/\s+/).length : 0;
    return (
      <div className="mt-2 space-y-2">
        {wTest && (
          <div className="p-2 bg-slate-50 rounded border text-xs text-slate-600 space-y-1">
            {(wTest as any).tasks?.map((task: any, i: number) => (
              <p key={i}><span className="font-semibold">Task {i + 1}:</span> {task.title ?? task.task}</p>
            ))}
          </div>
        )}
        <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200/50 space-y-1">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-purple-700 dark:text-purple-400">Student's Answer</p>
            <span className="text-xs text-purple-400">{wordCount} words</span>
          </div>
          {response ? (
            <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
              {response}
            </p>
          ) : (
            <p className="text-xs text-slate-400 italic">No answer provided</p>
          )}
        </div>
      </div>
    );
  }

  // ── Listening / Reading ───────────────────────────────────────────────────
  if (result.testType === "listening" || result.testType === "reading") {
    const testList = result.testType === "listening" ? listeningTests : readingTests;
    const testData = (testList as any[])?.find((t: any) => t.id === result.testId) as any;

    const allSections: any[] = testData?.testSections?.length
      ? testData.testSections
      : [{ questions: testData?.questions ?? [] }];

    const allQs = allSections.flatMap(s =>
      (s.questions ?? []).flatMap((q: any) => Array.isArray(q) ? q : [q])
    ).filter((q: any) => q.type !== "text");

    const isCorrect = (q: any) => {
      const ua = answers[q.id];
      if (q.correctAnswer !== undefined) return parseInt(String(ua)) === q.correctAnswer;
      if (q.correctText) return String(ua ?? "").trim().toLowerCase() === q.correctText.toLowerCase();
      return false;
    };

    const bgColor = result.testType === "listening" ? "bg-green-50 border-green-200" : "bg-blue-50 border-blue-200";
    const labelColor = result.testType === "listening" ? "text-green-700" : "text-blue-700";

    return (
      <div className={`mt-2 p-3 rounded-lg border ${bgColor} space-y-2`}>
        <div className="flex items-center justify-between">
          <p className={`text-xs font-semibold ${labelColor}`}>
            {testData?.title ?? result.testType} — Answers
          </p>
          <span className={`text-xs font-bold ${labelColor}`}>{result.score ?? 0}/{result.totalQuestions ?? allQs.length} correct</span>
        </div>
        {allQs.length > 0 ? (
          <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
            {allQs.map((q: any, qi: number) => {
              const ua = answers[q.id];
              const correct = isCorrect(q);
              const userLabel = q.options && !isNaN(parseInt(String(ua)))
                ? (q.options[parseInt(String(ua))] ?? `#${ua}`)
                : (ua !== undefined ? String(ua) : "—");
              const correctLabel = q.options && q.correctAnswer !== undefined
                ? q.options[q.correctAnswer]
                : q.correctText ?? "—";
              return (
                <div key={q.id ?? qi} className={`flex items-start gap-2 p-2 rounded text-xs ${correct ? "bg-green-100/70" : "bg-red-100/70"}`}>
                  <span className={`shrink-0 font-bold mt-0.5 ${correct ? "text-green-600" : "text-red-600"}`}>
                    {correct ? "✓" : "✗"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-700 font-medium leading-snug">{q.question || `Q${qi + 1}`}</p>
                    <div className="flex gap-3 mt-0.5 flex-wrap">
                      <span className={`font-medium ${correct ? "text-green-700" : "text-red-600"}`}>Answer: {userLabel}</span>
                      {!correct && <span className="text-green-700 font-medium">Correct: {correctLabel}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-400">No questions found</p>
        )}
      </div>
    );
  }

  return null;
}

function TestResultsTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: results, isLoading } = useQuery<TestResult[]>({
    queryKey: ["/api/admin/test-results"],
    queryFn: getQueryFn<TestResult[]>({ on401: "throw" }),
  });
  const { data: users } = useQuery<Omit<User, "password">[]>({
    queryKey: ["/api/admin/users"],
    queryFn: getQueryFn<Omit<User, "password">[]>({ on401: "throw" }),
  });
  const { data: listeningTests } = useQuery<ListeningTest[]>({ queryKey: ["/api/listening-tests"] });
  const { data: readingTests } = useQuery<ReadingTest[]>({ queryKey: ["/api/reading-tests"] });
  const { data: writingTests } = useQuery<WritingTest[]>({ queryKey: ["/api/writing-tests"] });
  const { data: spTests } = useQuery<SpeakingTest[]>({ queryKey: ["/api/speaking-tests"] });

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("all");
  const [filterUser, setFilterUser] = useState<string>("all");
  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/admin/test-results/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/test-results"] });
      toast({ title: "Result deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete", variant: "destructive" });
    },
  });

  const getUserName = (userId: string) => {
    const u = users?.find(u => u.id === userId);
    return u?.fullName || u?.username || userId.slice(0, 8) + "…";
  };

  const typeColor: Record<string, string> = {
    speaking:  "bg-amber-100 text-amber-800 border-amber-300",
    writing:   "bg-purple-100 text-purple-800 border-purple-300",
    reading:   "bg-blue-100 text-blue-800 border-blue-300",
    listening: "bg-green-100 text-green-800 border-green-300",
  };

  const filtered = (results ?? []).filter(r => {
    if (filterType !== "all" && r.testType !== filterType) return false;
    if (filterUser !== "all" && r.userId !== filterUser) return false;
    return true;
  }).sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());

  const uniqueUsers = [...new Map((results ?? []).map(r => [r.userId, r])).values()];

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">Loading...</div>;

  return (
    <Card className="border-amber-200/50 dark:border-slate-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-amber-600" /> Test Results</CardTitle>
        <CardDescription>{filtered.length} / {results?.length || 0} submissions</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {["all", "listening", "reading", "writing", "speaking"].map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`text-xs px-3 py-1 rounded-full border font-medium capitalize transition-colors ${filterType === t ? "bg-slate-800 text-white border-slate-800" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
            >{t === "all" ? "All Types" : t}</button>
          ))}
          <select
            value={filterUser}
            onChange={e => setFilterUser(e.target.value)}
            className="ml-auto text-xs border rounded-lg px-2 py-1 text-slate-600 bg-white"
          >
            <option value="all">All Students</option>
            {uniqueUsers.map(r => (
              <option key={r.userId} value={r.userId}>{getUserName(r.userId)}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          {filtered.map((r) => (
            <div key={r.id} className="rounded-lg border bg-white dark:bg-slate-800/30 overflow-hidden" data-testid={`row-result-${r.id}`}>
              <div className="flex items-center px-4 py-3 gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                  data-testid={`button-expand-result-${r.id}`}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm truncate">{getUserName(r.userId)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded border font-medium capitalize ${typeColor[r.testType] ?? "bg-slate-100 text-slate-700"}`}>
                      {r.testType}
                    </span>
                    {r.fullmockId && (
                      <span className="text-xs px-2 py-0.5 rounded border font-medium bg-slate-100 text-slate-600 border-slate-200">
                        Full Mock
                      </span>
                    )}
                    {r.score != null && r.totalQuestions ? (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded border ${r.score / r.totalQuestions >= 0.7 ? "bg-green-50 text-green-700 border-green-200" : r.score / r.totalQuestions >= 0.5 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-red-50 text-red-700 border-red-200"}`}>
                        {r.score}/{r.totalQuestions}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Submitted</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {r.completedAt ? new Date(r.completedAt).toLocaleString("uk-UA") : "—"}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => deleteMutation.mutate(r.id)}
                    disabled={deleteMutation.isPending}
                    className="p-1.5 rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                    title="Delete result"
                    data-testid={`button-delete-result-${r.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <div
                    className="cursor-pointer p-1"
                    onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
                  >
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expandedId === r.id ? "rotate-180" : ""}`} />
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {expandedId === r.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 border-t pt-1">
                      <ResultDetail
                        result={r}
                        listeningTests={listeningTests}
                        readingTests={readingTests}
                        writingTests={writingTests}
                        speakingTests={spTests}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
          {!filtered.length && (
            <div className="text-center text-muted-foreground py-8 rounded-lg border">No results found</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function FullMockTab() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { data: tests, isLoading } = useQuery<FullMockTest[]>({
    queryKey: ["/api/fullmock-tests"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/fullmock-tests/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fullmock-tests"] });
      toast({ title: "Full mock test deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  return (
    <Card className="border-amber-200/50 dark:border-slate-800">
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle className="flex items-center gap-2"><Trophy className="w-5 h-5 text-amber-600" /> Full Mock Exams</CardTitle>
          <CardDescription>{tests?.length || 0} exams available</CardDescription>
        </div>
        <Button
          onClick={() => navigate("/admin/mock-builder")}
          className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md"
          data-testid="button-create-fullmock"
        >
          <Plus className="w-4 h-4" />
          Build New Mock
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        ) : !tests?.length ? (
          <div className="text-center py-12 text-muted-foreground space-y-3">
            <Layers className="w-10 h-10 mx-auto opacity-30" />
            <p>No full mock tests yet.</p>
            <Button variant="outline" size="sm" onClick={() => navigate("/admin/mock-builder")} data-testid="button-create-first-mock">
              Open Mock Builder
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {tests.map((test) => (
              <TestListItem
                key={test.id}
                title={test.title}
                subtitle={`${test.sections.length} sections · ${test.totalDuration} min`}
                onEdit={() => navigate(`/admin/mock-builder/${test.id}`)}
                onDelete={() => {
                   if (confirm("Are you sure you want to delete this full mock test?")) {
                     deleteMutation.mutate(test.id);
                   }
                }}
                testId={`fullmock-test-${test.id}`}
                badge={`${test.totalDuration} min`}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type OLQuestion = { text: string; type: "mcq" | "text"; options: string[]; correctAnswer: string };

function OnlineLessonsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);
  const [activeSubTab, setActiveSubTab] = useState<"questions" | "materials" | "results">("questions");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [linkName, setLinkName] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  const [qText, setQText] = useState("");
  const [qType, setQType] = useState<"mcq" | "text">("mcq");
  const [qOptions, setQOptions] = useState(["", "", "", ""]);
  const [qCorrect, setQCorrect] = useState("0");

  const { data: lessons = [], isLoading } = useQuery<OnlineLesson[]>({
    queryKey: ["/api/admin/online-lessons"],
  });

  const { data: questions = [] } = useQuery<OnlineLessonQuestion[]>({
    queryKey: ["/api/admin/online-lessons", selectedLesson, "questions"],
    queryFn: async () => {
      if (!selectedLesson) return [];
      const res = await fetch(`/api/admin/online-lessons/${selectedLesson}/questions`, { credentials: "include" });
      return res.json();
    },
    enabled: !!selectedLesson,
  });

  const { data: results = [] } = useQuery<(OnlineLessonResult & { user: { fullName: string; username: string } | null })[]>({
    queryKey: ["/api/admin/online-lessons", selectedLesson, "results"],
    queryFn: async () => {
      if (!selectedLesson) return [];
      const res = await fetch(`/api/admin/online-lessons/${selectedLesson}/results`, { credentials: "include" });
      return res.json();
    },
    enabled: !!selectedLesson && activeSubTab === "results",
  });

  const createMutation = useMutation({
    mutationFn: (data: object) => apiRequest("POST", "/api/admin/online-lessons", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/online-lessons"] });
      setTitle(""); setDescription(""); setDeadline(""); setDurationMinutes("30");
      toast({ title: "Online lesson created" });
    },
    onError: () => toast({ title: "Failed to create", variant: "destructive" }),
  });

  const deleteLessonMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/online-lessons/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/online-lessons"] });
      setSelectedLesson(null);
      toast({ title: "Deleted" });
    },
    onError: () => toast({ title: "Failed to delete", variant: "destructive" }),
  });

  const toggleLessonMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiRequest("PATCH", `/api/admin/online-lessons/${id}`, { isActive }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/online-lessons"] }),
    onError: () => toast({ title: "Failed to toggle", variant: "destructive" }),
  });

  const addQuestionMutation = useMutation({
    mutationFn: (q: object) => apiRequest("POST", `/api/admin/online-lessons/${selectedLesson}/questions`, q),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/online-lessons", selectedLesson, "questions"] });
      setQText(""); setQOptions(["", "", "", ""]); setQCorrect("0"); setQType("mcq");
      toast({ title: "Question added" });
    },
    onError: () => toast({ title: "Failed to add question", variant: "destructive" }),
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/admin/online-lesson-questions/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/admin/online-lessons", selectedLesson, "questions"] }),
    onError: () => toast({ title: "Failed to delete question", variant: "destructive" }),
  });

  const uploadMaterialMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/admin/online-lessons/${selectedLesson}/upload-material`, {
        method: "POST", credentials: "include", body: formData,
      });
      if (!res.ok) throw new Error("Upload failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/online-lessons"] });
      toast({ title: "File uploaded" });
    },
    onError: () => toast({ title: "Upload failed", variant: "destructive" }),
  });

  const addLinkMutation = useMutation({
    mutationFn: (data: { name: string; url: string }) =>
      apiRequest("POST", `/api/admin/online-lessons/${selectedLesson}/add-link`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/online-lessons"] });
      setLinkName(""); setLinkUrl("");
      toast({ title: "Link added" });
    },
    onError: () => toast({ title: "Failed to add link", variant: "destructive" }),
  });

  const deleteAttachmentMutation = useMutation({
    mutationFn: (index: number) =>
      apiRequest("DELETE", `/api/admin/online-lessons/${selectedLesson}/attachments/${index}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/online-lessons"] });
      toast({ title: "Removed" });
    },
    onError: () => toast({ title: "Failed to remove", variant: "destructive" }),
  });

  const handleCreateLesson = () => {
    if (!title.trim() || !deadline) {
      toast({ title: "Title and deadline are required", variant: "destructive" }); return;
    }
    createMutation.mutate({ title: title.trim(), description: description.trim(), deadline, durationMinutes: parseInt(durationMinutes) || 30, isActive: true });
  };

  const handleAddQuestion = () => {
    if (!qText.trim()) { toast({ title: "Question text is required", variant: "destructive" }); return; }
    if (qType === "mcq") {
      const opts = qOptions.filter((o) => o.trim());
      if (opts.length < 2) { toast({ title: "Add at least 2 options", variant: "destructive" }); return; }
      addQuestionMutation.mutate({ questionText: qText.trim(), type: "mcq", options: opts, correctAnswer: qCorrect });
    } else {
      addQuestionMutation.mutate({ questionText: qText.trim(), type: "text", options: [], correctAnswer: "" });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-teal-500" />
            Online Lessons
          </CardTitle>
          <CardDescription>Create lesson tests with a timer and deadline for students</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="border rounded-xl p-4 space-y-3 bg-muted/30">
            <p className="text-sm font-semibold">Create New Online Lesson</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-medium">Title *</label>
                <Input data-testid="input-ol-title" placeholder="e.g. IELTS Writing Task 1 Quiz" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground font-medium">Timer (minutes) *</label>
                <Input data-testid="input-ol-duration" type="number" min={1} max={180} placeholder="30" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Description</label>
              <Input data-testid="input-ol-description" placeholder="Optional description..." value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground font-medium">Deadline (date & time) *</label>
              <Input data-testid="input-ol-deadline" type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="w-full sm:w-64" />
            </div>
            <Button data-testid="button-create-ol" onClick={handleCreateLesson} disabled={createMutation.isPending} className="gap-2">
              <Plus className="w-4 h-4" />Add Lesson
            </Button>
          </div>

          {isLoading ? (
            <div className="text-muted-foreground text-sm py-4 text-center">Loading...</div>
          ) : lessons.length === 0 ? (
            <div className="text-muted-foreground text-sm py-8 text-center border rounded-xl bg-muted/20">No lessons yet. Add one above.</div>
          ) : (
            <div className="space-y-2">
              {lessons.map((lesson) => {
                const isSelected = selectedLesson === lesson.id;
                const isPast = new Date(lesson.deadline) < new Date();
                return (
                  <div key={lesson.id} className={`border rounded-xl overflow-hidden ${isSelected ? "border-teal-400 dark:border-teal-600" : "border-border"}`} data-testid={`row-ol-${lesson.id}`}>
                    <div
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/30 transition-colors"
                      onClick={() => { setSelectedLesson(isSelected ? null : lesson.id); setActiveSubTab("questions"); }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm truncate">{lesson.title}</span>
                          {!lesson.isActive && <Badge variant="secondary" className="text-xs shrink-0">Hidden</Badge>}
                          {isPast && <Badge variant="outline" className="text-xs shrink-0 text-destructive border-destructive">Expired</Badge>}
                          {lesson.isActive && !isPast && <Badge className="bg-emerald-500 text-white text-xs shrink-0">Active</Badge>}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                          <span className="flex items-center gap-1">
                            <CalendarClock className="w-3 h-3" />
                            {new Date(lesson.deadline).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <span>{lesson.durationMinutes} min</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button size="sm" variant="outline" className="gap-1 text-xs" data-testid={`button-toggle-ol-${lesson.id}`}
                          onClick={(e) => { e.stopPropagation(); toggleLessonMutation.mutate({ id: lesson.id, isActive: !lesson.isActive }); }}
                          disabled={toggleLessonMutation.isPending}
                        >
                          {lesson.isActive ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          {lesson.isActive ? "Hide" : "Show"}
                        </Button>
                        <Button size="sm" variant="destructive" data-testid={`button-delete-ol-${lesson.id}`}
                          onClick={(e) => { e.stopPropagation(); if (confirm("Delete this lesson and all its questions?")) deleteLessonMutation.mutate(lesson.id); }}
                          disabled={deleteLessonMutation.isPending}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                        {isSelected ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    </div>

                    {isSelected && (
                      <div className="border-t border-border bg-muted/20 p-4 space-y-4">
                        <div className="flex gap-2 border-b border-border pb-3 flex-wrap">
                          <Button size="sm" variant={activeSubTab === "questions" ? "default" : "ghost"} className="gap-1" onClick={() => setActiveSubTab("questions")} data-testid="subtab-questions">
                            <ClipboardList className="w-3 h-3" />Questions ({questions.length})
                          </Button>
                          <Button size="sm" variant={activeSubTab === "materials" ? "default" : "ghost"} className="gap-1" onClick={() => setActiveSubTab("materials")} data-testid="subtab-materials">
                            <Upload className="w-3 h-3" />Materials ({(lesson.attachments as any[] ?? []).length})
                          </Button>
                          <Button size="sm" variant={activeSubTab === "results" ? "default" : "ghost"} className="gap-1" onClick={() => setActiveSubTab("results")} data-testid="subtab-results">
                            <BarChart3 className="w-3 h-3" />Results
                          </Button>
                        </div>

                        {activeSubTab === "questions" && (
                          <div className="space-y-4">
                            <div className="space-y-3 border rounded-lg p-3 bg-background">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Add Question</p>
                              <div className="flex gap-2">
                                <Button size="sm" variant={qType === "mcq" ? "default" : "outline"} onClick={() => setQType("mcq")}>Multiple Choice</Button>
                                <Button size="sm" variant={qType === "text" ? "default" : "outline"} onClick={() => setQType("text")}>Text Answer</Button>
                              </div>
                              <Textarea data-testid="input-q-text" value={qText} onChange={(e) => setQText(e.target.value)} placeholder="Enter question text..." className="min-h-[60px] resize-none" />
                              {qType === "mcq" && (
                                <div className="space-y-2">
                                  <label className="text-xs text-muted-foreground">Options — select the correct answer with the radio button</label>
                                  {qOptions.map((opt, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                      <input type="radio" name="qcorrect" value={String(i)} checked={qCorrect === String(i)} onChange={() => setQCorrect(String(i))} className="accent-primary w-4 h-4" />
                                      <Input
                                        data-testid={`input-q-option-${i}`}
                                        placeholder={`Option ${String.fromCharCode(65 + i)}`}
                                        value={opt}
                                        onChange={(e) => setQOptions((prev) => { const n = [...prev]; n[i] = e.target.value; return n; })}
                                        className="h-8 text-sm"
                                      />
                                    </div>
                                  ))}
                                  <Button size="sm" variant="ghost" className="text-xs gap-1" onClick={() => setQOptions((p) => [...p, ""])}>
                                    <Plus className="w-3 h-3" />Add option
                                  </Button>
                                </div>
                              )}
                              <Button size="sm" className="gap-1" onClick={handleAddQuestion} disabled={addQuestionMutation.isPending} data-testid="button-add-question">
                                <Plus className="w-3 h-3" />Add Question
                              </Button>
                            </div>

                            {questions.length === 0 ? (
                              <p className="text-xs text-muted-foreground text-center py-4">No questions yet.</p>
                            ) : (
                              <div className="space-y-2">
                                {questions.map((q, idx) => (
                                  <div key={q.id} className="border rounded-lg p-3 bg-background flex gap-3" data-testid={`q-row-${q.id}`}>
                                    <span className="w-6 h-6 rounded-full bg-teal-100 dark:bg-teal-950/30 text-teal-700 dark:text-teal-400 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{idx + 1}</span>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium">{q.questionText}</p>
                                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                                        <Badge variant="outline" className="text-xs">{q.type === "mcq" ? "Multiple Choice" : "Text"}</Badge>
                                        {q.type === "mcq" && q.options && <span className="text-xs text-muted-foreground">{q.options.length} options</span>}
                                      </div>
                                    </div>
                                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive shrink-0" onClick={() => deleteQuestionMutation.mutate(q.id)} data-testid={`button-delete-q-${q.id}`}>
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {activeSubTab === "materials" && (
                          <div className="space-y-4">
                            <input
                              ref={fileInputRef}
                              type="file"
                              className="hidden"
                              data-testid="input-material-file"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) { uploadMaterialMutation.mutate(file); e.target.value = ""; }
                              }}
                            />
                            <div className="border rounded-lg p-3 bg-background space-y-3">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Upload File</p>
                              <Button size="sm" variant="outline" className="gap-2" onClick={() => fileInputRef.current?.click()} disabled={uploadMaterialMutation.isPending} data-testid="button-upload-material">
                                <Upload className="w-3 h-3" />
                                {uploadMaterialMutation.isPending ? "Uploading..." : "Choose File to Upload"}
                              </Button>
                              <p className="text-xs text-muted-foreground">Any file type accepted (PDF, images, audio, video, docs…)</p>
                            </div>
                            <div className="border rounded-lg p-3 bg-background space-y-3">
                              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Add Link</p>
                              <div className="flex gap-2">
                                <Input data-testid="input-link-name" placeholder="Link name (e.g. Reading passage)" value={linkName} onChange={(e) => setLinkName(e.target.value)} className="h-8 text-sm flex-1" />
                                <Input data-testid="input-link-url" placeholder="https://..." value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} className="h-8 text-sm flex-[2]" />
                              </div>
                              <Button size="sm" className="gap-1" onClick={() => { if (!linkName.trim() || !linkUrl.trim()) { toast({ title: "Name and URL required", variant: "destructive" }); return; } addLinkMutation.mutate({ name: linkName.trim(), url: linkUrl.trim() }); }} disabled={addLinkMutation.isPending} data-testid="button-add-link">
                                <Link2 className="w-3 h-3" />Add Link
                              </Button>
                            </div>
                            {(lesson.attachments as any[] ?? []).length === 0 ? (
                              <p className="text-xs text-muted-foreground text-center py-3">No materials yet.</p>
                            ) : (
                              <div className="space-y-2">
                                {(lesson.attachments as { type: string; name: string; url: string }[]).map((att, idx) => (
                                  <div key={idx} className="flex items-center gap-3 border rounded-lg p-2.5 bg-background" data-testid={`attachment-row-${idx}`}>
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${att.type === "file" ? "bg-blue-100 dark:bg-blue-950/30" : "bg-green-100 dark:bg-green-950/30"}`}>
                                      {att.type === "file" ? <FileText className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> : <Link2 className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium truncate">{att.name}</p>
                                      <a href={att.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline truncate block">{att.url}</a>
                                    </div>
                                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive shrink-0" onClick={() => deleteAttachmentMutation.mutate(idx)} disabled={deleteAttachmentMutation.isPending} data-testid={`button-delete-att-${idx}`}>
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {activeSubTab === "results" && (
                          <div>
                            {results.length === 0 ? (
                              <p className="text-xs text-muted-foreground text-center py-4">No submissions yet.</p>
                            ) : (
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Student</TableHead>
                                    <TableHead>Score</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Submitted</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {results.map((r) => (
                                    <TableRow key={r.id} data-testid={`result-row-${r.id}`}>
                                      <TableCell className="font-medium">{r.user?.fullName ?? r.userId}</TableCell>
                                      <TableCell>{r.score ?? "-"} / {r.totalQuestions ?? "-"}</TableCell>
                                      <TableCell>
                                        {r.timedOut
                                          ? <Badge className="bg-orange-500 text-white text-xs">Timed Out</Badge>
                                          : <Badge className="bg-emerald-500 text-white text-xs">Submitted</Badge>}
                                      </TableCell>
                                      <TableCell className="text-xs text-muted-foreground">
                                        {new Date(r.submittedAt).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

