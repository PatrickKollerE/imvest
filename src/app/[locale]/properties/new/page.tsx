"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from 'next-intl';

export default function NewPropertyPage({ params }: { params: Promise<{ locale: string }> }) {
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [validationErrors, setValidationErrors] = useState<string[]>([]);
	const [locale, setLocale] = useState<string>('en');
	const t = useTranslations();
	
	useEffect(() => {
		params.then(({ locale }) => setLocale(locale));
	}, [params]);

	// Validation function to check required fields
	function validatePropertyForm(formData: FormData): string[] {
		const errors: string[] = [];
		
		// Required fields validation
		if (!formData.get("address") || (formData.get("address") as string).trim() === '') {
			errors.push(t('validation.addressRequired'));
		}
		if (!formData.get("city") || (formData.get("city") as string).trim() === '') {
			errors.push(t('validation.cityRequired'));
		}
		if (!formData.get("postalCode") || (formData.get("postalCode") as string).trim() === '') {
			errors.push(t('validation.postalCodeRequired'));
		}
		
		// Financial validation - at least one financial field should be provided
		const purchasePrice = formData.get("purchasePrice");
		const marketValue = formData.get("marketValue");
		const equity = formData.get("equity");
		const loanPrincipal = formData.get("loanPrincipal");
		
		if (!purchasePrice && !marketValue && !equity && !loanPrincipal) {
			errors.push(t('validation.financialInfoRequired'));
		}
		
		// Loan validation - if loan fields are provided, they should be complete
		const interestRate = formData.get("interestRate");
		const amortizationRate = formData.get("amortizationRate");
		
		if ((loanPrincipal && loanPrincipal !== '') || (interestRate && interestRate !== '') || (amortizationRate && amortizationRate !== '')) {
			if (!loanPrincipal || loanPrincipal === '') {
				errors.push(t('validation.loanPrincipalRequired'));
			}
			if (!interestRate || interestRate === '') {
				errors.push(t('validation.interestRateRequired'));
			}
			if (!amortizationRate || amortizationRate === '') {
				errors.push(t('validation.amortizationRateRequired'));
			}
		}
		
		return errors;
	}

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError(null);
		setValidationErrors([]);
		setLoading(true);

		const formData = new FormData(e.currentTarget);
		
		// Validate form data
		const validationErrors = validatePropertyForm(formData);
		if (validationErrors.length > 0) {
			setValidationErrors(validationErrors);
			setLoading(false);
			return;
		}
		const data = {
			address: formData.get("address"),
			city: formData.get("city"),
			postalCode: formData.get("postalCode"),
			sizeSqm: formData.get("sizeSqm") ? Number(formData.get("sizeSqm")) : null,
			purchasePriceCents: formData.get("purchasePrice") ? Number(formData.get("purchasePrice")) * 100 : null,
			marketValueCents: formData.get("marketValue") ? Number(formData.get("marketValue")) * 100 : null,
			equityCents: formData.get("equity") ? Number(formData.get("equity")) * 100 : null,
			loanPrincipalCents: formData.get("loanPrincipal") ? Number(formData.get("loanPrincipal")) * 100 : null,
			interestRatePct: formData.get("interestRate") ? Number(formData.get("interestRate")) : null,
			amortizationRatePct: formData.get("amortizationRate") ? Number(formData.get("amortizationRate")) : null,
			buyDate: formData.get("buyDate") || null,
		};

		try {
			const res = await fetch("/api/properties", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});

			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.error || "Failed to create property");
			}

			const property = await res.json();
			router.push(`/${locale}/properties/${property.id}`);
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred");
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="p-6 max-w-2xl mx-auto">
			<div className="mb-6">
				<h1 className="text-2xl font-semibold">{t('properties.addProperty')}</h1>
				<p className="text-gray-600">{t('properties.propertyDetails')}</p>
			</div>

			<form onSubmit={handleSubmit} className="space-y-6">
				<div className="border rounded-lg p-6">
					<h3 className="text-lg font-medium mb-4">{t('properties.propertyDetails')}</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="md:col-span-2">
							<label className="block text-sm font-medium mb-1">{t('properties.address')} *</label>
							<input
								name="address"
								type="text"
								required
								className="w-full border rounded px-3 py-2"
								placeholder="123 Main Street"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium mb-1">{t('properties.city')} *</label>
							<input
								name="city"
								type="text"
								required
								className="w-full border rounded px-3 py-2"
								placeholder="Zurich"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium mb-1">{t('properties.postalCode')} *</label>
							<input
								name="postalCode"
								type="text"
								required
								className="w-full border rounded px-3 py-2"
								placeholder="8001"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium mb-1">{t('properties.size')}</label>
							<input
								name="sizeSqm"
								type="number"
								className="w-full border rounded px-3 py-2"
								placeholder="80"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium mb-1">{t('properties.buyDate')}</label>
							<input
								name="buyDate"
								type="date"
								className="w-full border rounded px-3 py-2"
							/>
							<p className="text-xs text-gray-500 mt-1">{t('properties.buyDateHelp')}</p>
						</div>
					</div>
				</div>

				<div className="border rounded-lg p-6">
					<h3 className="text-lg font-medium mb-4">{t('properties.financialSummary')}</h3>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<label className="block text-sm font-medium mb-1">{t('properties.purchasePrice')} (CHF)</label>
							<input
								name="purchasePrice"
								type="number"
								step="0.01"
								className="w-full border rounded px-3 py-2"
								placeholder="250000"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium mb-1">{t('properties.marketValue')} (CHF)</label>
							<input
								name="marketValue"
								type="number"
								step="0.01"
								className="w-full border rounded px-3 py-2"
								placeholder="280000"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium mb-1">{t('properties.equity')} (CHF)</label>
							<input
								name="equity"
								type="number"
								step="0.01"
								className="w-full border rounded px-3 py-2"
								placeholder="50000"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium mb-1">{t('properties.loanPrincipal')} (CHF)</label>
							<input
								name="loanPrincipal"
								type="number"
								step="0.01"
								className="w-full border rounded px-3 py-2"
								placeholder="200000"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium mb-1">{t('properties.interestRate')}</label>
							<input
								name="interestRate"
								type="number"
								step="0.01"
								className="w-full border rounded px-3 py-2"
								placeholder="3.5"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium mb-1">{t('properties.amortizationRate')}</label>
							<input
								name="amortizationRate"
								type="number"
								step="0.01"
								className="w-full border rounded px-3 py-2"
								placeholder="2.0"
							/>
						</div>
					</div>
				</div>

				<div className="flex gap-4">
					<button
						type="submit"
						disabled={loading}
						className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
					>
						{loading ? t('common.loading') : t('properties.addProperty')}
					</button>
					<button
						type="button"
						onClick={() => router.back()}
						className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600"
					>
						{t('common.cancel')}
					</button>
				</div>

				{validationErrors.length > 0 && (
					<div className="bg-red-50 border border-red-200 rounded p-4">
						<h4 className="text-red-800 font-medium mb-2">{t('validation.title')}</h4>
						<ul className="list-disc list-inside text-red-600 space-y-1">
							{validationErrors.map((error, index) => (
								<li key={index}>{error}</li>
							))}
						</ul>
					</div>
				)}
				
				{error && (
					<div className="bg-red-50 border border-red-200 rounded p-4">
						<p className="text-red-600">{error}</p>
					</div>
				)}
			</form>
		</div>
	);
}
