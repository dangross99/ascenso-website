'use client';

import React from 'react';

const faqs: Array<{ q: string; a: React.ReactNode }> = [
  {
    q: 'מה זה מדרגות מרחפות?',
    a: (
      <p>
        מדרגות שמעניקות מראה “צף” וקליל בזכות קונסטרוקציה נסתרת או מינימלית, כך שהשלבים עצמם
        נראים כאילו מרחפים באוויר. ניתן לשלב חומרים כמו עץ, מתכת או אבן טבעית ומעקות שונים
        (זכוכית, מתכת או כבלי נירוסטה) לקבלת מראה נקי ויוקרתי.
      </p>
    ),
  },
  {
    q: 'איך מחשבים מחיר?',
    a: (
      <p>
        המחיר תלוי במסלול (מספר מדרגות/פודסטים/פניות), חומר המדרך, סוג המעקה ותוספות. בדף ההדמייה
        תקבלו מחיר משוער בזמן אמת – והצעה סופית ניתנת לאחר מדידה בשטח.
      </p>
    ),
  },
  {
    q: 'האם המחיר כולל התקנה?',
    a: <p>כן. אלא אם צוין אחרת, המחירים בדף ההדמייה כוללים ייצור הובלה והתקנה.</p>,
  },
  {
    q: 'מה לגבי אחריות ואישור מהנדס?',
    a: (
      <p>
        אנו עובדים לפי תכנון הנדסי מאושר: הקונסטרוקציה נבדקת ומאושרת על‑ידי מהנדס מוסמך בהתאם למפרט הפרויקט.
        על הגימור (חיפוי/לכה/צבע וכד׳) ניתנת אחריות למשך 24 חודשים, בכפוף לתחזוקה תקינה.
      </p>
    ),
  },
  {
    q: 'כמה זמן לוקחת האספקה?',
    a: <p>בדרך כלל {`3–6`} שבועות מרגע מדידה ואישור תכנון, בהתאם לעומסים ולבחירת החומרים.</p>,
  },
  {
    q: 'האם אפשר לשתף את ההדמייה?',
    a: (
      <p>
        כן. בדף ההדמייה יש כפתור שיתוף דרך WhatsApp שמצרף את פרטי הבחירה שלכם לטובת המשך תהליך.
      </p>
    ),
  },
  {
    q: 'איך קובעים מדידה?',
    a: (
      <p>
        פשוט שלחו לנו הודעה מהדמייה או צרו קשר, ונקבע יחד מועד נוח למדידה והצעת מחיר מסודרת.
      </p>
    ),
  },
];

export default function FAQPage() {
  return (
    <main className="max-w-4xl mx-auto px-4 py-8" dir="rtl">
      <h1 className="text-2xl font-bold mb-6">שאלות תשובות</h1>

      <section className="space-y-3">
        {faqs.map((item, idx) => (
          <details key={idx} className="group rounded-md border bg-white open:bg-gray-50">
            <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between">
              <span className="font-medium">{item.q}</span>
              <span className="text-gray-400 group-open:rotate-180 transition-transform">⌄</span>
            </summary>
            <div className="px-4 pb-4 text-gray-700 text-sm">{item.a}</div>
          </details>
        ))}
      </section>

      <div className="mt-10 border-t pt-6 text-sm text-gray-600">
        לא מצאתם תשובה? אפשר ליצור קשר דרך ההדמייה LIVE או לשלוח לנו הודעת WhatsApp ונחזור בהקדם.
      </div>
    </main>
  );
}


