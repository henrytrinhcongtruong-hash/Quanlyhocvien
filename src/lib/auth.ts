// src/lib/auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

// Ensure auth secret exists
const authSecret =
  process.env.NEXTAUTH_SECRET ||
  process.env.AUTH_SECRET ||
  (process.env.NODE_ENV === "development" ? "dev-only-local-secret-key-32-chars-min" : undefined);

if (!authSecret && process.env.NODE_ENV === "production") {
  console.error("CRITICAL SECURITY WARNING: NEXTAUTH_SECRET / AUTH_SECRET is not defined in environment variables!");
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: authSecret,
  trustHost: true,
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        username: { label: "Tên đăng nhập", type: "text" },
        password: { label: "Mật khẩu", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;
        const uname = (credentials.username as string).trim().toLowerCase();
        const pwd = (credentials.password as string).trim();

        // Safe User DB Lookup with Bcrypt verification
        try {
          let user = await prisma.user.findUnique({
            where: { username: uname },
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

          // Bootstrap initial SuperAdmin in DB with Bcrypt if DB has 0 users
          if (!user && uname === "admin") {
            const userCount = await prisma.user.count();
            if (userCount === 0) {
              const defaultPasswordHash = await bcrypt.hash("admin123", 12);
              user = await prisma.user.create({
                data: {
                  username: "admin",
                  passwordHash: defaultPasswordHash,
                  hoTen: "Admin Hệ Thống",
                  roleLabel: "Admin Tổng",
                  assignedLop: "12T2",
                  isSuperAdmin: true,
                  isActive: true,
                },
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
            }
          }

          if (!user || !user.isActive) return null;

          const isValid = await bcrypt.compare(pwd, user.passwordHash);
          if (!isValid) return null;

          return {
            id: String(user.id),
            name: user.hoTen,
            email: user.username,
            isSuperAdmin: user.isSuperAdmin,
            roleLabel: user.roleLabel,
            assignedLop: user.assignedLop || "12T2",
          };
        } catch (err) {
          console.error("Auth DB Error:", err);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = Number(user.id);
        token.isSuperAdmin = (user as { isSuperAdmin?: boolean }).isSuperAdmin ?? false;
        token.roleLabel = (user as { roleLabel?: string }).roleLabel ?? "";
        token.assignedLop = (user as { assignedLop?: string }).assignedLop ?? "12T2";
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = String(token.userId);
        (session as { isSuperAdmin?: boolean }).isSuperAdmin = token.isSuperAdmin as boolean;
        (session as { roleLabel?: string }).roleLabel = token.roleLabel as string;
        (session as { assignedLop?: string }).assignedLop = (token.assignedLop as string) || "12T2";
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
