"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { Chrome } from "@/components/nav/Chrome";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { Haptics } from "@/components/ux/Haptics";
import { InstallPrompt } from "@/components/ux/InstallPrompt";
import { StorageNotice } from "@/components/site/StorageNotice";
import { ServiceWorker } from "@/components/site/ServiceWorker";
import { MotionRoot } from "@/components/motion/MotionRoot";
import { RouteViews } from "@/components/analytics/RouteViews";
import { RoleSwitchFallback } from "@/components/app/RoleSwitchFallback";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";

/**
 * An iframe is not a compact version of the application. It is a public,
 * document-like artifact, so it must not mount auth, navigation, prompts,
 * storage notices or analytics chrome from the app shell.
 */
export function RouteEnvironment({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname.startsWith("/embed/")) return <>{children}</>;

  return (
      <ThemeProvider>
        <LocaleProvider>
          <MotionRoot>
            <AuthProvider>
              <Haptics />
              <RoleSwitchFallback />
              <Chrome>{children}</Chrome>
              <Suspense fallback={null}>
                <RouteViews />
              </Suspense>
              <InstallPrompt />
              <StorageNotice />
              <ServiceWorker />
              {/* No sonner <Toaster /> here: nothing calls sonner's toast(), so it only
                  put an empty region and its library on every page. The app's
                  toasts come from oh/ui's ToastHost. If sonner is used, mount the
                  Toaster from components/ui/sonner where it is needed. */}
            </AuthProvider>
          </MotionRoot>
        </LocaleProvider>
      </ThemeProvider>
  );
}
