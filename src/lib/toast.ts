type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

let toastListeners: ((toast: Toast) => void)[] = [];
let toastRemoveListeners: ((id: string) => void)[] = [];

export function subscribeToToasts(listener: (toast: Toast) => void) {
  toastListeners.push(listener);
  return () => {
    toastListeners = toastListeners.filter(l => l !== listener);
  };
}

export function subscribeToToastRemove(listener: (id: string) => void) {
  toastRemoveListeners.push(listener);
  return () => {
    toastRemoveListeners = toastRemoveListeners.filter(l => l !== listener);
  };
}

export function showToast(message: string, type: ToastType = "info", duration = 3000) {
  const id = Date.now().toString();
  const toast: Toast = { id, type, message, duration };

  toastListeners.forEach(listener => listener(toast));

  if (duration > 0) {
    setTimeout(() => {
      toastRemoveListeners.forEach(listener => listener(id));
    }, duration);
  }

  return id;
}

export const toast = {
  success: (msg: string, duration?: number) => showToast(msg, "success", duration),
  error: (msg: string, duration?: number) => showToast(msg, "error", duration),
  info: (msg: string, duration?: number) => showToast(msg, "info", duration),
  warning: (msg: string, duration?: number) => showToast(msg, "warning", duration),
};
