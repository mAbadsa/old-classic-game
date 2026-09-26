import type { Metadata } from "next";
import { Geist, Geist_Mono, Press_Start_2P } from "next/font/google";
import { AppShell } from "@/components/AppShell";
import { APP_NAME } from "@/components/Navbar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const arcade = Press_Start_2P({
  variable: "--font-arcade",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: APP_NAME,
  description: "Play classic console games in your browser.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${arcade.variable} h-full antialiased`}
    >
      {/*
        A fixed-height (not min-height) flex column: the Navbar AppShell
        renders sits above a single scrollable <main>, rather than the whole
        body scrolling. Lets a full-bleed page (the emulator) fill exactly
        the remaining space under the navbar instead of adding a second
        viewport's worth of height on top of it.
      */}
      <body className="flex h-dvh flex-col overflow-hidden">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
