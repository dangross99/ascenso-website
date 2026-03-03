'use client';
import React from "react";
import { usePathname } from "next/navigation";

const Footer: React.FC = () => {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const wrapperClasses = isHome
    ? "bg-white border-t border-gray-200 text-[#23243a]"
    : "bg-[#1a1a2e] border-t border-transparent text-white";
  const secondaryText = isHome ? "text-gray-500" : "text-white/70";

  return (
  <footer className={`w-full ${wrapperClasses} pt-3 pb-1 px-4`} dir="rtl">
    <div className="max-w-7xl mx-auto text-center mb-1">
      <div className="font-serif font-prosto text-[18px] md:text-[22px] font-bold tracking-widest select-none">
        ASCENSO
      </div>
      <p className={`text-[10px] ${secondaryText} mt-1`}>© ASCENSO 2026</p>
    </div>
    <div className="hidden max-w-7xl mx-auto grid grid-cols-1 gap-10 mb-8 text-center">
      {/* שירות לקוחות */}
      <div>
        <h4 className="text-base font-bold mb-4">יצירת קשר</h4>
        <ul className="space-y-2 text-sm">
          <li>
            <a href="https://wa.me/972539994995" target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-2">
              <span>צ׳אט ב‑WhatsApp</span>
            </a>
          </li>
          <li>
            <a
              href="tel:+972539994995"
              className="hover:underline flex items-center gap-2"
            >
              <span>+972‑53‑999‑4995</span>
            </a>
          </li>
          <li>
            <a href="/faq" className="hover:underline">
              שאלות תשובות (FAQ)
            </a>
          </li>
          <li>
            <a href="/live" className="hover:underline">
              הדמייה LIVE
            </a>
          </li>
        </ul>
      </div>
      {/* הסרנו מדורים שיווקיים – נשאיר רק יצירת קשר וניוזלטר */}
      {/* ניוזלטר ורשתות */}
      <div className="hidden" suppressHydrationWarning>
        <h4 className="text-base font-bold mb-4">הצטרפו לרשימת התפוצה</h4>
        <p className="text-sm mb-2">עדכונים והצעות בלעדיות</p>
        <form className="flex flex-col gap-2 mb-2" suppressHydrationWarning>
          <div className="flex border-b border-gray-400 focus-within:border-[#bfa980]">
            <input
              type="email"
              placeholder="כתובת אימייל"
              className="flex-1 bg-transparent outline-none py-1 px-2 text-sm"
              required
              suppressHydrationWarning
            />
            <button
              type="submit"
              className="text-sm font-semibold text-[#23243a] hover:text-[#bfa980] px-2"
              suppressHydrationWarning
            >
              הרשמה
            </button>
          </div>
        </form>
        <p className="text-xs text-gray-500 mb-4">
          בלחיצה על הרשמה אני מאשר/ת קבלת דיוור פרסומי מ‑ASCENSO. ניתן להסיר בכל עת.
          <br />
          לצפייה ב{" "}
          <a href="#" className="underline">
            מדיניות פרטיות
          </a>{" "}
          או{" "}
          <a href="#" className="underline">
            צור קשר
          </a>{" "}
          לכל שאלה.
        </p>
        <div className="flex flex-col gap-2 mt-2">
          <a href="#" className="flex items-center gap-2 hover:text-[#bfa980]">
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18 2h-12c-1.104 0-2 .896-2 2v16c0 1.104.896 2 2 2h12c1.104 0 2-.896 2-2v-16c0-1.104-.896-2-2-2zm-6 17c-3.313 0-6-2.687-6-6s2.687-6 6-6 6 2.687 6 6-2.687 6-6 6zm6-13c0 .552-.447 1-1 1s-1-.448-1-1 .447-1 1-1 1 .448 1 1z" />
            </svg>
            פייסבוק
          </a>
          <a href="#" className="flex items-center gap-2 hover:text-[#bfa980]">
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.334 3.608 1.308.974.974 1.246 2.242 1.308 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.062 1.366-.334 2.633-1.308 3.608-.974.974-2.242 1.246-3.608 1.308-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.062-2.633-.334-3.608-1.308-.974-.974-1.246-2.242-1.308-3.608-.058-1.266-.07-1.646-.07-4.85s.012-3.584.07-4.85c.062-1.366.334-2.633 1.308-3.608.974-.974 2.242-1.246 3.608-1.308 1.266-.058 1.646-.07 4.85-.07zm0-2.163c-3.259 0-3.667.012-4.947.07-1.276.058-2.687.334-3.662 1.308-.974.974-1.25 2.386-1.308 3.662-.058 1.28-.07 1.688-.07 4.947s.012 3.667.07 4.947c.058 1.276.334 2.687 1.308 3.662.974.974 2.386 1.25 3.662 1.308 1.28.058 1.688.07 4.947.07s3.667-.012 4.947-.07c1.276-.058 2.687-.334 3.662-1.308.974-.974 1.25-2.386 1.308-3.662.058-1.28.07-1.688.07-4.947s-.012-3.667-.07-4.947c-.058-1.276-.334-2.687-1.308-3.662-.974-.974-2.386-1.25-3.662-1.308-1.28-.058-1.688-.07-4.947-.07z" />
              <circle cx="12" cy="12" r="3.5" />
            </svg>
            אינסטגרם
          </a>
          <a href="#" className="flex items-center gap-2 hover:text-[#bfa980]">
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
              <path d="M22.46 6c-.77.35-1.6.59-2.47.7a4.3 4.3 0 0 0 1.88-2.37 8.59 8.59 0 0 1-2.72 1.04 4.28 4.28 0 0 0-7.29 3.9A12.13 12.13 0 0 1 3.1 4.9a4.28 4.28 0 0 0 1.32 5.71c-.7-.02-1.36-.21-1.94-.53v.05a4.28 4.28 0 0 0 3.43 4.19c-.33.09-.68.14-1.04.14-.25 0-.5-.02-.74-.07a4.29 4.29 0 0 0 4 2.98A8.6 8.6 0 0 1 2 19.54a12.13 12.13 0 0 0 6.56 1.92c7.88 0 12.2-6.53 12.2-12.2 0-.19 0-.39-.01-.58A8.72 8.72 0 0 0 24 4.59a8.5 8.5 0 0 1-2.54.7z" />
            </svg>
            טוויטר
          </a>
          <a href="#" className="flex items-center gap-2 hover:text-[#bfa980]">
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c-5.468 0-9.837 4.369-9.837 9.837 0 4.991 3.657 9.128 8.438 9.877.617.113.843-.267.843-.595 0-.293-.011-1.07-.017-2.099-3.338.726-4.042-1.61-4.042-1.61-.561-1.426-1.37-1.807-1.37-1.807-1.12-.765.085-.75.085-.75 1.24.087 1.893 1.274 1.893 1.274 1.1 1.888 2.887 1.343 3.593 1.028.112-.797.43-1.343.782-1.653-2.665-.304-5.466-1.332-5.466-5.931 0-1.31.469-2.381 1.236-3.221-.124-.303-.535-1.523.117-3.176 0 0 1.008-.322 3.301 1.23a11.5 11.5 0 0 1 3.003-.404c1.019.005 2.047.138 3.003.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.873.119 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.803 5.625-5.475 5.921.442.381.834 1.134.834 2.287 0 1.651-.015 2.983-.015 3.389 0 .33.223.713.85.592C20.346 21.288 24 17.151 24 12.163c0-5.468-4.369-9.837-9.837-9.837z" />
            </svg>
            פינטרסט
          </a>
        </div>
      </div>
    </div>
    {/* Bottom Bar */}
    <div className={`hidden w-full border-t pt-4 mt-8 flex items-center justify-center text-xs ${secondaryText} ${isHome ? 'border-gray-200' : 'border-white/10'}`}>
      <span>&copy; {new Date().getFullYear()} ASCENSO</span>
    </div>
  </footer>
  );
}

export default Footer;
