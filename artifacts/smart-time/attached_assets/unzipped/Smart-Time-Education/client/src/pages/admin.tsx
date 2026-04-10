import { useState, useRef } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, getQueryFn } from "@/lib/queryClient";
import { useI18n } from "@/lib/i18n";
import { motion } from "framer-motion";
import {
  BookOpen, ArrowLeft, LogOut, Plus, Pencil, Trash2,
  Upload, Music, FileText, Users, BarChart3, Settings,
  Mic, Headphones, PenTool, Home as HomeIcon, X, Check
} from "lucide-react";
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
    setLocation("/");
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
            <div className="mb-6 overflow-x-auto pb-1">
              <TabsList className="inline-flex h-auto gap-1 p-1 bg-white dark:bg-slate-800 border shadow-sm rounded-xl min-w-max" data-testid="admin-tabs-list">
                <TabsTrigger value="homepage" className="gap-2 rounded-lg px-4 py-2.5 text-sm" data-testid="tab-homepage">
                  <HomeIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Homepage</span>
                </TabsTrigger>
                <TabsTrigger value="speaking" className="gap-2 rounded-lg px-4 py-2.5 text-sm" data-testid="tab-speaking">
                  <Mic className="w-4 h-4" />
                  <span className="hidden sm:inline">Speaking</span>
                </TabsTrigger>
                <TabsTrigger value="listening" className="gap-2 rounded-lg px-4 py-2.5 text-sm" data-testid="tab-listening">
                  <Headphones className="w-4 h-4" />
                  <span className="hidden sm:inline">Listening</span>
                </TabsTrigger>
                <TabsTrigger value="reading" className="gap-2 rounded-lg px-4 py-2.5 text-sm" data-testid="tab-reading">
                  <BookOpen className="w-4 h-4" />
                  <span className="hidden sm:inline">Reading</span>
                </TabsTrigger>
                <TabsTrigger value="writing" className="gap-2 rounded-lg px-4 py-2.5 text-sm" data-testid="tab-writing">
                  <PenTool className="w-4 h-4" />
                  <span className="hidden sm:inline">Writing</span>
                </TabsTrigger>
                <TabsTrigger value="users" className="gap-2 rounded-lg px-4 py-2.5 text-sm" data-testid="tab-users">
                  <Users className="w-4 h-4" />
                  <span className="hidden sm:inline">Users</span>
                </TabsTrigger>
                <TabsTrigger value="results" className="gap-2 rounded-lg px-4 py-2.5 text-sm" data-testid="tab-results">
                  <BarChart3 className="w-4 h-4" />
                  <span className="hidden sm:inline">Results</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="homepage"><HomepageContentTab /></TabsContent>
            <TabsContent value="speaking"><SpeakingTestsTab /></TabsContent>
            <TabsContent value="listening"><ListeningTestsTab /></TabsContent>
            <TabsContent value="reading"><ReadingTestsTab /></TabsContent>
            <TabsContent value="writing"><WritingTestsTab /></TabsContent>
            <TabsContent value="users"><UsersTab /></TabsContent>
            <TabsContent value="results"><TestResultsTab /></TabsContent>
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
  const [questions, setQuestions] = useState("");
  const [tips, setTips] = useState("");
  const [difficulty, setDifficulty] = useState("Easy");
  const [duration, setDuration] = useState("5");

  const resetForm = () => {
    if (test) {
      setTitle(test.title);
      setPart(String(test.part));
      setTopic(test.topic);
      setDescription(test.description);
      setQuestions(test.questions.join("\n"));
      setTips(test.tips.join("\n"));
      setDifficulty(test.difficulty);
      setDuration(String(test.duration));
    } else {
      setTitle(""); setPart("1"); setTopic(""); setDescription("");
      setQuestions(""); setTips(""); setDifficulty("Easy"); setDuration("5");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (v) resetForm(); }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto max-w-lg" data-testid="dialog-speaking-test">
        <DialogHeader>
          <DialogTitle>{test ? "Edit Speaking Test" : "Add Speaking Test"}</DialogTitle>
          <DialogDescription>Fill in the details for the speaking test</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
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
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} data-testid="input-speaking-description" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Questions (one per line)</label>
            <Textarea value={questions} onChange={(e) => setQuestions(e.target.value)} className="min-h-[100px]" data-testid="input-speaking-questions" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Tips (one per line)</label>
            <Textarea value={tips} onChange={(e) => setTips(e.target.value)} data-testid="input-speaking-tips" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Duration (minutes)</label>
            <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} data-testid="input-speaking-duration" />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-speaking">Cancel</Button>
          <Button
            onClick={() => onSave({
              title, part: parseInt(part), topic, description,
              questions: questions.split("\n").filter(Boolean),
              tips: tips.split("\n").filter(Boolean),
              difficulty, duration: parseInt(duration),
            })}
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

