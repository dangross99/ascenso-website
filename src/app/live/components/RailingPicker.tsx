import React from 'react';
import type { PathSegment } from '../shared/path';

type RailingKind = 'none' | 'glass' | 'metal' | 'cable';

export function RailingPicker(props: {
	railing: RailingKind;
	setRailing: (k: RailingKind) => void;

	glassTone: 'extra' | 'smoked' | 'bronze';
	setGlassTone: (t: 'extra' | 'smoked' | 'bronze') => void;

	railingMetalSolid: string | null;
	setRailingMetalSolid: (hex: string | null) => void;
	setRailingMetalId: (id: string | null) => void;

	cableOptions: Array<{ id: string; name: string; image: string; color?: string }>;
	cableId: string | null;
	setCableId: (id: string | null) => void;
	setCableColor: (hex: string) => void;

	pathSegments: PathSegment[];
	landingMeta: Array<'left' | 'right' | undefined>;

	stepRailing: boolean[];
	setStepRailing: React.Dispatch<React.SetStateAction<boolean[]>>;

	landingRailing: boolean[];
	setLandingRailing: React.Dispatch<React.SetStateAction<boolean[]>>;
}) {
	const {
		railing,
		setRailing,
		glassTone,
		setGlassTone,
		railingMetalSolid,
		setRailingMetalSolid,
		setRailingMetalId,
		cableOptions,
		cableId,
		setCableId,
		setCableColor,
		pathSegments,
		landingMeta,
		stepRailing,
		setStepRailing,
		landingRailing,
		setLandingRailing,
	} = props;

	return (
		<div className="p-3">
			<div className="flex items-center justify-center gap-2 mb-2 text-center">
				{([
					{ id: 'none', label: 'ללא' },
					{ id: 'glass', label: 'זכוכית' },
					{ id: 'metal', label: 'מתכת' },
					{ id: 'cable', label: 'כבלי נירוסטה' },
				] as const).map(opt => (
					<button
						key={opt.id}
						className={`px-4 py-2 text-base rounded-full border ${railing === opt.id ? 'bg-[#1a1a2e] text-white' : 'bg-white hover:bg-gray-100'}`}
						onClick={() => setRailing(opt.id)}
					>
						{opt.label}
					</button>
				))}
			</div>

			{/* צבעים/גוונים לפי סוג המעקה הנבחר – מוצג בטאב העליון */}
			<div className="mb-3">
				{railing === 'glass' && (
					<div className="flex items-center justify-center gap-3">
						{([
							{ id: 'extra' as const, label: 'אקסטרה', color: '#aee7ff', border: '#81b1cc' },
							{ id: 'smoked' as const, label: 'מושחר', color: '#4a5568', border: '#2d3748' },
							{ id: 'bronze' as const, label: 'ברונזה', color: '#b08d57', border: '#8a6a3a' },
						]).map(sw => (
							<button
								key={sw.id}
								title={sw.label}
								aria-label={sw.label}
								onClick={() => setGlassTone(sw.id)}
								className={`w-[22px] h-[22px] rounded-full border-2 cursor-pointer ${glassTone === sw.id ? 'ring-2 ring-[#1a1a2e]' : ''}`}
								style={{ backgroundColor: sw.color, borderColor: sw.border }}
							/>
						))}
					</div>
				)}

				{railing === 'metal' && (
					<div className="flex items-center justify-center gap-3">
						<button
							title="שחור"
							aria-label="שחור"
							onClick={() => { setRailingMetalSolid('#111111'); setRailingMetalId(null); }}
							className={`w-[22px] h-[22px] rounded-full border-2 cursor-pointer ${railingMetalSolid === '#111111' ? 'ring-2 ring-[#1a1a2e]' : ''}`}
							style={{ backgroundColor: '#111111', borderColor: '#333' }}
						/>
						<button
							title="לבן"
							aria-label="לבן"
							onClick={() => { setRailingMetalSolid('#F5F5F5'); setRailingMetalId(null); }}
							className={`w-[22px] h-[22px] rounded-full border-2 cursor-pointer ${railingMetalSolid === '#F5F5F5' ? 'ring-2 ring-[#1a1a2e]' : ''}`}
							style={{ backgroundColor: '#F5F5F5', borderColor: '#ddd' }}
						/>
					</div>
				)}

				{railing === 'cable' && (
					<div className="flex items-center justify-center gap-3 flex-wrap">
						{cableOptions.map(opt => (
							<button
								key={opt.id}
								title={opt.name}
								aria-label={opt.name}
								onClick={() => { setCableId(opt.id); setCableColor(opt.color || '#c7ccd1'); }}
								className={`w-[22px] h-[22px] rounded-full border-2 bg-center bg-cover cursor-pointer ${cableId === opt.id ? 'ring-2 ring-[#1a1a2e]' : ''}`}
								style={{ backgroundImage: opt.image ? `url("${encodeURI(opt.image)}")` : undefined, borderColor: '#ddd' }}
							/>
						))}
					</div>
				)}
			</div>

			{(() => {
				// עורך מתקדם כמו ב"מסלול": עמודות לכל גרם (בלי בחירת צד – תמיד פנימי)
				// מפה את ריצות הישר לאינדקסי מדרגות במערכי המעקה
				const flights: Array<{ segIndex: number; start: number; count: number }> = [];
				let cursor = 0;
				for (let i = 0; i < pathSegments.length; i++) {
					const seg = pathSegments[i];
					if (seg.kind === 'straight') {
						const count = Math.max(0, (seg as any).steps || 0);
						flights.push({ segIndex: i, start: cursor, count });
						cursor += count;
					} else {
						// פודסט אינו מוסיף מדרגות
					}
				}
				const cols = Math.max(1, flights.length);

				const toggleFlight = (f: { start: number; count: number }, value: boolean) => {
					setStepRailing(prev => {
						const out = prev.slice(0, Math.max(prev.length, f.start + f.count));
						for (let i = f.start; i < f.start + f.count; i++) out[i] = value;
						return out;
					});
				};
				// ללא בחירת צד – הצד תמיד פנימי לפי computeInnerDefaultSides

				return (
					<>
						{/* ללא "מראה" – הצד נקבע אוטומטית */}

						<div className="grid gap-3 mb-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
							{flights.map((f, idx) => {
								const enabledCount = stepRailing.slice(f.start, f.start + f.count).filter(Boolean).length;
								const allOn = enabledCount === f.count && f.count > 0;
								const anyOn = enabledCount > 0;
								return (
									<div key={idx} className="border rounded-md p-2 text-center">
										<div className="text-sm text-gray-600 mb-1">גרם {idx + 1}</div>
										<div className="flex items-center justify-center gap-2 mb-2">
											<button
												className={`px-3 py-1 text-sm rounded-full border ${allOn ? 'bg-[#1a1a2e] text-white' : 'bg-white'}`}
												onClick={() => toggleFlight(f, true)}
											>
												עם מעקה
											</button>
											<button
												className={`px-3 py-1 text-sm rounded-full border ${!anyOn ? 'bg-[#1a1a2e] text-white' : 'bg-white'}`}
												onClick={() => toggleFlight(f, false)}
											>
												ללא
											</button>
										</div>
										{/* ללא בחירת צד */}
									</div>
								);
							})}
						</div>

						{/* פודסטים ללא פנייה – הפעלה בלבד (צד אוטומטי פנימי) */}
						{landingMeta.some(t => !t) && (
							<div className="flex items-center justify-center gap-2 flex-wrap">
								{landingMeta.map((turn, i) => {
									if (turn) return null;
									const on = landingRailing[i] ?? (railing !== 'none');
									return (
										<div key={i} className="border rounded-md p-2 text-center">
											<div className="text-sm text-gray-600 mb-1">פודסט {i + 1}</div>
											<div className="flex items-center justify-center gap-2 mb-2">
												<button
													className={`px-3 py-1 text-sm rounded-full border ${on ? 'bg-[#1a1a2e] text-white' : 'bg-white'}`}
													onClick={() => setLandingRailing(prev => prev.map((v, idx) => idx === i ? true : v))}
												>
													עם מעקה
												</button>
												<button
													className={`px-3 py-1 text-sm rounded-full border ${!on ? 'bg-[#1a1a2e] text-white' : 'bg-white'}`}
													onClick={() => setLandingRailing(prev => prev.map((v, idx) => idx === i ? false : v))}
												>
													ללא
												</button>
											</div>
											{/* ללא בחירת צד */}
										</div>
									);
								})}
							</div>
						)}
					</>
				);
			})()}
		</div>
	);
}

