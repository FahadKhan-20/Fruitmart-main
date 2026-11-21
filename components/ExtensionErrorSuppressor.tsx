'use client';

import { useEffect } from 'react';

export default function ExtensionErrorSuppressor() {
  useEffect(() => {
    function isExtensionText(str: string | null | undefined): boolean {
      if (!str || typeof str !== 'string') return false;
      const patterns = [
        'chrome-extension://',
        'moz-extension://',
        'safari-extension://',
        'nkbihfbeogaeaoehlefnkodbefgpgknn',
        'MetaMask',
        'metamask',
        'inpage.js',
        'evmProvider',
        'ethereum',
        'Error restoring session'
      ];
      for (const p of patterns) {
        if (str.includes(p)) return true;
      }
      return false;
    }

    function isExtensionError(errorOrEvent: any): boolean {
      if (!errorOrEvent) return false;
      try {
        const err = errorOrEvent.error || errorOrEvent.reason;
        const msg = String(
          (err && (err.message || err.stack)) ||
          errorOrEvent.message ||
          errorOrEvent.reason ||
          ''
        );
        const filename = String(
          errorOrEvent.filename ||
          (err && (err.fileName || err.filename)) ||
          ''
        );
        const stack = String((err && err.stack) || '');

        return isExtensionText(msg) || isExtensionText(filename) || isExtensionText(stack);
      } catch (e) {}
      return false;
    }

    const errorHandler = (event: ErrorEvent) => {
      if (isExtensionError(event)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };

    const rejectionHandler = (event: PromiseRejectionEvent) => {
      if (isExtensionError(event)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };

    window.addEventListener('error', errorHandler, true);
    window.addEventListener('unhandledrejection', rejectionHandler, true);

    const origConsoleError = console.error;
    console.error = function (...args: any[]) {
      for (const arg of args) {
        const str = typeof arg === 'string' ? arg : (arg && (arg.message || arg.stack)) || '';
        if (isExtensionText(str)) return;
      }
      return origConsoleError.apply(console, args);
    };

    return () => {
      window.removeEventListener('error', errorHandler, true);
      window.removeEventListener('unhandledrejection', rejectionHandler, true);
      console.error = origConsoleError;
    };
  }, []);

  return null;
}
