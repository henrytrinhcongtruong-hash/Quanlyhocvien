// src/lib/auth.ts
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || "11at3-secret-key-2025-please-change-in-production",
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

        // 1. Direct Instant Authentication for Core Accounts (Works 100% on any Serverless environment)
        if (uname === "admin" && pwd === "admin123") {
          return {
            id: "1",
            name: "Admin Hệ Thống",
            email: "admin",
            isSuperAdmin: true,
            roleLabel: "Admin Tổng",
            assignedLop: "11AT3",
          };
        }

        if (uname === "kimlien" && pwd === "123456") {
          return {
            id: "6",
            name: "Kim Liên",
            email: "kimlien",
            isSuperAdmin: false,
            roleLabel: "Giáo Viên Chủ Nhiệm",
            assignedLop: "12T2",
          };
        }

        if (uname === "gvcn" && pwd === "gvcn123") {
          return {
            id: "2",
            name: "Nguyễn Thị Lan",
            email: "gvcn",
            isSuperAdmin: false,
            roleLabel: "GVCN",
            assignedLop: "11AT3",
          };
        }

        if (uname === "loptruong" && pwd === "loptruong123") {
          return {
            id: "3",
            name: "Trần Văn Minh",
            email: "loptruong",
            isSuperAdmin: false,
            roleLabel: "Lớp trưởng",
            assignedLop: "11AT3",
          };
        }

        if (uname === "totruong2" && pwd === "totruong123") {
          return {
            id: "4",
            name: "Lê Thị Cẩm",
            email: "totruong2",
            isSuperAdmin: false,
            roleLabel: "Tổ trưởng Tổ 2",
            assignedLop: "11AT3",
          };
        }

        // 2. Custom User DB Lookup with Safe Error Handling
        try {
          const user = await prisma.user.findUnique({
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

          if (!user || !user.isActive) return null;

          const isValid = await bcrypt.compare(
            credentials.password as string,
            user.passwordHash
          );
          if (!isValid) return null;

          return {
            id: String(user.id),
            name: user.hoTen,
            email: user.username,
            isSuperAdmin: user.isSuperAdmin,
            roleLabel: user.roleLabel,
            assignedLop: user.assignedLop || "11AT3",
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
