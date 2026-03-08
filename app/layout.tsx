import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Mission Control | Atlas AI',
  description: 'Atlas Agentic Framework Dashboard',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <nav className="bg-gray-800 border-b border-gray-700 p-4">
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            <h1 className="text-xl font-bold text-blue-400">Mission Control</h1>
            <div className="flex gap-4 text-sm">
              <a href="/" className="text-gray-300 hover:text-white">Dashboard</a>
              <a href="/tasks" className="text-gray-300 hover:text-white">Tasks</a>
              <a href="/agents" className="text-gray-300 hover:text-white">Agents</a>
              <a href="/companies" className="text-gray-300 hover:text-white">Companies</a>
              <a href="/communications" className="text-gray-300 hover:text-white">Comms</a>
              <a href="/approvals" className="text-gray-300 hover:text-white">Approvals</a>
              <a href="/incidents" className="text-gray-300 hover:text-white">Incidents</a>
              <a href="/health" className="text-gray-300 hover:text-white">Health</a>
              <a href="/queue" className="text-gray-300 hover:text-white">Queues</a>
              <a href="/presence" className="text-gray-300 hover:text-white">Presence</a>
              <a href="/executions" className="text-gray-300 hover:text-white">Execs</a>
            </div>
          </div>
        </nav>
        <main className="max-w-7xl mx-auto p-6">{children}</main>
      </body>
    </html>
  )
}
