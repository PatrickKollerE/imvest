import { prisma } from "@/lib/prisma";
import { getCurrentUserId, getFirstOrganizationIdForUser } from "@/lib/auth-helpers";
import { notFound } from "next/navigation";
import { getTranslations } from 'next-intl/server';
import EditPropertyForm from "./EditPropertyForm";

async function getProperty(propertyId: string, organizationId: string) {
	const property = await prisma.property.findFirst({
		where: { 
			id: propertyId,
			organizationId 
		},
	});

	return property;
}

export default async function EditPropertyPage({ params }: { params: Promise<{ id: string; locale: string }> }) {
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
				<h1 className="text-2xl font-semibold">{t('properties.editProperty')}</h1>
				<p className="text-gray-600">{property.address}, {property.city}</p>
			</div>

			<EditPropertyForm property={property} locale={locale} />
		</div>
	);
}
