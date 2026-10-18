import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Neko AI — Tu asistente personal",
  description:
    "Asistente web tipo JARVIS con escucha continua, espectro de voz en tiempo real y respuestas por voz. Powered by Groq.",
  keywords: [
    "Neko",
    "AI assistant",
    "JARVIS",
    "voice assistant",
    "Groq",
    "Next.js",
  ],
  authors: [{ name: "Neko AI" }],
  icons: {
    icon: "/logo.svg",
  },
  openGraph: {
    title: "Neko AI — Tu asistente personal",
    description: "Asistente web tipo JARVIS, siempre escuchando.",
    siteName: "Neko AI",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Neko AI",
    description: "Asistente web tipo JARVIS, siempre escuchando.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
