'use client';

import Image from 'next/image';
import React from 'react';

type MaterialRecord = {
	id: string;
	name: string;
	category: 'wood' | 'metal' | 'stone';
	colors: string[];
	price: number;
	images: string[];
	variants?: Record<string, string[]>; // colorId -> responsive srcs (webp/avif). First is primary.
};

type MaterialItem = {
	id: string;
	materialId: string; // 'wood' | 'metal' | 'stone'
	name: string;
	image: string;
	color: string; // one of COLOR_SWATCHES ids
	price: number; // מחיר מדומה להצגה/סינון
	variantImages?: Record<string, string[]>; // אופציונלי: וריאנטים אמיתיים (למשל לעץ)
};

// בוטל: סינון צבעים הוסר מהעמוד

// גווני עץ לדוגמה בכל כרטיס – בחירה תשפיע ויזואלית על התמונה (Overlay)
// מציגים אך ורק 6 צבעים קבועים לדגמי עץ (ללא צביעה מלאכותית)
const WOOD_SWATCHES: { id: string; label: string; hex: string }[] = [
	{ id: 'black', label: 'שחור', hex: '#111827' },
	{ id: 'graphite', label: 'גרפיט', hex: '#3E3E3E' },
	{ id: 'white', label: 'לבן', hex: '#F3F4F6' },
	{ id: 'natural', label: 'טבעי בהיר', hex: '#D5C4A1' },
	{ id: 'walnut', label: 'וולנט', hex: '#7B5A39' },
	{ id: 'oak', label: 'אלון', hex: '#C8A165' },
];

// הוסרו נתוני דמה – הטעינה כולה מגיעה מ-materials.json

