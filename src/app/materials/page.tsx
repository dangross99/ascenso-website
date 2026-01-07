'use client';

import Image from 'next/image';
import React from 'react';

type Material = {
	id: string;
	name: string;
	image: string;
	specs: { label: string; value: string }[];
};

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

const MATERIALS: Material[] = [
	{
		id: 'wood',
		name: 'עץ',
		image: '/images/products/travertine-wall.jpg',
		specs: [
			{ label: 'סוגים נפוצים', value: 'אלון, אגוז, בוק' },
			{ label: 'גימור', value: 'לכה מט/משי, שמן' },
			{ label: 'תחזוקה', value: 'ניקוי עדין, חידוש גימור לפי צורך' },
			{ label: 'תאימות מערכת כבלים', value: '✓' },
			{ label: 'תאימות מעקה זכוכית', value: '✓' },
			{ label: 'תאימות מעקה ברזל', value: '✓' },
		],
	},
	{
		id: 'metal',
		name: 'מתכת',
		image: '/images/products/nero-marquina.jpg',
		specs: [
			{ label: 'סגסוגות', value: 'פלדה, נירוסטה 304/316, אלומיניום' },
			{ label: 'גימור', value: 'צבע אבקה RAL, מוברש' },
			{ label: 'עמידות', value: 'גבוהה, מתאים גם לחוץ (לפי גימור)' },
			{ label: 'תאימות מערכת כבלים', value: '✓' },
			{ label: 'תאימות מעקה זכוכית', value: '✓' },
			{ label: 'תאימות מעקה ברזל', value: '✓' },
		],
	},
	{
		id: 'stone',
		name: 'אבן טבעית',
		image: '/images/products/white-onyx.jpg',
		specs: [
			{ label: 'סוגים נפוצים', value: 'שיש, גרניט, טרוורטין' },
			{ label: 'גימור', value: 'מוברש, מט, מלוטש' },
			{ label: 'תחזוקה', value: 'איטום תקופתי, ניקוי ייעודי' },
			{ label: 'תאימות מערכת כבלים', value: '✓' },
			{ label: 'תאימות מעקה זכוכית', value: '✓' },
			{ label: 'תאימות מעקה ברזל', value: '✓' },
		],
	},
];

