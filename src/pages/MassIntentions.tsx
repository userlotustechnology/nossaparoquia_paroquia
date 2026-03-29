import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import DataTable from '@/components/DataTable';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';

interface MassOption {
  id: number;
  title: string;
  date: string | null;
  time: string | null;
}

interface MassIntention {
  id: number;
  mass_id: number | null;
  mass?: MassOption | null;
  requester_name: string;
  intention_text: string;
  intention_for: string | null;
  type: string;
  requested_date: string;
  status: string;
  notes: string | null;
  parish_id: number;
}

const TYPE_LABELS: Record<string, string> = {
  thanksgiving: 'Ação de Graças',
  deceased: 'Por Falecido',
  health: 'Pela Saúde',
  alive: 'Por Pessoa Viva',
  special: 'Intenção Especial',
  other: 'Outra',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  scheduled: 'Agendada',
  celebrated: 'Celebrada',
  cancelled: 'Cancelada',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  scheduled: 'bg-blue-100 text-blue-800',
  celebrated: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-500',
};

const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : '';

export default function MassIntentions() {
  const { hasPermission } = useAuth();
  const [data, setData] = useState<MassIntention[]>([]);
  const [meta, setMeta] = useState<any>();
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<MassIntention | null>(null);
  const [saving, setSaving] = useState(false);
  const [masses, setMasses] = useState<MassOption[]>([]);
  const [form, setForm] = useState({
    mass_id: '',
    requester_name: '',
    intention_text: '',
    intention_for: '',
    type: 'thanksgiving',
    requested_date: '',
    status: 'pending',
    notes: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/parish-admin/mass-intentions', {
        params: {
          page,
          search: search || undefined,
          status: statusFilter || undefined,
        },
      });
      setData(res.data.data);
      setMeta(res.data.meta);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  const loadMasses = async () => {
    try {
      const res = await api.get('/parish-admin/masses', {
        params: { per_page: 200, is_active: true },
      });
      setMasses(
        (res.data.data as any[]).map((m) => ({
          id: m.id,
          title: m.title,
          date: m.date,
          time: m.time,
        }))
      );
    } catch {
      /* ignore */
    }
  };

  const openCreate = async () => {
    setSelected(null);
    setForm({
      mass_id: '',
      requester_name: '',
      intention_text: '',
      intention_for: '',
      type: 'thanksgiving',
      requested_date: new Date().toISOString().slice(0, 10),
      status: 'pending',
      notes: '',
    });
    await loadMasses();
    setFormOpen(true);
  };

  const openEdit = async (item: MassIntention) => {
    setSelected(item);
    setForm({
      mass_id: item.mass_id ? String(item.mass_id) : '',
      requester_name: item.requester_name || '',
      intention_text: item.intention_text || '',
      intention_for: item.intention_for || '',
      type: item.type || 'thanksgiving',
      requested_date: item.requested_date ? item.requested_date.slice(0, 10) : '',
      status: item.status || 'pending',
      notes: item.notes || '',
    });
    await loadMasses();
    setFormOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        mass_id: form.mass_id ? parseInt(form.mass_id) : null,
      };
      if (selected) {
        await api.put(`/parish-admin/mass-intentions/${selected.id}`, payload);
      } else {
        await api.post('/parish-admin/mass-intentions', payload);
      }
      setFormOpen(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      const errors = err?.response?.data?.errors;
      const msg = errors
        ? Object.values(errors).flat().join('\n')
        : (err?.response?.data?.message || 'Erro ao salvar intenção.');
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await api.delete(`/parish-admin/mass-intentions/${selected.id}`);
      setDeleteOpen(false);
      setSelected(null);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir.');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      key: 'requester_name',
      label: 'Solicitante',
      render: (m: MassIntention) => (
        <span className="font-medium text-gray-900">{m.requester_name}</span>
      ),
    },
    {
      key: 'intention_for',
      label: 'Intenção Por',
      render: (m: MassIntention) => m.intention_for || '—',
    },
    {
      key: 'mass',
      label: 'Missa',
      render: (m: MassIntention) =>
        m.mass ? (
          <span className="text-sm text-gray-700">
            {m.mass.title}
            {m.mass.date && (
              <span className="text-gray-400 ml-1">({fmtDate(m.mass.date)})</span>
            )}
          </span>
        ) : (
          <span className="text-gray-400">Não vinculada</span>
        ),
    },
    {
      key: 'type',
      label: 'Tipo',
      render: (m: MassIntention) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
          {TYPE_LABELS[m.type] || m.type}
        </span>
      ),
    },
    {
      key: 'requested_date',
      label: 'Data',
      render: (m: MassIntention) => fmtDate(m.requested_date),
    },
    {
      key: 'status',
      label: 'Status',
      render: (m: MassIntention) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
            STATUS_COLORS[m.status] || 'bg-gray-100 text-gray-800'
          }`}
        >
          {STATUS_LABELS[m.status] || m.status}
        </span>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Intenções de Missa</h1>
        <p className="text-gray-500">Gerencie as intenções das missas</p>
      </div>

      {/* Filtro por status */}
      <div className="mb-4 flex gap-2 flex-wrap">
        {[
          { value: '', label: 'Todos' },
          { value: 'pending', label: 'Pendentes' },
          { value: 'scheduled', label: 'Agendadas' },
          { value: 'celebrated', label: 'Celebradas' },
          { value: 'cancelled', label: 'Canceladas' },
        ].map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
              statusFilter === opt.value
                ? 'bg-primary-500 text-white border-primary-500'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <DataTable
        title="Registros de Intenções"
        columns={columns}
        data={data}
        loading={loading}
        meta={meta}
        onPageChange={setPage}
        onSearch={setSearch}
        onCreate={hasPermission('mass-intentions.create') ? openCreate : undefined}
        onEdit={hasPermission('mass-intentions.update') ? openEdit : undefined}
        onDelete={
          hasPermission('mass-intentions.delete')
            ? (item) => {
                setSelected(item);
                setDeleteOpen(true);
              }
            : undefined
        }
        canCreate={hasPermission('mass-intentions.create')}
        canEdit={hasPermission('mass-intentions.update')}
        canDelete={hasPermission('mass-intentions.delete')}
        createLabel="Nova Intenção"
        searchPlaceholder="Buscar por solicitante..."
        keyExtractor={(m) => m.id}
      />

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={selected ? 'Editar Intenção' : 'Nova Intenção'}
        size="lg"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Missa (opcional)
            </label>
            <select
              value={form.mass_id}
              onChange={(e) => setForm({ ...form, mass_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
            >
              <option value="">Nenhuma missa vinculada</option>
              {masses.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                  {m.date ? ` — ${fmtDate(m.date)}` : ''}
                  {m.time ? ` às ${m.time.slice(0, 5)}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Solicitante *
            </label>
            <input
              value={form.requester_name}
              onChange={(e) => setForm({ ...form, requester_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo *
            </label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
            >
              {Object.entries(TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
            >
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Intenção Por
            </label>
            <input
              value={form.intention_for}
              onChange={(e) => setForm({ ...form, intention_for: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Solicitada *
            </label>
            <input
              type="date"
              value={form.requested_date}
              onChange={(e) => setForm({ ...form, requested_date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Texto da Intenção *
            </label>
            <textarea
              value={form.intention_text}
              onChange={(e) => setForm({ ...form, intention_text: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Observações
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={() => setFormOpen(false)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.requester_name || !form.intention_text || !form.requested_date}
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
        title="Excluir Intenção"
        message="Excluir esta intenção de missa? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        loading={saving}
      />
    </div>
  );
}
