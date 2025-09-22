import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUserId, getFirstOrganizationIdForUser } from "@/lib/auth-helpers";
import { generateNext12MonthsLoanExpenses } from "@/lib/loan-calculations";

export async function PUT(
	req: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const { id: propertyId } = await params;
	const userId = await getCurrentUserId();
	if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	
	const organizationId = await getFirstOrganizationIdForUser(userId);
	if (!organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

	// Verify property belongs to user's organization
	const existingProperty = await prisma.property.findFirst({
		where: {
			id: propertyId,
			organizationId
		}
	});

	if (!existingProperty) {
		return NextResponse.json({ error: "Property not found" }, { status: 404 });
	}

	const body = await req.json();
	const {
		address,
		city,
		postalCode,
		sizeSqm,
		purchasePriceCents,
		marketValueCents,
		equityCents,
		loanPrincipalCents,
		interestRatePct,
		amortizationRatePct,
	} = body;

	try {
		const updatedProperty = await prisma.property.update({
			where: { id: propertyId },
			data: {
				address: address !== undefined ? address : existingProperty.address,
				city: city !== undefined ? city : existingProperty.city,
				postalCode: postalCode !== undefined ? postalCode : existingProperty.postalCode,
				sizeSqm: sizeSqm !== undefined ? sizeSqm : existingProperty.sizeSqm,
				purchasePriceCents: purchasePriceCents !== undefined ? purchasePriceCents : existingProperty.purchasePriceCents,
				marketValueCents: marketValueCents !== undefined ? marketValueCents : existingProperty.marketValueCents,
				equityCents: equityCents !== undefined ? equityCents : existingProperty.equityCents,
				loanPrincipalCents: loanPrincipalCents !== undefined ? loanPrincipalCents : existingProperty.loanPrincipalCents,
				interestRatePct: interestRatePct !== undefined ? interestRatePct : existingProperty.interestRatePct,
				amortizationRatePct: amortizationRatePct !== undefined ? amortizationRatePct : existingProperty.amortizationRatePct,
			},
		});

		// Check if loan data has changed and regenerate loan expenses if needed
		const loanDataChanged = 
			loanPrincipalCents !== undefined || 
			interestRatePct !== undefined || 
			amortizationRatePct !== undefined;

		if (loanDataChanged) {
			// Delete existing loan expenses
			await prisma.expense.deleteMany({
				where: {
					propertyId: propertyId,
					category: {
						in: ['LOAN_INTEREST', 'LOAN_AMORTIZATION']
					}
				}
			});

			// Generate new loan expenses if loan data is provided
			const finalLoanPrincipal = loanPrincipalCents !== undefined ? loanPrincipalCents : existingProperty.loanPrincipalCents;
			const finalInterestRate = interestRatePct !== undefined ? interestRatePct : existingProperty.interestRatePct;
			const finalAmortizationRate = amortizationRatePct !== undefined ? amortizationRatePct : existingProperty.amortizationRatePct;

			if (finalLoanPrincipal && finalInterestRate && finalAmortizationRate) {
				const loanData = {
					loanPrincipalCents: finalLoanPrincipal,
					interestRatePct: finalInterestRate,
					amortizationRatePct: finalAmortizationRate,
				};
				
				const loanExpenses = generateNext12MonthsLoanExpenses(propertyId, loanData);
				
				if (loanExpenses.length > 0) {
					await prisma.expense.createMany({
						data: loanExpenses,
					});
				}
			}
		} else {
			// If no loan data was provided in the update, check if property has loan data but no loan expenses
			const hasLoanData = existingProperty.loanPrincipalCents && 
							   existingProperty.interestRatePct && 
							   existingProperty.amortizationRatePct;
			
			if (hasLoanData) {
				// Check if loan expenses exist
				const existingLoanExpenses = await prisma.expense.count({
					where: {
						propertyId: propertyId,
						category: {
							in: ['LOAN_INTEREST', 'LOAN_AMORTIZATION']
						}
					}
				});

				// If no loan expenses exist, generate them
				if (existingLoanExpenses === 0) {
					const loanData = {
						loanPrincipalCents: existingProperty.loanPrincipalCents,
						interestRatePct: existingProperty.interestRatePct,
						amortizationRatePct: existingProperty.amortizationRatePct,
					};
					
					const loanExpenses = generateNext12MonthsLoanExpenses(propertyId, loanData);
					
					if (loanExpenses.length > 0) {
						await prisma.expense.createMany({
							data: loanExpenses,
						});
					}
				}
			}
		}

		return NextResponse.json(updatedProperty);
	} catch (error) {
		console.error("Error updating property:", error);
		return NextResponse.json({ error: "Failed to update property" }, { status: 500 });
	}
}

export async function DELETE(
	req: Request,
	{ params }: { params: Promise<{ id: string }> }
) {
	const { id: propertyId } = await params;
	const userId = await getCurrentUserId();
	if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	
	const organizationId = await getFirstOrganizationIdForUser(userId);
	if (!organizationId) return NextResponse.json({ error: "No organization" }, { status: 400 });

	// Verify property belongs to user's organization
	const existingProperty = await prisma.property.findFirst({
		where: {
			id: propertyId,
			organizationId
		}
	});

	if (!existingProperty) {
		return NextResponse.json({ error: "Property not found" }, { status: 404 });
	}

	try {
		// Delete property and all related data (tenants, incomes, expenses, etc.)
		await prisma.property.delete({
			where: { id: propertyId },
		});

		return NextResponse.json({ message: "Property deleted successfully" });
	} catch (error) {
		console.error("Error deleting property:", error);
		return NextResponse.json({ error: "Failed to delete property" }, { status: 500 });
	}
}
