import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import AudioProvider from "@/components/AudioProvider";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "DrawGuess",
  description: "Vẽ hình đoán chữ cùng bạn bè - realtime multiplayer",
  icons: {
    icon: [
      { url: "/logo.png", type: "image/png" },
    ],
    apple: "/logo.png",
    shortcut: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/logo.png" type="image/png" />
      </head>
      <body className={`${poppins.variable} antialiased`}>
        <AudioProvider>
          {children}
        </AudioProvider>
      </body>
    </html>
  );
}
