import { prisma } from "@/lib/prisma";
import { getCurrentUserId, getFirstOrganizationIdForUser } from "@/lib/auth-helpers";
import { notFound } from "next/navigation";
import { getTranslations } from 'next-intl/server';
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
				orderBy: { date: "desc" },
				take: 10,
			},
			expenses: {
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
				<h1 className="text-2xl font-semibold">{property.address}</h1>
				<p className="text-gray-600">{property.city}, {property.postalCode}</p>
				{property.sizeSqm && (
					<p className="text-sm text-gray-500">{property.sizeSqm} m²</p>
				)}
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
