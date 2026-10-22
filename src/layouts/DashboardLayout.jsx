import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/layout/Sidebar";
import Header from "../components/layout/Header";
import Breadcrumbs from "../components/layout/Breadcrumbs";
import Footer from "../components/layout/Footer";

function DashboardLayout({ role }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarOpen((previous) => !previous);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  return (
    <div
      data-portal={role}
      className="min-h-screen bg-slate-50 text-slate-900"
    >
      {/* Header */}
      <Header onMenuClick={toggleSidebar} />

      {/* Main application body */}
      <div className="flex min-h-[calc(100vh-72px)]">
        {/* Sidebar */}
        <Sidebar
          role={role}
          isOpen={isSidebarOpen}
          onClose={closeSidebar}
        />

        {/* Page content */}
        <main
          className="
            min-w-0
            flex-1
            overflow-x-hidden
            bg-slate-50
            p-4
            transition-all
            duration-300
            sm:p-5
            md:p-6
            lg:p-8
          "
        >
          <Breadcrumbs />

          <Outlet />

          <Footer />
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;