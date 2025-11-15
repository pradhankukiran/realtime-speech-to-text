import type { Metadata } from 'next'

import { Analytics } from '@vercel/analytics/next'
import './globals.css'

import { Outfit, JetBrains_Mono } from 'next/font/google'

// Initialize fonts
const outfit = Outfit({
  subsets: ['latin'],
  weight: ["300","400","500","600","700","800","900"],
  variable: '--font-outfit'
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ["400","500","600","700"],
  variable: '--font-jetbrains'
})

export const metadata: Metadata = {
  title: 'VOICESCRIBER',
  description: 'Real-time speech-to-text powered by ElevenLabs Scribe v2',
  icons: {
    icon: [
      {
        url: '/favicon.svg',
        type: 'image/svg+xml',
      },
    ],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} ${jetbrainsMono.variable} font-sans antialiased`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
