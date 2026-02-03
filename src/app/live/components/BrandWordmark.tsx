import React from 'react';

export function BrandWordmark({ size = 'md' as 'sm' | 'md' | 'lg', color = '#1a1a2e' }: { size?: 'sm' | 'md' | 'lg'; color?: string }) {
	const sizeClass =
		size === 'lg'
			? 'text-[34px] md:text-[44px]'
			: size === 'sm'
			? 'text-[18px] md:text-[22px]'
			: 'text-[24px] md:text-[32px]';
	return (
		<span className={`${sizeClass} font-serif font-prosto font-semibold tracking-widest uppercase select-none`} style={{ color }}>
			ASCEN
			<span style={{ fontWeight: 170 }}>S</span>
			<span style={{ fontWeight: 170 }}>O</span>
		</span>
	);
}
