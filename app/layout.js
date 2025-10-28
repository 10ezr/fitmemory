import "./globals.css";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import Image from "next/image";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "FitMemory - Your Personal Workout Coach",
  description:
    "Single-user conversational workout coach with MongoDB persistence",
  keywords: "fitness, workout, coach, ai, personal trainer",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <Toaster />
          <div className="min-h-screen bg-background">
            <main className="mx-auto px-4">
              <div className="h-[calc(100vh)] overflow-hidden">{children}</div>
            </main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
