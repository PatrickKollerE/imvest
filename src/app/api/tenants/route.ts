import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserIdFromRequest, getFirstOrganizationIdForUser } from "@/lib/auth-helpers";

// Helper function to determine if tenant data is complete enough for ACTIVE status
function isTenantDataComplete(tenantData: {
	name?: string;
	contactEmail?: string | null;
	contactPhone?: string | null;
	leaseStart?: string | Date | null;
	leaseEnd?: string | Date | null;
	baseRentCents?: number | null;
}): boolean {
	// Required fields for ACTIVE status:
	// 1. Name must be provided
	// 2. Base rent must be provided and > 0
	// 3. Lease start date must be provided
	// 4. At least one contact method (email or phone) must be provided
	
	const hasName = !!(tenantData.name && tenantData.name.trim().length > 0);
	const hasValidRent = !!(tenantData.baseRentCents && tenantData.baseRentCents > 0);
	const hasLeaseStart = !!tenantData.leaseStart;
	const hasContactInfo = !!(tenantData.contactEmail && tenantData.contactEmail.trim().length > 0) || 
						   !!(tenantData.contactPhone && tenantData.contactPhone.trim().length > 0);
	
	return hasName && hasValidRent && hasLeaseStart && hasContactInfo;
}

export async function POST(req: NextRequest) {
	const userId = await getCurrentUserIdFromRequest(req);
	if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	
	const organizationId = await getFirstOrganizationIdForUser(userId);
	if (!organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

	const body = await req.json();
	const { propertyId, name, contactEmail, contactPhone, leaseStart, leaseEnd, baseRentCents } = body;

	// Determine tenant status based on data completeness
	const tenantData = { name, contactEmail, contactPhone, leaseStart, leaseEnd, baseRentCents };
	const isComplete = isTenantDataComplete(tenantData);
	const status = isComplete ? 'ACTIVE' : 'DRAFT';

	// Verify property belongs to user's organization
	const property = await prisma.property.findFirst({
		where: { 
			id: propertyId,
			organizationId 
		},
	});

	if (!property) {
		return NextResponse.json({ error: "Property not found" }, { status: 404 });
	}

	try {
		const result = await prisma.$transaction(async (tx) => {
			// Create the tenant
			const tenant = await tx.tenant.create({
				data: {
					propertyId,
					name,
					contactEmail: contactEmail || null,
					contactPhone: contactPhone || null,
					leaseStart: leaseStart ? new Date(leaseStart) : null,
					leaseEnd: leaseEnd ? new Date(leaseEnd) : null,
					baseRentCents: baseRentCents || null,
					status: status as 'ACTIVE' | 'INACTIVE' | 'DRAFT',
				},
			});

			// Auto-generate income records if we have valid lease start and rent
			if (leaseStart && baseRentCents && baseRentCents > 0) {
				const startDate = new Date(leaseStart);
				
				// For open-ended leases (no end date), generate income for next 2 years
				// For fixed-term leases, generate for the lease period
				const endDate = leaseEnd ? new Date(leaseEnd) : new Date(startDate.getFullYear() + 2, startDate.getMonth(), startDate.getDate());

				// Generate monthly income records for the lease period
				const incomeRecords = [];
				const currentDate = new Date(startDate);

				while (currentDate < endDate) {
					// Create income record for the first day of each month
					const incomeDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);

					incomeRecords.push({
						propertyId,
						date: incomeDate,
						amountCents: baseRentCents,
						type: 'RENT' as const,
						note: `Rent from ${tenant.name}`,
					});

					// Move to next month
					currentDate.setMonth(currentDate.getMonth() + 1);
				}

				// Create all income records
				if (incomeRecords.length > 0) {
					await tx.income.createMany({
						data: incomeRecords,
					});
				}
			}

			return tenant;
		});

		return NextResponse.json(result, { status: 201 });
	} catch (error) {
		console.error("Error creating tenant:", error);
		return NextResponse.json({ error: "Failed to create tenant" }, { status: 500 });
	}
}

