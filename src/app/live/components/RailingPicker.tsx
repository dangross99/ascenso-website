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

	stepCableSpanMode: Array<'floor' | 'tread'>;
	setStepCableSpanMode: React.Dispatch<React.SetStateAction<Array<'floor' | 'tread'>>>;
	landingCableSpanMode: Array<'floor' | 'tread'>;
	setLandingCableSpanMode: React.Dispatch<React.SetStateAction<Array<'floor' | 'tread'>>>;
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
		stepCableSpanMode,
		setStepCableSpanMode,
		landingCableSpanMode,
		setLandingCableSpanMode,
	} = props;

	const selectedCable = railing === 'cable' ? (cableOptions.find(o => o.id === cableId) ?? cableOptions[0]) : null;

	return (
		<div className="p-3 relative">
			{/* תצוגה מקדימה כבלים – צד שמאל, טיפה לכיוון המרכז; ריחוף = הגדלה פי 3 */}
			{railing === 'cable' && selectedCable && (
				<div className="absolute top-3 end-3 me-10 z-10 overflow-visible">
					<div
						className="rounded-full border-2 border-[#1a1a2e]/20 bg-center bg-cover transition-transform duration-200 origin-center hover:scale-[3] cursor-pointer"
						style={{
							width: 64,
							height: 64,
							backgroundImage: selectedCable.image ? `url("${encodeURI(selectedCable.image)}")` : undefined,
							backgroundColor: selectedCable.color || '#e5e5e5',
						}}
					/>
				</div>
			)}
			<div className="flex items-center justify-center gap-2 mb-2 text-center">
				{([
					{ id: 'none', label: 'ללא' },
					{ id: 'glass', label: 'זכוכית' },
					{ id: 'metal', label: 'מתכת' },
					{ id: 'cable', label: 'כבלי נירוסטה' },
				] as const).map(opt => (
					<button
						key={opt.id}
						className={`px-4 py-2 text-base rounded-full border cursor-pointer transition-colors ${railing === opt.id ? 'bg-[#1a1a2e] text-white' : 'bg-white hover:bg-gray-100'}`}
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
								className={`w-[22px] h-[22px] rounded-full border-2 cursor-pointer transition-transform hover:scale-110 ${glassTone === sw.id ? 'ring-2 ring-[#1a1a2e]' : ''}`}
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
							className={`w-[22px] h-[22px] rounded-full border-2 cursor-pointer transition-transform hover:scale-110 ${railingMetalSolid === '#111111' ? 'ring-2 ring-[#1a1a2e]' : ''}`}
							style={{ backgroundColor: '#111111', borderColor: '#333' }}
						/>
						<button
							title="לבן"
							aria-label="לבן"
							onClick={() => { setRailingMetalSolid('#F5F5F5'); setRailingMetalId(null); }}
							className={`w-[22px] h-[22px] rounded-full border-2 cursor-pointer transition-transform hover:scale-110 ${railingMetalSolid === '#F5F5F5' ? 'ring-2 ring-[#1a1a2e]' : ''}`}
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
								className={`w-[22px] h-[22px] rounded-full border-2 bg-center bg-cover cursor-pointer transition-transform hover:scale-110 ${cableId === opt.id ? 'ring-2 ring-[#1a1a2e]' : ''}`}
								style={{ backgroundImage: opt.image ? `url("${encodeURI(opt.image)}")` : undefined, borderColor: '#ddd' }}
							/>
						))}
					</div>
				)}
			</div>

			{railing === 'cable' && (() => {
				// כבלים בלבד: בחירה לכל גרם – תקרה‑רצפה או תקרה‑מדרגה
				const flights: Array<{ segIndex: number; start: number; count: number }> = [];
				let cursor = 0;
				for (let i = 0; i < pathSegments.length; i++) {
					const seg = pathSegments[i];
					if (seg.kind === 'straight') {
						const count = Math.max(0, (seg as any).steps || 0);
						flights.push({ segIndex: i, start: cursor, count });
						cursor += count;
					}
				}
				const cols = Math.max(1, flights.length);

				const setFlightCableSpan = (f: { start: number; count: number }, value: 'floor' | 'tread') => {
					setStepCableSpanMode(prev => {
						const out = prev.slice(0, Math.max(prev.length, f.start + f.count));
						for (let i = f.start; i < f.start + f.count; i++) out[i] = value;
						return out;
					});
				};

				return (
					<>
						<div className="grid gap-3 mb-3" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
							{flights.map((f, idx) => {
								const firstVal = stepCableSpanMode[f.start];
								const isFloor = firstVal === 'floor';
								return (
									<div key={idx} className="border rounded-md p-2 text-center">
										<div className="text-sm text-gray-600 mb-1">גרם {idx + 1}</div>
										<div className="flex items-center justify-center gap-2 mb-2">
											<button
												className={`px-3 py-1 text-sm rounded-full border cursor-pointer transition-colors ${isFloor ? 'bg-[#1a1a2e] text-white' : 'bg-white hover:bg-gray-100'}`}
												onClick={() => setFlightCableSpan(f, 'floor')}
											>
												תקרה‑רצפה
											</button>
											<button
												className={`px-3 py-1 text-sm rounded-full border cursor-pointer transition-colors ${!isFloor ? 'bg-[#1a1a2e] text-white' : 'bg-white hover:bg-gray-100'}`}
												onClick={() => setFlightCableSpan(f, 'tread')}
											>
												תקרה‑מדרגה
											</button>
										</div>
									</div>
								);
							})}
						</div>

						{/* פודסטים ללא פנייה – תקרה‑רצפה או תקרה‑מדרגה */}
						{landingMeta.some(t => !t) && (
							<div className="flex items-center justify-center gap-2 flex-wrap">
								{landingMeta.map((turn, i) => {
									if (turn) return null;
									const val = landingCableSpanMode[i] ?? 'tread';
									return (
										<div key={i} className="border rounded-md p-2 text-center">
											<div className="text-sm text-gray-600 mb-1">פודסט {i + 1}</div>
											<div className="flex items-center justify-center gap-2 mb-2">
												<button
													className={`px-3 py-1 text-sm rounded-full border cursor-pointer transition-colors ${val === 'floor' ? 'bg-[#1a1a2e] text-white' : 'bg-white hover:bg-gray-100'}`}
													onClick={() => setLandingCableSpanMode(prev => prev.map((v, j) => j === i ? 'floor' : v))}
												>
													תקרה‑רצפה
												</button>
												<button
													className={`px-3 py-1 text-sm rounded-full border cursor-pointer transition-colors ${val === 'tread' ? 'bg-[#1a1a2e] text-white' : 'bg-white hover:bg-gray-100'}`}
													onClick={() => setLandingCableSpanMode(prev => prev.map((v, j) => j === i ? 'tread' : v))}
												>
													תקרה‑מדרגה
												</button>
											</div>
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

