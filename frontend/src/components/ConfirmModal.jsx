import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Trash2, X, AlertCircle } from "lucide-react";

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Confirm Deletion",
  message = "Are you sure you want to proceed? This action cannot be undone.",
  itemDetails = null,
  confirmText = "Delete",
  cancelText = "Cancel",
  confirmVariant = "danger", // "danger" | "warning" | "primary"
  isProcessing = false,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && isOpen && !isProcessing) {
        onClose();
      }
    };
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, isProcessing]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop with soft blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={!isProcessing ? onClose : undefined}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm cursor-pointer"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 10 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-md neu-surface rounded-3xl p-6 sm:p-7 shadow-2xl border border-white/80 z-10 space-y-5"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center neu-inset-sm flex-shrink-0 ${
                  confirmVariant === "danger"
                    ? "text-rose-600 bg-rose-500/10"
                    : "text-amber-600 bg-amber-500/10"
                }`}
              >
                {confirmVariant === "danger" ? (
                  <Trash2 className="w-5 h-5" />
                ) : (
                  <AlertTriangle className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  {title}
                </h3>
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold">
                  Safe Audit Control
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={isProcessing}
              className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body Message */}
          <div className="space-y-3">
            <p className="text-xs text-slate-600 leading-relaxed font-normal">
              {message}
            </p>

            {/* Optional Item Details Callout */}
            {itemDetails && (
              <div className="p-3.5 rounded-2xl neu-inset-sm space-y-1.5 bg-slate-50/70 border border-slate-200/60">
                {itemDetails.title && (
                  <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                    {itemDetails.title}
                  </div>
                )}
                {itemDetails.subtitle && (
                  <div className="text-[11px] text-slate-500 font-mono">
                    {itemDetails.subtitle}
                  </div>
                )}
                {itemDetails.badge && (
                  <div className="pt-1">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700">
                      {itemDetails.badge}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50/80 border border-amber-200/60 text-[11px] text-amber-800 font-medium">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>This record will be permanently purged from your browser storage.</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2.5 rounded-xl neu-btn text-xs font-semibold text-slate-600 hover:text-slate-900 transition-all cursor-pointer"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={isProcessing}
              className={`px-5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 shadow-sm ${
                confirmVariant === "danger"
                  ? "bg-rose-600 hover:bg-rose-700 text-white hover:shadow-rose-600/25 active:scale-95"
                  : "neu-btn-primary text-white active:scale-95"
              }`}
            >
              {isProcessing && (
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              <span>{confirmText}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

