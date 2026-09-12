import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VideoScale — Video Processing Pipeline",
  description: "Upload videos, track processing jobs in real time.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        {/* Set theme before paint: stored choice, else OS preference, else dark */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("VideoScale-theme");if(!t){t=matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="dark"}})()`,
          }}
        />
      </head>
      <body className="min-h-full bg-ink text-paper">{children}</body>
    </html>
  );
}
