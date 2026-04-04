import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import type { DashboardMetrics, PendingLink } from '@/types';
import {
  Users,
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowRight,
  UserPlus,
  Check,
  X,
} from 'lucide-react';

export default function Dashboard() {
  const { permissions } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/parish-admin/dashboard')
      .then((res) => setMetrics(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
      </div>
    );
  }

  const handleLinkAction = async (pivotId: number, action: 'approve' | 'reject') => {
    try {
      await api.post(`/parish-admin/link-requests/${pivotId}/${action}`);
      // Refresh dashboard
      const res = await api.get('/parish-admin/dashboard');
      setMetrics(res.data.data);
    } catch {
      alert('Erro ao processar solicitação.');
    }
  };

  const cards = [
    {
      label: 'Paroquianos',
      value: metrics?.parishioners_count ?? 0,
      icon: Users,
      color: 'bg-blue-50 text-blue-600',
      href: '/paroquianos',
    },
    {
      label: 'Próximos Eventos',
      value: metrics?.events_upcoming ?? 0,
      icon: Calendar,
      color: 'bg-purple-50 text-purple-600',
      href: '/eventos',
    },
    {
      label: 'Receitas (Mês)',
      value: formatCurrency(metrics?.income_this_month ?? 0),
      icon: TrendingUp,
      color: 'bg-green-50 text-green-600',
      href: '/financeiro',
    },
    {
      label: 'Despesas (Mês)',
      value: formatCurrency(metrics?.expense_this_month ?? 0),
      icon: TrendingDown,
      color: 'bg-red-50 text-red-600',
      href: '/financeiro',
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Olá, bem-vindo(a)!
        </h1>
        <p className="text-gray-500">
          {permissions?.parish.name} — Visão geral
        </p>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => (
          <Link
            key={card.label}
            to={card.href}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`p-2 rounded-lg ${card.color}`}>
                <card.icon className="h-5 w-5" />
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{card.value}</p>
            <p className="text-sm text-gray-500">{card.label}</p>
          </Link>
        ))}
      </div>

      {/* Pending link requests */}
      {(metrics?.pending_links_count ?? 0) > 0 && metrics && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-amber-100">
              <UserPlus className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">
                {metrics.pending_links_count} {metrics.pending_links_count === 1 ? 'solicitação de vínculo pendente' : 'solicitações de vínculo pendentes'}
              </h2>
              <p className="text-sm text-gray-500">Fiéis aguardando aprovação para se vincular à paróquia</p>
            </div>
          </div>
          <div className="space-y-2">
            {(metrics.pending_links ?? []).map((link: PendingLink) => (
              <div key={link.pivot_id} className="flex items-center justify-between bg-white rounded-lg p-3 border border-amber-100">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{link.user_name}</p>
                  <p className="text-xs text-gray-500">{link.user_email} — {new Date(link.requested_at).toLocaleDateString('pt-BR')}</p>
                </div>
                <div className="flex gap-2 shrink-0 ml-3">
                  <button
                    onClick={() => handleLinkAction(link.pivot_id, 'approve')}
                    className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors"
                    title="Aprovar"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleLinkAction(link.pivot_id, 'reject')}
                    className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                    title="Rejeitar"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dízimos summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Dízimos</h2>
            <DollarSign className="h-5 w-5 text-accent-400" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Este mês</p>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(metrics?.tithes_this_month ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Mês anterior</p>
              <p className="text-xl font-bold text-gray-700">
                {formatCurrency(metrics?.tithes_last_month ?? 0)}
              </p>
            </div>
          </div>
        </div>

        {/* Upcoming events */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Próximos Eventos</h2>
            <Link to="/eventos" className="text-sm text-primary-500 hover:underline">
              Ver todos
            </Link>
          </div>
          {metrics?.upcoming_events && metrics.upcoming_events.length > 0 ? (
            <ul className="space-y-3">
              {metrics.upcoming_events.slice(0, 4).map((evt) => (
                <li key={evt.id} className="flex items-center gap-3 text-sm">
                  <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                    <Calendar className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{evt.title}</p>
                    <p className="text-gray-500">
                      {new Date(evt.starts_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">Nenhum evento próximo</p>
          )}
        </div>
      </div>
    </div>
  );
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}
