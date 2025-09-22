"use client";

import { useState } from "react";
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

type Property = {
	id: string;
	address: string;
	city: string | null;
	postalCode: string | null;
	sizeSqm: number | null;
	purchasePriceCents: number | null;
	marketValueCents: number | null;
	equityCents: number | null;
	loanPrincipalCents: number | null;
	interestRatePct: number | null;
	amortizationRatePct: number | null;
	buyDate: Date | null;
};

type EditPropertyFormProps = {
	property: Property;
	locale: string;
};

export default function EditPropertyForm({ property, locale }: EditPropertyFormProps) {
	const [formData, setFormData] = useState({
		address: property.address || '',
		city: property.city || '',
		postalCode: property.postalCode || '',
		sizeSqm: property.sizeSqm?.toString() || '',
		purchasePrice: property.purchasePriceCents ? (property.purchasePriceCents / 100).toString() : '',
		marketValue: property.marketValueCents ? (property.marketValueCents / 100).toString() : '',
		equity: property.equityCents ? (property.equityCents / 100).toString() : '',
		loanPrincipal: property.loanPrincipalCents ? (property.loanPrincipalCents / 100).toString() : '',
		interestRate: property.interestRatePct?.toString() || '',
		amortizationRate: property.amortizationRatePct?.toString() || '',
		buyDate: property.buyDate ? new Date(property.buyDate).toISOString().split('T')[0] : '',
	});
	const [isLoading, setIsLoading] = useState(false);
	const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
	const [validationErrors, setValidationErrors] = useState<string[]>([]);
	
	const t = useTranslations();
	const router = useRouter();

	// Validation function to check required fields
	function validatePropertyForm(data: typeof formData): string[] {
		const errors: string[] = [];
		
		// Required fields validation
		if (!data.address || data.address.trim() === '') {
			errors.push(t('validation.addressRequired'));
		}
		if (!data.city || data.city.trim() === '') {
			errors.push(t('validation.cityRequired'));
		}
		if (!data.postalCode || data.postalCode.trim() === '') {
			errors.push(t('validation.postalCodeRequired'));
		}
		
		// Financial validation - at least one financial field should be provided
		const purchasePrice = data.purchasePrice;
		const marketValue = data.marketValue;
		const equity = data.equity;
		const loanPrincipal = data.loanPrincipal;
		
		if (!purchasePrice && !marketValue && !equity && !loanPrincipal) {
			errors.push(t('validation.financialInfoRequired'));
		}
		
		// Loan validation - if loan fields are provided, they should be complete
		const interestRate = data.interestRate;
		const amortizationRate = data.amortizationRate;
		
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

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setIsLoading(true);
		setMessage(null);
		setValidationErrors([]);

		// Validate form data
		const validationErrors = validatePropertyForm(formData);
		if (validationErrors.length > 0) {
			setValidationErrors(validationErrors);
			setIsLoading(false);
			return;
		}

		try {
			const response = await fetch(`/api/properties/${property.id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					address: formData.address,
					city: formData.city,
					postalCode: formData.postalCode,
					sizeSqm: formData.sizeSqm ? Number(formData.sizeSqm) : null,
					purchasePriceCents: formData.purchasePrice ? Number(formData.purchasePrice) * 100 : null,
					marketValueCents: formData.marketValue ? Number(formData.marketValue) * 100 : null,
					equityCents: formData.equity ? Number(formData.equity) * 100 : null,
					loanPrincipalCents: formData.loanPrincipal ? Number(formData.loanPrincipal) * 100 : null,
					interestRatePct: formData.interestRate ? Number(formData.interestRate) : null,
					amortizationRatePct: formData.amortizationRate ? Number(formData.amortizationRate) : null,
					buyDate: formData.buyDate || null,
				}),
			});

			const data = await response.json();

			if (response.ok) {
				setMessage({ type: 'success', text: t('properties.propertyUpdated') });
				// Redirect back to property details after successful update
				setTimeout(() => {
					router.push(`/${locale}/properties/${property.id}`);
				}, 1500);
			} else {
				setMessage({ type: 'error', text: data.error || t('properties.errorUpdatingProperty') });
			}
		} catch {
			setMessage({ type: 'error', text: t('properties.errorUpdatingProperty') });
		} finally {
			setIsLoading(false);
		}
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setFormData(prev => ({
			...prev,
			[name]: value
		}));
	};

	return (
		<div className="max-w-2xl">
			<form onSubmit={handleSubmit} className="space-y-6">
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
				
				{message && (
					<div className={`p-4 rounded ${
						message.type === 'success' 
							? 'bg-green-50 text-green-800 border border-green-200' 
							: 'bg-red-50 text-red-800 border border-red-200'
					}`}>
						{message.text}
					</div>
				)}

				<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
					<div>
						<label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
							{t('properties.address')}
						</label>
						<input
							type="text"
							id="address"
							name="address"
							value={formData.address}
							onChange={handleInputChange}
							required
							className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>

					<div>
						<label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
							{t('properties.city')}
						</label>
						<input
							type="text"
							id="city"
							name="city"
							value={formData.city}
							onChange={handleInputChange}
							required
							className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>

					<div>
						<label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-1">
							{t('properties.postalCode')}
						</label>
						<input
							type="text"
							id="postalCode"
							name="postalCode"
							value={formData.postalCode}
							onChange={handleInputChange}
							required
							className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>

					<div>
						<label htmlFor="sizeSqm" className="block text-sm font-medium text-gray-700 mb-1">
							{t('properties.size')}
						</label>
						<input
							type="number"
							id="sizeSqm"
							name="sizeSqm"
							value={formData.sizeSqm}
							onChange={handleInputChange}
							min="0"
							step="0.1"
							className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>

					<div>
						<label htmlFor="buyDate" className="block text-sm font-medium text-gray-700 mb-1">
							{t('properties.buyDate')}
						</label>
						<input
							type="date"
							id="buyDate"
							name="buyDate"
							value={formData.buyDate}
							onChange={handleInputChange}
							className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
						<p className="text-xs text-gray-500 mt-1">{t('properties.buyDateHelp')}</p>
					</div>

					<div>
						<label htmlFor="purchasePrice" className="block text-sm font-medium text-gray-700 mb-1">
							{t('properties.purchasePrice')}
						</label>
						<input
							type="number"
							id="purchasePrice"
							name="purchasePrice"
							value={formData.purchasePrice}
							onChange={handleInputChange}
							min="0"
							step="0.01"
							className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>

					<div>
						<label htmlFor="marketValue" className="block text-sm font-medium text-gray-700 mb-1">
							{t('properties.marketValue')}
						</label>
						<input
							type="number"
							id="marketValue"
							name="marketValue"
							value={formData.marketValue}
							onChange={handleInputChange}
							min="0"
							step="0.01"
							className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>

					<div>
						<label htmlFor="equity" className="block text-sm font-medium text-gray-700 mb-1">
							{t('properties.equity')}
						</label>
						<input
							type="number"
							id="equity"
							name="equity"
							value={formData.equity}
							onChange={handleInputChange}
							min="0"
							step="0.01"
							className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>

					<div>
						<label htmlFor="loanPrincipal" className="block text-sm font-medium text-gray-700 mb-1">
							{t('properties.loanPrincipal')}
						</label>
						<input
							type="number"
							id="loanPrincipal"
							name="loanPrincipal"
							value={formData.loanPrincipal}
							onChange={handleInputChange}
							min="0"
							step="0.01"
							className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>

					<div>
						<label htmlFor="interestRate" className="block text-sm font-medium text-gray-700 mb-1">
							{t('properties.interestRate')}
						</label>
						<input
							type="number"
							id="interestRate"
							name="interestRate"
							value={formData.interestRate}
							onChange={handleInputChange}
							min="0"
							max="100"
							step="0.01"
							className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>

					<div>
						<label htmlFor="amortizationRate" className="block text-sm font-medium text-gray-700 mb-1">
							{t('properties.amortizationRate')}
						</label>
						<input
							type="number"
							id="amortizationRate"
							name="amortizationRate"
							value={formData.amortizationRate}
							onChange={handleInputChange}
							min="0"
							max="100"
							step="0.01"
							className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>
				</div>

				<div className="flex gap-4 pt-4">
					<button
						type="submit"
						disabled={isLoading}
						className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isLoading ? t('common.loading') : t('common.save')}
					</button>
					<button
						type="button"
						onClick={() => router.push(`/${locale}/properties/${property.id}`)}
						className="bg-gray-500 text-white px-6 py-2 rounded-md hover:bg-gray-600"
					>
						{t('common.cancel')}
					</button>
				</div>
			</form>
		</div>
	);
}
