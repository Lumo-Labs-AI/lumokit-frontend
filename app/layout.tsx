import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Space_Grotesk, Bebas_Neue } from "next/font/google"
import WalletContextProvider from "@/components/WalletContextProvider"
import '@/styles/chat.css'

// Load Space Grotesk font for body text - more interesting than Inter
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
})

// Load Bebas Neue for headings
const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas-neue",
  display: "swap",
})

export const metadata: Metadata = {
  title: "LumoKit - AI Toolkit for Solana",
  description: "A lightweight AI Toolkit Framework catering to Solana ecosystem",
  icons: {
    icon: [
      { url: '/favicon.ico' },
    ],
    apple: [
      { url: '/favicon.png', sizes: '128x128', type: 'image/png' },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${spaceGrotesk.variable} ${bebasNeue.variable}`}>
        <WalletContextProvider>
          {children}
        </WalletContextProvider>
      </body>
    </html>
  )
}
