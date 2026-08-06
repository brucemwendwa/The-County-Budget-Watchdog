import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import type { ReactNode } from "react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";

import "./globals.css";

export const metadata: Metadata = {
  title: "County Budget Tracker",
  description:
    "AI-powered civic finance platform helping citizens understand official county budget documents from county to ward level."
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("cbt-theme");if(t==="dark")document.documentElement.classList.add("dark");}catch(e){}})();`
          }}
        />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <Analytics />
          <SiteHeader />
          {children}
          <SiteFooter />
        </ThemeProvider>
      </body>
    </html>
  );
}
