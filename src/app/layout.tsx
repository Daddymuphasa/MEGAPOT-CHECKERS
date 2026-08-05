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

export const metadata: Metadata = {
  title: "Megapot Checkers — Private Checkers, powered by Inco Lightning",
  description:
    "A stunning, buttery-smooth Checkers game. Play local, vs AI, or online with confidential wagers powered by Inco Lightning on Base.",
  applicationName: "Megapot Checkers",
  authors: [{ name: "Megapot" }],
  keywords: ["checkers", "draughts", "inco", "base", "web3 game", "confidential"],
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
