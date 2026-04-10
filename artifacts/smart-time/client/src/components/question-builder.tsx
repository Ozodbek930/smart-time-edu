import { useState, useRef } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical, Trash2, ChevronDown, ChevronUp,
  Plus, CheckSquare, AlignLeft, List, Hash,
  MessageSquare, Link2, SplitSquareVertical,
  ImagePlus, X as XIcon, Loader2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue
} from "@/components/ui/select";

export type QuestionType =
  | "mcq"
  | "tfng"
  | "ynng"
  | "completion"
  | "short-answer"
  | "matching"
  | "text";

export interface BuilderQuestion {
  id: number;
  type?: QuestionType;
  question: string;
  options: string[];
  correctAnswer: number | string;
  imageUrl?: string | null;
  imageCaption?: string;
}

const TYPE_META: Record<
  QuestionType,
  { label: string; short: string; colorClass: string; badgeClass: string; icon: React.ElementType }
> = {
  mcq:           { label: "Multiple Choice",       short: "MCQ",        colorClass: "border-blue-300 bg-blue-50 dark:bg-blue-950/20",     badgeClass: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",     icon: CheckSquare },
  tfng:          { label: "True / False / Not Given", short: "T/F/NG",  colorClass: "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20", badgeClass: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300", icon: CheckSquare },
  ynng:          { label: "Yes / No / Not Given",  short: "Y/N/NG",     colorClass: "border-violet-300 bg-violet-50 dark:bg-violet-950/20", badgeClass: "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300", icon: CheckSquare },
  completion:    { label: "Sentence Completion",   short: "Fill",       colorClass: "border-orange-300 bg-orange-50 dark:bg-orange-950/20", badgeClass: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300", icon: AlignLeft },
  "short-answer":{ label: "Short Answer",          short: "Short",      colorClass: "border-pink-300 bg-pink-50 dark:bg-pink-950/20",      badgeClass: "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300",      icon: MessageSquare },
  matching:      { label: "Matching Headings",     short: "Match",      colorClass: "border-cyan-300 bg-cyan-50 dark:bg-cyan-950/20",      badgeClass: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300",      icon: Link2 },
  text:          { label: "Text / Instruction",    short: "Text",       colorClass: "border-amber-300 bg-amber-50 dark:bg-amber-950/20",   badgeClass: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",  icon: SplitSquareVertical },
};

const ADD_BUTTONS: { type: QuestionType; label: string; defaultQ: Partial<BuilderQuestion> }[] = [
  {
    type: "mcq",
    label: "+ MCQ",
    defaultQ: { options: ["Option A", "Option B", "Option C", "Option D"], correctAnswer: 0 },
  },
  {
    type: "tfng",
    label: "+ T/F/NG",
    defaultQ: { options: ["True", "False", "Not Given"], correctAnswer: 0 },
  },
  {
    type: "ynng",
    label: "+ Y/N/NG",
    defaultQ: { options: ["Yes", "No", "Not Given"], correctAnswer: 0 },
  },
  {
    type: "completion",
    label: "+ Fill",
    defaultQ: { options: [], correctAnswer: "" },
  },
  {
    type: "short-answer",
    label: "+ Short Ans.",
    defaultQ: { options: [], correctAnswer: "" },
  },
  {
    type: "matching",
    label: "+ Matching",
    defaultQ: {
      options: ["i. First heading", "ii. Second heading", "iii. Third heading", "iv. Fourth heading"],
      correctAnswer: 0,
    },
  },
  {
    type: "text",
    label: "+ Text",
    defaultQ: { options: [], correctAnswer: 0 },
  },
];

/* ─── Question type-specific editor ─── */
function QuestionEditor({
  q,
  onChange,
}: {
  q: BuilderQuestion;
  onChange: (updated: BuilderQuestion) => void;
}) {
  const type = q.type || "mcq";
  const imgInputRef = useRef<HTMLInputElement>(null);
  const [imgUploading, setImgUploading] = useState(false);

  const setQuestion = (question: string) => onChange({ ...q, question });
  const setCorrect = (correctAnswer: number | string) => onChange({ ...q, correctAnswer });
  const setOption = (i: number, val: string) => {
    const options = [...q.options];
    options[i] = val;
    onChange({ ...q, options });
  };
  const addOption = () => onChange({ ...q, options: [...q.options, ""] });
  const removeOption = (i: number) => {
    const options = q.options.filter((_, idx) => idx !== i);
    onChange({ ...q, options, correctAnswer: 0 });
  };

  const handleImageUpload = async (file: File) => {
    setImgUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      onChange({ ...q, imageUrl: data.url });
    } catch {
      alert("Image upload failed. Please try again.");
    } finally {
      setImgUploading(false);
    }
  };

  return (
    <div className="mt-3 space-y-3 pt-3 border-t border-border/60">
      {/* Question / text field */}
      <div className="space-y-1">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {type === "text" ? "Instruction / Block Text" : "Question Text"}
        </label>
        <Textarea
          value={q.question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={
            type === "text"
              ? "e.g. Questions 1–5\nChoose the correct answer A, B, C or D."
              : type === "completion"
              ? "e.g. The report states that pollution levels ___ significantly."
              : "Enter question text..."
          }
          className="text-sm min-h-[64px] resize-none"
          rows={3}
        />
      </div>

      {/* Image upload (for non-text blocks) */}
      {type !== "text" && (
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Image (optional)
          </label>
          <input
            ref={imgInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ""; }}
          />
          {q.imageUrl ? (
            <div className="space-y-2">
              <div className="relative inline-block rounded-lg overflow-hidden border max-w-xs">
                <img src={q.imageUrl} alt="Question image" className="max-h-40 object-contain w-full" />
                <button
                  type="button"
                  onClick={() => onChange({ ...q, imageUrl: null })}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-red-600 transition-colors"
                  title="Remove image"
                >
                  <XIcon className="w-3 h-3" />
                </button>
              </div>
              <Input
                value={q.imageCaption || ""}
                onChange={(e) => onChange({ ...q, imageCaption: e.target.value })}
                placeholder="Image caption (optional)..."
                className="text-xs h-7 max-w-xs"
              />
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5 border-dashed"
              onClick={() => imgInputRef.current?.click()}
              disabled={imgUploading}
            >
              {imgUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ImagePlus className="w-3 h-3" />}
              {imgUploading ? "Uploading..." : "Add Image"}
            </Button>
          )}
        </div>
      )}

      {/* MCQ options */}
      {type === "mcq" && (
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Options &amp; Correct Answer
          </label>
          {q.options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCorrect(i)}
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                  q.correctAnswer === i
                    ? "border-emerald-500 bg-emerald-500"
                    : "border-border hover:border-emerald-400"
                }`}
                title="Mark as correct"
              >
                {q.correctAnswer === i && (
                  <div className="w-2 h-2 rounded-full bg-white" />
                )}
              </button>
              <span className="text-xs font-bold text-muted-foreground w-5">
                {String.fromCharCode(65 + i)}.
              </span>
              <Input
                value={opt}
                onChange={(e) => setOption(i, e.target.value)}
                placeholder={`Option ${String.fromCharCode(65 + i)}`}
                className="text-sm h-8"
              />
              {q.options.length > 2 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeOption(i)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
          ))}
          {q.options.length < 6 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={addOption}
            >
              <Plus className="w-3 h-3" /> Add Option
            </Button>
          )}
        </div>
      )}

      {/* T/F/NG and Y/N/NG correct answer */}
      {(type === "tfng" || type === "ynng") && (
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Correct Answer
          </label>
          <div className="flex gap-2">
            {q.options.map((opt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setCorrect(i)}
                className={`flex-1 py-1.5 px-3 rounded-lg border-2 text-sm font-semibold transition-all ${
                  q.correctAnswer === i
                    ? "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300"
                    : "border-border text-muted-foreground hover:border-emerald-300"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Completion correct answer */}
      {type === "completion" && (
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Correct Answer (word/phrase to fill the blank)
          </label>
          <Input
            value={String(q.correctAnswer)}
            onChange={(e) => setCorrect(e.target.value)}
            placeholder="e.g. increased"
            className="text-sm h-8"
          />
          <p className="text-[10px] text-muted-foreground">
            Case-insensitive. Use ___ in the question text to mark the blank.
          </p>
        </div>
      )}

      {/* Short answer */}
      {type === "short-answer" && (
        <div className="space-y-1">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Correct Answer
          </label>
          <Input
            value={String(q.correctAnswer)}
            onChange={(e) => setCorrect(e.target.value)}
            placeholder="Enter expected answer"
            className="text-sm h-8"
          />
          <p className="text-[10px] text-muted-foreground">Case-insensitive match.</p>
        </div>
      )}

      {/* Matching */}
      {type === "matching" && (
        <div className="space-y-2">
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            Options (headings / list items)
          </label>
          {q.options.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs font-bold text-muted-foreground w-5 shrink-0">
                {i + 1}.
              </span>
              <Input
                value={opt}
                onChange={(e) => setOption(i, e.target.value)}
                placeholder={`Option ${i + 1}`}
                className="text-sm h-8"
              />
              {q.options.length > 2 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => removeOption(i)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
          ))}
          {q.options.length < 8 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={addOption}
            >
              <Plus className="w-3 h-3" /> Add Option
            </Button>
          )}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Correct Answer (option number, 0-based index)
            </label>
            <Select
              value={String(q.correctAnswer)}
              onValueChange={(v) => setCorrect(parseInt(v))}
            >
              <SelectTrigger className="h-8 text-sm">
                <SelectValue placeholder="Select correct" />
              </SelectTrigger>
              <SelectContent>
                {q.options.map((opt, i) => (
                  <SelectItem key={i} value={String(i)}>
                    {i + 1}. {opt.slice(0, 40)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Text block: no answer needed, just info text */}
      {type === "text" && (
        <p className="text-xs text-muted-foreground bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded p-2">
          This block renders as an instruction/info box for students. No answer required.
        </p>
      )}
    </div>
  );
}

/* ─── Sortable question card ─── */
function SortableQuestionCard({
  q,
  index,
  expanded,
  onToggle,
  onChange,
  onDelete,
}: {
  q: BuilderQuestion;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onChange: (updated: BuilderQuestion) => void;
  onDelete: () => void;
}) {
  const type = (q.type || "mcq") as QuestionType;
  const meta = TYPE_META[type];
  const Icon = meta.icon;

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: String(q.id) });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-lg border-2 ${meta.colorClass} transition-all ${isDragging ? "shadow-xl z-50" : "shadow-sm"}`}
    >
      <div className="flex items-center gap-2 p-3">
        {/* Drag handle */}
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground p-0.5 shrink-0 touch-none"
          {...attributes}
          {...listeners}
          title="Drag to reorder"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        {/* Question number */}
        {type !== "text" && (
          <span className="text-xs font-bold text-muted-foreground/70 w-5 shrink-0">
            {index + 1}
          </span>
        )}

        {/* Type badge */}
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide shrink-0 ${meta.badgeClass}`}>
          {meta.short}
        </span>

        {/* Question preview */}
        <span className="flex-1 text-xs text-foreground/80 truncate min-w-0">
          {q.question || <span className="italic text-muted-foreground">Empty question…</span>}
        </span>

        {/* Image indicator */}
        {q.imageUrl && (
          <span className="shrink-0 text-sky-500" title="Has image">
            <ImagePlus className="w-3.5 h-3.5" />
          </span>
        )}

        {/* Action buttons */}
        <button
          type="button"
          onClick={onToggle}
          className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground transition-colors shrink-0"
          title={expanded ? "Collapse" : "Edit"}
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-950/30 text-muted-foreground hover:text-destructive transition-colors shrink-0"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Inline editor */}
      {expanded && (
        <div className="px-3 pb-3">
          <QuestionEditor q={q} onChange={onChange} />
        </div>
      )}
    </div>
  );
}

/* ─── Main QuestionBuilder export ─── */
export function QuestionBuilder({
  questions,
  onChange,
}: {
  questions: BuilderQuestion[];
  onChange: (questions: BuilderQuestion[]) => void;
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = questions.findIndex((q) => String(q.id) === String(active.id));
      const newIndex = questions.findIndex((q) => String(q.id) === String(over.id));
      onChange(arrayMove(questions, oldIndex, newIndex));
    }
  };

  const addQuestion = (type: QuestionType, defaults: Partial<BuilderQuestion>) => {
    const maxId = questions.length > 0 ? Math.max(...questions.map((q) => q.id)) : 0;
    const newQ: BuilderQuestion = {
      id: maxId + 1,
      type,
      question: "",
      options: defaults.options ?? [],
      correctAnswer: defaults.correctAnswer ?? 0,
    };
    onChange([...questions, newQ]);
    setExpandedId(newQ.id);
  };

  const updateQuestion = (id: number, updated: BuilderQuestion) => {
    onChange(questions.map((q) => (q.id === id ? updated : q)));
  };

  const deleteQuestion = (id: number) => {
    onChange(questions.filter((q) => q.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  /* Real question count (excluding text blocks) */
  const realCount = questions.filter((q) => q.type !== "text").length;

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Questions — {realCount} question{realCount !== 1 ? "s" : ""}
          {questions.length > realCount && ` + ${questions.length - realCount} text block${questions.length - realCount !== 1 ? "s" : ""}`}
        </span>
        <span className="text-xs text-muted-foreground">Drag ⠿ to reorder</span>
      </div>

      {/* Sortable list */}
      {questions.length === 0 ? (
        <div className="border-2 border-dashed border-border rounded-xl p-8 text-center text-muted-foreground text-sm">
          <List className="w-8 h-8 mx-auto mb-2 opacity-30" />
          No questions yet. Use the buttons below to add questions.
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={questions.map((q) => String(q.id))}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {questions.map((q, index) => {
                const type = (q.type || "mcq") as QuestionType;
                /* calculate real question number (skip text blocks) */
                const realIndex =
                  type === "text"
                    ? -1
                    : questions.slice(0, index).filter((x) => x.type !== "text").length;

                return (
                  <SortableQuestionCard
                    key={q.id}
                    q={q}
                    index={realIndex}
                    expanded={expandedId === q.id}
                    onToggle={() => setExpandedId(expandedId === q.id ? null : q.id)}
                    onChange={(updated) => updateQuestion(q.id, updated)}
                    onDelete={() => deleteQuestion(q.id)}
                  />
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Add question type palette */}
      <div className="pt-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
          Add Question
        </p>
        <div className="flex flex-wrap gap-1.5">
          {ADD_BUTTONS.map(({ type, label, defaultQ }) => {
            const meta = TYPE_META[type];
            return (
              <button
                key={type}
                type="button"
                onClick={() => addQuestion(type, defaultQ)}
                className={`text-xs px-2.5 py-1 rounded-lg border-2 font-semibold transition-all hover:shadow-sm ${meta.colorClass} hover:brightness-95`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
