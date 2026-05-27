import type { Metadata } from 'next'
import { Orbitron, Space_Grotesk } from 'next/font/google'
import './globals.css'

const orbitron = Orbitron({
  subsets: ['latin'],
  variable: '--font-orbitron',
  weight: ['400', '700', '900'],
})

const grotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-grotesk',
})

export const metadata: Metadata = {
  title: 'Varun Palanisamy',
  description: 'Portfolio — Full Stack Engineer & AI Builder',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${orbitron.variable} ${grotesk.variable}`}>
      <body style={{ margin: 0, padding: 0, overflow: 'hidden', background: '#050508' }}>
        {children}
      </body>
    </html>
  )
}
