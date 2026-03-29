import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import DataTable from '@/components/DataTable';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';

interface Tither {
  id: number;
  tither_number: string;
  parishioner_id: number;
  parishioner?: { id: number; name: string; phone: string | null; email: string | null };
  joined_at: string;
  periodicity: string;
  suggested_amount: number | null;
  status: string;
  notes: string | null;
  preferred_day: number | null;
  reminder_enabled: boolean;
  parish_id: number;
}

interface ParishionerOption {
  id: number;
  name: string;
}

const PERIOD_LABELS: Record<string, string> = {
  monthly: 'Mensal',
  bimonthly: 'Bimestral',
  quarterly: 'Trimestral',
  yearly: 'Anual',
};

const fmt = (v: number | null) =>
  v != null
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
    : '—';

const fmtDate = (d: string | null) =>
  d ? new Date(d.slice(0, 10) + 'T00:00:00').toLocaleDateString('pt-BR') : '—';

export default function Tithers() {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<Tither[]>([]);
  const [meta, setMeta] = useState<any>();
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  // form modal
  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState<Tither | null>(null);
  const [saving, setSaving] = useState(false);
  const [parishioners, setParishioners] = useState<ParishionerOption[]>([]);
  const [form, setForm] = useState({
    parishioner_id: '',
    joined_at: '',
    periodicity: 'monthly',
    suggested_amount: '',
    status: 'active',
    preferred_day: '',
    reminder_enabled: true,
    notes: '',
  });

  // delete
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Tither | null>(null);

  // ─── fetch list ───────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/parish-admin/tithers', {
        params: { page, search: search || undefined },
      });
      setData(res.data.data);
      setMeta(res.data.meta);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [search]);

  // ─── helpers ──────────────────────────────────────────────────────
  const loadParishioners = async () => {
    if (parishioners.length > 0) return;
    try {
      const res = await api.get('/parish-admin/parishioners', { params: { per_page: 200 } });
      setParishioners(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  // ─── create / edit ────────────────────────────────────────────────
  const openCreate = async () => {
    await loadParishioners();
    setSelected(null);
    setForm({ parishioner_id: '', joined_at: '', periodicity: 'monthly', suggested_amount: '', status: 'active', preferred_day: '', reminder_enabled: true, notes: '' });
    setFormOpen(true);
  };

  const openEdit = async (item: Tither) => {
    await loadParishioners();
    setSelected(item);
    setForm({
      parishioner_id: String(item.parishioner_id),
      joined_at: item.joined_at ? item.joined_at.slice(0, 10) : '',
      periodicity: item.periodicity,
      suggested_amount: item.suggested_amount?.toString() || '',
      status: item.status,
      preferred_day: item.preferred_day?.toString() || '',
      reminder_enabled: item.reminder_enabled,
      notes: item.notes || '',
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        joined_at: form.joined_at,
        suggested_amount: form.suggested_amount ? parseFloat(form.suggested_amount) : null,
        preferred_day: form.preferred_day ? parseInt(form.preferred_day) : null,
      };
      if (selected) {
        await api.put(`/parish-admin/tithers/${selected.id}`, payload);
      } else {
        await api.post('/parish-admin/tithers', payload);
      }
      setFormOpen(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      const errors = err?.response?.data?.errors;
      const msg = errors ? Object.values(errors).flat().join('\n') : 'Erro ao salvar dizimista.';
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  // ─── delete ───────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await api.delete(`/parish-admin/tithers/${deleteTarget.id}`);
      setDeleteOpen(false);
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir.');
    } finally {
      setSaving(false);
    }
  };

  // ─── table columns ────────────────────────────────────────────────
  const columns = [
    {
      key: 'tither_number',
      label: 'Nº',
      render: (t: Tither) => <span className="text-xs font-mono text-gray-500">#{t.tither_number}</span>,
    },
    {
      key: 'parishioner',
      label: 'Dizimista',
      render: (t: Tither) => <span className="font-medium text-gray-900">{t.parishioner?.name || '—'}</span>,
    },
    {
      key: 'joined_at',
      label: 'Adesão',
      render: (t: Tither) => fmtDate(t.joined_at),
    },
    {
      key: 'preferred_day',
      label: 'Dia Preferido',
      render: (t: Tither) => t.preferred_day ? `Dia ${t.preferred_day}` : '—',
    },
    {
      key: 'periodicity',
      label: 'Periodicidade',
      render: (t: Tither) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
          {PERIOD_LABELS[t.periodicity] || t.periodicity}
        </span>
      ),
    },
    {
      key: 'suggested_amount',
      label: 'Valor Sugerido',
      render: (t: Tither) => fmt(t.suggested_amount),
    },
    {
      key: 'status',
      label: 'Status',
      render: (t: Tither) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${t.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
          {t.status === 'active' ? 'Ativo' : 'Inativo'}
        </span>
      ),
    },
  ];

  // ─── render ───────────────────────────────────────────────────────
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dizimistas</h1>
        <p className="text-gray-500">Gestão de dizimistas da paróquia</p>
      </div>

      <DataTable
        title="Lista de Dizimistas"
        columns={columns}
        data={data}
        loading={loading}
        meta={meta}
        onPageChange={setPage}
        onSearch={setSearch}
        onCreate={hasPermission('tithers.create') ? openCreate : undefined}
        onView={(item) => navigate(`/dizimistas/${item.id}`)}
        onEdit={hasPermission('tithers.update') ? openEdit : undefined}
        onDelete={
          hasPermission('tithers.delete')
            ? (item) => { setDeleteTarget(item); setDeleteOpen(true); }
            : undefined
        }
        canCreate={hasPermission('tithers.create')}
        canEdit={hasPermission('tithers.update')}
        canDelete={hasPermission('tithers.delete')}
        createLabel="Novo Dizimista"
        searchPlaceholder="Buscar dizimistas..."
        keyExtractor={(t) => t.id}
      />

      {/* ── Form Modal ─────────────────────────────────────────────── */}
      <Modal open={formOpen} onClose={() => setFormOpen(false)} title={selected ? 'Editar Dizimista' : 'Novo Dizimista'} size="lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Paroquiano *</label>
            <select
              value={form.parishioner_id}
              onChange={(e) => setForm({ ...form, parishioner_id: e.target.value })}
              disabled={!!selected}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm disabled:bg-gray-50"
            >
              <option value="">Selecione...</option>
              {parishioners.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data de Adesão *</label>
            <input
              type="date"
              value={form.joined_at}
              onChange={(e) => setForm({ ...form, joined_at: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Periodicidade *</label>
            <select
              value={form.periodicity}
              onChange={(e) => setForm({ ...form, periodicity: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
            >
              {Object.entries(PERIOD_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valor Sugerido</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.suggested_amount}
              onChange={(e) => setForm({ ...form, suggested_amount: e.target.value })}
              placeholder="R$ 0,00"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
            >
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dia de Preferência</label>
            <input
              type="number"
              min="1"
              max="31"
              value={form.preferred_day}
              onChange={(e) => setForm({ ...form, preferred_day: e.target.value })}
              placeholder="1–31"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
            />
          </div>
          <div className="sm:col-span-2 flex items-center gap-2">
            <input
              type="checkbox"
              id="reminder"
              checked={form.reminder_enabled}
              onChange={(e) => setForm({ ...form, reminder_enabled: e.target.checked })}
              className="h-4 w-4 text-primary-600 border-gray-300 rounded"
            />
            <label htmlFor="reminder" className="text-sm text-gray-700">Enviar lembrete de dízimo</label>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
          <button onClick={() => setFormOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !form.parishioner_id || !form.joined_at}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 rounded-lg"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </Modal>

      {/* ── Confirm Delete ─────────────────────────────────────────── */}
      <ConfirmDialog
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        onConfirm={handleDelete}
        title="Excluir Dizimista"
        message={`Excluir "${deleteTarget?.parishioner?.name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        loading={saving}
      />
    </div>
  );
}
