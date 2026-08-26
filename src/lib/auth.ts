// src/lib/auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Tên đăng nhập", type: "text" },
        password: { label: "Mật khẩu", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { username: credentials.username as string },
          select: {
            id: true,
            username: true,
            passwordHash: true,
            hoTen: true,
            roleLabel: true,
            assignedLop: true,
            isSuperAdmin: true,
            isActive: true,
          },
        });

        if (!user || !user.isActive) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!isValid) return null;

        return {
          id: String(user.id),
          name: user.hoTen,
          email: user.username, // reuse email field for username
          isSuperAdmin: user.isSuperAdmin,
          roleLabel: user.roleLabel,
          assignedLop: user.assignedLop || "11AT3",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = Number(user.id);
        token.isSuperAdmin = (user as { isSuperAdmin?: boolean }).isSuperAdmin ?? false;
        token.roleLabel = (user as { roleLabel?: string }).roleLabel ?? "";
        token.assignedLop = (user as { assignedLop?: string }).assignedLop ?? "11AT3";
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = String(token.userId);
        (session as { isSuperAdmin?: boolean }).isSuperAdmin = token.isSuperAdmin as boolean;
        (session as { roleLabel?: string }).roleLabel = token.roleLabel as string;
        (session as { assignedLop?: string }).assignedLop = (token.assignedLop as string) || "11AT3";
      }
      return session;
    },
  },
  pages: {
    signIn: "/admin/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 ngày
  },
});

// Type augmentation
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
    isSuperAdmin?: boolean;
    roleLabel?: string;
    assignedLop?: string;
  }
  interface JWT {
    userId?: number;
    isSuperAdmin?: boolean;
    roleLabel?: string;
    assignedLop?: string;
  }
}
