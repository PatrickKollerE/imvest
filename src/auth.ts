import type { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

declare module "next-auth" {
	interface Session {
		user: {
			id: string;
			name?: string | null;
			firstName?: string | null;
			lastName?: string | null;
			email?: string | null;
			image?: string | null;
		};
	}
}

export const authOptions: NextAuthOptions = {
	session: { strategy: "jwt" },
	providers: [
		Credentials({
			name: "credentials",
			credentials: {
				email: { label: "Email", type: "email" },
				password: { label: "Password", type: "password" },
			},
			async authorize(credentials) {
				if (!credentials?.email || !credentials?.password) return null;
				const email = String(credentials.email).toLowerCase().trim();
				const user = await prisma.user.findUnique({ where: { email } });
				if (!user?.passwordHash) return null;
				const valid = await bcrypt.compare(String(credentials.password), user.passwordHash);
				if (!valid) return null;
				return { 
					id: user.id, 
					name: user.name ?? undefined, 
					firstName: user.firstName ?? undefined,
					lastName: user.lastName ?? undefined,
					email: user.email 
				} as { id: string; name?: string; firstName?: string; lastName?: string; email: string };
			},
		}),
	],
	callbacks: {
		async jwt({ token, user }) {
			if (user) {
				token.id = user.id;
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				token.firstName = (user as any).firstName;
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				token.lastName = (user as any).lastName;
			}
			return token;
		},
		async session({ session, token }) {
			if (token.id) {
				session.user = {
					...session.user,
					id: token.id as string,
					firstName: token.firstName as string | null,
					lastName: token.lastName as string | null,
				};
			}
			return session;
		},
	},
	pages: {
		signIn: "/de/login",
	},
	secret: process.env.NEXTAUTH_SECRET,
	debug: process.env.NODE_ENV === "development",
};


