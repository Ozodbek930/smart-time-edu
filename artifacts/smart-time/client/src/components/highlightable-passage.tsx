import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Highlighter, Trash2, X } from "lucide-react";

type Highlight = { start: number; end: number; color: string };

const COLORS = [
  { id: "yellow", label: "Жёлтый", bg: "bg-yellow-200 dark:bg-yellow-400/40", hex: "#fef08a" },
  { id: "green",  label: "Зелёный", bg: "bg-green-200 dark:bg-green-400/40", hex: "#bbf7d0" },
  { id: "pink",   label: "Розовый", bg: "bg-pink-200 dark:bg-pink-400/40",   hex: "#fbcfe8" },
  { id: "blue",   label: "Голубой", bg: "bg-blue-200 dark:bg-blue-400/40",   hex: "#bfdbfe" },
];

function storageKey(testId: string) {
  return `highlights-${testId}`;
}

function loadHighlights(testId: string): Highlight[] {
  try {
    const raw = localStorage.getItem(storageKey(testId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHighlights(testId: string, highlights: Highlight[]) {
  localStorage.setItem(storageKey(testId), JSON.stringify(highlights));
}

function mergeSegments(text: string, highlights: Highlight[]): { text: string; color: string | null }[] {
  if (highlights.length === 0) return [{ text, color: null }];

  const events: { pos: number; color: string | null }[] = [];
  for (const h of highlights) {
    events.push({ pos: h.start, color: h.color });
    events.push({ pos: h.end, color: null });
  }
  events.sort((a, b) => a.pos - b.pos || (a.color === null ? 1 : -1));

  const segments: { text: string; color: string | null }[] = [];
  let pos = 0;
  let activeColor: string | null = null;

  const positions = [...new Set(events.map((e) => e.pos))].sort((a, b) => a - b);
  const fullPositions = [0, ...positions, text.length].filter(
    (p, i, arr) => i === 0 || arr[i - 1] !== p
  );

  for (let i = 0; i < fullPositions.length - 1; i++) {
    const start = fullPositions[i];
    const end = fullPositions[i + 1];
    const segText = text.slice(start, end);
    if (!segText) continue;

    const active = highlights.find((h) => h.start <= start && h.end >= end);
    segments.push({ text: segText, color: active ? active.color : null });
  }

  return segments;
}

function getOffsetInContainer(container: HTMLElement, node: Node, offset: number): number {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let total = 0;
  let current: Node | null;
  while ((current = walker.nextNode())) {
    if (current === node) return total + offset;
    total += (current.textContent || "").length;
  }
  return total + offset;
}

export function HighlightablePassage({ passage, testId }: { passage: string; testId: string }) {
  const [highlights, setHighlights] = useState<Highlight[]>(() => loadHighlights(testId));
  const [activeColor, setActiveColor] = useState(COLORS[0].id);
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null);
  const [pendingRange, setPendingRange] = useState<{ start: number; end: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => saveHighlights(testId, highlights), [highlights, testId]);

  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !containerRef.current) return;
    const range = sel.getRangeAt(0);
    if (!containerRef.current.contains(range.commonAncestorContainer)) return;

    const start = getOffsetInContainer(containerRef.current, range.startContainer, range.startOffset);
    const end = getOffsetInContainer(containerRef.current, range.endContainer, range.endOffset);
    if (start >= end) return;

    const rect = range.getBoundingClientRect();
    const containerRect = containerRef.current.getBoundingClientRect();
    setTooltip({
      x: rect.left + rect.width / 2 - containerRect.left,
      y: rect.top - containerRect.top - 8,
    });
    setPendingRange({ start, end });
    sel.removeAllRanges();
  }, []);

  const applyHighlight = () => {
    if (!pendingRange) return;
    const color = COLORS.find((c) => c.id === activeColor)!.hex;
    setHighlights((prev) => {
      const filtered = prev.filter(
        (h) => !(h.start < pendingRange.end && h.end > pendingRange.start)
      );
      return [...filtered, { ...pendingRange, color }];
    });
    setTooltip(null);
    setPendingRange(null);
  };

  const removeHighlightAt = (start: number, end: number) => {
    setHighlights((prev) => prev.filter((h) => !(h.start === start && h.end === end)));
  };

  const clearAll = () => {
    setHighlights([]);
    setTooltip(null);
    setPendingRange(null);
  };

  const cancelTooltip = () => {
    setTooltip(null);
    setPendingRange(null);
  };

  const segments = mergeSegments(passage, highlights);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Highlighter className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground">Маркер:</span>
        </div>
        {COLORS.map((c) => (
          <button
            key={c.id}
            onClick={() => setActiveColor(c.id)}
            className={`w-6 h-6 rounded-full border-2 transition-transform ${
              activeColor === c.id
                ? "border-slate-600 dark:border-white scale-125 shadow"
                : "border-transparent hover:scale-110"
            }`}
            style={{ backgroundColor: c.hex }}
            title={c.label}
            data-testid={`button-highlight-color-${c.id}`}
          />
        ))}
        {highlights.length > 0 && (
          <button
            onClick={clearAll}
            className="ml-auto flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors"
            data-testid="button-clear-highlights"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Очистить всё
          </button>
        )}
      </div>

      <div className="relative">
        <div
          ref={containerRef}
          onMouseUp={handleMouseUp}
          className="p-4 rounded-md border border-emerald-200/40 dark:border-emerald-800/40 bg-emerald-50/30 dark:bg-emerald-900/10 text-sm leading-relaxed whitespace-pre-line select-text cursor-text"
          data-testid={`text-passage-${testId}`}
        >
          {segments.map((seg, i) => {
            if (!seg.color) return <span key={i}>{seg.text}</span>;
            const hl = highlights.find((h) => passage.slice(h.start, h.end) === seg.text || (highlights.find(hh => hh.color === seg.color && passage.slice(hh.start, hh.end).includes(seg.text))));
            const matchedHl = highlights.find(
              (h) => h.color === seg.color && passage.slice(h.start, h.end).startsWith(seg.text.slice(0, 5))
            ) || highlights[0];
            return (
              <mark
                key={i}
                className="rounded cursor-pointer group relative"
                style={{ backgroundColor: seg.color }}
                onClick={() => {
                  const h = highlights.find(
                    (hh) => hh.color === seg.color && passage.slice(hh.start, hh.end).includes(seg.text)
                  );
                  if (h) removeHighlightAt(h.start, h.end);
                }}
                title="Нажмите чтобы снять выделение"
                data-testid={`highlight-segment-${i}`}
              >
                {seg.text}
              </mark>
            );
          })}
        </div>

        <AnimatePresence>
          {tooltip && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute z-10 flex items-center gap-1.5 bg-slate-800 text-white rounded-xl shadow-xl px-3 py-2 text-xs"
              style={{
                left: `${tooltip.x}px`,
                top: `${tooltip.y}px`,
                transform: "translate(-50%, -100%)",
              }}
            >
              {COLORS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => { setActiveColor(c.id); applyHighlight(); }}
                  className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-125 ${activeColor === c.id ? "border-white scale-125" : "border-slate-600"}`}
                  style={{ backgroundColor: c.hex }}
                  title={c.label}
                  data-testid={`tooltip-color-${c.id}`}
                />
              ))}
              <div className="w-px h-4 bg-slate-600 mx-0.5" />
              <button
                onClick={cancelTooltip}
                className="text-slate-400 hover:text-white transition-colors"
                data-testid="tooltip-cancel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {highlights.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Нажмите на выделенный текст чтобы снять выделение
        </p>
      )}
    </div>
  );
}
