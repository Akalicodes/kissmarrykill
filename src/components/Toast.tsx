"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

type Toast = {
  id: number;
  title: string;
  body?: string;
  tone?: "default" | "egg";
};

type ToastApi = {
  push: (t: Omit<Toast, "id">) => void;
};

const Ctx = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const push = useCallback((t: Omit<Toast, "id">) => {
    setItems((prev) => [...prev, { ...t, id: Date.now() + Math.random() }]);
  }, []);

  useEffect(() => {
    if (items.length === 0) return;
    const id = items[items.length - 1].id;
    const timeout = setTimeout(() => {
      setItems((prev) => prev.filter((x) => x.id !== id));
    }, 5000);
    return () => clearTimeout(timeout);
  }, [items]);

  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[100] flex flex-col items-center gap-2 px-4">
        {items.slice(-3).map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto animate-rise"
          >
            <div
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-[0_20px_60px_-10px_rgba(0,0,0,0.7)] backdrop-blur-xl ${
                t.tone === "egg"
                  ? "border-kiss/40 bg-gradient-to-r from-kiss/15 via-marry/10 to-kill/15"
                  : "border-white/15 bg-white/10"
              }`}
            >
              <div className="flex flex-col">
                <div className="text-sm font-bold text-white">{t.title}</div>
                {t.body && (
                  <div className="text-xs text-white/70">{t.body}</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useToast must be used inside <ToastProvider>");
  return v;
}
