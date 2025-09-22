"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

type LoginFormProps = {
	locale: string;
	translations: {
		signIn: string;
		email: string;
		password: string;
		loading: string;
		loginError: string;
		dontHaveAccount: string;
		signUp: string;
	};
};

export default function LoginForm({ locale, translations }: LoginFormProps) {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError(null);
		setLoading(true);
		const fd = new FormData(e.currentTarget);
		const email = String(fd.get("email") || "");
		const password = String(fd.get("password") || "");
		const res = await signIn("credentials", { redirect: false, email, password });
		setLoading(false);
		if (res?.error) {
			setError(translations.loginError);
			return;
		}
		window.location.href = `/${locale}`;
	}

	return (
		<form className="w-full max-w-sm space-y-4 border rounded-lg p-6" onSubmit={onSubmit}>
			<h1 className="text-xl font-semibold">{translations.signIn}</h1>
			<div className="space-y-2">
				<label className="block text-sm">{translations.email}</label>
				<input name="email" type="email" required className="w-full border rounded px-3 py-2" />
			</div>
			<div className="space-y-2">
				<label className="block text-sm">{translations.password}</label>
				<input name="password" type="password" required className="w-full border rounded px-3 py-2" />
			</div>
			<button disabled={loading} type="submit" className="w-full bg-black text-white rounded py-2">
				{loading ? translations.loading : translations.signIn}
			</button>
			{error && <p className="text-sm text-red-600">{error}</p>}
			<p className="text-sm text-center">
				{translations.dontHaveAccount} <a className="underline" href={`/${locale}/register`}>{translations.signUp}</a>
			</p>
		</form>
	);
}
