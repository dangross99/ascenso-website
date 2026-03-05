'use client';

import React from 'react';
import Link from 'next/link';

export default function HoneycombTechnologyPage() {
  return (
    <main className="min-h-screen bg-white" dir="rtl">
      {/* Hero — מינימל אופנה */}
      <section className="relative bg-[#1a1a2e] text-white py-20 md:py-28">
        <div className="max-w-3xl mx-auto px-4 md:px-8 text-center">
          <p className="text-[10px] md:text-xs tracking-[0.35em] uppercase text-white/50 mb-6">
            טכנולוגיה
          </p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-light mb-6 tracking-tight">
            טכנולוגיית Honeycomb
          </h1>
          <p className="text-base md:text-lg text-white/80 max-w-xl mx-auto font-light leading-relaxed">
            לוחות חיפוי קלי משקל — אבן טבעית או מתכת, ליבת חלת דבש אלומיניום וגב אלומיניום.
          </p>
        </div>
      </section>

      {/* מבנה הלוח */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 py-16 md:py-24">
        <p className="text-center text-[10px] md:text-xs tracking-[0.3em] uppercase text-neutral-400 mb-4">מבנה</p>
        <h2 className="text-2xl md:text-3xl font-light text-[#1a1a2e] text-center mb-12 md:mb-14 tracking-tight">
          מבנה הלוח
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-16 items-center">
          <div className="order-2 lg:order-1">
            <div className="bg-[#fafafa] p-8 md:p-10">
              <svg viewBox="0 0 400 180" className="w-full h-auto" aria-hidden>
                <defs>
                  <linearGradient id="stone" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#e2e8f0" />
                    <stop offset="100%" stopColor="#cbd5e1" />
                  </linearGradient>
                  <linearGradient id="honey" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#94a3b8" />
                    <stop offset="100%" stopColor="#64748b" />
                  </linearGradient>
                  <linearGradient id="alum" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#94a3b8" />
                    <stop offset="100%" stopColor="#475569" />
                  </linearGradient>
                </defs>
                {/* שכבת אבן */}
                <rect x="40" y="30" width="320" height="24" rx="2" fill="url(#stone)" stroke="#64748b" strokeWidth="1" />
                <text x="200" y="47" textAnchor="middle" fontSize="11" fill="#475569" fontWeight="600">שכבת אבן / מתכת</text>
                {/* פייבר גלס */}
                <rect x="40" y="56" width="320" height="6" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="0.5" />
                {/* חלת דבש */}
                <rect x="40" y="64" width="320" height="80" rx="1" fill="url(#honey)" stroke="#475569" strokeWidth="1" />
                <text x="200" y="108" textAnchor="middle" fontSize="12" fill="white" fontWeight="600">ליבת Honeycomb אלומיניום</text>
                {/* גב אלומיניום */}
                <rect x="40" y="146" width="320" height="8" fill="url(#alum)" stroke="#334155" strokeWidth="0.5" />
                <text x="200" y="163" textAnchor="middle" fontSize="10" fill="white">גב אלומיניום</text>
              </svg>
            </div>
          </div>
          <ul className="order-1 lg:order-2 space-y-6 text-neutral-600 text-[15px] md:text-base leading-relaxed font-light">
            <li className="flex gap-4 items-start">
              <span className="flex-shrink-0 w-7 h-7 rounded-full border border-[#1a1a2e] text-[#1a1a2e] flex items-center justify-center text-xs font-normal">1</span>
              <span><strong className="font-normal text-[#1a1a2e]">שכבת אבן או מתכת</strong> — פרוסה דקה של אבן טבעית (שיש, גרניט, טרוורטין) או לוח מתכת. מראה יוקרתי ועמיד.</span>
            </li>
            <li className="flex gap-4 items-start">
              <span className="flex-shrink-0 w-7 h-7 rounded-full border border-[#1a1a2e] text-[#1a1a2e] flex items-center justify-center text-xs font-normal">2</span>
              <span><strong className="font-normal text-[#1a1a2e]">ליבת Honeycomb</strong> — חלת דבש אלומיניום. מקנה חוזק וקשיחות במשקל מינימלי, מתאימה ללוחות גדולי ממד.</span>
            </li>
            <li className="flex gap-4 items-start">
              <span className="flex-shrink-0 w-7 h-7 rounded-full border border-[#1a1a2e] text-[#1a1a2e] flex items-center justify-center text-xs font-normal">3</span>
              <span><strong className="font-normal text-[#1a1a2e]">גב אלומיניום</strong> — שכבת סגירה וייצוב. המבנה מאפשר תלייה יבשה (Z-Clips ועוד) ללא צורך בקונסטרוקציה כבדה.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* בלוק תוכן מינימלי — אופנה: חלת הדבש + משקל */}
      <section className="w-full bg-[#fafafa] py-20 md:py-28">
        <div className="max-w-[720px] mx-auto px-6 md:px-10">
          <p className="text-[10px] md:text-xs tracking-[0.3em] uppercase text-neutral-400 mb-6">
            רקע מדעי והנדסי
          </p>
          <h2 className="text-2xl md:text-3xl font-light text-[#1a1a2e] tracking-tight mb-12 md:mb-14">
            חלת הדבש
          </h2>
          <div className="space-y-8 text-neutral-600 text-[15px] md:text-base leading-[1.85] font-light">
            <p>
              <strong className="font-normal text-[#1a1a2e]">מבנה חלת הדבש (Honeycomb)</strong> הוא מבנה תאי המורכב מתאים שש־צלעיים (הקסגונליים), הדומים בצורתם לחלות דבש בטבע. במכניקה של מבנים ובדינמיקה של מבנים נלמד כי למבנה זה יחס קשיחות־למשקל (stiffness-to-weight ratio) מעולה: הוא מקנה חוזק בכפיפה (bending stiffness) ועמידות בפני גליון (shear) תוך משקל נמוך מאוד ביחס לנפח. התאים הסגורים יוצרים מרחק בין שני הפנים (שכבת האבן וגב האלומיניום) ומגדילים את מומנט האינרציה של החתך — ולכן את הקשיחות — בלי להוסיף מסה משמעותית.
            </p>
            <p>
              השימוש בליבת Honeycomb אלומיניום ב<strong className="font-normal text-[#1a1a2e]">מבנה סנדוויץ' (Sandwich Panel)</strong> מקובל בתעשיית התעופה והחלל, ברכיבים מבניים ובמעטפות בניין. שני הפנים (אבן ומתכת) נושאים את רוב המאמצים האורכיים, בעוד הליבה מונעת יציבות (מתנגדת לכשל ב־buckling) ומעבירה מאמצי גליון. התוצאה: לוח ששטח הפנים שלו נראה ומתנהג כמו אבן מלאה, אך משקלו קטן בכמה מונים — וכך מתאפשר שימוש בלוחות גדולי ממד על קירות חוץ ופנים ללא עומס מבני כבד.
            </p>
            <p>
              בחירת <strong className="font-normal text-[#1a1a2e]">אלומיניום</strong> לליבה נובעת מקלות, עמידות לקורוזיה וזמינות. גודל התא ועובי דפנות התא נקבעים לפי דרישות העומס והתקן. בלוחות חיפוי למבנים משתמשים בליבת חלת דבש אלומיניום המותאמת לעובי לוח כולל של כ־16–29 מ"מ, תוך שמירה על עמידות מכנית ותאימות למערכות תלייה יבשה.
            </p>
          </div>

          <div className="w-12 h-px bg-neutral-300 my-16 md:my-20" aria-hidden />

          <p className="text-[10px] md:text-xs tracking-[0.3em] uppercase text-neutral-400 mb-6">
            משקל והשוואה
          </p>
          <h2 className="text-2xl md:text-3xl font-light text-[#1a1a2e] tracking-tight mb-12 md:mb-14">
            משקל הלוח
          </h2>
          <div className="space-y-8 text-neutral-600 text-[15px] md:text-base leading-[1.85] font-light">
            <p>
              <strong className="font-normal text-[#1a1a2e]">לוח אבן מלאה</strong> בעובי 20–30 מ"מ (שיש, גרניט) שוקל כ־55–85 ק"ג למ"ר, בהתאם לסוג האבן ולעובי. לוח Honeycomb עם שכבת אבן דקה (כ־6–7 מ"מ), ליבת חלת דבש אלומיניום וגב אלומיניום שוקל כ־<strong className="font-normal text-[#1a1a2e]">15–25 ק"ג למ"ר</strong> — כלומר הפחתה של כ־70% ויותר במשקל ביחס לאבן מלאה באותו שטח.
            </p>
            <p>
              המשמעות המעשית: עומס על הקונסטרוקציה והמשטח קטן משמעותית; הובלה והרמה פשוטות ובטוחות יותר; והתקנה על קירות גבוהים או על קונסטרוקציה קלה אפשרית בלי חיזוקים כבדים. בנוסף, הפחתת המשקל מקטינה את כוחות האינרציה ברעידות אדמה ומקלה על עמידות מבנית. לכן לוחות Honeycomb מתאימים במיוחד לחיפוי חוץ ופנים במבני ציבור, משרדים ומגורים — גם כשמדובר בלוחות גדולי ממד (למשל 2900×1450 מ"מ).
            </p>
            <ul className="space-y-4 pt-6 text-sm font-light">
              <li className="flex justify-between gap-6 py-3 border-b border-neutral-200 last:border-0">
                <span className="text-neutral-500">אבן מלאה 30 מ"מ (שיש/גרניט)</span>
                <span className="text-[#1a1a2e] font-normal">~55–85 ק"ג/מ"ר</span>
              </li>
              <li className="flex justify-between gap-6 py-3 border-b border-neutral-200 last:border-0">
                <span className="text-neutral-500">לוח Honeycomb (עובי ~25–29 מ"מ)</span>
                <span className="text-[#1a1a2e] font-normal">~15–25 ק"ג/מ"ר</span>
              </li>
              <li className="flex justify-between gap-6 py-3">
                <span className="text-neutral-500">חיסכון במשקל</span>
                <span className="text-[#1a1a2e] font-normal">כ־70% ומעלה</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* יתרונות — מינימל */}
      <section className="py-20 md:py-28 border-t border-neutral-200">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <p className="text-center text-[10px] md:text-xs tracking-[0.3em] uppercase text-neutral-400 mb-4">יתרונות</p>
          <h2 className="text-2xl md:text-3xl font-light text-[#1a1a2e] text-center mb-14 md:mb-16 tracking-tight">
            יתרונות הטכנולוגיה
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-10">
            {[
              { title: 'קל משקל', desc: 'משקל נמוך ביחס לאבן מלאה — מתאים לחיפוי קירות גבוהים ולחיזוק מינימלי.' },
              { title: 'חזק ויציב', desc: 'ליבת Honeycomb מספקת קשיחות ועמידות בפני עומסים ורוח.' },
              { title: 'גדולי ממד', desc: 'לוחות עד 2900×1450 מ"מ ויותר — פחות תפרים, מראה אחיד.' },
              { title: 'תלייה יבשה', desc: 'מערכות Z-Clips ותלייה יבשה — התקנה מהירה, ללא דבקים כבדים.' },
            ].map((item, i) => (
              <div key={i} className="text-center md:text-right">
                <h3 className="text-base font-normal text-[#1a1a2e] mb-3 tracking-tight">{item.title}</h3>
                <p className="text-neutral-500 text-sm leading-relaxed font-light">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA — מינימל */}
      <section className="max-w-[720px] mx-auto px-4 md:px-8 py-20 md:py-28 text-center border-t border-neutral-200">
        <p className="text-neutral-500 text-[15px] md:text-base font-light mb-10 leading-relaxed">
          רוצים לראות את הלוח בתלת־ממד, לבחור חומר ולקבל מחיר? גלשו להדמייה החיה או לקטלוג האבן.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-6">
          <Link
            href="/live"
            className="inline-block px-10 py-3.5 bg-[#1a1a2e] text-white text-sm font-normal tracking-widest hover:opacity-90 transition-opacity uppercase"
          >
            להדמייה LIVE
          </Link>
          <Link
            href="/materials"
            className="inline-block px-10 py-3.5 border border-[#1a1a2e] text-[#1a1a2e] text-sm font-normal tracking-widest hover:bg-[#1a1a2e] hover:text-white transition-colors uppercase"
          >
            קולקציות אבן
          </Link>
        </div>
      </section>
    </main>
  );
}
