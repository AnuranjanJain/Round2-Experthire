import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SevaGrid Command',
  description:
    'Premium Mahakumbh volunteer deployment optimizer for skills, location, workload, and incident response.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
