'use client';

import React from 'react';
import LivePageInner from './LivePageInner';

export default function LivePage() {
	return (
		<LiveErrorBoundary>
			<React.Suspense fallback={null}>
				<LivePageInner />
			</React.Suspense>
		</LiveErrorBoundary>
	);
}

class LiveErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; message?: string }> {
	constructor(props: { children: React.ReactNode }) {
		super(props);
		this.state = { hasError: false, message: undefined };
	}
	static getDerivedStateFromError(error: any) {
		return { hasError: true, message: String(error?.message || error) };
	}
	componentDidCatch(error: any, info: any) {
		// לוג שימושי לבדיקת חריגות בפרודקשן
		try {
			// eslint-disable-next-line no-console
			console.error('LIVE error boundary:', error, info);
		} catch {}
	}
	render() {
		if (this.state.hasError) {
			return (
				<main dir="rtl" className="max-w-3xl mx-auto px-4 py-10">
					<h1 className="text-xl font-bold mb-2">אירעה שגיאה בהטענת ההדמייה</h1>
					<p className="text-gray-600 mb-4">נסה לרענן את הדף. אם הבעיה נמשכת, שלח לנו צילום מסך של הקונסול.</p>
					{this.state.message ? <pre className="text-sm bg-gray-50 border p-3 overflow-auto">{this.state.message}</pre> : null}
					<div className="mt-4">
						<button onClick={() => location.reload()} className="px-4 py-2 bg-black text-white">רענון</button>
					</div>
				</main>
			);
		}
		return this.props.children as any;
	}
}
