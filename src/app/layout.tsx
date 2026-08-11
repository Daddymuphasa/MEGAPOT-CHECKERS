import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Sora } from "next/font/google";
import "./globals.css";
import { ThemeSync } from "@/components/theme-sync";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const sora = Sora({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const SITE = "https://megapot-checkers.vercel.app";
const TITLE = "Megapot Checkers — play checkers for real USDC on Base";
const DESCRIPTION =
  "A buttery-smooth Checkers game. Play the AI free with no wallet, or stake real USDC online — winner takes the pot, settled by contract on Base.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "Megapot Checkers",
  authors: [{ name: "Megapot" }],
  keywords: ["checkers", "draughts", "megapot", "base", "usdc", "web3 game"],
  openGraph: {
    type: "website",
    url: SITE,
    siteName: "Megapot Checkers",
    title: TITLE,
    description: DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export const viewport: Viewport = {
  themeColor: "#08090f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

// Set the theme class before hydration to avoid a flash of the wrong theme.
const themeScript = `(function(){try{var s=JSON.parse(localStorage.getItem('megapot-settings')||'{}');var t=(s&&s.state&&s.state.theme)||'dark';document.documentElement.classList.toggle('dark',t!=='light');}catch(e){document.documentElement.classList.add('dark');}})();`;

export default function RootLayout({ children }: { children: import("react").ReactNode }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${sora.variable} h-full antialiased dark`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full">
        <ThemeSync />
        {children}
      </body>
    </html>
  );
}
