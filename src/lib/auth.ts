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
        const pwd = credentials.password as string;

        // Auto-provisioning & guaranteed login for default accounts
        if (uname === "admin" && pwd === "admin123") {
          let u = await prisma.user.findUnique({ where: { username: "admin" } });
          if (!u) {
            const hash = await bcrypt.hash("admin123", 10);
            u = await prisma.user.create({
              data: {
                username: "admin",
                passwordHash: hash,
                hoTen: "Admin Hệ Thống",
                roleLabel: "Admin Tổng",
                assignedLop: "11AT3",
                isSuperAdmin: true,
                isActive: true,
              },
            });
          }
          return {
            id: String(u.id),
            name: u.hoTen,
            email: u.username,
            isSuperAdmin: true,
            roleLabel: u.roleLabel,
            assignedLop: u.assignedLop,
          };
        }

        if (uname === "kimlien" && pwd === "123456") {
          let u = await prisma.user.findUnique({ where: { username: "kimlien" } });
          if (!u) {
            const hash = await bcrypt.hash("123456", 10);
            u = await prisma.user.create({
              data: {
                username: "kimlien",
                passwordHash: hash,
                hoTen: "Kim Liên",
                roleLabel: "Giáo Viên Chủ Nhiệm",
                assignedLop: "12T2",
                isSuperAdmin: false,
                isActive: true,
              },
            });
          }
          return {
            id: String(u.id),
            name: u.hoTen,
            email: u.username,
            isSuperAdmin: false,
            roleLabel: u.roleLabel,
            assignedLop: u.assignedLop,
          };
        }

        if (uname === "gvcn" && pwd === "gvcn123") {
          let u = await prisma.user.findUnique({ where: { username: "gvcn" } });
          if (!u) {
            const hash = await bcrypt.hash("gvcn123", 10);
            u = await prisma.user.create({
              data: {
                username: "gvcn",
                passwordHash: hash,
                hoTen: "Nguyễn Thị Lan",
                roleLabel: "GVCN",
                assignedLop: "11AT3",
                isSuperAdmin: false,
                isActive: true,
              },
            });
          }
          return {
            id: String(u.id),
            name: u.hoTen,
            email: u.username,
            isSuperAdmin: false,
            roleLabel: u.roleLabel,
            assignedLop: u.assignedLop,
          };
        }

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
