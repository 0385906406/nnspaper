"use client";

import { useEffect, useState } from "react";
import { subscribeToToasts, subscribeToToastRemove } from "@/lib/toast";

interface Toast {
  id: string;
  type: "success" | "error" | "info" | "warning";
  message: string;
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToToasts((toast) => {
      setToasts((prev) => [...prev, toast as Toast]);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToToastRemove((id) => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    });

    return unsubscribe;
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case "success":
        return "✅";
      case "error":
        return "❌";
      case "warning":
        return "⚠️";
      case "info":
      default:
        return "ℹ️";
    }
  };

  const getBgColor = (type: string) => {
    switch (type) {
      case "success":
        return "bg-green-500/20 border-green-500/50";
      case "error":
        return "bg-red-500/20 border-red-500/50";
      case "warning":
        return "bg-yellow-500/20 border-yellow-500/50";
      case "info":
      default:
        return "bg-blue-500/20 border-blue-500/50";
    }
  };

  const getTextColor = (type: string) => {
    switch (type) {
      case "success":
        return "text-green-400";
      case "error":
        return "text-red-400";
      case "warning":
        return "text-yellow-400";
      case "info":
      default:
        return "text-blue-400";
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`animate-slide-in-right pointer-events-auto rounded-lg border px-4 py-3 backdrop-blur-sm max-w-sm ${getBgColor(
            t.type
          )}`}
        >
          <div className="flex items-center gap-3">
            <span className="text-lg flex-shrink-0">{getIcon(t.type)}</span>
            <p className={`text-sm font-medium ${getTextColor(t.type)}`}>{t.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
