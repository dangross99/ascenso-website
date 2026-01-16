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
  metadataBase: new URL("https://ascenso.co.il"),
  title: {
    default: "מדרגות מרחפות | ASCENSO",
    template: "%s | ASCENSO",
  },
  description:
    "מדרגות מרחפות בעיצוב אישי ובאיכות פרימיום. תכנון, הדמיה LIVE והצעת מחיר מיידית — עץ, מתכת וזכוכית. ASCENSO: ייצור והתקנה מדויקת בכל רחבי הארץ.",
  keywords: [
    "מדרגות מרחפות",
    "מדרגות",
    "מדרגות עץ",
    "מדרגות מתכת",
    "הדמיית מדרגות",
    "מעקות זכוכית",
    "ASCENSO",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "https://ascenso.co.il/",
    siteName: "ASCENSO",
    title: "מדרגות מרחפות | ASCENSO",
    description:
      "מדרגות מרחפות בעיצוב אישי ובאיכות פרימיום. הדמיה LIVE והצעת מחיר מיידית.",
    images: [
      {
        url: "/images/hero1.png?v=1",
        width: 1200,
        height: 630,
        alt: "מדרגות מרחפות של ASCENSO",
      },
    ],
    locale: "he_IL",
  },
  twitter: {
    card: "summary_large_image",
    title: "מדרגות מרחפות | ASCENSO",
    description:
      "מדרגות מרחפות בעיצוב אישי ובאיכות פרימיום. הדמיה LIVE והצעת מחיר מיידית.",
    images: ["/images/hero1.png?v=1"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
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
