'use client';

import React from 'react';
import Link from 'next/link';

export default function HoneycombTechnologyPage() {
  return (
    <main className="min-h-screen bg-white" dir="rtl">
      {/* Hero */}
      <section className="relative bg-[#1a1a2e] text-white py-16 md:py-24">
        <div className="max-w-4xl mx-auto px-4 md:px-8 text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 tracking-tight">
            טכנולוגיית Honeycomb
          </h1>
          <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto">
            לוחות חיפוי קלי משקל — אבן טבעית או מתכת, ליבת חלת דבש אלומיניום וגב אלומיניום. עוצמה של סלע, קלות של טכנולוגיה.
          </p>
        </div>
      </section>

      {/* מבנה הלוח */}
      <section className="max-w-6xl mx-auto px-4 md:px-8 py-12 md:py-16">
        <h2 className="text-2xl md:text-3xl font-bold text-[#1a1a2e] text-center mb-10">
          מבנה הלוח
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <div className="order-2 lg:order-1">
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-200">
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
          <ul className="order-1 lg:order-2 space-y-4 text-gray-700 text-base md:text-lg">
            <li className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#1a1a2e] text-white flex items-center justify-center text-sm font-bold">1</span>
              <span><strong className="text-[#1a1a2e]">שכבת אבן או מתכת</strong> — פרוסה דקה של אבן טבעית (שיש, גרניט, טרוורטין) או לוח מתכת. מראה יוקרתי ועמיד.</span>
            </li>
            <li className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#1a1a2e] text-white flex items-center justify-center text-sm font-bold">2</span>
              <span><strong className="text-[#1a1a2e]">ליבת Honeycomb</strong> — חלת דבש אלומיניום. מקנה חוזק וקשיחות במשקל מינימלי, מתאימה ללוחות גדולי ממד.</span>
            </li>
            <li className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[#1a1a2e] text-white flex items-center justify-center text-sm font-bold">3</span>
              <span><strong className="text-[#1a1a2e]">גב אלומיניום</strong> — שכבת סגירה וייצוב. המבנה מאפשר תלייה יבשה (Z-Clips ועוד) ללא צורך בקונסטרוקציה כבדה.</span>
            </li>
          </ul>
        </div>
      </section>

      {/* חלת הדבש — רקע מדעי והנדסי (רמת אוניברסיטה) */}
      <section className="bg-slate-100 py-14 md:py-20">
        <div className="max-w-4xl mx-auto px-4 md:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-[#1a1a2e] text-center mb-3">
            חלת הדבש — רקע מדעי והנדסי
          </h2>
          <p className="text-center text-gray-500 text-sm mb-10">מבנה, מכניקה ויתרונות מבניים</p>
          <div className="prose prose-slate prose-lg max-w-none text-gray-700 leading-relaxed space-y-6">
            <p>
              <strong className="text-[#1a1a2e]">מבנה חלת הדבש (Honeycomb)</strong> הוא מבנה תאי המורכב מתאים שש־צלעיים (הקסגונליים), הדומים בצורתם לחלות דבש בטבע. במכניקה של מבנים ובדינמיקה של מבנים נלמד כי למבנה זה יחס קשיחות־למשקל (stiffness-to-weight ratio) מעולה: הוא מקנה חוזק בכפיפה (bending stiffness) ועמידות בפני גליון (shear) תוך משקל נמוך מאוד ביחס לנפח. התאים הסגורים יוצרים מרחק בין שני הפנים (שכבת האבן וגב האלומיניום) ומגדילים את מומנט האינרציה של החתך — ולכן את הקשיחות — בלי להוסיף מסה משמעותית.
            </p>
            <p>
              השימוש בליבת Honeycomb אלומיניום ב<strong className="text-[#1a1a2e]">מבנה סנדוויץ' (Sandwich Panel)</strong> מקובל בתעשיית התעופה והחלל, ברכיבים מבניים ובמעטפות בניין. שני הפנים (אבן ומתכת) נושאים את רוב המאמצים האורכיים, בעוד הליבה מונעת יציבות (מתנגדת לכשל ב־buckling) ומעבירה מאמצי גליון. התוצאה: לוח ששטח הפנים שלו נראה ומתנהג כמו אבן מלאה, אך משקלו קטן בכמה מונים — וכך מתאפשר שימוש בלוחות גדולי ממד על קירות חוץ ופנים ללא עומס מבני כבד.
            </p>
            <p>
              בחירת <strong className="text-[#1a1a2e]">אלומיניום</strong> לליבה נובעת מקלות, עמידות לקורוזיה וזמינות. גודל התא ועובי דפנות התא נקבעים לפי דרישות העומס והתקן. בלוחות חיפוי למבנים משתמשים בליבת חלת דבש אלומיניום המותאמת לעובי לוח כולל של כ־16–29 מ"מ, תוך שמירה על עמידות מכנית ותאימות למערכות תלייה יבשה.
            </p>
          </div>
        </div>
      </section>

      {/* משקל הלוח — הסבר והשוואה */}
      <section className="max-w-4xl mx-auto px-4 md:px-8 py-14 md:py-20">
        <h2 className="text-2xl md:text-3xl font-bold text-[#1a1a2e] text-center mb-10">
          משקל הלוח — הסבר והשוואה
        </h2>
        <div className="space-y-6 text-gray-700 leading-relaxed">
          <p>
            <strong className="text-[#1a1a2e]">לוח אבן מלאה</strong> בעובי 20–30 מ"מ (שיש, גרניט) שוקל כ־55–85 ק"ג למ"ר, בהתאם לסוג האבן ולעובי. לוח Honeycomb עם שכבת אבן דקה (כ־6–7 מ"מ), ליבת חלת דבש אלומיניום וגב אלומיניום שוקל כ־<strong className="text-[#1a1a2e]">15–25 ק"ג למ"ר</strong> — כלומר הפחתה של כ־70% ויותר במשקל ביחס לאבן מלאה באותו שטח.
          </p>
          <p>
            המשמעות המעשית: עומס על הקונסטרוקציה והמשטח קטן משמעותית; הובלה והרמה פשוטות ובטוחות יותר; והתקנה על קירות גבוהים או על קונסטרוקציה קלה אפשרית בלי חיזוקים כבדים. בנוסף, הפחתת המשקל מקטינה את כוחות האינרציה ברעידות אדמה ומקלה על עמידות מבנית. לכן לוחות Honeycomb מתאימים במיוחד לחיפוי חוץ ופנים במבני ציבור, משרדים ומגורים — גם כשמדובר בלוחות גדולי ממד (למשל 2900×1450 מ"מ).
          </p>
          <div className="bg-slate-50 rounded-xl p-6 border border-slate-200 mt-8">
            <h3 className="text-lg font-bold text-[#1a1a2e] mb-3">השוואת משקל (אומדן למ"ר)</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between gap-4"><span>אבן מלאה 30 מ"מ (שיש/גרניט)</span><span className="font-semibold text-[#1a1a2e]">~55–85 ק"ג/מ"ר</span></li>
              <li className="flex justify-between gap-4"><span>לוח Honeycomb (אבן + אלומיניום, עובי כולל ~25–29 מ"מ)</span><span className="font-semibold text-[#1a1a2e]">~15–25 ק"ג/מ"ר</span></li>
              <li className="flex justify-between gap-4 pt-2 border-t border-slate-200"><span>חיסכון במשקל</span><span className="font-semibold text-green-700">כ־70% ומעלה</span></li>
            </ul>
          </div>
        </div>
      </section>

      {/* יתרונות */}
      <section className="bg-slate-50 py-12 md:py-16">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <h2 className="text-2xl md:text-3xl font-bold text-[#1a1a2e] text-center mb-10">
            יתרונות הטכנולוגיה
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: 'קל משקל', desc: 'משקל נמוך ביחס לאבן מלאה — מתאים לחיפוי קירות גבוהים ולחיזוק מינימלי.' },
              { title: 'חזק ויציב', desc: 'ליבת Honeycomb מספקת קשיחות ועמידות בפני עומסים ורוח.' },
              { title: 'גדולי ממד', desc: 'לוחות עד 2900×1450 מ"מ ויותר — פחות תפרים, מראה אחיד.' },
              { title: 'תלייה יבשה', desc: 'מערכות Z-Clips ותלייה יבשה — התקנה מהירה, ללא דבקים כבדים.' },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-slate-100">
                <h3 className="text-lg font-bold text-[#1a1a2e] mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 md:px-8 py-12 md:py-16 text-center">
        <p className="text-gray-700 text-lg mb-8">
          רוצים לראות את הלוח בתלת־ממד, לבחור חומר ולקבל מחיר? גלשו להדמייה החיה או לקטלוג האבן.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/live"
            className="inline-block px-8 py-4 bg-[#1a1a2e] text-white font-bold rounded-md hover:opacity-90 transition-opacity"
          >
            להדמייה LIVE
          </Link>
          <Link
            href="/materials"
            className="inline-block px-8 py-4 border-2 border-[#1a1a2e] text-[#1a1a2e] font-bold rounded-md hover:bg-[#1a1a2e] hover:text-white transition-colors"
          >
            קולקציות אבן
          </Link>
        </div>
      </section>
    </main>
  );
}
