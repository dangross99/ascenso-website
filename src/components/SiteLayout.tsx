import React, { ReactNode } from "react";
import Header from "./Header";
import Footer from "./Footer";

interface LayoutProps {
  children: ReactNode;
}

const SiteLayout: React.FC<LayoutProps> = ({ children }) => (
  <div className="flex flex-col min-h-screen bg-[#EFEFEF]">
    <Header />
    <main className="flex-1">{children}</main>
    <Footer />
  </div>
);

export default SiteLayout;


