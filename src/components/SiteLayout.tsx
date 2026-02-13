'use client';
import React, { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Header from "./Header";
import Footer from "./Footer";

interface LayoutProps {
  children: ReactNode;
}

const SiteLayout: React.FC<LayoutProps> = ({ children }) => {
  const pathname = usePathname();
  const hideFooter = pathname === "/live";
  return (
    <div className="flex flex-col min-h-screen bg-[#EFEFEF]">
      <Header />
      <main className="flex-1">{children}</main>
      {!hideFooter && <Footer />}
    </div>
  );
};

export default SiteLayout;


