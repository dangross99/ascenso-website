import React from 'react';

type WoodModel = { id: string; name?: string; images: string[] };

const PREVIEW_SIZE = 520; // 52px × 10

export function WoodTexturePicker(props: {
	woodModels: WoodModel[];
	activeModelId: string | null;
	onPick: (id: string) => void;
}) {
	const { woodModels, activeModelId, onPick } = props;
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
			<div className="flex flex-wrap justify-center gap-4 text-center">
				{woodModels.map(m => (
					<div key={m.id} className="flex flex-col items-center w-16">
						<button
							aria-label={m.name || m.id}
							title={`${m.name || m.id} – לחץ לבחירה`}
							onClick={() => onPick(m.id)}
							onMouseEnter={() => { clearCloseTimeout(); setHoverPreview({
								image: m.images?.[0],
								backgroundColor: m.images?.[0] ? undefined : '#e5e5e5',
								pickId: m.id,
							}); }}
							onMouseLeave={() => {
								closeTimeoutRef.current = setTimeout(() => setHoverPreview(null), 220);
							}}
							className={`w-[52px] h-[52px] rounded-full border-2 bg-center bg-cover cursor-pointer ${activeModelId === m.id ? 'ring-2 ring-[#1a1a2e]' : ''}`}
							style={{ backgroundImage: m.images?.[0] ? `url("${encodeURI(m.images[0])}")` : undefined, borderColor: '#ddd' }}
						/>
						<span className="mt-1 text-[11px] text-gray-600 truncate w-16">{m.name || m.id}</span>
					</div>
				))}
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
