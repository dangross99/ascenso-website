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
