import type { Metadata } from "next";
import { Space_Grotesk, Archivo_Black } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const archivoBlack = Archivo_Black({
  variable: "--font-archivo-black",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Vibe in the Dark",
  description: "Code with AI. See nothing. Vibe everything.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${spaceGrotesk.variable} ${archivoBlack.variable} antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
