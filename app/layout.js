import './globals.css'
import { Inter } from 'next/font/google'
import { ThemeProvider } from '@/components/theme-provider'
import { AppToaster } from '@/components/AppToaster'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'FitMemory',
  description: 'AI fitness and sleep coach',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <AppToaster />
        </ThemeProvider>
      </body>
    </html>
  )
}
