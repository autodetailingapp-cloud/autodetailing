import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'

const geist = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'AutoDetailing Manager',
  description: 'Sistema de gestión para lavaderos de autos en Ecuador',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`${geist.variable} h-full`}>
      <body className="h-full antialiased bg-gray-50 text-gray-900">{children}</body>
    </html>
  )
}
