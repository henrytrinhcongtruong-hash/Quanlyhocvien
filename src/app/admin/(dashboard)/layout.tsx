// src/app/admin/(dashboard)/layout.tsx
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminLayoutClient from "@/components/layout/AdminLayout";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }

  const isSuperAdmin = !!(session as { isSuperAdmin?: boolean }).isSuperAdmin;

  return (
    <AdminLayoutClient isSuperAdmin={isSuperAdmin}>
      {children}
    </AdminLayoutClient>
  );
}
