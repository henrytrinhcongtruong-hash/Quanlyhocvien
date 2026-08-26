// src/app/admin/layout.tsx
import { auth } from "@/lib/auth";
import SessionProviderWrapper from "@/components/layout/SessionProviderWrapper";

export default async function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <SessionProviderWrapper session={session}>
      {children}
    </SessionProviderWrapper>
  );
}
