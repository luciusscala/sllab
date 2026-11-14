"use client";

import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";

type Kind = "success" | "error";
type Toast = { id: number; message: string; kind: Kind };

const ToastContext = createContext<{ toast: (message: string, kind?: Kind) => void }>({
  toast: () => {},
});

/**
 * Brief confirmations after an action: "Field saved", and nothing more. They
 * stack bottom-right, clear of the phone tab bar, and leave on their own.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const toast = useCallback((message: string, kind: Kind = "success") => {
    const id = Date.now() + Math.random();
    setItems((list) => [...list, { id, message, kind }]);
    setTimeout(() => setItems((list) => list.filter((item) => item.id !== id)), 4000);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-20 z-50 flex flex-col items-center gap-2 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:items-end"
      >
        {items.map((item) => (
          <div
            key={item.id}
            className="pointer-events-auto flex items-center gap-2 rounded-md border border-border bg-surface-raised px-3.5 py-2 text-sm shadow-lg"
          >
            <span
              aria-hidden="true"
              className={`size-1.5 rounded-full ${item.kind === "error" ? "bg-not-going" : "bg-accent"}`}
            />
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