function SpecTable({ specs }: { specs: { label: string; value: string }[] }) {
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

export default function MaterialsPage() {
	// תמונת ברירת מחדל אמינה (Data URL SVG) כדי להימנע משבירת תצוגה אם קבצים חסרים/ננעלו בעיבוד
	const FALLBACK_SRC =
		'data:image/svg+xml;utf8,' +
		encodeURIComponent(
			`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0%" stop-color="#e5e7eb"/><stop offset="100%" stop-color="#cbd5e1"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><text x="50%" y="50%" font-family="Arial, Helvetica, sans-serif" font-size="22" fill="#64748b" text-anchor="middle" dominant-baseline="middle">תמונה תיטען…</text></svg>`
		);
	const [materialFilter, setMaterialFilter] = React.useState<string | null>(null);
	// color filter removed
	const [priceFilter, setPriceFilter] = React.useState<number | null>(5000); // max price (slider)
	const [allItems, setAllItems] = React.useState<MaterialItem[]>([]);
	const [visibleCount, setVisibleCount] = React.useState<number>(9);
	// צבע נבחר לכל פריט עץ (מפה לפי id)
	const [woodColorById, setWoodColorById] = React.useState<Record<string, string>>({});


	// מעקב אחרי תמונות שלא נטענו (fallback)
	const [brokenStripById, setBrokenStripById] = React.useState<Record<string, boolean>>({});
	const [brokenGridById, setBrokenGridById] = React.useState<Record<string, boolean>>({});
	// תצוגת הגדלה (Lightbox) לתמונות הגריד
	const [lightbox, setLightbox] = React.useState<{ src: string; href?: string } | null>(null);
	React.useEffect(() => {
        if (!lightbox) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') setLightbox(null);
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [lightbox]);

	// טען נתונים מ-JSON ציבורי
	React.useEffect(() => {
		let cancelled = false;
		async function load() {
			try {
				const res = await fetch(`/data/materials.json?ts=${Date.now()}`, { cache: 'no-store' });
				const json: MaterialRecord[] = await res.json();
				if (cancelled) return;
				const items: MaterialItem[] = json.map((rec, idx) => ({
					id: rec.id || `json-${idx}`,
					materialId: rec.category,
					name: rec.name,
					image: rec.images?.[0] || FALLBACK_SRC,
					color: (rec.colors && rec.colors[0]) || 'gray',
					price: rec.price ?? 3000,
					variantImages: rec.variants,
				}));
				setAllItems(items);
			} catch (e) {
				console.warn('Failed to load materials.json', e);
				setAllItems([]);
			}
		}
		load();
		return () => {
			cancelled = true;
		};
	}, []);

	// נתונים מסוננים
	const filteredItems = React.useMemo(() => {
		const source = allItems;
		return source.filter(it => {
			if (materialFilter && it.materialId !== materialFilter) return false;
			if (priceFilter !== null && it.price > priceFilter) return false;
			return true;
		});
	}, [allItems, materialFilter, priceFilter]);

	// איפוס טען-עוד בעת שינוי סינון/מקור
	React.useEffect(() => {
		setVisibleCount(9);
	}, [materialFilter, priceFilter, allItems]);

	// הוסר פס הגלילה העליון

	return (
		<main className="max-w-7xl mx-auto px-4 pt-10 md:pt-14 pb-6 bg-[#EFEFEF]" dir="rtl">
			{/* פס גלילה עליון הוסר לפי בקשה */}

			{/* אזור תוכן: סינון + תוצאות */}
			<div className="grid grid-cols-1 lg:grid-cols-12 gap-8" dir="ltr">
				{/* סינון בראש הדף בדסקטופ */}
				<aside className="lg:col-span-12 self-start" dir="rtl">
					<div className="p-4 bg-white">

						{/* קטגוריות (במקום Origin) */}
						<div className="mb-5">
							<div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
								<button
									className={`w-full py-2 text-base rounded-full border cursor-pointer transition-colors ${materialFilter === null ? 'bg-[#1a1a2e] text-white border-[#1a1a2e]' : 'bg-white text-[#1a1a2e] border-gray-300 hover:border-gray-400'}`}
									onClick={() => setMaterialFilter(null)}
								>
									הכל
								</button>
								<button
									className={`w-full py-2 text-base rounded-full border cursor-pointer transition-colors ${materialFilter === 'wood' ? 'bg-[#1a1a2e] text-white border-[#1a1a2e]' : 'bg-white text-[#1a1a2e] border-gray-300 hover:border-gray-400'}`}
									onClick={() => setMaterialFilter('wood')}
								>
									עץ
								</button>
								<button
									className={`w-full py-2 text-base rounded-full border cursor-pointer transition-colors ${materialFilter === 'metal' ? 'bg-[#1a1a2e] text-white border-[#1a1a2e]' : 'bg-white text-[#1a1a2e] border-gray-300 hover:border-gray-400'}`}
									onClick={() => setMaterialFilter('metal')}
								>
									מתכת
								</button>
								<button
									className={`w-full py-2 text-base rounded-full border cursor-pointer transition-colors ${materialFilter === 'stone' ? 'bg-[#1a1a2e] text-white border-[#1a1a2e]' : 'bg-white text-[#1a1a2e] border-gray-300 hover:border-gray-400'}`}
									onClick={() => setMaterialFilter('stone')}
								>
									אבן טבעית
								</button>
							</div>
						</div>

						{/* צבעים – הוסר לפי בקשה */}

						{/* מחיר */}
						<div className="mb-3">
							<div className="text-sm text-gray-600 mb-2">המחיר כולל התקנה</div>
							<input
								type="range"
								min={2000}
								max={5000}
								step={100}
								value={priceFilter ?? 5000}
								onChange={e => setPriceFilter(parseInt(e.target.value, 10))}
								className="w-full accent-[#1a1a2e]"
								aria-label="סינון לפי מחיר מקסימלי"
							/>
							<div className="flex justify-between text-sm text-gray-600 mt-1">
								<span>₪2000</span>
								<span>₪2500</span>
								<span>₪3000</span>
								<span>₪4000</span>
								<span>₪5000</span>
							</div>
						</div>
					</div>
				</aside>

				{/* תוצאות */}
				<section className="lg:col-span-12" dir="rtl">
					<div className="flex items-center justify-between mb-3 text-sm text-gray-600">
						<span>{filteredItems.length} תוצאות</span>
						<div className="flex items-center gap-2">
							<span>מיין לפי:</span>
							<select className="border px-2 py-1 text-sm cursor-pointer">
								<option>ברירת מחדל</option>
								<option>שם (א-ת)</option>
								<option>שם (ת-א)</option>
							</select>
						</div>
					</div>
					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
						{filteredItems.slice(0, visibleCount).map((it, i) => {
							// צבע נבחר: מה-UI, אחרת צבע ראשון זמין מתוך השישה, אחרת 'oak'
							const availableWoodColors = WOOD_SWATCHES.map(s => s.id).filter(id => !it.variantImages || it.variantImages[id]);
							const selectedColorId =
								it.materialId === 'wood'
									? (woodColorById[it.id] ?? (availableWoodColors[0] ?? 'oak'))
									: it.color;
							const selectedVariantSrc =
								it.materialId === 'wood' && it.variantImages
									? it.variantImages[selectedColorId]?.[0] || it.image
									: it.image;
							const displaySrc = selectedVariantSrc || FALLBACK_SRC;
							const safeSrc = brokenGridById[it.id] ? FALLBACK_SRC : (displaySrc || FALLBACK_SRC);
							return (
								<article key={i} className="bg-white group">
									<div className="relative aspect-[4/3] overflow-hidden rounded-t-[9999px] rounded-b-none">
										<Image
											src={safeSrc}
											alt={it.name}
											fill
											className="object-cover transition-opacity duration-300 group-hover:opacity-70"
											onError={() => setBrokenGridById(prev => ({ ...prev, [it.id]: true }))}
										/>
										{/* Overlay + control on hover */}
										<div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
											<button
												type="button"
												className="pointer-events-auto inline-block px-14 py-3.5 rounded-md bg-[#1a1a2e] text-white text-sm md:text-base font-bold tracking-widest shadow-sm hover:opacity-90 cursor-pointer"
												onClick={(e) => {
													e.preventDefault();
													const href = `/live?material=${encodeURIComponent(it.materialId)}&color=${encodeURIComponent(selectedColorId)}&price=${it.price}`;
													setLightbox({ src: safeSrc, href });
												}}
											>
												הגדל
											</button>
										</div>
									</div>
									<div className="p-3">
										<div className="flex items-center justify-center">
											<h3 className="font-semibold text-gray-900">{it.name}</h3>
										</div>
										{/* בוחר גוונים – מוצג רק לפריטי עץ */}
										{it.materialId === 'wood' && (
											<div className="mt-3 flex items-center justify-center gap-2">
												{WOOD_SWATCHES.filter(sw => !it.variantImages || it.variantImages[sw.id]).map(sw => {
													const active = selectedColorId === sw.id;
													return (
														<button
															key={sw.id}
															type="button"
															title={sw.label}
															aria-label={sw.label}
															className={`w-6 h-6 rounded-full border-2 transition-transform ${active ? 'border-[#1a1a2e] scale-110' : 'border-gray-300 hover:border-gray-400 hover:scale-105'}`}
															style={{ backgroundColor: sw.hex }}
															onClick={() => setWoodColorById(prev => ({ ...prev, [it.id]: sw.id }))}
														/>
													);
												})}
											</div>
										)}
										<div className="mt-3 flex justify-center">
											<a
												href={`/live?material=${encodeURIComponent(it.materialId)}&color=${encodeURIComponent(selectedColorId)}&price=${it.price}`}
												className="inline-block px-14 py-3.5 bg-white text-[#1a1a2e] text-sm md:text-base font-bold tracking-widest rounded-md transition-colors duration-300 hover:bg-gray-400 group-hover:bg-gray-400 cursor-pointer border hover:border-gray-400 group-hover:border-gray-400"
											>
												צפייה בטקסטורה LIVE
											</a>
										</div>
									</div>
								</article>
							);
						})}
					</div>
					{visibleCount < filteredItems.length && (
						<div className="mt-6 flex justify-center">
							<button
								className="px-14 py-3.5 bg-[#1a1a2e] text-white text-sm md:text-base font-bold tracking-widest rounded-md transition-colors duration-300 hover:opacity-90 cursor-pointer"
								onClick={() =>
									setVisibleCount(c => Math.min(c + 9, filteredItems.length))
								}
							>
								טען עוד
							</button>
						</div>
					)}
				</section>
			</div>

			{/* Lightbox modal */}
			{lightbox && (
				<div
					className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4 cursor-pointer"
					onClick={() => setLightbox(null)}
					aria-modal="true"
					role="dialog"
				>
					<div className="relative max-w-6xl max-h-[92vh] w-full h-full flex flex-col items-center justify-center gap-4" onClick={e => e.stopPropagation()}>
						<img
							src={lightbox.src}
							alt="תצוגה מוגדלת"
							className="max-w-[95vw] max-h-[82vh] object-contain"
						/>
						{lightbox.href && (
							<a
								href={lightbox.href}
								className="inline-block px-14 py-3.5 rounded-md bg-white text-[#1a1a2e] text-sm md:text-base font-bold tracking-widest shadow-sm hover:bg-gray-400 cursor-pointer transition-colors"
							>
								צפייה בטקסטורה LIVE
							</a>
						)}
					</div>
				</div>
			)}
		</main>
	);
}


