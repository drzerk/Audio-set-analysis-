import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  description?: string;
}

interface ToastContextType {
  showToast: (title: string, type?: 'success' | 'info' | 'warning' | 'error', description?: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (title: string, type: 'success' | 'info' | 'warning' | 'error' = 'info', description?: string) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      setToasts((prev) => [...prev.slice(-3), { id, type, title, description }]);

      // Auto-dismiss after 4.5 seconds
      setTimeout(() => {
        removeToast(id);
      }, 4500);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      {/* Toast Render View */}
      <div
        id="toast-notification-hub"
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full px-2"
        aria-live="polite"
      >
        {toasts.map((toast) => {
          const colors =
            toast.type === 'success'
              ? 'bg-[#0f1d16] border-emerald-500/40 text-emerald-300'
              : toast.type === 'warning'
              ? 'bg-[#1e1708] border-amber-500/40 text-amber-300'
              : toast.type === 'error'
              ? 'bg-[#1f0e12] border-rose-500/40 text-rose-300'
              : 'bg-[#0f172a] border-blue-500/40 text-blue-300';

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto border rounded-lg p-3 shadow-2xl backdrop-blur-md flex items-start gap-2.5 transition-all transform animate-in fade-in slide-in-from-bottom-2 ${colors}`}
            >
              {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />}
              {toast.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />}
              {toast.type === 'error' && <XCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />}
              {toast.type === 'info' && <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />}

              <div className="flex-1 text-xs">
                <div className="font-semibold tracking-tight text-white">{toast.title}</div>
                {toast.description && (
                  <div className="text-[11px] opacity-85 mt-0.5 leading-relaxed font-sans">{toast.description}</div>
                )}
              </div>

              <button
                onClick={() => removeToast(toast.id)}
                className="text-slate-400 hover:text-white p-0.5 rounded transition-colors cursor-pointer"
                title="Schließen"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      showToast: (title: string, type?: 'success' | 'info' | 'warning' | 'error', description?: string) => {
        console.log(`[Toast ${type || 'info'}]: ${title}`, description);
      },
      removeToast: () => {}
    };
  }
  return context;
};
