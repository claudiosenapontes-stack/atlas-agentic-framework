import './globals.css'
import { Inter } from 'next/font/google'
import { Navbar } from '@/components/ui/navbar'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Atlas Agentic Corporation',
  description: 'Atlas Agentic Framework Dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Navbar />
        <main className="max-w-7xl mx-auto p-4 sm:p-6">{children}</main>
      </body>
    </html>
  )
}
