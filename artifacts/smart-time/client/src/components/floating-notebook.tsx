import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, X, Plus, Trash2, PenLine, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Note } from "@shared/schema";

export function FloatingNotebook() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: notes = [], isLoading } = useQuery<Note[]>({
    queryKey: ["/api/notes"],
    enabled: open,
  });

  const addMutation = useMutation({
    mutationFn: async (content: string) => {
      await apiRequest("POST", "/api/notes", { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      setDraft("");
    },
    onError: () => toast({ title: "Не удалось сохранить запись", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/notes/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/notes"] }),
    onError: () => toast({ title: "Не удалось удалить запись", variant: "destructive" }),
  });

  const handleAdd = () => {
    if (draft.trim()) addMutation.mutate(draft.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleAdd();
    }
  };

  useEffect(() => {
    if (open) setTimeout(() => textareaRef.current?.focus(), 300);
  }, [open]);

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="fixed bottom-24 right-5 z-50 w-80 sm:w-96 rounded-2xl shadow-2xl border bg-white dark:bg-slate-900 overflow-hidden flex flex-col"
            style={{ maxHeight: "70vh" }}
            data-testid="notebook-panel"
          >
            <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground">
              <div className="flex items-center gap-2">
                <NotebookPen className="w-4 h-4" />
                <span className="font-semibold text-sm">Мои записи</span>
                {notes.length > 0 && (
                  <span className="text-xs bg-white/20 rounded-full px-2 py-0.5">{notes.length}</span>
                )}
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full p-1 hover:bg-white/20 transition-colors"
                data-testid="notebook-close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
              {isLoading ? (
                <div className="flex flex-col gap-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 rounded-lg bg-slate-100 dark:bg-slate-800 animate-pulse" />
                  ))}
                </div>
              ) : notes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground gap-2">
                  <PenLine className="w-8 h-8 opacity-30" />
                  <p className="text-sm">Записей пока нет</p>
                  <p className="text-xs opacity-60">Напишите первую заметку ниже</p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {[...notes].reverse().map((note) => (
                    <motion.div
                      key={note.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.2 }}
                      className="group relative rounded-xl border bg-amber-50 dark:bg-amber-950/30 border-amber-200/60 dark:border-amber-800/40 px-3 py-2.5"
                      data-testid={`note-item-${note.id}`}
                    >
                      <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap pr-6 leading-relaxed">{note.content}</p>
                      <p className="text-[10px] text-slate-400 mt-1">
                        {new Date(note.createdAt).toLocaleString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                      <button
                        onClick={() => deleteMutation.mutate(note.id)}
                        disabled={deleteMutation.isPending}
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity rounded-full p-1 hover:bg-red-100 dark:hover:bg-red-900/40 text-red-400 hover:text-red-600"
                        data-testid={`button-delete-note-${note.id}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            <div className="border-t p-3 bg-slate-50 dark:bg-slate-900 space-y-2">
              <Textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Напишите заметку... (Ctrl+Enter для сохранения)"
                className="resize-none text-sm min-h-[70px] max-h-[120px] bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus-visible:ring-primary"
                data-testid="input-note-draft"
              />
              <Button
                onClick={handleAdd}
                disabled={!draft.trim() || addMutation.isPending}
                size="sm"
                className="w-full gap-2"
                data-testid="button-add-note"
              >
                <Plus className="w-3.5 h-3.5" />
                Добавить запись
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setOpen(!open)}
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:shadow-xl"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        animate={open ? { rotate: 10 } : { rotate: 0 }}
        transition={{ type: "spring", stiffness: 400 }}
        data-testid="button-open-notebook"
        aria-label="Открыть блокнот"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div key="x" initial={{ opacity: 0, rotate: -90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: 90 }}>
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div key="book" initial={{ opacity: 0, rotate: 90 }} animate={{ opacity: 1, rotate: 0 }} exit={{ opacity: 0, rotate: -90 }}>
              <BookOpen className="w-6 h-6" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    </>
  );
}
