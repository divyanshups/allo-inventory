import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Allo — Inventory",
  description: "Multi-warehouse inventory reservation platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen bg-zinc-50 text-zinc-900`}>

        {/* Top navigation bar */}
        <header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/80 backdrop-blur-sm">
          <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-zinc-900 flex items-center justify-center">
                <span className="text-white text-xs font-bold">A</span>
              </div>
              <span className="font-semibold text-zinc-900 tracking-tight">Allo Store</span>
            </div>
            <span className="text-xs text-zinc-400 hidden sm:block">
              Units are held for 10 min at checkout
            </span>
          </div>
        </header>

        <main>{children}</main>

        {/* Toast notifications */}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}