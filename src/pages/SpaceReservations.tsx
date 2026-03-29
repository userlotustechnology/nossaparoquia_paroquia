import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Plus, ChevronLeft, ChevronRight, RefreshCw, Building2 } from 'lucide-react';

interface Space {
  id: number;
  name: string;
}

interface Reservation {
  id: number;
  space_id: number;
  space_name: string;
  requester_name: string;
  requester_phone: string | null;
  purpose: string;
  starts_at: string;
  ends_at: string;
  status: string;
  status_label: string;
  notes: string | null;
}

interface Meta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

const STATUS_COLORS: Record<string, string> = {
  pending:   'bg-yellow-100 text-yellow-800',
  approved:  'bg-green-100 text-green-800',
  rejected:  'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-500',
  finished:  'bg-blue-100 text-blue-800',
};

const STATUS_LABELS: Record<string, string> = {
  pending:   'Pendente',
  approved:  'Aprovada',
  rejected:  'Recusada',
  cancelled: 'Cancelada',
  finished:  'Finalizada',
};

const fmtDt = (v: string) =>
  new Date(v).toLocaleString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function SpaceReservations() {
  const { hasPermission } = useAuth();
  const [data, setData] = useState<Reservation[]>([]);
  const [meta, setMeta] = useState<Meta | null>(null);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSpace, setFilterSpace] = useState('');

  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const [selected, setSelected] = useState<Reservation | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    space_id: '',
    requester_name: '',
    requester_phone: '',
    purpose: '',
    starts_at: '',
    ends_at: '',
    notes: '',
  });
  const [newStatus, setNewStatus] = useState('');

  const fetchSpaces = useCallback(async () => {
    try {
      const res = await api.get('/parish-admin/spaces', { params: { per_page: 100 } });
      setSpaces(res.data.data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/parish-admin/space-reservations', {
        params: {
          page,
          search: search || undefined,
          status: filterStatus || undefined,
          space_id: filterSpace || undefined,
        },
      });
      setData(res.data.data);
      setMeta(res.data.meta);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search, filterStatus, filterSpace]);

  useEffect(() => { fetchSpaces(); }, [fetchSpaces]);
  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [search, filterStatus, filterSpace]);

  const openCreate = () => {
    setSelected(null);
    setForm({ space_id: spaces[0]?.id.toString() || '', requester_name: '', requester_phone: '', purpose: '', starts_at: '', ends_at: '', notes: '' });
    setFormOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/parish-admin/space-reservations', {
        ...form,
        space_id: Number(form.space_id),
      });
      setFormOpen(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      const errors = err?.response?.data?.errors;
      const msg = errors
        ? Object.values(errors).flat().join('\n')
        : (err?.response?.data?.message || 'Erro ao salvar reserva.');
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async () => {
    if (!selected || !newStatus) return;
    setSaving(true);
    try {
      await api.patch(`/parish-admin/space-reservations/${selected.id}/status`, { status: newStatus });
      setStatusOpen(false);
      setSelected(null);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Erro ao atualizar status.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await api.delete(`/parish-admin/space-reservations/${selected.id}`);
      setDeleteOpen(false);
      setSelected(null);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir reserva.');
    } finally {
      setSaving(false);
    }
  };

  const canUpdate = hasPermission('spaces.update');
  const canCreate = hasPermission('spaces.create');
  const canDelete = hasPermission('spaces.delete');

  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reservas de Espaço</h1>
          <p className="text-gray-500">Gerencie as reservas dos espaços da paróquia</p>
        </div>
        {canCreate && (
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg"
          >
            <Plus className="h-4 w-4" />
            Nova Reserva
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap gap-3">
          <input
            placeholder="Buscar por solicitante ou finalidade..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          />
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          >
            <option value="">Todos os status</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          {spaces.length > 0 && (
            <select
              value={filterSpace}
              onChange={e => setFilterSpace(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
            >
              <option value="">Todos os espaços</option>
              {spaces.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          )}
          <button
            onClick={() => fetchData()}
            className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
          </div>
        ) : data.length === 0 ? (
          <div className="text-center py-16">
            <Building2 className="h-10 w-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Nenhuma reserva encontrada.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Espaço</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Solicitante</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 hidden md:table-cell">Finalidade</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 hidden lg:table-cell">Período</th>
                  <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Status</th>
                  {(canUpdate || canDelete) && (
                    <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Ações</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map(res => (
                  <tr key={res.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-medium text-gray-900 text-sm">{res.space_name}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-900">{res.requester_name}</div>
                      {res.requester_phone && (
                        <div className="text-xs text-gray-500">{res.requester_phone}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="text-sm text-gray-600 max-w-xs truncate">{res.purpose}</div>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-xs text-gray-500">
                      <div>{fmtDt(res.starts_at)}</div>
                      <div>{fmtDt(res.ends_at)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[res.status] || 'bg-gray-100 text-gray-600'}`}>
                        {res.status_label}
                      </span>
                    </td>
                    {(canUpdate || canDelete) && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {canUpdate && (
                            <button
                              onClick={() => { setSelected(res); setNewStatus(res.status); setStatusOpen(true); }}
                              className="text-xs px-2.5 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
                            >
                              Status
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => { setSelected(res); setDeleteOpen(true); }}
                              className="text-xs px-2.5 py-1 border border-red-200 rounded-lg hover:bg-red-50 text-red-600"
                            >
                              Excluir
                            </button>
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
              Página {meta.current_page} de {meta.last_page} · {meta.total} reservas
            </span>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(p => p - 1)} disabled={meta.current_page <= 1} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button onClick={() => setPage(p => p + 1)} disabled={meta.current_page >= meta.last_page} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title="Nova Reserva" size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Espaço *</label>
            <select
              value={form.space_id}
              onChange={e => setForm({ ...form, space_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
            >
              <option value="">Selecione...</option>
              {spaces.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Solicitante *</label>
            <input
              value={form.requester_name}
              onChange={e => setForm({ ...form, requester_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
            <input
              value={form.requester_phone}
              onChange={e => setForm({ ...form, requester_phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Finalidade *</label>
            <textarea
              value={form.purpose}
              onChange={e => setForm({ ...form, purpose: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Início *</label>
            <input
              type="datetime-local"
              value={form.starts_at}
              onChange={e => setForm({ ...form, starts_at: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Término *</label>
            <input
              type="datetime-local"
              value={form.ends_at}
              onChange={e => setForm({ ...form, ends_at: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
            <textarea
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
          <button onClick={() => setFormOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.space_id || !form.requester_name || !form.purpose || !form.starts_at || !form.ends_at}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 rounded-lg"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </Modal>

      {/* Change Status Modal */}
      <Modal open={statusOpen} onClose={() => setStatusOpen(false)} title="Alterar Status da Reserva" size="sm">
        <p className="text-sm text-gray-600 mb-4">
          Reserva de <strong>{selected?.requester_name}</strong> para <strong>{selected?.space_name}</strong>
        </p>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Novo Status</label>
          <select
            value={newStatus}
            onChange={e => setNewStatus(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
          >
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
          <button onClick={() => setStatusOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={handleStatusChange}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 rounded-lg"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Excluir Reserva"
        message={`Excluir a reserva de "${selected?.requester_name}" para "${selected?.space_name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        loading={saving}
      />
    </div>
  );
}