// יצירת פריטי הדגמה עם צבע/מחיר
const MATERIAL_ITEMS: MaterialItem[] = (() => {
	const base: Array<Omit<MaterialItem, 'id'>> = [
		{ materialId: 'wood', name: 'עץ – דוגמה', image: MATERIALS[0].image, color: 'brown', price: 3200 },
		{ materialId: 'wood', name: 'עץ בהיר', image: MATERIALS[0].image, color: 'beige', price: 2400 },
		{ materialId: 'wood', name: 'עץ כהה', image: MATERIALS[0].image, color: 'black', price: 4800 },
		{ materialId: 'metal', name: 'מתכת מושחרת', image: MATERIALS[1].image, color: 'black', price: 2900 },
		{ materialId: 'metal', name: 'מתכת מוברשת', image: MATERIALS[1].image, color: 'gray', price: 2300 },
		{ materialId: 'metal', name: 'מתכת ירקרקה', image: MATERIALS[1].image, color: 'green', price: 4100 },
		{ materialId: 'stone', name: 'אבן בהירה', image: MATERIALS[2].image, color: 'white', price: 3600 },
		{ materialId: 'stone', name: 'אבן בז', image: MATERIALS[2].image, color: 'beige', price: 2500 },
		{ materialId: 'stone', name: 'אבן אפורה', image: MATERIALS[2].image, color: 'gray', price: 5000 },
	];
	// שכפול לגלילה יפה
	return base.flatMap((b, idx) => {
		return Array.from({ length: 3 }).map((_, k) => ({
			id: `itm-${idx}-${k}`,
			...b,
		}));
	});
})();

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


	// הדגמות עיצוב לפס הגלילה
	const [featureFade] = React.useState(false);
	const [featureSnap] = React.useState(false);
	const [featureHover] = React.useState(true);
	const [featureArrows] = React.useState(false);
	const [featureSelect] = React.useState(false);
	const [featureAuto] = React.useState(false);

	const stripRef = React.useRef<HTMLDivElement>(null);
	const [isHoveringStrip, setIsHoveringStrip] = React.useState(false);
	const [selectedIdx, setSelectedIdx] = React.useState<number | null>(null);
	// מעקב אחרי תמונות שלא נטענו (fallback)
	const [brokenStripById, setBrokenStripById] = React.useState<Record<string, boolean>>({});
	const [brokenGridById, setBrokenGridById] = React.useState<Record<string, boolean>>({});
	// תצוגת הגדלה (Lightbox) לתמונות הגריד
	const [lightboxSrc, setLightboxSrc] = React.useState<string | null>(null);
	React.useEffect(() => {
		if (!lightboxSrc) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') setLightboxSrc(null);
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [lightboxSrc]);

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
					image: rec.images?.[0] || '/images/materials/placeholder.jpg',
					color: (rec.colors && rec.colors[0]) || 'gray',
					price: rec.price ?? 3000,
					variantImages: rec.variants,
				}));
				setAllItems(items);
			} catch (e) {
				console.warn('Failed to load materials.json, using demo data', e);
				setAllItems(MATERIAL_ITEMS);
			}
		}
		load();
		return () => {
			cancelled = true;
		};
	}, []);

	// נתונים מסוננים
	const filteredItems = React.useMemo(() => {
		const source = allItems.length ? allItems : MATERIAL_ITEMS;
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

	// גלילה אוטומטית עדינה
	React.useEffect(() => {
		if (!featureAuto) return;
		let raf = 0;
		let lastTs = 0;
		const step = (ts: number) => {
			if (!stripRef.current || isHoveringStrip) {
				raf = requestAnimationFrame(step);
				lastTs = ts;
				return;
			}
			const dt = lastTs ? Math.min(32, ts - lastTs) : 16;
			stripRef.current.scrollLeft += 0.15 * dt; // תנועה איטית
			lastTs = ts;
			raf = requestAnimationFrame(step);
		};
		raf = requestAnimationFrame(step);
		return () => cancelAnimationFrame(raf);
	}, [featureAuto, isHoveringStrip]);

	// גרירת עכבר לגלילה
	React.useEffect(() => {
		const el = stripRef.current;
		if (!el) return;
		let isDown = false;
		let startX = 0;
		let scrollLeft = 0;
		const onDown = (e: MouseEvent) => {
			isDown = true;
			startX = e.pageX - el.offsetLeft;
			scrollLeft = el.scrollLeft;
			el.style.cursor = 'grabbing';
			e.preventDefault();
		};
		const onMove = (e: MouseEvent) => {
			if (!isDown) return;
			const x = e.pageX - el.offsetLeft;
			const walk = (x - startX) * 1; // מהירות גרירה
			el.scrollLeft = scrollLeft - walk;
		};
		const onUp = () => {
			isDown = false;
			el.style.cursor = '';
		};
		el.addEventListener('mousedown', onDown);
		window.addEventListener('mousemove', onMove);
		window.addEventListener('mouseup', onUp);
		return () => {
			el.removeEventListener('mousedown', onDown);
			window.removeEventListener('mousemove', onMove);
			window.removeEventListener('mouseup', onUp);
		};
	}, []);

	const scrollByTiles = (dir: 1 | -1) => {
		const el = stripRef.current;
		if (!el) return;
		// חישוב רוחב כרטיס (כולל המרווחים)
		const tileWidth = el.clientWidth / 7;
		el.scrollBy({ left: dir * tileWidth, behavior: 'smooth' });
	};

	return (
		<main className="max-w-7xl mx-auto px-4 py-6" dir="rtl">
			{/* גלריית פס עליון נגלל אופקית - מלא רוחב מסך */}
			<div
				className="mb-6 overflow-x-auto w-screen relative left-1/2 right-1/2 -mx-[50vw] px-4 scrollbar-classic"
				onMouseEnter={() => setIsHoveringStrip(true)}
				onMouseLeave={() => setIsHoveringStrip(false)}
			>
				{/* חיצי ניווט */}
				{featureArrows && (
					<>
						<button
							className="hidden md:flex absolute left-6 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full items-center justify-center bg-white/80 shadow cursor-pointer hover:bg-white"
							onClick={() => scrollByTiles(1)}
							aria-label="גלול ימינה"
						>
							<span className="text-xl select-none">›</span>
						</button>
						<button
							className="hidden md:flex absolute right-6 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full items-center justify-center bg-white/80 shadow cursor-pointer hover:bg-white"
							onClick={() => scrollByTiles(-1)}
							aria-label="גלול שמאלה"
						>
							<span className="text-xl select-none">‹</span>
						</button>
					</>
				)}

				{/* קצוות עם פייד */}
				{featureFade && (
					<>
						<div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-white to-transparent z-10" />
						<div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-white to-transparent z-10" />
					</>
				)}

				{/* מקור התמונות לפס */}
				<div
					ref={stripRef}
					className={`flex gap-1 min-w-full ${featureSnap ? 'snap-x snap-mandatory' : ''}`}
					style={{ scrollBehavior: 'smooth' }}
				>
					{(allItems.length ? allItems : MATERIAL_ITEMS)
						.slice(0, 14)
						.map((item, i) => (
						<div
							key={i}
							className={`relative shrink-0 border bg-white overflow-hidden h-96 group ${featureSnap ? 'snap-start' : ''} ${featureHover ? 'transition-transform duration-300 hover:scale-[1.03]' : ''} ${featureSelect && selectedIdx === i ? 'ring-2 ring-[#1a1a2e]' : ''}`}
							style={{ width: 'calc((100% - (0.25rem * 6)) / 7)' }} // 7 פריטים רוחב מלא עם gap-1
							onClick={() => featureSelect && setSelectedIdx(prev => (prev === i ? null : i))}
						>
							{/* תמונה עם fallback */}
							<Image
								src={brokenStripById[item.id] ? FALLBACK_SRC : (item.image || FALLBACK_SRC)}
								alt={item.name}
								fill
								className="object-cover select-none pointer-events-none"
								onError={() => setBrokenStripById(prev => ({ ...prev, [item.id]: true }))}
							/>
							{/* שכבת שם חומר */}
							{featureHover && (
								<div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/50 to-transparent text-white text-sm p-2 opacity-0 group-hover:opacity-100 transition-opacity">
									{item.name}
								</div>
							)}
							{/* דוט בחירה */}
							{featureSelect && selectedIdx === i && (
								<span className="absolute bottom-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[#1a1a2e]" />
							)}
						</div>
					))}
				</div>
			</div>

			{/* אזור תוכן: סינון + תוצאות */}
			<div className="grid grid-cols-1 lg:grid-cols-12 gap-8" dir="ltr">
				{/* סינון צדדי - משמאל בדסקטופ */}
				<aside className="lg:col-span-3 lg:-ml-8" dir="rtl">
					<div className="border p-4 bg-white rounded-xl shadow-sm">
						<h3 className="text-base font-semibold mb-4">סינון</h3>

						{/* קטגוריות (במקום Origin) */}
						<div className="mb-5">
							<div className="text-sm font-medium mb-2">קטגוריות</div>
							<div className="flex flex-wrap gap-2">
								<button
									className={`px-3 py-1 text-sm rounded-full border cursor-pointer ${materialFilter === null ? 'bg-[#1a1a2e] text-white' : 'bg-white hover:bg-gray-100'}`}
									onClick={() => setMaterialFilter(null)}
								>
									הכל
								</button>
								<button
									className={`px-3 py-1 text-sm rounded-full border cursor-pointer ${materialFilter === 'wood' ? 'bg-[#1a1a2e] text-white' : 'bg-white hover:bg-gray-100'}`}
									onClick={() => setMaterialFilter('wood')}
								>
									עץ
								</button>
								<button
									className={`px-3 py-1 text-sm rounded-full border cursor-pointer ${materialFilter === 'metal' ? 'bg-[#1a1a2e] text-white' : 'bg-white hover:bg-gray-100'}`}
									onClick={() => setMaterialFilter('metal')}
								>
									מתכת
								</button>
								<button
									className={`px-3 py-1 text-sm rounded-full border cursor-pointer ${materialFilter === 'stone' ? 'bg-[#1a1a2e] text-white' : 'bg-white hover:bg-gray-100'}`}
									onClick={() => setMaterialFilter('stone')}
								>
									אבן טבעית
								</button>
							</div>
						</div>

						{/* צבעים – הוסר לפי בקשה */}

						{/* מחיר */}
						<div className="mb-3">
							<div className="flex items-center justify-between mb-2">
								<div className="text-sm font-medium">מחיר</div>
								<div className="text-xs text-gray-600">
									עד ₪{priceFilter ?? 0}
								</div>
							</div>
							<div className="text-[11px] text-gray-500 mb-2">המחיר כולל התקנה</div>
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
							<div className="flex justify-between text-[10px] text-gray-500 mt-1">
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
				<section className="lg:col-span-9" dir="rtl">
					<div className="flex items-center justify-between mb-3 text-sm text-gray-600">
						<span>{(filteredItems.length || MATERIAL_ITEMS.length)} תוצאות</span>
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
						{(filteredItems.length ? filteredItems : MATERIAL_ITEMS).slice(0, visibleCount).map((it, i) => {
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
							const displaySrc = selectedVariantSrc || '/images/products/white-onyx.jpg';
							const safeSrc = brokenGridById[it.id] ? FALLBACK_SRC : (displaySrc || FALLBACK_SRC);
							return (
								<article key={i} className="border bg-white group">
									<div className="relative aspect-[4/3] overflow-hidden">
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
												className="pointer-events-auto px-5 py-2 rounded-full bg-white text-[#1a1a2e] text-sm font-bold tracking-wider shadow-sm hover:bg-white/95"
												onClick={(e) => {
													e.preventDefault();
													setLightboxSrc(safeSrc);
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
												className="inline-block px-14 py-3.5 bg-[#1a1a2e] text-white text-sm md:text-base font-bold tracking-widest rounded-md transition-colors duration-300 hover:opacity-90 cursor-pointer"
											>
												פתח הדמייה LIVE
											</a>
										</div>
									</div>
								</article>
							);
						})}
					</div>
					{visibleCount < (filteredItems.length || MATERIAL_ITEMS.length) && (
						<div className="mt-6 flex justify-center">
							<button
								className="px-14 py-3.5 bg-[#1a1a2e] text-white text-sm md:text-base font-bold tracking-widest rounded-md transition-colors duration-300 hover:opacity-90 cursor-pointer"
								onClick={() =>
									setVisibleCount(c => Math.min(c + 9, (filteredItems.length || MATERIAL_ITEMS.length)))
								}
							>
								טען עוד
							</button>
						</div>
					)}
				</section>
			</div>

			{/* Lightbox modal */}
			{lightboxSrc && (
				<div
					className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center p-4"
					onClick={() => setLightboxSrc(null)}
					aria-modal="true"
					role="dialog"
				>
					<div className="relative max-w-6xl max-h-[92vh] w-full h-full flex items-center justify-center" onClick={e => e.stopPropagation()}>
						<button
							type="button"
							className="absolute top-3 left-3 text-white/80 hover:text-white bg-black/40 rounded-full w-8 h-8 flex items-center justify-center"
							aria-label="סגור"
							onClick={() => setLightboxSrc(null)}
						>
							×
						</button>
						<img
							src={lightboxSrc}
							alt="תצוגה מוגדלת"
							className="max-w-[95vw] max-h-[92vh] object-contain"
						/>
					</div>
				</div>
			)}
		</main>
	);
}


