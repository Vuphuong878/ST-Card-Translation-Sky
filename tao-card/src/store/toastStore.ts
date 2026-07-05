import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration?: number;
}

interface ToastStore {
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  success: (message: string, title?: string, duration?: number) => void;
  error: (message: string, title?: string, duration?: number) => void;
  info: (message: string, title?: string, duration?: number) => void;
  warning: (message: string, title?: string, duration?: number) => void;
}

export const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  
  addToast: (toast) => {
    const id = uuidv4();
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id }]
    }));
    
    // Auto remove
    const duration = toast.duration || 3000;
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id)
      }));
    }, duration);
  },

  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter((t) => t.id !== id)
  })),

  success: (message, title, duration) => set((state) => {
    state.addToast({ type: 'success', message, title, duration });
    return {};
  }),

  error: (message, title, duration) => set((state) => {
    state.addToast({ type: 'error', message, title, duration });
    return {};
  }),

  info: (message, title, duration) => set((state) => {
    state.addToast({ type: 'info', message, title, duration });
    return {};
  }),

  warning: (message, title, duration) => set((state) => {
    state.addToast({ type: 'warning', message, title, duration });
    return {};
  }),
}));
