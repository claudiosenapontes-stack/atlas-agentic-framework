import './globals.css'
import { Inter, Space_Grotesk } from 'next/font/google'
import { Navbar } from '@/components/ui/navbar'
import { AlertProvider } from '@/app/components/alert-toast'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const spaceGrotesk = Space_Grotesk({ 
  subsets: ['latin'], 
  variable: '--font-space',
  weight: ['500', '600', '700']
})

export const metadata = {
  title: 'Atlas Agentic Corporation',
  description: 'Atlas Agentic Framework Dashboard',
  other: {
    'build-timestamp': '2026-03-18T02:55:00Z',
    'deploy-commit': '9876-FORCE',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="${inter.variable} ${spaceGrotesk.variable}">
      <body className={`${inter.className} bg-[#0B0B0C] text-white antialiased`}>
        <AlertProvider>
          <Navbar />
          <main className="p-4 sm:p-6">{children}</main>
        </AlertProvider>
      </body>
    </html>
  )
}
