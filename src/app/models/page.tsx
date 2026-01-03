 'use client';

import Image from 'next/image';
import React from 'react';

type Spec = { label: string; value: string };
type Shape = {
  id: string;
  name: string;
  code: string;
  description: string;
  image: string;
  specs: Spec[];
};

const SHAPES: Shape[] = [
  {
    id: 'box-thick',
    name: 'תיבה עבה-דופן',
    code: 'BX-T',
    description:
      'מעטפת תיבה עבה‑דופן המתלבשת על הקונסטרוקציה/המדרגות – מראה נקי ומסיבי, מתאימה לפתחים גדולים ולחיבורים נסתרים.',
    image: '/images/products/nero-marquina.jpg',
    specs: [
      { label: 'גובה', value: '11 ס״מ' },
      { label: 'חומרים אפשריים', value: 'עץ, מתכת, אבן טבעית' },
      { label: 'תאימות מערכת כבלים', value: '✓' },
      { label: 'תאימות מעקה זכוכית', value: '✓' },
      { label: 'תאימות מעקה ברזל', value: '✓' },
    ],
  },
  {
    id: 'box-thin',
    name: 'תיבה דקה-דופן',
    code: 'BX-S',
    description:
      'מעטפת תיבה דקה‑דופן המתלבשת על הקונסטרוקציה/המדרגות – שפה מינימליסטית ומשקל קל.',
    image: '/images/products/white-onyx.jpg',
    specs: [
      { label: 'גובה', value: '7 ס״מ' },
      { label: 'חומרים אפשריים', value: 'עץ, מתכת, אבן טבעית' },
      { label: 'תאימות מערכת כבלים', value: '✓' },
      { label: 'תאימות מעקה זכוכית', value: '✓' },
      { label: 'תאימות מעקה ברזל', value: '✓' },
    ],
  },
];

