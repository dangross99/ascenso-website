import React from 'react';

type Swatch = { id: string; label: string };

type ActiveModelLike = {
	variants?: Record<string, string[]>;
};

const PREVIEW_SIZE = 520; // 52px × 10

export function WoodColorPicker(props: {
	swatches: Swatch[];
	activeModel: ActiveModelLike | null;
	activeColor: string;
	colorHex: Record<string, string>;
	onPick: (id: string) => void;
}) {
	const { swatches, activeModel, activeColor, colorHex, onPick } = props;
	const items = swatches.filter(sw => !!activeModel?.variants?.[sw.id]);
	const [hoverPreview, setHoverPreview] = React.useState<{ image?: string; backgroundColor?: string; pickId: string } | null>(null);
	const closeTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
	const clearCloseTimeout = () => {
		if (closeTimeoutRef.current) {
			clearTimeout(closeTimeoutRef.current);
			closeTimeoutRef.current = null;
		}
	};
	return (
		<div className="p-2 pt-1">
			<div className="flex items-center justify-center gap-4 flex-wrap text-center">
				{items.map(sw => {
					const img = activeModel?.variants?.[sw.id]?.[0];
					const solid = colorHex[sw.id];
					return (
						<div key={sw.id} className="flex flex-col items-center w-16">
							<button
								aria-label={sw.label}
								title={`${sw.label} – לחץ לבחירה`}
								onClick={() => onPick(sw.id)}
								onMouseEnter={() => { clearCloseTimeout(); setHoverPreview({
									image: img,
									backgroundColor: img ? undefined : solid,
									pickId: sw.id,
								}); }}
								onMouseLeave={() => {
									closeTimeoutRef.current = setTimeout(() => setHoverPreview(null), 220);
								}}
								className={`w-[52px] h-[52px] rounded-full border-2 cursor-pointer ${activeColor === sw.id ? 'ring-2 ring-[#1a1a2e]' : ''}`}
								style={{
									backgroundImage: img ? `url("${encodeURI(img)}")` : undefined,
									backgroundColor: img ? undefined : solid,
									backgroundSize: 'cover',
									backgroundPosition: 'center',
									borderColor: '#ddd',
								}}
							/>
							<span className="mt-1 text-[11px] text-gray-600 truncate w-16">{sw.label}</span>
						</div>
					);
				})}
			</div>
			{hoverPreview && (
				<div
					className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-3 bg-black/40 cursor-pointer"
					onMouseEnter={clearCloseTimeout}
					onMouseLeave={() => { clearCloseTimeout(); setHoverPreview(null); }}
					onClick={() => { if (hoverPreview.pickId) { onPick(hoverPreview.pickId); setHoverPreview(null); } }}
					aria-hidden
				>
					<div
						className="rounded-full border-4 border-white shadow-2xl bg-center bg-cover ring-2 ring-[#1a1a2e]/30"
						style={{
							width: PREVIEW_SIZE,
							height: PREVIEW_SIZE,
							backgroundImage: hoverPreview.image ? `url("${encodeURI(hoverPreview.image)}")` : undefined,
							backgroundColor: hoverPreview.backgroundColor,
						}}
					/>
					<span className="text-sm font-medium text-white drop-shadow-md bg-black/30 px-3 py-1.5 rounded-full">לחץ לבחירה</span>
				</div>
			)}
		</div>
	);
}
