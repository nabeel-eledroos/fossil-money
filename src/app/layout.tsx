import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fossil Money - Track Your Rep's Fossil Fuel Donations",
  description: "See how much money your elected officials take from fossil fuel companies and their climate voting records.",
  openGraph: {
    title: "Fossil Money",
    description: "Track fossil fuel donations to your elected officials",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#F5F5F3]">{children}</body>
    </html>
  );
}
