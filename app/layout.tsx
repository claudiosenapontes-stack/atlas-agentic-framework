import './globals.css'
import { Inter, Space_Grotesk } from 'next/font/google'
import { Navbar } from '@/components/ui/navbar'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const spaceGrotesk = Space_Grotesk({ 
  subsets: ['latin'], 
  variable: '--font-space',
  weight: ['500', '600', '700']
})

export const metadata = {
  title: 'Atlas Agentic Corporation',
  description: 'Atlas Agentic Framework Dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="${inter.variable} ${spaceGrotesk.variable}">
      <body className={`${inter.className} bg-slate-50 text-slate-800 antialiased`}>
        <Navbar />
        <main className="max-w-7xl mx-auto p-4 sm:p-6">{children}</main>
      </body>
    </html>
  )
}
