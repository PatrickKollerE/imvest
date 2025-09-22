"use client";
import { useState, useEffect } from "react";
import { useTranslations } from 'next-intl';

export default function RegisterPage({ params }: { params: Promise<{ locale: string }> }) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const t = useTranslations();
	const [locale, setLocale] = useState<string>('en');
	
	useEffect(() => {
		params.then(({ locale }) => setLocale(locale));
	}, [params]);

	async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError(null);
		setLoading(true);
		const form = e.currentTarget;
		const formData = new FormData(form);
		const res = await fetch("/api/register", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				firstName: formData.get("firstName"),
				lastName: formData.get("lastName"),
				email: formData.get("email"),
				password: formData.get("password"),
				organizationName: formData.get("organizationName") || undefined,
			}),
		});
		setLoading(false);
		if (!res.ok) {
			const data = await res.json().catch(() => ({}));
			setError(data.error || "Registration failed");
			return;
		}
		window.location.href = `/${locale}/login`;
	}

	return (
		<div className="min-h-screen flex items-center justify-center p-4">
			<form className="w-full max-w-sm space-y-4 border rounded-lg p-6" onSubmit={onSubmit}>
				<h1 className="text-xl font-semibold">{t('auth.signUp')}</h1>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
					<div className="space-y-2">
						<label className="block text-sm">{t('account.firstName')}</label>
						<input name="firstName" type="text" className="w-full border rounded px-3 py-2" />
					</div>
					<div className="space-y-2">
						<label className="block text-sm">{t('account.lastName')}</label>
						<input name="lastName" type="text" className="w-full border rounded px-3 py-2" />
					</div>
				</div>
				<div className="space-y-2">
					<label className="block text-sm">{t('common.organization')}</label>
					<input name="organizationName" type="text" placeholder="My Portfolio" className="w-full border rounded px-3 py-2" />
				</div>
				<div className="space-y-2">
					<label className="block text-sm">{t('auth.email')}</label>
					<input name="email" type="email" required className="w-full border rounded px-3 py-2" />
				</div>
				<div className="space-y-2">
					<label className="block text-sm">{t('auth.password')}</label>
					<input name="password" type="password" required className="w-full border rounded px-3 py-2" />
				</div>
				<button disabled={loading} type="submit" className="w-full bg-black text-white rounded py-2">
					{loading ? t('common.loading') : t('auth.signUp')}
				</button>
				{error && <p className="text-red-600 text-sm">{error}</p>}
			</form>
		</div>
	);
}
