import { useState, useCallback } from "react";
import type { TestMode } from "./testModeConfig";

const STORAGE_KEY = "smart-time-test-mode";

export function useModeStore() {
  const [mode, setModeState] = useState<TestMode>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as TestMode | null;
      if (stored === "IELTS" || stored === "CEFR" || stored === "BOTH") return stored;
    } catch {}
    return "BOTH";
  });

  const setMode = useCallback((m: TestMode) => {
    setModeState(m);
    try { localStorage.setItem(STORAGE_KEY, m); } catch {}
  }, []);

  return { mode, setMode };
}
