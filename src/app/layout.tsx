import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { APP_NAME } from "@/lib/env";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: { default: APP_NAME, template: `%s — ${APP_NAME}` },
  description: "Ative, configure e acompanhe suas plaquinhas NFC e QR Code.",
  appleWebApp: { capable: true, title: APP_NAME, statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#f7f9fc",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${geist.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
