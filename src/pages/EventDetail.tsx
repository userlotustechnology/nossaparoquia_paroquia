import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import ConfirmDialog from '@/components/ConfirmDialog';
import {
  ArrowLeft,
  Users,
  CheckSquare,
  DollarSign,
  RefreshCw,
  Check,
  X,
  CreditCard,
  UserCheck,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface EventInfo {
  id: number;
  title: string;
  registration_fee: number | null;
  requires_approval: boolean;
  max_participants: number | null;
  registration_open: boolean;
  confirmed_count: number;
}

interface Registration {
  id: number;
  name: string;
  email: string;
  phone: string;
  status: string;
  status_label: string;
  payment_status: string;
  payment_label: string;
  attended_at: string | null;
  registered_at: string;
  parishioner_id: number | null;
}

interface Meta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-500',
  attended:  'bg-blue-100 text-blue-800',
};

const PAYMENT_COLORS: Record<string, string> = {
  pending:  'bg-orange-100 text-orange-800',
  paid:     'bg-green-100 text-green-800',
  refunded: 'bg-gray-100 text-gray-500',
};

type ActiveTab = 'registrations' | 'checkin';

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('registrations');
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPayment, setFilterPayment] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Registration | null>(null);
  const [confirmAction, setConfirmAction] = useState<null | { type: string; label: string; reg: Registration }>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [bulkSelected, setBulkSelected] = useState<number[]>([]);
  const [bulkLoading, setBulkLoading] = useState(false);

  const fetchRegistrations = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.get(`/parish-admin/events/${id}/registrations`, {
        params: {
          page,
          per_page: 20,
          status: filterStatus || undefined,
          payment_status: filterPayment || undefined,
          search: search || undefined,
        },
      });
      setRegistrations(res.data.data);
      setMeta(res.data.meta);
      if (!eventInfo) setEventInfo(res.data.event);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id, page, filterStatus, filterPayment, search]);

  useEffect(() => { fetchRegistrations(); }, [fetchRegistrations]);
  useEffect(() => { setPage(1); }, [filterStatus, filterPayment, search]);

  const doAction = async () => {
    if (!confirmAction || !id) return;
    setActionLoading(true);
    try {
      const { type, reg } = confirmAction;
      if (type === 'approve') {
        await api.post(`/parish-admin/events/${id}/registrations/${reg.id}/approve`);
      } else if (type === 'reject') {
        await api.post(`/parish-admin/events/${id}/registrations/${reg.id}/reject`);
      } else if (type === 'payment') {
        await api.post(`/parish-admin/events/${id}/registrations/${reg.id}/payment`);
      }
      setConfirmAction(null);
      fetchRegistrations();
    } catch (err) {
      console.error(err);
      alert('Erro ao executar ação.');
    } finally {
      setActionLoading(false);
    }
  };

  const toggleCheckin = async (reg: Registration) => {
    if (!id) return;
    setActionLoading(true);
    try {
      await api.post(`/parish-admin/events/${id}/checkin/${reg.id}`);
      fetchRegistrations();
    } catch (err) {
      console.error(err);
      alert('Erro ao registrar check-in.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkAction = async (action: string) => {
    if (!id || bulkSelected.length === 0) return;
    setBulkLoading(true);
    try {
      await api.post(`/parish-admin/events/${id}/registrations/bulk`, {
        action,
        ids: bulkSelected,
      });
      setBulkSelected([]);
      fetchRegistrations();
    } catch (err) {
      console.error(err);
      alert('Erro ao executar ação em massa.');
    } finally {
      setBulkLoading(false);
    }
  };

  const toggleBulkSelect = (regId: number) => {
    setBulkSelected(prev =>
      prev.includes(regId) ? prev.filter(id => id !== regId) : [...prev, regId]
    );
  };

  const selectAll = () => {
    if (bulkSelected.length === registrations.length) {
      setBulkSelected([]);
    } else {
      setBulkSelected(registrations.map(r => r.id));
    }
  };

  const canUpdate = hasPermission('events.update');
  const hasFee = eventInfo && eventInfo.registration_fee && eventInfo.registration_fee > 0;

  const attendedCount = registrations.filter(r => r.attended_at).length;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/eventos')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar aos Eventos
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {eventInfo?.title ?? 'Gerenciar Evento'}
            </h1>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
              {eventInfo && (
                <>
                  <span className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {eventInfo.confirmed_count} confirmados
                    {eventInfo.max_participants ? ` / ${eventInfo.max_participants}` : ''}
                  </span>
                  {hasFee && (
                    <span className="flex items-center gap-1">
                      <DollarSign className="h-4 w-4" />
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(eventInfo.registration_fee!)}
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-1">
          {([
            { id: 'registrations', label: 'Inscrições', icon: Users },
            { id: 'checkin', label: 'Check-in', icon: CheckSquare },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap gap-3">
          <input
            placeholder="Buscar por nome, email ou telefone..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          />
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          >
            <option value="">Todos os status</option>
            <option value="pending">Pendente</option>
            <option value="confirmed">Confirmado</option>
            <option value="attended">Presente</option>
            <option value="cancelled">Cancelado</option>
          </select>
          {hasFee && (
            <select
              value={filterPayment}
              onChange={e => setFilterPayment(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
            >
              <option value="">Todos os pagamentos</option>
              <option value="pending">Pendente</option>
              <option value="paid">Pago</option>
              <option value="refunded">Reembolsado</option>
            </select>
          )}
          <button
            onClick={() => fetchRegistrations()}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Bulk actions */}
      {canUpdate && bulkSelected.length > 0 && (
        <div className="bg-primary-50 border border-primary-200 rounded-xl p-3 mb-4 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-primary-800">{bulkSelected.length} selecionado(s)</span>
          <button
            onClick={() => handleBulkAction('approve')}
            disabled={bulkLoading}
            className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-60"
          >
            <Check className="h-3.5 w-3.5" />
            Confirmar
          </button>
          <button
            onClick={() => handleBulkAction('reject')}
            disabled={bulkLoading}
            className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-60"
          >
            <X className="h-3.5 w-3.5" />
            Cancelar
          </button>
          {hasFee && (
            <button
              onClick={() => handleBulkAction('confirm_payment')}
              disabled={bulkLoading}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-60"
            >
              <CreditCard className="h-3.5 w-3.5" />
              Confirmar Pagto.
            </button>
          )}
          <button
            onClick={() => setBulkSelected([])}
            className="ml-auto text-sm text-primary-600 hover:text-primary-800"
          >
            Desmarcar
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {activeTab === 'checkin' && (
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-gray-700">
                {attendedCount} / {registrations.length} presentes nesta página
              </span>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
          </div>
        ) : registrations.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">
            Nenhuma inscrição encontrada.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {canUpdate && activeTab === 'registrations' && (
                    <th className="w-10 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={bulkSelected.length === registrations.length}
                        onChange={selectAll}
                        className="rounded"
                      />
                    </th>
                  )}
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Nome</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 hidden sm:table-cell">Contato</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Status</th>
                  {hasFee && activeTab === 'registrations' && (
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 hidden md:table-cell">Pagto.</th>
                  )}
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 hidden lg:table-cell">Inscrição</th>
                  {canUpdate && (
                    <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Ações</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {registrations.map(reg => (
                  <tr key={reg.id} className="hover:bg-gray-50 transition-colors">
                    {canUpdate && activeTab === 'registrations' && (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={bulkSelected.includes(reg.id)}
                          onChange={() => toggleBulkSelect(reg.id)}
                          className="rounded"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 text-sm">{reg.name}</div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="text-xs text-gray-500">{reg.email || '—'}</div>
                      <div className="text-xs text-gray-400">{reg.phone || ''}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[reg.status] || 'bg-gray-100 text-gray-600'}`}>
                        {reg.status_label}
                      </span>
                    </td>
                    {hasFee && activeTab === 'registrations' && (
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${PAYMENT_COLORS[reg.payment_status] || 'bg-gray-100 text-gray-600'}`}>
                          {reg.payment_label}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-500">
                      {reg.registered_at}
                    </td>
                    {canUpdate && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {activeTab === 'checkin' ? (
                            <button
                              onClick={() => toggleCheckin(reg)}
                              disabled={actionLoading}
                              className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                reg.attended_at
                                  ? 'bg-green-100 text-green-800 hover:bg-green-200'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              }`}
                            >
                              <UserCheck className="h-3.5 w-3.5" />
                              {reg.attended_at ? 'Presente' : 'Check-in'}
                            </button>
                          ) : (
                            <>
                              {reg.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => setConfirmAction({ type: 'approve', label: 'Confirmar inscrição', reg })}
                                    className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                                    title="Confirmar"
                                  >
                                    <Check className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => setConfirmAction({ type: 'reject', label: 'Cancelar inscrição', reg })}
                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                                    title="Cancelar"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </>
                              )}
                              {reg.status === 'confirmed' && (
                                <button
                                  onClick={() => setConfirmAction({ type: 'reject', label: 'Cancelar inscrição', reg })}
                                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                                  title="Cancelar"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              )}
                              {hasFee && reg.payment_status === 'pending' && reg.status !== 'cancelled' && (
                                <button
                                  onClick={() => setConfirmAction({ type: 'payment', label: 'Confirmar pagamento', reg })}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                                  title="Confirmar pagamento"
                                >
                                  <CreditCard className="h-4 w-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {meta && meta.last_page > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <span className="text-sm text-gray-500">
              Página {meta.current_page} de {meta.last_page} · {meta.total} inscrições
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(p => p - 1)}
                disabled={meta.current_page <= 1}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={meta.current_page >= meta.last_page}
                className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={doAction}
        title={confirmAction?.label ?? ''}
        message={`${confirmAction?.label} para "${confirmAction?.reg.name}"?`}
        confirmLabel="Confirmar"
        loading={actionLoading}
      />
    </div>
  );
}
