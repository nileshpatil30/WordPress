import Script from "next/script";
import { GA_MEASUREMENT_ID, analyticsEnabled } from "@/lib/analytics-config";

/**
 * Google Analytics 4.
 *
 * `afterInteractive` rather than `beforeInteractive`: nothing on the page needs
 * gtag to render, so it must not compete with the calculator for main-thread
 * time during hydration.
 *
 * Two deliberate settings on the config call:
 *
 *   anonymize_ip     - truncates the visitor's IP before it reaches Google.
 *   allow_google_signals: false
 *                    - turns off cross-device and advertising personalisation,
 *                      which is what turns plain analytics into ad tracking.
 *                      We measure which pages get used; we are not building
 *                      audiences for remarketing.
 *
 * Both are cheap and both are things /privacy now states plainly. If either is
 * removed, the privacy page has to change in the same commit.
 */
export function Analytics() {
  if (!analyticsEnabled) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}', {
  anonymize_ip: true,
  allow_google_signals: false
});`}
      </Script>
    </>
  );
}
