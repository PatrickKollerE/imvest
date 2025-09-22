"use client";

import { useSession } from "next-auth/react";
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AccountPage() {
	const { data: session, status, update } = useSession();
	const t = useTranslations();
	const router = useRouter();
	const [isLoading, setIsLoading] = useState(false);
	const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

	// Form states
	const [email, setEmail] = useState(session?.user?.email || '');
	const [firstName, setFirstName] = useState(session?.user?.firstName || '');
	const [lastName, setLastName] = useState(session?.user?.lastName || '');
	const [currentPassword, setCurrentPassword] = useState('');
	const [newPassword, setNewPassword] = useState('');
	const [confirmPassword, setConfirmPassword] = useState('');

	if (status === 'loading') {
		return (
			<div className="min-h-screen bg-gray-50 flex items-center justify-center">
				<div className="text-center">
					<div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
					<p className="mt-4 text-gray-600">{t('common.loading')}</p>
				</div>
			</div>
		);
	}

	if (!session) {
		router.push('/login');
		return null;
	}

	const handleUpdateAccount = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsLoading(true);
		setMessage(null);

		try {
			const response = await fetch('/api/account', {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					email,
					firstName,
					lastName,
					currentPassword,
					newPassword: newPassword || undefined,
					confirmPassword: confirmPassword || undefined,
				}),
			});

			const data = await response.json();

			if (response.ok) {
				setMessage({ type: 'success', text: t('account.accountUpdated') });
				setCurrentPassword('');
				setNewPassword('');
				setConfirmPassword('');
				// Refresh the session to update the navigation
				await update();
			} else {
				setMessage({ type: 'error', text: data.error || t('account.errorUpdatingAccount') });
			}
		} catch {
			setMessage({ type: 'error', text: t('account.errorUpdatingAccount') });
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-gray-50 py-8">
			<div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="bg-white shadow rounded-lg">
					<div className="px-4 py-5 sm:p-6">
						<h1 className="text-2xl font-bold text-gray-900 mb-6">
							{t('account.title')}
						</h1>

						{message && (
							<div className={`mb-4 p-4 rounded-md ${
								message.type === 'success' 
									? 'bg-green-50 text-green-800 border border-green-200' 
									: 'bg-red-50 text-red-800 border border-red-200'
							}`}>
								{message.text}
							</div>
						)}

						<form onSubmit={handleUpdateAccount} className="space-y-6">
							{/* Personal Information Section */}
							<div>
								<h2 className="text-lg font-medium text-gray-900 mb-4">
									{t('account.personalInformation')}
								</h2>
								
								<div className="space-y-4">
									<div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
										<div>
											<label htmlFor="firstName" className="block text-sm font-medium text-gray-700">
												{t('account.firstName')}
											</label>
											<input
												type="text"
												id="firstName"
												value={firstName}
												onChange={(e) => setFirstName(e.target.value)}
												className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border"
											/>
										</div>
										<div>
											<label htmlFor="lastName" className="block text-sm font-medium text-gray-700">
												{t('account.lastName')}
											</label>
											<input
												type="text"
												id="lastName"
												value={lastName}
												onChange={(e) => setLastName(e.target.value)}
												className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border"
											/>
										</div>
									</div>
									<div>
										<label htmlFor="email" className="block text-sm font-medium text-gray-700">
											{t('auth.email')}
										</label>
										<input
											type="email"
											id="email"
											value={email}
											onChange={(e) => setEmail(e.target.value)}
											className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border"
											required
										/>
									</div>
								</div>
							</div>

							{/* Change Password Section */}
							<div>
								<h2 className="text-lg font-medium text-gray-900 mb-4">
									{t('account.changePassword')}
								</h2>
								
								<div className="space-y-4">
									<div>
										<label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
											{t('account.currentPassword')}
										</label>
										<input
											type="password"
											id="currentPassword"
											value={currentPassword}
											onChange={(e) => setCurrentPassword(e.target.value)}
											className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border"
										/>
									</div>

									<div>
										<label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
											{t('account.newPassword')}
										</label>
										<input
											type="password"
											id="newPassword"
											value={newPassword}
											onChange={(e) => setNewPassword(e.target.value)}
											className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border"
										/>
									</div>

									<div>
										<label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
											{t('account.confirmNewPassword')}
										</label>
										<input
											type="password"
											id="confirmPassword"
											value={confirmPassword}
											onChange={(e) => setConfirmPassword(e.target.value)}
											className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm px-3 py-2 border"
										/>
									</div>
								</div>
							</div>

							{/* Submit Button */}
							<div className="flex justify-end">
								<button
									type="submit"
									disabled={isLoading}
									className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
								>
									{isLoading ? t('common.loading') : t('account.updateAccount')}
								</button>
							</div>
						</form>
					</div>
				</div>
			</div>
		</div>
	);
}
