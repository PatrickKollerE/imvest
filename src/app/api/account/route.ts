import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/auth';
import { prisma } from '@/lib/prisma';
// Dynamic import for bcryptjs

export async function PUT(request: NextRequest) {
	try {
		const session = await getServerSession(authOptions);
		
		if (!session?.user?.email) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Dynamic import for bcryptjs
		const bcrypt = await import('bcryptjs');
		
		const body = await request.json();
		const { email, firstName, lastName, currentPassword, newPassword, confirmPassword } = body;

		// Get current user
		const user = await prisma.user.findUnique({
			where: { email: session.user.email }
		});

		if (!user) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		// If changing password, validate current password
		if (newPassword) {
			if (!currentPassword) {
				return NextResponse.json({ error: 'Current password is required' }, { status: 400 });
			}

			// Verify current password
			const isCurrentPasswordValid = await bcrypt.default.compare(currentPassword, user.passwordHash);
			if (!isCurrentPasswordValid) {
				return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
			}

			// Validate new password
			if (newPassword !== confirmPassword) {
				return NextResponse.json({ error: 'New passwords do not match' }, { status: 400 });
			}

			if (newPassword.length < 6) {
				return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
			}
		}

		// Update user data
		const updateData: { firstName?: string; lastName?: string; email?: string; passwordHash?: string } = {};
		
		if (firstName !== undefined) {
			updateData.firstName = firstName;
		}
		
		if (lastName !== undefined) {
			updateData.lastName = lastName;
		}
		
		if (email && email !== user.email) {
			// Check if email is already taken
			const existingUser = await prisma.user.findUnique({
				where: { email }
			});
			
			if (existingUser) {
				return NextResponse.json({ error: 'Email is already taken' }, { status: 400 });
			}
			
			updateData.email = email;
		}

		if (newPassword) {
			updateData.passwordHash = await bcrypt.default.hash(newPassword, 12);
		}

		// Update user in database
		const updatedUser = await prisma.user.update({
			where: { id: user.id },
			data: updateData,
			select: {
				id: true,
				email: true,
				name: true,
				firstName: true,
				lastName: true,
				createdAt: true,
				updatedAt: true
			}
		});

		return NextResponse.json({ 
			message: 'Account updated successfully',
			user: updatedUser
		});

	} catch (error) {
		console.error('Error updating account:', error);
		return NextResponse.json(
			{ error: 'Internal server error' },
			{ status: 500 }
		);
	}
}
