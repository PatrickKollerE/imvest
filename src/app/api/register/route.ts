import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

export async function POST(req: Request) {
	try {
		const { firstName, lastName, email, password, organizationName } = await req.json();
		if (!email || !password) {
			return NextResponse.json({ error: "Missing fields" }, { status: 400 });
		}
		const existing = await prisma.user.findUnique({ where: { email } });
		if (existing) {
			return NextResponse.json({ error: "Email already in use" }, { status: 409 });
		}
		const passwordHash = await bcrypt.hash(password, 10);
		const orgName = organizationName || "My Portfolio";
		const result = await prisma.$transaction(async (tx) => {
			const org = await tx.organization.create({ data: { name: orgName } });
			const user = await tx.user.create({ 
				data: { 
					firstName, 
					lastName, 
					email, 
					passwordHash 
				} 
			});
			await tx.membership.create({ data: { userId: user.id, organizationId: org.id } });
			return { userId: user.id, organizationId: org.id };
		});
		return NextResponse.json({ ok: true, ...result }, { status: 201 });
	} catch {
		return NextResponse.json({ error: "Server error" }, { status: 500 });
	}
}


