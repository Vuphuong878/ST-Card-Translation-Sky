import { useToastStore, type ToastType } from '../../store/toastStore';
import { Check, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

const icons: Record<ToastType, React.ElementType> = {
  success: Check,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const styles: Record<ToastType, string> = {
  success: 'bg-emerald-500/15 text-emerald-500 border-emerald-500/20',
  error: 'bg-destructive/15 text-destructive border-destructive/20',
  info: 'bg-blue-500/15 text-blue-500 border-blue-500/20',
  warning: 'bg-amber-500/15 text-amber-500 border-amber-500/20',
};

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-80 max-w-[calc(100vw-2rem)] pointer-events-none">
      {toasts.map((toast) => {
        const Icon = icons[toast.type];
        return (
          <div
            key={toast.id}
            className={`flex items-start gap-3 p-3 rounded-lg border shadow-lg backdrop-blur-sm pointer-events-auto animate-in slide-in-from-top-2 fade-in ${styles[toast.type]}`}
          >
            <Icon className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              {toast.title && <h4 className="text-sm font-semibold mb-0.5">{toast.title}</h4>}
              <p className="text-sm whitespace-pre-wrap break-words opacity-90">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="p-1 -mr-1 -mt-1 rounded opacity-70 hover:opacity-100 hover:bg-black/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
