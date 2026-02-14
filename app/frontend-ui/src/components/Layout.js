import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { LayoutDashboard, DollarSign, Receipt, FileText, LogOut, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: DollarSign, label: 'Revenue', path: '/revenue' },
  { icon: Receipt, label: 'Expenses', path: '/expenses' },
  { icon: FileText, label: 'Daily Reports', path: '/daily-reports' },
];

export const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-[#FAFAFA]">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-[#0F172A] text-white">
        <div className="p-6 border-b border-white/10">
          <h1 className="text-xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Finance Tracker
          </h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-white/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" strokeWidth={1.5} />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t border-white/10">
          <div className="px-4 py-2 mb-2">
            <p className="text-sm text-white/90 font-medium">{user?.name}</p>
            <p className="text-xs text-white/50">{user?.email}</p>
          </div>
          <Button
            onClick={handleLogout}
            data-testid="logout-btn"
            variant="ghost"
            className="w-full justify-start text-white/70 hover:text-white hover:bg-white/5"
          >
            <LogOut className="w-4 h-4 mr-3" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Sidebar - Mobile */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50" onClick={() => setSidebarOpen(false)}>
          <aside
            className="w-64 h-full bg-[#0F172A] text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-white/10 flex items-center justify-between">
              <h1 className="text-xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>
                Finance Tracker
              </h1>
              <button onClick={() => setSidebarOpen(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>
            <nav className="flex-1 p-4 space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      navigate(item.path);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                      isActive
                        ? 'bg-white/10 text-white'
                        : 'text-white/70 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" strokeWidth={1.5} />
                    <span className="text-sm font-medium">{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-white/10">
              <div className="px-4 py-2 mb-2">
                <p className="text-sm text-white/90 font-medium">{user?.name}</p>
                <p className="text-xs text-white/50">{user?.email}</p>
              </div>
              <Button
                onClick={handleLogout}
                variant="ghost"
                className="w-full justify-start text-white/70 hover:text-white hover:bg-white/5"
              >
                <LogOut className="w-4 h-4 mr-3" />
                Logout
              </Button>
            </div>
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-[#E4E4E7] p-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-[#0F172A]" style={{ fontFamily: 'Manrope, sans-serif' }}>
            Finance Tracker
          </h1>
          <button onClick={() => setSidebarOpen(true)} data-testid="mobile-menu-btn">
            <Menu className="w-6 h-6" />
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto p-6 md:p-8 lg:p-12">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;