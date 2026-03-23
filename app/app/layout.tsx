import { redirect } from "next/navigation";
import { getCurrentUserContext } from "@/lib/org";
import { getCurrentUser } from "@/lib/currentUser";
import AppNav from "@/components/AppNav";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard - Mini CRM",
  description: "Mini CRM for Real Estate Teams",
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [ctx, user] = await Promise.all([getCurrentUserContext(), getCurrentUser()]);
  if (!ctx || !user) {
    redirect("/login");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 selection:bg-blue-100 selection:text-blue-900 dark:selection:bg-blue-900 dark:selection:text-blue-100">
      <AppNav userRole={ctx.role} userEmail={user.email} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-8 md:py-8 layout-content">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