function SpecTable({ specs }: { specs: Spec[] }) {
  return (
    <table className="w-full text-sm text-gray-700">
      <tbody>
        {specs.map(s => (
          <tr key={s.label} className="border-b last:border-0">
            <td className="py-2 font-semibold w-1/2">{s.label}</td>
            <td className="py-2">
              {s.value === '✓' || s.value === '✔' ? (
                <span className="text-green-600 font-semibold">✓</span>
              ) : (
                s.value
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function Schematic({ type }: { type: string }) {
  // SVG סכמטי כללי, לא בקנה מידה אמיתי – הבהרת הגיאומטריה והמידות העיקריות
  // מותאם RTL באמצעות כתביות בעברית
  const common = { stroke: '#1f2937', strokeWidth: 2, fill: 'none' };
  switch (type) {
    case 'box-thick':
      return (
        <svg viewBox="0 0 360 160" className="w-full h-auto bg-white border">
          {/* תיבה עבה-דופן */}
          <rect x="40" y="40" width="280" height="80" rx="2" {...common} strokeWidth={3} />
          {/* חץ חתך (גובה) */}
          <line x1="330" y1="40" x2="330" y2="120" stroke="#6b7280" strokeWidth="1.5" />
          <polygon points="327,40 333,40 330,32" fill="#6b7280" />
          <polygon points="327,120 333,120 330,128" fill="#6b7280" />
          <text x="350" y="82" textAnchor="middle" fontSize="12" fill="#6b7280" transform="rotate(-90 350,82)">11 ס"מ</text>
        </svg>
      );
    case 'box-thin':
      return (
        <svg viewBox="0 0 360 160" className="w-full h-auto bg-white border">
          {/* קורה קופסתית */}
          <rect x="40" y="60" width="280" height="40" rx="2" {...common} />
          {/* חץ חתך */}
          <line x1="330" y1="60" x2="330" y2="100" stroke="#6b7280" strokeWidth="1.5" />
          <polygon points="327,60 333,60 330,52" fill="#6b7280" />
          <polygon points="327,100 333,100 330,108" fill="#6b7280" />
          <text x="350" y="83" textAnchor="middle" fontSize="12" fill="#6b7280" transform="rotate(-90 350,83)">7 ס"מ</text>
        </svg>
      );
    case 'box':
      return (
        <svg viewBox="0 0 360 160" className="w-full h-auto bg-white border">
          {/* קורה קופסתית */}
          <rect x="40" y="60" width="280" height="40" rx="2" {...common} />
          {/* חץ חתך */}
          <line x1="330" y1="60" x2="330" y2="100" stroke="#6b7280" strokeWidth="1.5" />
          <polygon points="327,60 333,60 330,52" fill="#6b7280" />
          <polygon points="327,100 333,100 330,108" fill="#6b7280" />
          <text x="350" y="83" textAnchor="middle" fontSize="12" fill="#6b7280" transform="rotate(-90 350,83)">7 ס"מ</text>
        </svg>
      );
    case 'triangle':
      return (
        <svg viewBox="0 0 360 160" className="w-full h-auto bg-white border">
          {/* קורה משולשת */}
          <polygon points="40,100 320,100 40,60" {...common} />
          {/* מידות */}
          <line x1="40" y1="110" x2="320" y2="110" stroke="#6b7280" strokeWidth="1.5" />
          <polygon points="40,107 40,113 32,110" fill="#6b7280" />
          <polygon points="320,107 320,113 328,110" fill="#6b7280" />
          <text x="180" y="125" textAnchor="middle" fontSize="12" fill="#6b7280">מפתח</text>
          <line x1="28" y1="60" x2="28" y2="100" stroke="#6b7280" strokeWidth="1.5" />
          <polygon points="25,60 31,60 28,52" fill="#6b7280" />
          <polygon points="25,100 31,100 28,108" fill="#6b7280" />
          <text x="20" y="83" fontSize="12" fill="#6b7280" transform="rotate(-90 20,83)">גובה</text>
        </svg>
      );
    case 'mono':
      return (
        <svg viewBox="0 0 360 160" className="w-full h-auto bg-white border">
          {/* קורה מרכזית */}
          <line x1="40" y1="80" x2="320" y2="80" {...common} />
          {/* מדרגות סכמטיות */}
          {[0, 1, 2, 3, 4, 5].map(i => (
            <line key={i} x1={60 + i * 40} y1="80" x2={60 + i * 40} y2="60" stroke="#9ca3af" strokeWidth="2" />
          ))}
          {/* מפתח */}
          <line x1="40" y1="100" x2="320" y2="100" stroke="#6b7280" strokeWidth="1.5" />
          <polygon points="40,97 40,103 32,100" fill="#6b7280" />
          <polygon points="320,97 320,103 328,100" fill="#6b7280" />
          <text x="180" y="115" textAnchor="middle" fontSize="12" fill="#6b7280">מפתח</text>
        </svg>
      );
    case 'double':
      return (
        <svg viewBox="0 0 360 160" className="w-full h-auto bg-white border">
          {/* שתי קורות */}
          <line x1="40" y1="60" x2="320" y2="60" {...common} />
          <line x1="40" y1="100" x2="320" y2="100" {...common} />
          {/* חתך/מרחק בין קורות */}
          <line x1="330" y1="60" x2="330" y2="100" stroke="#6b7280" strokeWidth="1.5" />
          <polygon points="327,60 333,60 330,52" fill="#6b7280" />
          <polygon points="327,100 333,100 330,108" fill="#6b7280" />
          <text x="336" y="83" fontSize="12" fill="#6b7280" transform="rotate(-90 336,83)">מרחק קורות</text>
        </svg>
      );
    default:
      return null;
  }
}

export default function ModelsPage() {
  return (
	    <main className="max-w-7xl mx-auto px-4 py-8" dir="rtl">
      

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {SHAPES.map(shape => (
          <section key={shape.id} id={shape.id} className="border bg-white">
            <div className="relative aspect-[16/9] overflow-hidden">
              <Image src={shape.image} alt={shape.name} fill className="object-cover" />
            </div>
            <div className="p-4">
              <div className="mb-1 relative">
                <h2 className="text-xl font-bold text-gray-900 text-center">{shape.name}</h2>
                <span className="absolute left-0 top-0 text-xs text-gray-500">קוד: {shape.code}</span>
              </div>
              <div className="mb-4">
                <Schematic type={shape.id} />
              </div>
              <SpecTable specs={shape.specs} />
              <div className="mt-4 flex justify-center">
                <a
                  href={`/live?shape=${encodeURIComponent(shape.id)}&code=${encodeURIComponent(
                    shape.code
                  )}&name=${encodeURIComponent(shape.name)}`}
                  className="inline-block px-4 py-2 border border-gray-300 text-sm rounded-md cursor-pointer transition-colors duration-200 bg-white hover:bg-gray-100"
                >
                  פתח הדמייה LIVE
                </a>
              </div>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}


