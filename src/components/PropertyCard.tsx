"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/currency";
import { useTranslations } from 'next-intl';

interface Property {
  id: string;
  address: string;
  city: string | null;
  postalCode: string | null;
  sizeSqm: number | null;
  purchasePriceCents: number | null;
  tenants: Array<{ id: string }>;
}

interface PropertyCardProps {
  property: Property;
  locale: string;
}

export default function PropertyCard({ property, locale }: PropertyCardProps) {
  const t = useTranslations();
  const router = useRouter();

  const handleEditClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/${locale}/properties/${property.id}/edit`);
  };

  return (
    <Link 
      href={`/${locale}/properties/${property.id}`}
      className="border rounded-lg p-4 block transition-all duration-200 hover:shadow-lg hover:border-gray-400 hover:bg-gray-50 cursor-pointer group"
    >
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-medium group-hover:text-blue-600 transition-colors">{property.address}</h3>
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
        <span className="text-blue-600 group-hover:text-blue-700 transition-colors">
          {t('properties.viewDetails')}
        </span>
        <button 
          onClick={handleEditClick}
          className="text-gray-600 hover:text-gray-800 hover:underline transition-colors"
        >
          {t('properties.editProperty')}
        </button>
      </div>
    </Link>
  );
}
