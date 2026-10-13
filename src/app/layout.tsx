import type { Metadata } from "next";
import localFont from "next/font/local";
import { Fraunces } from "next/font/google";
import { Nav } from "@/components/Nav";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});
const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Proxy — agents date on your behalf",
  description: "Each person gets an agent. The agents read LinkedIn + Instagram, go on dates for their person, and rank who fits best.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} ${display.variable} min-h-screen antialiased`}>
        <Nav />
        <main className="mx-auto max-w-6xl px-5 py-10">{children}</main>
        <footer className="mx-auto flex max-w-6xl items-center justify-between border-t border-white/5 px-5 py-10 text-xs text-zinc-500">
          <span>Every agent knows its person from exactly two public sources: LinkedIn and Instagram. Nothing else.</span>
          <span className="font-display hidden text-sm text-zinc-400 sm:inline">Proxy</span>
        </footer>
      </body>
    </html>
  );
}
