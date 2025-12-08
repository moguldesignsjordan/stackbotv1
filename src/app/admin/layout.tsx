"use client";

import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminTopbar from "@/components/admin/AdminTopbar";
import AdminGuard from "@/components/admin/AdminGuard";
import AdminMobileNav from "@/components/admin/AdminMobileNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminGuard>
      <div className="flex min-h-screen bg-sb-bg">
        {/* Desktop Sidebar - Hidden on mobile */}
        <aside className="hidden lg:flex lg:flex-shrink-0">
          <AdminSidebar />
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          {/* Topbar */}
          <AdminTopbar />

          {/* Main Content */}
          <main className="flex-1 p-4 md:p-6 lg:p-8 xl:p-10 admin-main overflow-auto">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>

        {/* Mobile Bottom Navigation */}
        <AdminMobileNav />
      </div>
    </AdminGuard>
  );
}