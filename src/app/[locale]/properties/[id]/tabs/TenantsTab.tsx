"use client";

import { useState } from "react";
import { useTranslations } from 'next-intl';

type Tenant = {
	id: string;
	name: string;
	contactEmail: string | null;
	contactPhone: string | null;
	leaseStart: Date | null;
	leaseEnd: Date | null;
	baseRentCents: number | null;
	contractUrl: string | null;
	status: 'ACTIVE' | 'INACTIVE' | 'DRAFT';
};

type TenantsTabProps = {
	propertyId: string;
	tenants: Tenant[];
};

export default function TenantsTab({ propertyId, tenants }: TenantsTabProps) {
	const [showForm, setShowForm] = useState(false);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [validationErrors, setValidationErrors] = useState<string[]>([]);
	const [deletingTenant, setDeletingTenant] = useState<string | null>(null);
	const [updatingTenant, setUpdatingTenant] = useState<string | null>(null);
	const [editingTenant, setEditingTenant] = useState<string | null>(null);
	const [editFormData, setEditFormData] = useState<{
		name: string;
		contactEmail: string;
		contactPhone: string;
		leaseStart: string;
		leaseEnd: string;
		baseRent: string;
	}>({
		name: '',
		contactEmail: '',
		contactPhone: '',
		leaseStart: '',
		leaseEnd: '',
		baseRent: '',
	});
	const t = useTranslations();

	// Validation function to check required fields for tenant
	function validateTenantForm(formData: FormData): string[] {
		const errors: string[] = [];
		
		// Required fields validation
		if (!formData.get("name") || (formData.get("name") as string).trim() === '') {
			errors.push(t('validation.tenantNameRequired'));
		}
		if (!formData.get("baseRent") || Number(formData.get("baseRent")) <= 0) {
			errors.push(t('validation.baseRentRequired'));
		}
		if (!formData.get("leaseStart")) {
			errors.push(t('validation.leaseStartRequired'));
		}
		
		// Contact information validation - at least one contact method is required
		const contactEmail = formData.get("contactEmail");
		const contactPhone = formData.get("contactPhone");
		
		if ((!contactEmail || (contactEmail as string).trim() === '') && 
			(!contactPhone || (contactPhone as string).trim() === '')) {
			errors.push(t('validation.contactInfoRequired'));
		}
		
		return errors;
	}

	async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError(null);
		setValidationErrors([]);
		setLoading(true);

		const formData = new FormData(e.currentTarget);
		
		// Validate form data
		const validationErrors = validateTenantForm(formData);
		if (validationErrors.length > 0) {
			setValidationErrors(validationErrors);
			setLoading(false);
			return;
		}
		const data = {
			name: formData.get("name"),
			contactEmail: formData.get("contactEmail"),
			contactPhone: formData.get("contactPhone"),
			leaseStart: formData.get("leaseStart"),
			leaseEnd: formData.get("leaseEnd"),
			baseRentCents: formData.get("baseRent") ? Number(formData.get("baseRent")) * 100 : null,
		};

		try {
			const res = await fetch("/api/tenants", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ propertyId, ...data }),
			});

			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.error || "Failed to create tenant");
			}

			window.location.reload();
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred");
		} finally {
			setLoading(false);
		}
	}

	async function handleDeleteTenant(tenantId: string, tenantName: string) {
		if (!confirm(t('tenants.confirmDelete', { name: tenantName }))) {
			return;
		}

		setDeletingTenant(tenantId);
		setError(null);

		try {
			const res = await fetch(`/api/tenants?tenantId=${tenantId}`, {
				method: "DELETE",
			});

			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.error || "Failed to delete tenant");
			}

			window.location.reload();
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred");
		} finally {
			setDeletingTenant(null);
		}
	}

	async function handleToggleTenantStatus(tenantId: string, currentStatus: 'ACTIVE' | 'INACTIVE' | 'DRAFT', tenantName: string) {
		const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
		const action = newStatus === 'INACTIVE' ? t('tenants.deactivate') : t('tenants.activate');
		
		if (!confirm(t('tenants.confirmStatusChange', { name: tenantName, action }))) {
			return;
		}

		setUpdatingTenant(tenantId);
		setError(null);

		try {
			const res = await fetch("/api/tenants", {
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ tenantId, status: newStatus }),
			});

			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.error || "Failed to update tenant status");
			}

			window.location.reload();
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred");
		} finally {
			setUpdatingTenant(null);
		}
	}

	// Helper function to check if tenant is currently active based on lease dates
	function isCurrentlyActive(tenant: Tenant): boolean {
		if (tenant.status === 'INACTIVE') return false;
		if (!tenant.leaseStart) return false;
		
		const now = new Date();
		const start = new Date(tenant.leaseStart);
		
		// If no lease end date, it's open-ended (valid indefinitely)
		if (!tenant.leaseEnd) {
			return start <= now;
		}
		
		// If lease end date exists, check if we're within the period
		const end = new Date(tenant.leaseEnd);
		return start <= now && now <= end;
	}

	// Helper function to get lease status text
	function getLeaseStatusText(tenant: Tenant): string {
		if (!tenant.leaseStart) return '';
		
		const now = new Date();
		const start = new Date(tenant.leaseStart);
		
		if (!tenant.leaseEnd) {
			// Open-ended lease
			if (start <= now) {
				return t('tenants.openEndedActive');
			} else {
				return t('tenants.openEndedFuture');
			}
		} else {
			// Fixed-term lease
			const end = new Date(tenant.leaseEnd);
			if (start <= now && now <= end) {
				return t('tenants.activePeriod');
			} else if (now < start) {
				return t('tenants.futurePeriod');
			} else {
				return t('tenants.expiredPeriod');
			}
		}
	}

	function startEditing(tenant: Tenant) {
		setEditingTenant(tenant.id);
		setEditFormData({
			name: tenant.name,
			contactEmail: tenant.contactEmail || '',
			contactPhone: tenant.contactPhone || '',
			leaseStart: tenant.leaseStart ? new Date(tenant.leaseStart).toISOString().split('T')[0] : '',
			leaseEnd: tenant.leaseEnd ? new Date(tenant.leaseEnd).toISOString().split('T')[0] : '',
			baseRent: tenant.baseRentCents ? (tenant.baseRentCents / 100).toString() : '',
		});
		setError(null);
	}

	function cancelEditing() {
		setEditingTenant(null);
		setEditFormData({
			name: '',
			contactEmail: '',
			contactPhone: '',
			leaseStart: '',
			leaseEnd: '',
			baseRent: '',
		});
		setError(null);
	}

	// Validation function for edit form
	function validateEditTenantForm(data: typeof editFormData): string[] {
		const errors: string[] = [];
		
		// Required fields validation
		if (!data.name || data.name.trim() === '') {
			errors.push(t('validation.tenantNameRequired'));
		}
		if (!data.baseRent || Number(data.baseRent) <= 0) {
			errors.push(t('validation.baseRentRequired'));
		}
		if (!data.leaseStart) {
			errors.push(t('validation.leaseStartRequired'));
		}
		
		// Contact information validation - at least one contact method is required
		if ((!data.contactEmail || data.contactEmail.trim() === '') && 
			(!data.contactPhone || data.contactPhone.trim() === '')) {
			errors.push(t('validation.contactInfoRequired'));
		}
		
		return errors;
	}

	async function handleEditSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError(null);
		setValidationErrors([]);
		setLoading(true);

		// Validate form data
		const validationErrors = validateEditTenantForm(editFormData);
		if (validationErrors.length > 0) {
			setValidationErrors(validationErrors);
			setLoading(false);
			return;
		}

		const data = {
			tenantId: editingTenant,
			name: editFormData.name,
			contactEmail: editFormData.contactEmail || null,
			contactPhone: editFormData.contactPhone || null,
			leaseStart: editFormData.leaseStart || null,
			leaseEnd: editFormData.leaseEnd || null,
			baseRentCents: editFormData.baseRent ? Number(editFormData.baseRent) * 100 : null,
		};

		try {
			const res = await fetch("/api/tenants", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});

			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.error || "Failed to update tenant");
			}

			cancelEditing();
			window.location.reload();
		} catch (err) {
			setError(err instanceof Error ? err.message : "An error occurred");
		} finally {
			setLoading(false);
		}
	}

	return (
		<div>
			<div className="flex justify-between items-center mb-4">
				<h3 className="text-lg font-medium">{t('tenants.title')}</h3>
				<button
					onClick={() => setShowForm(!showForm)}
					className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
				>
					{showForm ? t('common.cancel') : t('tenants.addTenant')}
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
								{t('tenants.name')} <span className="text-red-500">*</span>
							</label>
							<input
								name="name"
								type="text"
								required
								className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium mb-1">
								{t('tenants.email')} <span className="text-red-500">*</span>
							</label>
							<input
								name="contactEmail"
								type="email"
								className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							/>
							<p className="text-xs text-gray-500 mt-1">{t('validation.emailOrPhone')}</p>
						</div>
						<div>
							<label className="block text-sm font-medium mb-1">
								{t('tenants.phone')} <span className="text-red-500">*</span>
							</label>
							<input
								name="contactPhone"
								type="tel"
								className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							/>
							<p className="text-xs text-gray-500 mt-1">{t('validation.emailOrPhone')}</p>
						</div>
						<div>
							<label className="block text-sm font-medium mb-1">
								{t('tenants.baseRent')} ({t('common.currencySymbol')}) <span className="text-red-500">*</span>
							</label>
							<input
								name="baseRent"
								type="number"
								step="0.01"
								min="0"
								className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium mb-1">
								{t('tenants.leaseStart')} <span className="text-red-500">*</span>
							</label>
							<input
								name="leaseStart"
								type="date"
								className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium mb-1">
								{t('tenants.leaseEnd')} <span className="text-gray-400">({t('validation.optional')})</span>
							</label>
							<input
								name="leaseEnd"
								type="date"
								className="w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							/>
							<p className="text-xs text-gray-500 mt-1">{t('validation.openEndedLease')}</p>
						</div>
					</div>
					<div className="mt-4 flex gap-2">
						<button
							type="submit"
							disabled={loading}
							className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
						>
							{loading ? t('common.loading') : t('common.create')}
						</button>
						<button
							type="button"
							onClick={() => setShowForm(false)}
							className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
						>
							{t('common.cancel')}
						</button>
					</div>
					{error && <p className="mt-2 text-red-600 text-sm">{error}</p>}
				</form>
			)}

			<div className="space-y-4">
				{tenants
					.sort((a, b) => {
						// Sort by: 1) Currently active, 2) Active status, 3) Lease start date
						const aActive = isCurrentlyActive(a);
						const bActive = isCurrentlyActive(b);
						
						// Currently active tenants first
						if (aActive && !bActive) return -1;
						if (!aActive && bActive) return 1;
						
						// Then by status (ACTIVE before INACTIVE)
						if (a.status === 'ACTIVE' && b.status === 'INACTIVE') return -1;
						if (a.status === 'INACTIVE' && b.status === 'ACTIVE') return 1;
						
						// Finally by lease start date (most recent first)
						if (a.leaseStart && b.leaseStart) {
							return new Date(b.leaseStart).getTime() - new Date(a.leaseStart).getTime();
						}
						if (a.leaseStart && !b.leaseStart) return -1;
						if (!a.leaseStart && b.leaseStart) return 1;
						
						return 0;
					})
					.map((tenant) => {
					const isActive = isCurrentlyActive(tenant);
					const canDeactivate = tenant.status === 'ACTIVE' && tenant.leaseStart; // Can deactivate if lease has started (even if no end date)
					const isEditing = editingTenant === tenant.id;
					
					if (isEditing) {
						return (
							<div key={tenant.id} className="border rounded p-4 bg-blue-50 border-blue-300">
								<form onSubmit={handleEditSubmit} className="space-y-4">
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
									
									<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
										<div>
											<label className="block text-sm font-medium text-gray-700 mb-1">
												{t('tenants.name')} <span className="text-red-500">*</span>
											</label>
											<input
												type="text"
												value={editFormData.name}
												onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
												className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
												required
											/>
										</div>
										<div>
											<label className="block text-sm font-medium text-gray-700 mb-1">
												{t('tenants.baseRent')} ({t('common.currencySymbol')}) <span className="text-red-500">*</span>
											</label>
											<input
												type="number"
												step="0.01"
												min="0"
												value={editFormData.baseRent}
												onChange={(e) => setEditFormData(prev => ({ ...prev, baseRent: e.target.value }))}
												className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
											/>
										</div>
										<div>
											<label className="block text-sm font-medium text-gray-700 mb-1">
												{t('tenants.contactEmail')} <span className="text-red-500">*</span>
											</label>
											<input
												type="email"
												value={editFormData.contactEmail}
												onChange={(e) => setEditFormData(prev => ({ ...prev, contactEmail: e.target.value }))}
												className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
											/>
											<p className="text-xs text-gray-500 mt-1">{t('validation.emailOrPhone')}</p>
										</div>
										<div>
											<label className="block text-sm font-medium text-gray-700 mb-1">
												{t('tenants.contactPhone')} <span className="text-red-500">*</span>
											</label>
											<input
												type="tel"
												value={editFormData.contactPhone}
												onChange={(e) => setEditFormData(prev => ({ ...prev, contactPhone: e.target.value }))}
												className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
											/>
											<p className="text-xs text-gray-500 mt-1">{t('validation.emailOrPhone')}</p>
										</div>
										<div>
											<label className="block text-sm font-medium text-gray-700 mb-1">
												{t('tenants.leaseStart')} <span className="text-red-500">*</span>
											</label>
											<input
												type="date"
												value={editFormData.leaseStart}
												onChange={(e) => setEditFormData(prev => ({ ...prev, leaseStart: e.target.value }))}
												className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
											/>
										</div>
										<div>
											<label className="block text-sm font-medium text-gray-700 mb-1">
												{t('tenants.leaseEnd')} <span className="text-gray-400">({t('validation.optional')})</span>
											</label>
											<input
												type="date"
												value={editFormData.leaseEnd}
												onChange={(e) => setEditFormData(prev => ({ ...prev, leaseEnd: e.target.value }))}
												className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
											/>
											<p className="text-xs text-gray-500 mt-1">{t('validation.openEndedLease')}</p>
										</div>
									</div>
									
									{/* Status Toggle Section */}
									<div className="mt-4 p-3 bg-gray-50 rounded-lg">
										<h4 className="text-sm font-medium text-gray-700 mb-2">{t('tenants.tenantStatus')}</h4>
										<div className="flex gap-2">
											{canDeactivate && (
												<button
													type="button"
													onClick={() => handleToggleTenantStatus(tenant.id, tenant.status, tenant.name)}
													disabled={updatingTenant === tenant.id || loading}
													className="bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed"
												>
													{updatingTenant === tenant.id ? t('common.loading') : t('tenants.deactivate')}
												</button>
											)}
											{tenant.status === 'INACTIVE' && (
												<button
													type="button"
													onClick={() => handleToggleTenantStatus(tenant.id, tenant.status, tenant.name)}
													disabled={updatingTenant === tenant.id || loading}
													className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
												>
													{updatingTenant === tenant.id ? t('common.loading') : t('tenants.activate')}
												</button>
											)}
											<span className="text-sm text-gray-600 flex items-center">
												{t('tenants.currentStatus')}: <span className={`ml-1 font-medium ${
													tenant.status === 'ACTIVE' ? 'text-green-600' : 
													tenant.status === 'DRAFT' ? 'text-yellow-600' : 
													'text-gray-600'
												}`}>
													{tenant.status === 'ACTIVE' ? t('tenants.active') : 
													 tenant.status === 'DRAFT' ? t('tenants.draft') : 
													 t('tenants.inactive')}
												</span>
											</span>
										</div>
									</div>
									
									<div className="flex gap-2 pt-4">
										<button
											type="submit"
											disabled={loading}
											className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
										>
											{loading ? t('common.loading') : t('common.save')}
										</button>
										<button
											type="button"
											onClick={cancelEditing}
											className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
										>
											{t('common.cancel')}
										</button>
										<button
											type="button"
											onClick={() => {
												if (editingTenant && confirm(t('tenants.confirmDelete', { name: editFormData.name }))) {
													handleDeleteTenant(editingTenant, editFormData.name);
												}
											}}
											disabled={deletingTenant === editingTenant || loading}
											className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
										>
											{deletingTenant === editingTenant ? t('common.loading') : t('common.delete')}
										</button>
									</div>
								</form>
							</div>
						);
					}
					
					return (
						<div 
							key={tenant.id} 
							onClick={() => startEditing(tenant)}
							className={`border rounded p-4 cursor-pointer transition-all duration-200 hover:shadow-md ${
								isActive 
									? 'border-green-500 bg-green-50 shadow-md hover:bg-green-100' 
									: tenant.status === 'INACTIVE' 
										? 'border-gray-300 bg-gray-50 opacity-75 hover:opacity-90' 
										: tenant.status === 'DRAFT'
											? 'border-yellow-300 bg-yellow-50 hover:bg-yellow-100'
											: 'border-gray-300 hover:bg-gray-50'
							} ${isEditing ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
						>
							<div className="flex justify-between items-start">
								<div className="flex-1">
									<div className="flex items-center gap-2 mb-1">
										<h4 className="font-medium">{tenant.name}</h4>
										{isActive && (
											<span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full font-medium">
												{t('tenants.currentlyActive')}
											</span>
										)}
										{tenant.status === 'INACTIVE' && (
											<span className="bg-gray-100 text-gray-800 text-xs px-2 py-1 rounded-full font-medium">
												{t('tenants.inactive')}
											</span>
										)}
										{tenant.status === 'DRAFT' && (
											<span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full font-medium">
												{t('tenants.draft')}
											</span>
										)}
									</div>
									{tenant.contactEmail && (
										<p className="text-sm text-gray-600">{tenant.contactEmail}</p>
									)}
									{tenant.contactPhone && (
										<p className="text-sm text-gray-600">{tenant.contactPhone}</p>
									)}
									{tenant.leaseStart && (
										<div className="mt-2">
											<p className="text-sm text-gray-500">
												{t('tenants.leasePeriod')}: {new Date(tenant.leaseStart).toISOString().split('T')[0]} 
												{tenant.leaseEnd ? ` - ${new Date(tenant.leaseEnd).toISOString().split('T')[0]}` : ` (${t('tenants.openEnded')})`}
											</p>
											{getLeaseStatusText(tenant) && (
												<p className={`text-xs font-medium ${
													isActive ? 'text-green-600' : 
													tenant.leaseStart && new Date(tenant.leaseStart) > new Date() ? 'text-blue-600' :
													tenant.leaseEnd && new Date(tenant.leaseEnd) < new Date() ? 'text-red-600' : 'text-gray-600'
												}`}>
													{getLeaseStatusText(tenant)}
												</p>
											)}
										</div>
									)}
								</div>
								<div className="text-right">
									{tenant.baseRentCents && (
										<p className="font-semibold">{t('common.currencySymbol')}{(tenant.baseRentCents / 100).toLocaleString()}</p>
									)}
									{tenant.contractUrl && (
										<a
											href={tenant.contractUrl}
											target="_blank"
											rel="noopener noreferrer"
											className="text-blue-600 hover:underline text-sm"
											onClick={(e) => e.stopPropagation()}
										>
											{t('tenants.viewContract')}
										</a>
									)}
									<p className="text-xs text-gray-400 mt-1">{t('tenants.clickToEdit')}</p>
								</div>
							</div>
						</div>
					);
				})}
				{tenants.length === 0 && (
					<div className="text-center py-8 text-gray-500">
						{t('tenants.noTenants')}. {t('tenants.addFirstTenant')}.
					</div>
				)}
			</div>
		</div>
	);
}
