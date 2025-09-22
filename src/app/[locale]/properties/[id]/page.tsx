import { prisma } from "@/lib/prisma";
import { getCurrentUserId, getFirstOrganizationIdForUser } from "@/lib/auth-helpers";
import { notFound } from "next/navigation";
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import PropertyTabs from "./PropertyTabs";
import AIMarketInsights from "./AIMarketInsights";
import PropertyFinancialOverview from "./PropertyFinancialOverview";

async function getProperty(propertyId: string, organizationId: string) {
	const property = await prisma.property.findFirst({
		where: { 
			id: propertyId,
			organizationId 
		},
		include: {
			tenants: true,
			incomes: {
				where: {
					date: {
						lte: new Date(), // Only show incomes up to current date
					},
				},
				orderBy: { date: "desc" },
				take: 10,
			},
			expenses: {
				where: {
					date: {
						lte: new Date(), // Only show expenses up to current date
					},
				},
				orderBy: { date: "desc" },
				take: 10,
			},
			utilityCosts: {
				orderBy: { year: "desc" },
			},
		},
	});

	return property;
}


export default async function PropertyPage({ params }: { params: Promise<{ id: string; locale: string }> }) {
	const { id, locale } = await params;
	const t = await getTranslations({ locale });
	const userId = await getCurrentUserId();
	if (!userId) return <div>{t('common.please')} <a href={`/${locale}/login`} className="underline">{t('navigation.login')}</a></div>;
	
	const organizationId = await getFirstOrganizationIdForUser(userId);
	if (!organizationId) return <div>{t('common.noOrganizationFound')}</div>;

	const property = await getProperty(id, organizationId);
	if (!property) notFound();

	return (
		<div className="p-6">
			<div className="mb-6">
				<div className="flex justify-between items-start mb-4">
					<div>
						<h1 className="text-2xl font-semibold">{property.address}</h1>
						<p className="text-gray-600">{property.city}, {property.postalCode}</p>
						{property.sizeSqm && (
							<p className="text-sm text-gray-500">{property.sizeSqm} m²</p>
						)}
					</div>
					<Link
						href={`/${locale}/properties/${property.id}/edit`}
						className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
					>
						<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
						</svg>
						{t('properties.editProperty')}
					</Link>
				</div>
			</div>

			{/* Financial Overview with Time Range Filter */}
			<PropertyFinancialOverview 
				propertyId={property.id}
				locale={locale}
			/>

			<PropertyTabs property={property} />
			
			<AIMarketInsights property={property} />
		</div>
	);
}
