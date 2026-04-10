import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Save, Headphones, BookOpen, PenTool, Mic,
  Plus, X, GripVertical, Clock, FileText, Layers, ChevronDown
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { ListeningTest, ReadingTest, WritingTest, SpeakingTest, FullMockTest } from "@shared/schema";
import { useState, useEffect, useRef } from "react";
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates,
  useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type SectionType = "speaking" | "listening" | "reading" | "writing";

interface DynamicPart {
  uid: string;
  testId: string;
  testTitle: string;
  testSubtitle: string;
  duration: number;
}

type SectionsState = Record<SectionType, DynamicPart[]>;

const SECTION_META: Record<SectionType, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  light: string;
  text: string;
  addLabel: string;
  partLabel: (idx: number) => string;
}> = {
  speaking: {
    label: "Speaking",
    icon: Mic,
    color: "bg-amber-500",
    light: "bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800",
    text: "text-amber-700 dark:text-amber-400",
    addLabel: "Add Speaking Part",
    partLabel: (i) => `Part ${i + 1}`,
  },
  listening: {
    label: "Listening",
    icon: Headphones,
    color: "bg-blue-500",
    light: "bg-blue-50/60 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800",
    text: "text-blue-700 dark:text-blue-400",
    addLabel: "Add Listening Part",
    partLabel: (i) => `Section ${i + 1}`,
  },
  reading: {
    label: "Reading",
    icon: BookOpen,
    color: "bg-emerald-600",
    light: "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800",
    text: "text-emerald-700 dark:text-emerald-400",
    addLabel: "Add Reading Passage",
    partLabel: (i) => `Passage ${i + 1}`,
  },
  writing: {
    label: "Writing",
    icon: PenTool,
    color: "bg-purple-600",
    light: "bg-purple-50/60 dark:bg-purple-950/20 border-purple-200 dark:border-purple-800",
    text: "text-purple-700 dark:text-purple-400",
    addLabel: "Add Writing Task",
    partLabel: (i) => `Task ${i + 1}`,
  },
};

