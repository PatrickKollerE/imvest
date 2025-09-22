import { prisma } from "@/lib/prisma";
import { getCurrentUserId, getFirstOrganizationIdForUser } from "@/lib/auth-helpers";
import { formatCurrency } from "@/lib/currency";
import { getTranslations } from 'next-intl/server';
import Link from "next/link";
import PropertyCard from "@/components/PropertyCard";

async function getProperties(organizationId: string) {
	return await prisma.property.findMany({
		where: { organizationId },
		include: {
			tenants: true,
		},
		orderBy: { createdAt: "desc" },
	});
}

export default async function PropertiesPage({ params }: { params: Promise<{ locale: string }> }) {
	const { locale } = await params;
	const t = await getTranslations({ locale });
	const userId = await getCurrentUserId();
	if (!userId) return <div>{t('common.please')} <Link href={`/${locale}/login`} className="underline">{t('navigation.login')}</Link></div>;
	
	const organizationId = await getFirstOrganizationIdForUser(userId);
	if (!organizationId) return <div>{t('common.noOrganizationFound')}</div>;

	const properties = await getProperties(organizationId);

	return (
		<div className="p-6">
			<div className="flex justify-between items-center mb-6">
				<h1 className="text-2xl font-semibold">{t('properties.title')}</h1>
				<Link 
					href={`/${locale}/properties/new`} 
					className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
				>
					{t('properties.addProperty')}
				</Link>
			</div>

			<div className="grid gap-4">
				{properties.map((property) => (
					<PropertyCard 
						key={property.id} 
						property={property} 
						locale={locale}
					/>
				))}
				{properties.length === 0 && (
					<div className="text-center py-8 text-gray-500">
						{t('properties.noProperties')}. <Link href={`/${locale}/properties/new`} className="text-blue-600 hover:underline">{t('properties.addFirstProperty')}</Link>
					</div>
				)}
			</div>
		</div>
	);
}
