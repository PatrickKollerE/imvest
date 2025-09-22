"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations, useLocale } from 'next-intl';
import { useState, useEffect, useRef } from 'react';

export default function Navigation() {
	const { data: session, status } = useSession();
	const pathname = usePathname();
	const router = useRouter();
	const t = useTranslations();
	const locale = useLocale();
	const [showAccountMenu, setShowAccountMenu] = useState(false);
	const accountMenuRef = useRef<HTMLDivElement>(null);
	
	// Extract locale from pathname (more reliable than useLocale() hook)
	const currentLocale = pathname.split('/')[1] || locale || 'de';

	// Close account menu when clicking outside
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (accountMenuRef.current && !accountMenuRef.current.contains(event.target as Node)) {
				setShowAccountMenu(false);
			}
		};

		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, []);

	const switchLanguage = (newLocale: string) => {
		const segments = pathname.split('/');
		segments[1] = newLocale;
		router.push(segments.join('/'));
	};


	if (status === "loading") {
		return (
			<nav className="bg-white border-b">
				<div className="flex h-16">
					<div className="px-4 sm:px-6 lg:px-8 flex items-center">
						<div className="h-6 w-16 bg-gray-200 rounded animate-pulse"></div>
					</div>
					<div className="flex-1 flex justify-between items-center max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
						<div className="hidden md:flex space-x-8">
							<div className="h-6 w-20 bg-gray-200 rounded animate-pulse"></div>
							<div className="h-6 w-16 bg-gray-200 rounded animate-pulse"></div>
							<div className="h-6 w-20 bg-gray-200 rounded animate-pulse"></div>
						</div>
						<div className="flex items-center space-x-4">
							<div className="flex items-center space-x-2">
								<div className="h-6 w-8 bg-gray-200 rounded animate-pulse"></div>
								<div className="h-6 w-8 bg-gray-200 rounded animate-pulse"></div>
							</div>
							<div className="h-6 w-16 bg-gray-200 rounded animate-pulse"></div>
						</div>
					</div>
				</div>
			</nav>
		);
	}

	if (!session) {
		return (
			<nav className="bg-white border-b">
				<div className="flex h-16">
					<Link href={`/${locale}`} className="text-xl font-bold text-gray-900 px-4 sm:px-6 lg:px-8 flex items-center">
						Imvest
					</Link>
					<div className="flex-1 flex justify-end items-center px-4 sm:px-6 lg:px-8">
						<div className="flex items-center space-x-4">
							<div className="flex items-center space-x-2">
								<button
									onClick={() => switchLanguage('en')}
									className={`px-2 py-1 text-sm rounded ${currentLocale === 'en' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
								>
									EN
								</button>
								<button
									onClick={() => switchLanguage('de')}
									className={`px-2 py-1 text-sm rounded ${currentLocale === 'de' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
								>
									DE
								</button>
							</div>
							<Link
								href={`/${currentLocale}/login`}
								className="text-gray-500 hover:text-gray-700"
							>
								{t('navigation.login')}
							</Link>
							<Link
								href={`/${currentLocale}/register`}
								className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
							>
								{t('navigation.register')}
							</Link>
						</div>
					</div>
				</div>
			</nav>
		);
	}

	return (
		<nav className="bg-white border-b">
			<div className="flex h-16">
			<Link href={`/${currentLocale}`} className="text-xl font-bold text-gray-900 px-4 sm:px-6 lg:px-8 flex items-center">
				Imvest
			</Link>
			<div className="flex-1 flex justify-between items-center max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="hidden md:flex space-x-8">
					<Link
						href={`/${currentLocale}`}
						className={`px-3 py-2 rounded-md text-sm font-medium ${
							pathname === `/${currentLocale}` || pathname.endsWith(`/${currentLocale}`)
								? "bg-gray-100 text-gray-900"
								: "text-gray-500 hover:text-gray-700"
						}`}
					>
						{t('navigation.dashboard')}
					</Link>
					<Link
						href={`/${currentLocale}/evaluate`}
							className={`px-3 py-2 rounded-md text-sm font-medium ${
								pathname.includes("/evaluate")
									? "bg-gray-100 text-gray-900"
									: "text-gray-500 hover:text-gray-700"
							}`}
						>
							{t('navigation.evaluate')}
						</Link>
					<Link
						href={`/${currentLocale}/properties`}
						className={`px-3 py-2 rounded-md text-sm font-medium ${
							pathname.includes("/properties")
								? "bg-gray-100 text-gray-900"
								: "text-gray-500 hover:text-gray-700"
						}`}
					>
						{t('navigation.properties')}
					</Link>
					</div>
					<div className="flex items-center space-x-4">
						<div className="flex items-center space-x-2">
							<button
								onClick={() => switchLanguage('en')}
								className={`px-2 py-1 text-sm rounded ${currentLocale === 'en' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
							>
								EN
							</button>
							<button
								onClick={() => switchLanguage('de')}
								className={`px-2 py-1 text-sm rounded ${currentLocale === 'de' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
							>
								DE
							</button>
						</div>
						
						{/* User Account Menu */}
						<div className="relative" ref={accountMenuRef}>
							<button
								onClick={() => setShowAccountMenu(!showAccountMenu)}
								className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 focus:outline-none"
							>
								<span className="text-sm font-medium">
									{session.user?.firstName || session.user?.name || session.user?.email}
								</span>
								<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
									<path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
								</svg>
							</button>
							
							{/* Dropdown Menu */}
							{showAccountMenu && (
								<div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
									<Link
										href={`/${currentLocale}/account`}
										className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
										onClick={() => setShowAccountMenu(false)}
									>
										{t('navigation.editAccount')}
									</Link>
									<button
										onClick={() => {
											setShowAccountMenu(false);
											signOut();
										}}
										className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
									>
										{t('navigation.signOut')}
									</button>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</nav>
	);
}