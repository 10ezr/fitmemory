import './globals.css'
import { Inter } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import { AppToaster } from '@/components/AppToaster'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import FitnessSidebar from '@/components/FitnessSidebar'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'FitMemory',
  description: 'AI fitness and sleep coach',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} bg-background`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <SidebarProvider defaultOpen={true}>
            <div className="flex h-screen w-full overflow-hidden bg-background">
              <FitnessSidebar />
              <SidebarInset className="flex-1">
                <div className="h-full overflow-y-auto scrollbar-hide">
                  <main className="w-full max-w-7xl mx-auto px-4 py-6">
                    {children}
                  </main>
                </div>
              </SidebarInset>
            </div>
          </SidebarProvider>
          <AppToaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