export async function PUT(req: NextRequest) {
	const userId = await getCurrentUserIdFromRequest(req);
	if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	
	const organizationId = await getFirstOrganizationIdForUser(userId);
	if (!organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

	const body = await req.json();
	const { tenantId, name, contactEmail, contactPhone, leaseStart, leaseEnd, baseRentCents } = body;

	if (!tenantId) {
		return NextResponse.json({ error: "Tenant ID is required" }, { status: 400 });
	}

	// Verify tenant belongs to user's organization
	const existingTenant = await prisma.tenant.findFirst({
		where: { 
			id: tenantId,
			property: {
				organizationId
			}
		},
		include: {
			property: true
		}
	});

	if (!existingTenant) {
		return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
	}

	// Determine tenant status based on data completeness
	const updatedData = {
		name: name !== undefined ? name : existingTenant.name,
		contactEmail: contactEmail !== undefined ? contactEmail : existingTenant.contactEmail,
		contactPhone: contactPhone !== undefined ? contactPhone : existingTenant.contactPhone,
		leaseStart: leaseStart !== undefined ? leaseStart : existingTenant.leaseStart,
		leaseEnd: leaseEnd !== undefined ? leaseEnd : existingTenant.leaseEnd,
		baseRentCents: baseRentCents !== undefined ? baseRentCents : existingTenant.baseRentCents,
	};
	
	const isComplete = isTenantDataComplete(updatedData);
	// Only update status if tenant is currently DRAFT or if data becomes incomplete
	const newStatus = existingTenant.status === 'DRAFT' || !isComplete ? 
		(isComplete ? 'ACTIVE' : 'DRAFT') : 
		existingTenant.status;

	try {
		const result = await prisma.$transaction(async (tx) => {
			// Update the tenant
			const updatedTenant = await tx.tenant.update({
				where: { id: tenantId },
				data: {
					name: name !== undefined ? name : existingTenant.name,
					contactEmail: contactEmail !== undefined ? contactEmail : existingTenant.contactEmail,
					contactPhone: contactPhone !== undefined ? contactPhone : existingTenant.contactPhone,
					leaseStart: leaseStart !== undefined ? (leaseStart ? new Date(leaseStart) : null) : existingTenant.leaseStart,
					leaseEnd: leaseEnd !== undefined ? (leaseEnd ? new Date(leaseEnd) : null) : existingTenant.leaseEnd,
					baseRentCents: baseRentCents !== undefined ? baseRentCents : existingTenant.baseRentCents,
					status: newStatus as 'ACTIVE' | 'INACTIVE' | 'DRAFT',
				},
			});

			// Handle income records if rent or lease period changed
			const rentChanged = baseRentCents !== undefined && baseRentCents !== existingTenant.baseRentCents;
			const leaseChanged = leaseStart !== undefined || leaseEnd !== undefined;
			
			if (rentChanged || leaseChanged) {
				// Delete existing income records for this tenant
				await tx.income.deleteMany({
					where: {
						propertyId: existingTenant.propertyId,
						type: 'RENT' as const,
						note: `Rent from ${existingTenant.name}`,
					},
				});

				// Generate new income records if we have valid lease period and rent
				const newLeaseStart = leaseStart ? new Date(leaseStart) : existingTenant.leaseStart;
				const newBaseRent = baseRentCents !== undefined ? baseRentCents : existingTenant.baseRentCents;
				
				if (newLeaseStart && newBaseRent && newBaseRent > 0) {
					const startDate = newLeaseStart;
					
					// For open-ended leases (no end date), generate income for next 2 years
					// For fixed-term leases, generate for the lease period
					const endDate = leaseEnd ? new Date(leaseEnd) : existingTenant.leaseEnd || new Date(startDate.getFullYear() + 2, startDate.getMonth(), startDate.getDate());
					
					// Generate monthly income records for the lease period
					const incomeRecords = [];
					const currentDate = new Date(startDate);
					
					while (currentDate < endDate) {
						// Create income record for the first day of each month
						const incomeDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
						
						incomeRecords.push({
							propertyId: existingTenant.propertyId,
							date: incomeDate,
							amountCents: newBaseRent,
							type: 'RENT' as const,
							note: `Rent from ${updatedTenant.name}`,
						});
						
						// Move to next month
						currentDate.setMonth(currentDate.getMonth() + 1);
					}
					
					// Create all income records
					if (incomeRecords.length > 0) {
						await tx.income.createMany({
							data: incomeRecords,
						});
					}
				}
			}

			return updatedTenant;
		});

		return NextResponse.json(result, { status: 200 });
	} catch (error) {
		console.error("Error updating tenant:", error);
		return NextResponse.json({ error: "Failed to update tenant" }, { status: 500 });
	}
}

export async function DELETE(req: NextRequest) {
	const userId = await getCurrentUserIdFromRequest(req);
	if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	
	const organizationId = await getFirstOrganizationIdForUser(userId);
	if (!organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

	const url = new URL(req.url);
	const tenantId = url.searchParams.get('tenantId');

	if (!tenantId) {
		return NextResponse.json({ error: "Tenant ID is required" }, { status: 400 });
	}

	// Verify tenant belongs to user's organization
	const existingTenant = await prisma.tenant.findFirst({
		where: { 
			id: tenantId,
			property: {
				organizationId
			}
		},
	});

	if (!existingTenant) {
		return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
	}

	try {
		const result = await prisma.$transaction(async (tx) => {
			// Delete associated income records
			await tx.income.deleteMany({
				where: {
					propertyId: existingTenant.propertyId,
					type: 'RENT',
					note: `Rent from ${existingTenant.name}`,
				},
			});

			// Delete the tenant
			await tx.tenant.delete({
				where: { id: tenantId },
			});

			return { success: true };
		});

		return NextResponse.json(result, { status: 200 });
	} catch (error) {
		console.error("Error deleting tenant:", error);
		return NextResponse.json({ error: "Failed to delete tenant" }, { status: 500 });
	}
}

export async function PATCH(req: NextRequest) {
	const userId = await getCurrentUserIdFromRequest(req);
	if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	
	const organizationId = await getFirstOrganizationIdForUser(userId);
	if (!organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

	const body = await req.json();
	const { tenantId, status } = body;

	if (!tenantId || !status) {
		return NextResponse.json({ error: "Tenant ID and status are required" }, { status: 400 });
	}

	// Validate status
	if (status !== 'ACTIVE' && status !== 'INACTIVE' && status !== 'DRAFT') {
		return NextResponse.json({ error: "Invalid status. Must be 'ACTIVE', 'INACTIVE', or 'DRAFT'" }, { status: 400 });
	}

	// Verify tenant belongs to user's organization
	const existingTenant = await prisma.tenant.findFirst({
		where: { 
			id: tenantId,
			property: {
				organizationId
			}
		},
		include: {
			property: true
		}
	});

	if (!existingTenant) {
		return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
	}

	// If deactivating, validate that tenant has valid lease start date
	if (status === 'INACTIVE') {
		if (!existingTenant.leaseStart) {
			return NextResponse.json({ 
				error: "Cannot deactivate tenant without valid lease start date" 
			}, { status: 400 });
		}

		const now = new Date();
		const leaseStart = new Date(existingTenant.leaseStart);

		// If lease has an end date, validate it
		if (existingTenant.leaseEnd) {
			const leaseEnd = new Date(existingTenant.leaseEnd);

			if (leaseStart >= leaseEnd) {
				return NextResponse.json({ 
					error: "Cannot deactivate tenant with invalid lease period (start date must be before end date)" 
				}, { status: 400 });
			}

			if (leaseEnd < now) {
				return NextResponse.json({ 
					error: "Cannot deactivate tenant with expired lease (lease has already ended)" 
				}, { status: 400 });
			}
		}
		// If no lease end date, it's open-ended and can be deactivated as long as lease has started
	}

	try {
		const result = await prisma.$transaction(async (tx) => {
			// Update tenant status
			const updatedTenant = await tx.tenant.update({
				where: { id: tenantId },
				data: { status },
			});

			// If deactivating, also update income records to reflect the change
			if (status === 'INACTIVE') {
				// Update income records to mark them as inactive (we can add a note or change type)
				await tx.income.updateMany({
					where: {
						propertyId: existingTenant.propertyId,
						type: 'RENT' as const,
						note: `Rent from ${existingTenant.name}`,
						date: {
							gte: new Date() // Only future income records
						}
					},
					data: {
						note: `Rent from ${existingTenant.name} (INACTIVE)`,
					},
				});
			} else if (status === 'ACTIVE') {
				// Reactivate income records
				await tx.income.updateMany({
					where: {
						propertyId: existingTenant.propertyId,
						type: 'RENT' as const,
						note: `Rent from ${existingTenant.name} (INACTIVE)`,
					},
					data: {
						note: `Rent from ${existingTenant.name}`,
					},
				});
			}

			return updatedTenant;
		});

		return NextResponse.json(result, { status: 200 });
	} catch (error) {
		console.error("Error updating tenant status:", error);
		return NextResponse.json({ error: "Failed to update tenant status" }, { status: 500 });
	}
}
