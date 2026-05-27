import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import Button from './Button';

const DialogContext = createContext(null);

const defaultLabels = {
  alert: { confirmText: 'OK' },
  confirm: { confirmText: 'Confirm', cancelText: 'Cancel' },
  prompt: { confirmText: 'Submit', cancelText: 'Cancel' }
};

export function GlobalDialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const dialogRef = useRef(null);
  const firstActionRef = useRef(null);
  const inputRef = useRef(null);

  const closeDialog = useCallback((result) => {
    setDialog((current) => {
      current?.resolve(result);
      return null;
    });
  }, []);

  const openDialog = useCallback((type, options = {}) => new Promise((resolve) => {
    setDialog({
      type,
      title: options.title || (type === 'confirm' ? 'Confirm action' : 'Notice'),
      message: options.message || '',
      confirmText: options.confirmText || defaultLabels[type].confirmText,
      cancelText: options.cancelText || defaultLabels[type].cancelText,
      inputPlaceholder: options.inputPlaceholder || '',
      defaultValue: options.defaultValue || '',
      multiline: options.multiline !== false,
      requiredText: options.requiredText || '',
      resolve
    });
  }), []);

  const showAlert = useCallback((options) => openDialog('alert', options), [openDialog]);
  const showConfirm = useCallback((options) => openDialog('confirm', options), [openDialog]);
  const showPrompt = useCallback((options) => openDialog('prompt', options), [openDialog]);

  useEffect(() => {
    if (!dialog) return undefined;

    const focusTarget = dialog.type === 'prompt' ? inputRef.current : firstActionRef.current;
    setTimeout(() => focusTarget?.focus(), 0);

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        closeDialog(dialog.type === 'alert' ? true : null);
      }

      if (event.key === 'Tab') {
        const focusable = dialogRef.current?.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable?.[0];
        const last = focusable?.[focusable.length - 1];
        if (!first || !last) return;

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeDialog, dialog]);

  const handleSubmit = (event) => {
    event.preventDefault();

    if (dialog.type === 'prompt') {
      const value = inputRef.current?.value || '';
      if (dialog.requiredText && value.trim() !== dialog.requiredText) {
        closeDialog(null);
        return;
      }
      closeDialog(value);
      return;
    }

    closeDialog(true);
  };

  return (
    <DialogContext.Provider value={{ showAlert, showConfirm, showPrompt }}>
      {children}
      {dialog && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
          <form
            ref={dialogRef}
            onSubmit={handleSubmit}
            role="dialog"
            aria-modal="true"
            aria-labelledby="global-dialog-title"
            className="motion-dropdown-in w-full max-w-md rounded-2xl border border-green-100 bg-white p-5 shadow-2xl"
          >
            <h2 id="global-dialog-title" className="text-xl font-bold text-brand-primary">
              {dialog.title}
            </h2>
            {dialog.message && (
              <p className="mt-3 whitespace-pre-line text-sm leading-6 text-gray-700">{dialog.message}</p>
            )}

            {dialog.type === 'prompt' && (
              dialog.multiline ? (
                <textarea
                  ref={inputRef}
                  defaultValue={dialog.defaultValue}
                  placeholder={dialog.inputPlaceholder}
                  rows={4}
                  className="mt-4 w-full rounded-xl border border-green-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              ) : (
                <input
                  ref={inputRef}
                  defaultValue={dialog.defaultValue}
                  placeholder={dialog.inputPlaceholder}
                  className="mt-4 w-full rounded-xl border border-green-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              )
            )}

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              {dialog.type !== 'alert' && (
                <Button type="button" variant="secondary" onClick={() => closeDialog(null)}>
                  {dialog.cancelText}
                </Button>
              )}
              <Button ref={firstActionRef} type="submit" variant={dialog.type === 'confirm' ? 'danger' : 'primary'}>
                {dialog.confirmText}
              </Button>
            </div>
          </form>
        </div>
      )}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within GlobalDialogProvider');
  }
  return context;
}
