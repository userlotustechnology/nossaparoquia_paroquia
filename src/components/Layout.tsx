import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import clsx from 'clsx';
import {
  LayoutDashboard,
  Users,
  Home,
  Star,
  UserCheck,
  DollarSign,
  BookOpen,
  ClipboardList,
  Heart,
  Calendar,
  Users2,
  Megaphone,
  Building2,
  BarChart3,
  LogOut,
  Menu,
  X,
  ChevronDown,
  CalendarRange,
  GraduationCap,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard, permission: null, section: null },
  // Fiéis
  { name: 'Paroquianos', href: '/paroquianos', icon: Users, permission: 'parishioners.index', section: 'Fiéis' },
  { name: 'Famílias', href: '/familias', icon: Home, permission: 'families.index', section: 'Fiéis' },
  { name: 'Sacramentos', href: '/sacramentos', icon: Star, permission: 'sacraments.index', section: 'Fiéis' },
  // Arrecadação
  { name: 'Dizimistas', href: '/dizimistas', icon: UserCheck, permission: 'tithers.index', section: 'Arrecadação' },
  { name: 'Dízimos', href: '/financeiro', icon: DollarSign, permission: 'financial-transactions.index', section: 'Arrecadação' },
  // Liturgia
  { name: 'Missas', href: '/missas', icon: BookOpen, permission: 'masses.index', section: 'Liturgia' },
  { name: 'Modelos de Missa', href: '/modelos-missa', icon: ClipboardList, permission: 'mass-templates.index', section: 'Liturgia' },
  { name: 'Intenções', href: '/intencoes', icon: Heart, permission: 'mass-intentions.index', section: 'Liturgia' },
  // Gestão
  { name: 'Eventos', href: '/eventos', icon: Calendar, permission: 'events.index', section: 'Gestão' },
  { name: 'Pastorais', href: '/pastorais', icon: Users2, permission: 'pastorals.index', section: 'Gestão' },
  { name: 'Campanhas', href: '/campanhas', icon: Megaphone, permission: 'campaigns.index', section: 'Gestão' },
  { name: 'Espaços', href: '/espacos', icon: Building2, permission: 'spaces.index', section: 'Gestão' },
  { name: 'Reservas', href: '/reservas', icon: CalendarRange, permission: 'spaces.index', section: 'Gestão' },
  { name: 'Catequese', href: '/catequese', icon: GraduationCap, permission: 'catechism-groups.index', section: 'Gestão' },
  // Financeiro
  { name: 'Plano de Contas', href: '/plano-de-contas', icon: BarChart3, permission: 'account-plans.index', section: 'Financeiro' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, permissions, logout, hasPermission } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const filteredNav = navigation.filter(
    (item) => !item.permission || hasPermission(item.permission)
  );

  const roleName = permissions?.parish_role === 'sacerdote' ? 'Sacerdote' : 'Secretária';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl z-50">
            <SidebarContent
              nav={filteredNav}
              currentPath={location.pathname}
              parishName={permissions?.parish.name}
              roleName={roleName}
              onClose={() => setSidebarOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64">
        <div className="flex flex-col w-full bg-white border-r border-gray-200">
          <SidebarContent
            nav={filteredNav}
            currentPath={location.pathname}
            parishName={permissions?.parish.name}
            roleName={roleName}
          />
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            <button
              className="lg:hidden p-2 -ml-2 text-gray-500 hover:text-gray-700"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>

            <div className="flex-1" />

            {/* User menu */}
            <div className="relative">
              <button
                className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
              >
                <div className="h-8 w-8 rounded-full bg-primary-500 text-white flex items-center justify-center text-sm font-medium">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:block">{user?.name}</span>
                <ChevronDown className="h-4 w-4" />
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <div className="p-3 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="h-4 w-4" />
                      Sair
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

interface SidebarContentProps {
  nav: typeof navigation;
  currentPath: string;
  parishName?: string;
  roleName: string;
  onClose?: () => void;
}

function SidebarContent({ nav, currentPath, parishName, roleName, onClose }: SidebarContentProps) {
  return (
    <div className="flex flex-col h-full">
      {/* Parish Info + Close */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
        <div className="flex items-center gap-2.5 min-w-0">
          <img src="/logo.png" alt="Logo" className="h-9 w-9 rounded-full shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate leading-tight">{parishName}</p>
            <p className="text-xs text-gray-500 leading-tight">{roleName}</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="lg:hidden p-1 text-gray-400 hover:text-gray-600 shrink-0">
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        {nav.map((item, idx) => {
          const prevSection = idx > 0 ? nav[idx - 1].section : null;
          const showSectionLabel = item.section && item.section !== prevSection;
          const isActive = currentPath === item.href ||
            (item.href !== '/' && currentPath.startsWith(item.href));

          return (
            <div key={item.name}>
              {showSectionLabel && (
                <p className="text-xs uppercase text-gray-400 font-semibold px-3 py-2 mt-2 mb-1">
                  {item.section}
                </p>
              )}
              <Link
                to={item.href}
                onClick={onClose}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-500 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-200">
        <p className="text-xs text-gray-400">Nossa Paróquia Online</p>
      </div>
    </div>
  );
}
