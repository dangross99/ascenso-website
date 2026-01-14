import { Geist, Geist_Mono, Prosto_One, Heebo } from "next/font/google";
import "./globals.css";
import SiteLayout from "@/components/SiteLayout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const prosto = Prosto_One({
  weight: "400",
  variable: "--font-prosto",
  subsets: ["latin"],
});

const heebo = Heebo({
  weight: ["400","500","700"],
  variable: "--font-heebo",
  subsets: ["latin","hebrew"],
});

export const metadata = {
  title: {
    default: "ASCENSO — Custom Stairs & Materials",
    template: "%s | ASCENSO",
  },
  description:
    "ASCENSO — תכנון, הדמיה והצעת מחיר בזמן אמת למדרגות עץ, מתכת וזכוכית. בחרו מסלול, טקסטורה ומעקה, וקבלו הצעת מחיר מיידית.",
} as const;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${prosto.variable} ${heebo.variable} antialiased`}
      >
        <SiteLayout>{children}</SiteLayout>
      </body>
    </html>
  );
}
