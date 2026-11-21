import type { Metadata } from "next";
import "./globals.css";
import ClientModals from "@/components/ClientModals";
import ExtensionErrorSuppressor from "@/components/ExtensionErrorSuppressor";

export const metadata: Metadata = {
  title: "MD FRESH - Fresh Fruits & Vegetables",
  description: "Farm-fresh fruits and vegetables delivered directly to your doorstep",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                if (typeof window === 'undefined') return;

                function isExtensionText(str) {
                  if (!str || typeof str !== 'string') return false;
                  var patterns = [
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
                  for (var i = 0; i < patterns.length; i++) {
                    if (str.indexOf(patterns[i]) !== -1) return true;
                  }
                  return false;
                }

                function isExtensionError(errorOrEvent) {
                  if (!errorOrEvent) return false;
                  try {
                    var err = errorOrEvent.error || errorOrEvent.reason;
                    var msg = String(
                      (err && (err.message || err.stack)) ||
                      errorOrEvent.message ||
                      errorOrEvent.reason ||
                      ''
                    );
                    var filename = String(
                      errorOrEvent.filename ||
                      (err && (err.fileName || err.filename)) ||
                      ''
                    );
                    var stack = String((err && err.stack) || '');

                    return isExtensionText(msg) || isExtensionText(filename) || isExtensionText(stack);
                  } catch (e) {}
                  return false;
                }

                // 1. Filter window.error & unhandledrejection
                window.addEventListener('error', function(event) {
                  if (isExtensionError(event)) {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                  }
                }, true);

                window.addEventListener('unhandledrejection', function(event) {
                  if (isExtensionError(event)) {
                    event.preventDefault();
                    event.stopImmediatePropagation();
                  }
                }, true);

                // 2. Intercept console.error & console.warn so Next.js overlay does not pop up
                var origConsoleError = console.error;
                console.error = function() {
                  for (var i = 0; i < arguments.length; i++) {
                    var arg = arguments[i];
                    var str = '';
                    if (typeof arg === 'string') str = arg;
                    else if (arg && (arg.message || arg.stack)) str = (arg.message || '') + ' ' + (arg.stack || '');
                    if (isExtensionText(str)) return;
                  }
                  return origConsoleError.apply(console, arguments);
                };

                var origConsoleWarn = console.warn;
                console.warn = function() {
                  for (var i = 0; i < arguments.length; i++) {
                    var arg = arguments[i];
                    var str = typeof arg === 'string' ? arg : (arg && arg.message) || '';
                    if (isExtensionText(str)) return;
                  }
                  return origConsoleWarn.apply(console, arguments);
                };

                // 3. Wrap window.addEventListener for dev overlay
                var origAddEventListener = window.addEventListener;
                window.addEventListener = function(type, listener, options) {
                  if ((type === 'error' || type === 'unhandledrejection') && typeof listener === 'function') {
                    var wrapped = function(event) {
                      if (isExtensionError(event)) {
                        if (event.preventDefault) event.preventDefault();
                        if (event.stopImmediatePropagation) event.stopImmediatePropagation();
                        return;
                      }
                      return listener.apply(this, arguments);
                    };
                    return origAddEventListener.call(this, type, wrapped, options);
                  }
                  return origAddEventListener.call(this, type, listener, options);
                };
              })();
            `,
          }}
        />
        {/* Official Razorpay Checkout Script */}
        <script src="https://checkout.razorpay.com/v1/checkout.js" async />
      </head>
      <body className="min-h-full flex flex-col bg-gray-50 font-sans" suppressHydrationWarning>
        <ExtensionErrorSuppressor />
        <ClientModals />
        {children}
      </body>
    </html>
  );
}
