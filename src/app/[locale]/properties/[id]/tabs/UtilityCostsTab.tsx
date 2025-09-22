"use client";

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { formatCurrency } from '@/lib/currency';

interface UtilityCost {
  id: string;
  propertyId: string;
  year: number;
  totalAmountCents: number;
  allocationMethod: 'SQUARE_METERS' | 'TENANTS';
  category: 'HEATING' | 'ELECTRICITY' | 'WATER' | 'GARBAGE' | 'CLEANING' | 'ELEVATOR' | 'INTERNET' | 'OTHER';
  generatedStatementUrl: string | null;
  createdAt: Date;
}

interface UtilityCostsTabProps {
  propertyId: string;
  utilityCosts: UtilityCost[];
}

export default function UtilityCostsTab({ propertyId, utilityCosts: initialUtilityCosts }: UtilityCostsTabProps) {
  const t = useTranslations();
  const [utilityCosts, setUtilityCosts] = useState<UtilityCost[]>(initialUtilityCosts);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const validateUtilityCostForm = (formData: FormData): string[] => {
    const errors: string[] = [];
    
    if (!formData.get("year") || (formData.get("year") as string).trim() === '') {
      errors.push(t('validation.yearRequired'));
    }
    
    const year = Number(formData.get("year"));
    if (year < 2000 || year > 2100) {
      errors.push(t('validation.yearRangeInvalid'));
    }
    
    if (!formData.get("totalAmount") || Number(formData.get("totalAmount")) <= 0) {
      errors.push(t('validation.totalAmountRequired'));
    }
    
    if (!formData.get("allocationMethod")) {
      errors.push(t('validation.allocationMethodRequired'));
    }
    
    if (!formData.get("category")) {
      errors.push(t('validation.categoryRequired'));
    }
    
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setValidationErrors([]);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    console.log('Form data:', Object.fromEntries(formData.entries()));
    
    const validationErrors = validateUtilityCostForm(formData);
    
    if (validationErrors.length > 0) {
      setValidationErrors(validationErrors);
      setLoading(false);
      return;
    }

    const requestBody = {
      propertyId,
      year: Number(formData.get('year')),
      totalAmountCents: Number(formData.get('totalAmount')) * 100,
      allocationMethod: formData.get('allocationMethod'),
      category: formData.get('category'),
      generatedStatementUrl: formData.get('statementUrl') || null,
    };
    
    console.log('Request body:', requestBody);

    try {
      const response = await fetch('/api/utility-costs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const newUtilityCost = await response.json();
        setUtilityCosts([...utilityCosts, newUtilityCost]);
        setShowForm(false);
        // Reset form
        (e.target as HTMLFormElement).reset();
      } else {
        const data = await response.json();
        console.log('Error response:', data);
        
        if (response.status === 401) {
          setError(t('utilities.errorUnauthorized'));
        } else if (response.status === 404) {
          setError(t('utilities.errorPropertyNotFound'));
        } else {
          setError(data.error || t('utilities.errorCreatingUtilityCost'));
        }
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError(t('utilities.errorCreatingUtilityCost'));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (utilityCostId: string) => {
    if (!confirm(t('utilities.confirmDelete'))) return;

    try {
      const response = await fetch(`/api/utility-costs/${utilityCostId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setUtilityCosts(utilityCosts.filter(uc => uc.id !== utilityCostId));
      } else {
        setError(t('utilities.errorDeletingUtilityCost'));
      }
    } catch (err) {
      setError(t('utilities.errorDeletingUtilityCost'));
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded p-4 text-red-800">
          {error}
        </div>
      )}

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">{t('utilities.title')}</h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {showForm ? t('common.cancel') : t('utilities.addUtilityCosts')}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 border rounded-lg bg-gray-50">
          {validationErrors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded p-4 mb-4">
              <h4 className="text-red-800 font-medium mb-2">{t('validation.title')}</h4>
              <ul className="list-disc list-inside text-red-600 space-y-1">
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                {t('utilities.year')} <span className="text-red-500">*</span>
              </label>
              <input
                name="year"
                type="number"
                min="2000"
                max="2100"
                required
                className="w-full border rounded px-3 py-2"
                placeholder="2024"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                {t('utilities.totalAmount')} <span className="text-red-500">*</span>
              </label>
              <input
                name="totalAmount"
                type="number"
                step="0.01"
                min="0"
                required
                className="w-full border rounded px-3 py-2"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                {t('utilities.category')} <span className="text-red-500">*</span>
              </label>
              <select
                name="category"
                required
                className="w-full border rounded px-3 py-2"
              >
                <option value="HEATING">{t('utilities.heating')}</option>
                <option value="ELECTRICITY">{t('utilities.electricity')}</option>
                <option value="WATER">{t('utilities.water')}</option>
                <option value="GARBAGE">{t('utilities.garbage')}</option>
                <option value="CLEANING">{t('utilities.cleaning')}</option>
                <option value="ELEVATOR">{t('utilities.elevator')}</option>
                <option value="INTERNET">{t('utilities.internet')}</option>
                <option value="OTHER">{t('utilities.other')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                {t('utilities.allocationMethod')} <span className="text-red-500">*</span>
              </label>
              <select
                name="allocationMethod"
                required
                className="w-full border rounded px-3 py-2"
              >
                <option value="SQUARE_METERS">{t('utilities.allocationBySquareMeters')}</option>
                <option value="TENANTS">{t('utilities.allocationByTenants')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">
                {t('utilities.statementUrl')} <span className="text-gray-400">({t('validation.optional')})</span>
              </label>
              <input
                name="statementUrl"
                type="url"
                className="w-full border rounded px-3 py-2"
                placeholder="https://example.com/statement.pdf"
              />
            </div>
          </div>
          
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? t('common.loading') : t('common.save')}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      )}

      {utilityCosts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <p className="mb-4">{t('utilities.noUtilityCosts')}</p>
          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            {t('utilities.addFirstUtilityCosts')}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {utilityCosts.map((utilityCost) => (
            <div key={utilityCost.id} className="border rounded p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium">{utilityCost.year} - {t(`utilities.${utilityCost.category?.toLowerCase() || 'other'}`)}</h4>
                  <p className="text-sm text-gray-600">
                    {formatCurrency(utilityCost.totalAmountCents, 'de')}
                  </p>
                  <p className="text-xs text-gray-500">
                    {utilityCost.allocationMethod === 'SQUARE_METERS' 
                      ? t('utilities.allocationBySquareMeters')
                      : t('utilities.allocationByTenants')
                    }
                  </p>
                  {utilityCost.generatedStatementUrl && (
                    <a 
                      href={utilityCost.generatedStatementUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      {t('utilities.viewStatement')}
                    </a>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(utilityCost.id)}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  {t('common.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