const SECTION_ORDER: SectionType[] = ["listening", "reading", "writing", "speaking"];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function SortablePartRow({
  part, index, sectionType, onRemove,
}: {
  part: DynamicPart;
  index: number;
  sectionType: SectionType;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: part.uid });
  const meta = SECTION_META[sectionType];
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-3 rounded-lg border bg-background transition-shadow ${
        isDragging ? "shadow-lg ring-2 ring-primary/30 z-10" : ""
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing shrink-0 touch-none"
        title="Drag to reorder"
        type="button"
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <div className={`w-7 h-7 rounded-md ${meta.color} flex items-center justify-center text-white shrink-0 text-[11px] font-bold`}>
        {meta.partLabel(index)}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${meta.text}`}>{part.testTitle}</p>
        <p className="text-xs text-muted-foreground truncate">{part.testSubtitle}</p>
      </div>
      {part.duration > 0 && (
        <span className="text-xs text-muted-foreground flex items-center gap-0.5 shrink-0">
          <Clock className="w-3 h-3" />{part.duration}m
        </span>
      )}
      <Button
        variant="ghost"
        size="sm"
        type="button"
        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-red-50 dark:hover:bg-red-950/20 shrink-0"
        onClick={onRemove}
        title="Remove this part"
      >
        <X className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

function AddPartPopover({
  sectionType,
  allTests,
  onAdd,
}: {
  sectionType: SectionType;
  allTests: { id: string; title: string; subtitle: string; duration: number }[];
  onAdd: (t: { id: string; title: string; subtitle: string; duration: number }) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const meta = SECTION_META[sectionType];

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const filtered = allTests.filter(t =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.subtitle.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative" ref={ref}>
      <Button
        variant="outline"
        size="sm"
        type="button"
        className={`gap-2 text-sm border-dashed w-full justify-start ${meta.text} hover:bg-transparent`}
        onClick={() => { setOpen(!open); setSearch(""); }}
        data-testid={`button-add-part-${sectionType}`}
      >
        <Plus className="w-3.5 h-3.5" />
        {meta.addLabel}
        <ChevronDown className={`w-3.5 h-3.5 ml-auto transition-transform ${open ? "rotate-180" : ""}`} />
      </Button>

      {open && (
        <div className="absolute top-full mt-1 left-0 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-xl border bg-background shadow-xl overflow-hidden">
          <div className="p-3 border-b">
            <Input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={`Search ${meta.label.toLowerCase()} parts...`}
              className="h-8 text-sm"
            />
          </div>
          <div className="max-h-52 overflow-y-auto p-1.5 space-y-0.5">
            {filtered.length === 0 ? (
              <div className="text-center py-6 text-sm text-muted-foreground">
                <FileText className="w-6 h-6 mx-auto mb-1.5 opacity-30" />
                {allTests.length === 0
                  ? `No ${meta.label.toLowerCase()} parts in library yet`
                  : "No matches found"}
              </div>
            ) : (
              filtered.map(t => (
                <button
                  key={t.id}
                  type="button"
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-muted transition-colors"
                  onClick={() => {
                    onAdd(t);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <p className="text-sm font-medium">{t.title}</p>
                  <p className="text-xs text-muted-foreground">{t.subtitle}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SectionPanel({
  type,
  parts,
  allTests,
  onReorder,
  onAdd,
  onRemove,
}: {
  type: SectionType;
  parts: DynamicPart[];
  allTests: { id: string; title: string; subtitle: string; duration: number }[];
  onReorder: (items: DynamicPart[]) => void;
  onAdd: (test: { id: string; title: string; subtitle: string; duration: number }) => void;
  onRemove: (uid: string) => void;
}) {
  const meta = SECTION_META[type];
  const Icon = meta.icon;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = parts.findIndex(p => p.uid === active.id);
    const newIndex = parts.findIndex(p => p.uid === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      onReorder(arrayMove(parts, oldIndex, newIndex));
    }
  }

  const sectionDuration = parts.reduce((sum, p) => sum + p.duration, 0);

  return (
    <div className={`rounded-xl border ${meta.light} overflow-hidden`}>
      <div className={`px-4 py-3 flex items-center justify-between border-b ${meta.light}`}>
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg ${meta.color} flex items-center justify-center text-white`}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <h3 className={`font-semibold text-sm ${meta.text}`}>{meta.label}</h3>
            <p className="text-xs text-muted-foreground">
              {parts.length === 0 ? "No parts added yet" : `${parts.length} part${parts.length !== 1 ? "s" : ""}`}
              {sectionDuration > 0 && ` · ${sectionDuration} min`}
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="text-xs">
          {parts.length} {parts.length === 1 ? "part" : "parts"}
        </Badge>
      </div>

      <div className="p-3 space-y-2">
        {parts.length > 0 && (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={parts.map(p => p.uid)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {parts.map((part, i) => (
                  <SortablePartRow
                    key={part.uid}
                    part={part}
                    index={i}
                    sectionType={type}
                    onRemove={() => onRemove(part.uid)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {parts.length === 0 && (
          <div className="py-4 text-center">
            <p className="text-xs text-muted-foreground italic">
              Click "{meta.addLabel}" below to add parts from your library
            </p>
          </div>
        )}

        <AddPartPopover sectionType={type} allTests={allTests} onAdd={onAdd} />
      </div>
    </div>
  );
}

function buildLibrary(
  type: SectionType,
  listening: ListeningTest[],
  reading: ReadingTest[],
  writing: WritingTest[],
  speaking: SpeakingTest[]
) {
  if (type === "listening") return listening.map(t => ({
    id: t.id, title: t.title, subtitle: `Section ${t.section} · ${t.topic} · ${t.difficulty}`, duration: t.duration
  }));
  if (type === "reading") return reading.map(t => ({
    id: t.id, title: t.title, subtitle: `${t.topic} · ${t.difficulty}`, duration: t.duration
  }));
  if (type === "writing") return writing.map(t => ({
    id: t.id, title: t.title, subtitle: `Task ${t.task} · ${t.topic} · ${t.difficulty}`, duration: t.duration
  }));
  if (type === "speaking") return speaking.map(t => ({
    id: t.id, title: t.title, subtitle: `Part ${t.part} · ${t.topic} · ${t.difficulty}`, duration: t.duration
  }));
  return [];
}

function buildTestLookup(
  type: SectionType,
  listening: ListeningTest[],
  reading: ReadingTest[],
  writing: WritingTest[],
  speaking: SpeakingTest[],
  testId: string
): { title: string; subtitle: string; duration: number } {
  const lib = buildLibrary(type, listening, reading, writing, speaking);
  const t = lib.find(x => x.id === testId);
  return t || { title: testId, subtitle: "", duration: 0 };
}

export default function AdminMockBuilder() {
  const { id } = useParams<{ id?: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("IELTS Academic Mock Test 1");
  const [description, setDescription] = useState("");
  const [sections, setSections] = useState<SectionsState>({
    listening: [], reading: [], writing: [], speaking: [],
  });

  const { data: speakingTests = [] } = useQuery<SpeakingTest[]>({ queryKey: ["/api/speaking-tests"] });
  const { data: listeningTests = [] } = useQuery<ListeningTest[]>({ queryKey: ["/api/listening-tests"] });
  const { data: readingTests = [] } = useQuery<ReadingTest[]>({ queryKey: ["/api/reading-tests"] });
  const { data: writingTests = [] } = useQuery<WritingTest[]>({ queryKey: ["/api/writing-tests"] });

  const { data: existingTest } = useQuery<FullMockTest>({
    queryKey: ["/api/fullmock-tests", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await fetch(`/api/fullmock-tests/${id}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load test");
      return res.json();
    },
  });

  useEffect(() => {
    if (!existingTest || !listeningTests.length && !readingTests.length && !writingTests.length && !speakingTests.length) return;
    setTitle(existingTest.title);
    setDescription(existingTest.description || "");

    const byType: SectionsState = { listening: [], reading: [], writing: [], speaking: [] };
    const sorted = [...existingTest.sections].sort((a, b) => ((a as any).sectionIndex || 0) - ((b as any).sectionIndex || 0));
    for (const sec of sorted) {
      const type = sec.type as SectionType;
      const look = buildTestLookup(type, listeningTests, readingTests, writingTests, speakingTests, sec.testId);
      byType[type].push({ uid: uid(), testId: sec.testId, testTitle: look.title, testSubtitle: look.subtitle, duration: look.duration });
    }
    setSections(byType);
  }, [existingTest, listeningTests, readingTests, writingTests, speakingTests]);

  const totalParts = Object.values(sections).reduce((s, arr) => s + arr.length, 0);
  const totalDuration = Object.values(sections).reduce((s, arr) => s + arr.reduce((ss, p) => ss + p.duration, 0), 0);

  function addPart(type: SectionType, test: { id: string; title: string; subtitle: string; duration: number }) {
    const newPart: DynamicPart = { uid: uid(), testId: test.id, testTitle: test.title, testSubtitle: test.subtitle, duration: test.duration };
    setSections(prev => ({ ...prev, [type]: [...prev[type], newPart] }));
  }

  function removePart(type: SectionType, partUid: string) {
    setSections(prev => ({ ...prev, [type]: prev[type].filter(p => p.uid !== partUid) }));
  }

  function reorderParts(type: SectionType, items: DynamicPart[]) {
    setSections(prev => ({ ...prev, [type]: items }));
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const flat: { type: string; testId: string; sectionIndex?: number }[] = [];
      for (const type of SECTION_ORDER) {
        sections[type].forEach((p, i) => {
          if (type === "speaking") flat.push({ type, testId: p.testId });
          else flat.push({ type, testId: p.testId, sectionIndex: i + 1 });
        });
      }
      const body = { title, description, sections: flat, totalDuration };
      if (id) await apiRequest("PUT", `/api/admin/fullmock-tests/${id}`, body);
      else await apiRequest("POST", "/api/admin/fullmock-tests", body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/fullmock-tests"] });
      toast({ title: id ? "Mock test updated!" : "Mock test created!" });
      navigate("/admin");
    },
    onError: (err: any) => toast({ title: "Error saving", description: err.message, variant: "destructive" }),
  });

  const statsItems = SECTION_ORDER.map(type => ({
    type,
    count: sections[type].length,
    meta: SECTION_META[type],
  }));

  return (
    <div className="min-h-screen bg-muted/20">
      <div className="border-b bg-background/95 backdrop-blur sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="gap-2" onClick={() => navigate("/admin")} data-testid="button-back-admin">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Admin</span>
            </Button>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-md bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                <Layers className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold text-sm">Mock Test Builder</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground">
              <span>{totalParts} parts</span>
              <span className="text-border">·</span>
              <Clock className="w-3.5 h-3.5" />
              <span>{totalDuration} min</span>
            </div>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!title.trim() || saveMutation.isPending}
              className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
              data-testid="button-save-mock"
            >
              <Save className="w-4 h-4" />
              {saveMutation.isPending ? "Saving..." : id ? "Save Changes" : "Create Test"}
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Test Title</label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. IELTS Academic Mock Test 1"
              className="font-medium bg-background"
              data-testid="input-mock-title"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-muted-foreground">Description (optional)</label>
            <Input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Brief description..."
              className="bg-background"
              data-testid="input-mock-description"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {statsItems.map(({ type, count, meta }) => {
            const Icon = meta.icon;
            return (
              <div key={type} className={`p-3 rounded-xl border text-center ${meta.light}`}>
                <Icon className={`w-5 h-5 mx-auto mb-1.5 ${meta.text}`} />
                <p className={`text-xs font-semibold ${meta.text}`}>{meta.label}</p>
                <p className="text-2xl font-black mt-0.5">{count}</p>
                <p className="text-xs text-muted-foreground">{count === 1 ? "part" : "parts"}</p>
              </div>
            );
          })}
        </div>

        <div className="space-y-4">
          {SECTION_ORDER.map(type => (
            <SectionPanel
              key={type}
              type={type}
              parts={sections[type]}
              allTests={buildLibrary(type, listeningTests, readingTests, writingTests, speakingTests)}
              onReorder={items => reorderParts(type, items)}
              onAdd={test => addPart(type, test)}
              onRemove={partUid => removePart(type, partUid)}
            />
          ))}
        </div>

        {totalParts === 0 && (
          <div className="text-center py-8 rounded-xl border-2 border-dashed border-border bg-background">
            <Layers className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground font-medium">No parts added yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Use the "+ Add" buttons in each section above to build your exam
            </p>
          </div>
        )}

        <div className="flex items-center justify-between p-4 rounded-xl border bg-background">
          <div>
            <p className="font-semibold">Total: {totalParts} parts · {totalDuration} minutes</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {statsItems.map(s => `${s.meta.label}: ${s.count}`).join(" · ")}
            </p>
          </div>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={!title.trim() || saveMutation.isPending}
            className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
          >
            <Save className="w-4 h-4" />
            {saveMutation.isPending ? "Saving..." : id ? "Save Changes" : "Create Test"}
          </Button>
        </div>
      </div>
    </div>
  );
}
