import { prisma } from "@/lib/prisma";
import { getCurrentUserId, getFirstOrganizationIdForUser } from "@/lib/auth-helpers";
import { formatCurrency } from "@/lib/currency";
import { getTranslations } from 'next-intl/server';
import Link from "next/link";

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
					<div key={property.id} className="border rounded-lg p-4">
						<div className="flex justify-between items-start">
							<div>
								<h3 className="text-lg font-medium">{property.address}</h3>
								<p className="text-gray-600">{property.city}, {property.postalCode}</p>
								{property.sizeSqm && (
									<p className="text-sm text-gray-500">{property.sizeSqm} m²</p>
								)}
							</div>
							<div className="text-right">
								{property.purchasePriceCents && (
									<p className="text-lg font-semibold">
										{formatCurrency(property.purchasePriceCents, locale)}
									</p>
								)}
								<p className="text-sm text-gray-500">
									{property.tenants.length} {property.tenants.length === 1 ? t('tenants.tenant') : t('tenants.tenants')}
								</p>
							</div>
						</div>
						
						<div className="mt-4 flex gap-2">
							<Link 
								href={`/${locale}/properties/${property.id}`}
								className="text-blue-600 hover:underline"
							>
								{t('properties.viewDetails')}
							</Link>
							<Link 
								href={`/${locale}/properties/${property.id}/edit`}
								className="text-gray-600 hover:underline"
							>
								{t('properties.editProperty')}
							</Link>
						</div>
					</div>
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
