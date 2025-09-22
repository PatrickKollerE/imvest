import { getServerSession } from "next-auth";
import { getToken } from "next-auth/jwt";
import { authOptions } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCache, setCache, CACHE_KEYS } from "@/lib/cache";
import { NextRequest } from "next/server";

export async function getCurrentUserId(): Promise<string | null> {
	const session = await getServerSession(authOptions);
	return (session?.user as { id?: string | null })?.id ?? null;
}

export async function getCurrentUserIdFromRequest(req: NextRequest): Promise<string | null> {
	const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
	return token?.sub ?? null;
}

export async function getFirstOrganizationIdForUser(userId: string): Promise<string | null> {
	// Check cache first
	const cacheKey = CACHE_KEYS.USER_ORGS(userId);
	const cached = getCache<string>(cacheKey);
	if (cached) return cached;

	// Fetch from database
	const membership = await prisma.membership.findFirst({ 
		where: { userId }, 
		orderBy: { createdAt: "asc" } 
	});
	
	const orgId = membership?.organizationId ?? null;
	
	// Cache for 5 minutes
	if (orgId) {
		setCache(cacheKey, orgId, 300);
	}
	
	return orgId;
}
