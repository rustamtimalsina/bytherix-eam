import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { ThemeProvider } from "@/lib/theme-context";
import { EnterpriseCanvasBackground } from "@/components/EnterpriseCanvasBackground";

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

export const metadata: Metadata = {
  title: "Bytherix EAM — Enterprise AI Platform",
  description: "Secure Multi-Tenant AI Knowledge Management Platform",
  icons: {
    icon: [
      { url: "/icon-128.png", sizes: "128x128", type: "image/png" },
      { url: "/bytherix_eam_icon.png", sizes: "512x512", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/icon-128.png",
    apple: "/bytherix_eam_icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen selection:bg-blue-600 selection:text-white transition-colors duration-300 relative`}
      >
        <ThemeProvider>
          <AuthProvider>
            <EnterpriseCanvasBackground />
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
