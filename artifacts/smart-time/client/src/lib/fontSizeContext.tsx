import React, { createContext, useContext, useState } from "react";

const STORAGE_KEY = "smart-time-font-size";
const MIN = 12;
const MAX = 26;
const DEFAULT = 16;
const STEP = 2;

interface FontSizeCtx {
  fontSize: number;
  increase: () => void;
  decrease: () => void;
  reset: () => void;
  canIncrease: boolean;
  canDecrease: boolean;
}

const FontSizeContext = createContext<FontSizeCtx>({
  fontSize: DEFAULT,
  increase: () => {},
  decrease: () => {},
  reset: () => {},
  canIncrease: true,
  canDecrease: true,
});

export function FontSizeProvider({ children }: { children: React.ReactNode }) {
  const [fontSize, setFontSize] = useState(() => {
    try {
      const stored = parseInt(localStorage.getItem(STORAGE_KEY) || "");
      return isNaN(stored) ? DEFAULT : Math.min(MAX, Math.max(MIN, stored));
    } catch {
      return DEFAULT;
    }
  });

  const update = (n: number) => {
    const v = Math.min(MAX, Math.max(MIN, n));
    setFontSize(v);
    try { localStorage.setItem(STORAGE_KEY, String(v)); } catch {}
  };

  return (
    <FontSizeContext.Provider value={{
      fontSize,
      increase: () => update(fontSize + STEP),
      decrease: () => update(fontSize - STEP),
      reset: () => update(DEFAULT),
      canIncrease: fontSize < MAX,
      canDecrease: fontSize > MIN,
    }}>
      {children}
    </FontSizeContext.Provider>
  );
}

export const useFontSize = () => useContext(FontSizeContext);
