import React from 'react';
import { X, Loader2 } from 'lucide-react';

/**
 * Standard Project Management Modal Component
 * Matches the orientation, dimensions, header, and footer of ERP module modals.
 */
export default function ProjectModal({
  open,
  isOpen,
  onClose,
  title,
  subtitle,
  icon: Icon,
  children,
  maxWidth = 'max-w-2xl lg:max-w-3xl',
  onSubmit,
  footer,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  submitting = false,
  showFooter = true,
}) {
  const isVisible = open !== undefined ? open : isOpen;
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex justify-center items-start p-4 sm:p-6 md:p-10 animate-fadeIn">
      <div
        className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full ${maxWidth} shadow-2xl overflow-hidden my-auto sm:my-8 transition-all`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
          <div className="flex items-center gap-3">
            {Icon && (
              <div className="w-10 h-10 rounded-xl bg-brand-50 dark:bg-brand-900/30 text-brand-900 dark:text-brand-400 flex items-center justify-center font-bold flex-shrink-0 border border-brand-200/50 dark:border-brand-800/50">
                <Icon size={20} />
              </div>
            )}
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {title}
              </h3>
              {subtitle && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        {onSubmit ? (
          <form onSubmit={onSubmit} className="p-6 space-y-4 text-sm">
            {children}
            {showFooter && (
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 bg-white dark:bg-slate-900 -mx-6 -mb-6 p-4">
                {footer ? (
                  footer
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={onClose}
                      className="inline-flex items-center justify-center h-9 px-3.5 sm:px-4 text-xs sm:text-sm font-medium rounded-xl text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-all duration-150 active:scale-[0.98] cursor-pointer whitespace-nowrap"
                    >
                      {cancelLabel}
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center justify-center gap-2 h-9 px-4 sm:px-5 text-xs sm:text-sm font-semibold rounded-xl text-white bg-[#0E3646] hover:bg-[#154659] active:bg-[#092531] shadow-apple-xs transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
                    >
                      {submitting ? <Loader2 size={15} className="animate-spin" /> : null}
                      {submitLabel}
                    </button>
                  </>
                )}
              </div>
            )}
          </form>
        ) : (
          <div className="p-6 space-y-4 text-sm">
            {children}
            {showFooter && (
              <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 bg-white dark:bg-slate-900 -mx-6 -mb-6 p-4">
                {footer ? (
                  footer
                ) : (
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center justify-center h-9 px-4 text-xs sm:text-sm font-medium rounded-xl text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-all duration-150 active:scale-[0.98] cursor-pointer whitespace-nowrap"
                  >
                    Close
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