function ListeningTestDialog({ open, onOpenChange, test, onSave, isPending }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  test: ListeningTest | null;
  onSave: (body: any) => void;
  isPending: boolean;
}) {
  const [title, setTitle] = useState("");
  const [section, setSection] = useState("1");
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [questionsJson, setQuestionsJson] = useState("[]");
  const [audioUrl, setAudioUrl] = useState("");
  const [difficulty, setDifficulty] = useState("Easy");
  const [duration, setDuration] = useState("10");

  const resetForm = () => {
    if (test) {
      setTitle(test.title);
      setSection(String(test.section));
      setTopic(test.topic);
      setDescription(test.description);
      setQuestionsJson(JSON.stringify(test.questions, null, 2));
      setAudioUrl(test.audioUrl || "");
      setDifficulty(test.difficulty);
      setDuration(String(test.duration));
    } else {
      setTitle(""); setSection("1"); setTopic(""); setDescription("");
      setQuestionsJson('[{"id":1,"question":"","options":["","","",""],"correctAnswer":0}]');
      setAudioUrl(""); setDifficulty("Easy"); setDuration("10");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (v) resetForm(); }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto max-w-lg" data-testid="dialog-listening-test">
        <DialogHeader>
          <DialogTitle>{test ? "Edit Listening Test" : "Add Listening Test"}</DialogTitle>
          <DialogDescription>Add audio file and questions for the listening test</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} data-testid="input-listening-title" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Section</label>
              <Select value={section} onValueChange={setSection}>
                <SelectTrigger data-testid="select-listening-section"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Section 1</SelectItem>
                  <SelectItem value="2">Section 2</SelectItem>
                  <SelectItem value="3">Section 3</SelectItem>
                  <SelectItem value="4">Section 4</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Topic</label>
              <Input value={topic} onChange={(e) => setTopic(e.target.value)} data-testid="input-listening-topic" />
            </div>
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
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} data-testid="input-listening-description" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Audio File (MP3)</label>
            <div className="flex items-center gap-3">
              <FileUploadButton
                onUploaded={(url) => setAudioUrl(url)}
                accept=".mp3,.wav,.ogg,.m4a"
                label="Upload MP3"
                icon={Music}
              />
              {audioUrl && (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Badge variant="secondary" className="gap-1 max-w-full truncate">
                    <Music className="w-3 h-3 shrink-0" />
                    <span className="truncate">{audioUrl.split("/").pop()}</span>
                  </Badge>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setAudioUrl("")}>
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
            {audioUrl && (
              <audio controls className="w-full mt-2 rounded-lg" src={audioUrl} data-testid="audio-preview">
                Your browser does not support audio playback.
              </audio>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Questions (JSON array)</label>
            <Textarea
              value={questionsJson}
              onChange={(e) => setQuestionsJson(e.target.value)}
              className="font-mono text-xs min-h-[120px]"
              data-testid="input-listening-questions"
            />
            <p className="text-xs text-muted-foreground">Format: [{"{"}"id":1,"question":"...","options":["A","B","C","D"],"correctAnswer":0{"}"}]</p>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Duration (minutes)</label>
            <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} data-testid="input-listening-duration" />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-listening">Cancel</Button>
          <Button
            onClick={() => {
              let questions: ListeningQuestion[] = [];
              try { questions = JSON.parse(questionsJson); } catch { return; }
              onSave({
                title, section: parseInt(section), topic, description,
                questions, audioUrl: audioUrl || null,
                difficulty, duration: parseInt(duration),
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

function ReadingTestDialog({ open, onOpenChange, test, onSave, isPending }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  test: ReadingTest | null;
  onSave: (body: any) => void;
  isPending: boolean;
}) {
  const [title, setTitle] = useState("");
  const [passage, setPassage] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [topic, setTopic] = useState("");
  const [description, setDescription] = useState("");
  const [questionsJson, setQuestionsJson] = useState("[]");
  const [difficulty, setDifficulty] = useState("Easy");
  const [duration, setDuration] = useState("20");

  const resetForm = () => {
    if (test) {
      setTitle(test.title);
      setPassage(test.passage);
      setPdfUrl(test.pdfUrl || "");
      setTopic(test.topic);
      setDescription(test.description);
      setQuestionsJson(JSON.stringify(test.questions, null, 2));
      setDifficulty(test.difficulty);
      setDuration(String(test.duration));
    } else {
      setTitle(""); setPassage(""); setPdfUrl(""); setTopic(""); setDescription("");
      setQuestionsJson('[{"id":1,"question":"","options":["","","",""],"correctAnswer":0}]');
      setDifficulty("Easy"); setDuration("20");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (v) resetForm(); }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto max-w-lg" data-testid="dialog-reading-test">
        <DialogHeader>
          <DialogTitle>{test ? "Edit Reading Test" : "Add Reading Test"}</DialogTitle>
          <DialogDescription>Add a passage or PDF and questions for the reading test</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
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
              <label className="text-sm font-medium">Duration (minutes)</label>
              <Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} data-testid="input-reading-duration" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Description</label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} data-testid="input-reading-description" />
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
            <label className="text-sm font-medium">Passage (text)</label>
            <Textarea
              value={passage}
              onChange={(e) => setPassage(e.target.value)}
              className="min-h-[120px]"
              placeholder="Enter the reading passage text here..."
              data-testid="input-reading-passage"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Questions (JSON array)</label>
            <Textarea
              value={questionsJson}
              onChange={(e) => setQuestionsJson(e.target.value)}
              className="font-mono text-xs min-h-[120px]"
              data-testid="input-reading-questions"
            />
            <p className="text-xs text-muted-foreground">Format: [{"{"}"id":1,"question":"...","options":["A","B","C","D"],"correctAnswer":0{"}"}]</p>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-reading">Cancel</Button>
          <Button
            onClick={() => {
              let questions: ReadingQuestion[] = [];
              try { questions = JSON.parse(questionsJson); } catch { return; }
              onSave({
                title, passage, pdfUrl: pdfUrl || null, topic, description,
                questions, difficulty, duration: parseInt(duration),
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
                subtitle={`Task ${test.task} - ${test.difficulty} - ${test.duration}min`}
                onEdit={() => { setEditingTest(test); setDialogOpen(true); }}
                onDelete={() => deleteMutation.mutate(test.id)}
                testId={`writing-test-${test.id}`}
                badge={`Task ${test.task}`}
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
      setDifficulty(test.difficulty);
      setDuration(String(test.duration));
    } else {
      setTitle(""); setTask("1"); setTopic(""); setDescription("");
      setPrompt(""); setTips(""); setSampleAnswer(""); setDifficulty("Medium"); setDuration("20");
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
  const { data: users, isLoading } = useQuery<Omit<User, "password">[]>({
    queryKey: ["/api/admin/users"],
    queryFn: getQueryFn<Omit<User, "password">[]>({ on401: "throw" }),
  });

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
                </TableRow>
              ))}
              {!users?.length && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No users found</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function TestResultsTab() {
  const { data: results, isLoading } = useQuery<TestResult[]>({
    queryKey: ["/api/admin/test-results"],
    queryFn: getQueryFn<TestResult[]>({ on401: "throw" }),
  });

  const { data: users } = useQuery<Omit<User, "password">[]>({
    queryKey: ["/api/admin/users"],
    queryFn: getQueryFn<Omit<User, "password">[]>({ on401: "throw" }),
  });

  const getUserName = (userId: string) => {
    const user = users?.find(u => u.id === userId);
    return user?.fullName || user?.username || userId.slice(0, 8) + "...";
  };

  if (isLoading) {
    return <div className="text-center py-12 text-muted-foreground">Loading...</div>;
  }

  return (
    <Card className="border-amber-200/50 dark:border-slate-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-amber-600" /> Test Results</CardTitle>
        <CardDescription>{results?.length || 0} submissions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-lg border">
          <Table data-testid="table-results">
            <TableHeader>
              <TableRow className="bg-slate-50 dark:bg-slate-800/50">
                <TableHead className="font-semibold">Student</TableHead>
                <TableHead className="font-semibold">Test Type</TableHead>
                <TableHead className="font-semibold">Score</TableHead>
                <TableHead className="font-semibold">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results?.map((r) => (
                <TableRow key={r.id} data-testid={`row-result-${r.id}`}>
                  <TableCell className="font-medium">{getUserName(r.userId)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{r.testType}</Badge>
                  </TableCell>
                  <TableCell>
                    {r.score != null && r.totalQuestions ? (
                      <span className="font-medium">{r.score}/{r.totalQuestions}</span>
                    ) : (
                      <span className="text-muted-foreground">Submitted</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.completedAt ? new Date(r.completedAt).toLocaleDateString() : "-"}
                  </TableCell>
                </TableRow>
              ))}
              {!results?.length && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No test results yet</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
