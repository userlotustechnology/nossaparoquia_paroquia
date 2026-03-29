import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import DataTable from '@/components/DataTable';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import { PlusCircle } from 'lucide-react';

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

interface AccountPlan {
  id: number;
  name: string;
  code: string;
}

const PERIOD_LABELS: Record<string, string> = {
  monthly: 'Mensal',
  bimonthly: 'Bimestral',
  quarterly: 'Trimestral',
  yearly: 'Anual',
};

const METHOD_LABELS: Record<string, string> = {
  cash: 'Espécie',
  pix: 'PIX',
  bank_transfer: 'Transferência bancária',
  credit_card: 'Cartão de crédito',
  debit_card: 'Cartão de débito',
  boleto: 'Boleto',
};

const fmt = (v: number | null) =>
  v != null
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
    : '—';

const fmtDate = (d: string | null) =>
  d ? new Date(d.slice(0, 10) + 'T00:00:00').toLocaleDateString('pt-BR') : '—';

const today = () => new Date().toISOString().slice(0, 10);

export default function Tithers() {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<Tither[]>([]);
  const [meta, setMeta] = useState<any>();
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  // Dizimista form modal
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

  // Contribuição modal
  const [contribOpen, setContribOpen] = useState(false);
  const [contribSaving, setContribSaving] = useState(false);
  const [accountPlans, setAccountPlans] = useState<AccountPlan[]>([]);
  const [contribForm, setContribForm] = useState({
    tither_id: '',
    paid_at: today(),
    amount: '',
    method: 'pix',
    account_plan_id: '',
    notes: '',
  });
  const [allTithers, setAllTithers] = useState<{ id: number; label: string; suggested: number | null }[]>([]);
  const [tithersLoaded, setTithersLoaded] = useState(false);

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

  const loadContribDeps = async () => {
    if (tithersLoaded) return;
    try {
      const [tRes, aRes] = await Promise.all([
        api.get('/parish-admin/tithers', { params: { per_page: 200, status: 'active' } }),
        api.get('/parish-admin/account-plans', { params: { per_page: 100 } }),
      ]);
      setAllTithers(
        tRes.data.data.map((t: Tither) => ({
          id: t.id,
          label: `${t.parishioner?.name ?? '—'} (#${t.tither_number})`,
          suggested: t.suggested_amount,
        }))
      );
      setAccountPlans(aRes.data.data);
      setTithersLoaded(true);
    } catch (err) {
      console.error(err);
    }
  };

  // ─── Contribuição ─────────────────────────────────────────────────
  const openContrib = async (tither?: Tither) => {
    await loadContribDeps();
    setContribForm({
      tither_id: tither ? String(tither.id) : '',
      paid_at: today(),
      amount: tither?.suggested_amount?.toString() ?? '',
      method: 'pix',
      account_plan_id: '',
      notes: '',
    });
    setContribOpen(true);
  };

  const handleContribSave = async () => {
    setContribSaving(true);
    try {
      await api.post('/parish-admin/tithe-contributions', {
        tither_id: Number(contribForm.tither_id),
        paid_at: contribForm.paid_at,
        amount: parseFloat(contribForm.amount),
        method: contribForm.method,
        account_plan_id: contribForm.account_plan_id ? Number(contribForm.account_plan_id) : null,
        notes: contribForm.notes || null,
      });
      setContribOpen(false);
      fetchData();
    } catch (err: any) {
      const errors = err?.response?.data?.errors;
      const msg = errors
        ? Object.values(errors).flat().join('\n')
        : (err?.response?.data?.message || 'Erro ao registrar contribuição.');
      alert(msg);
    } finally {
      setContribSaving(false);
    }
  };

  // Preencher valor sugerido ao selecionar dizimista
  const handleTitherSelect = (titherId: string) => {
    const t = allTithers.find(t => String(t.id) === titherId);
    setContribForm(prev => ({
      ...prev,
      tither_id: titherId,
      amount: t?.suggested ? String(t.suggested) : prev.amount,
    }));
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

  const canContrib = hasPermission('tithe-contributions.create');

  // ─── render ───────────────────────────────────────────────────────
  return (
    <div>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dizimistas</h1>
          <p className="text-gray-500">Gestão de dizimistas da paróquia</p>
        </div>
        {canContrib && (
          <button
            onClick={() => openContrib()}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg"
          >
            <PlusCircle className="h-4 w-4" />
            Lançar Dízimo
          </button>
        )}
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

      {/* ── Contribuição Modal ──────────────────────────────────────── */}
      <Modal open={contribOpen} onClose={() => setContribOpen(false)} title="Lançar Dízimo" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dizimista *</label>
            <select
              value={contribForm.tither_id}
              onChange={(e) => handleTitherSelect(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
            >
              <option value="">Selecione o dizimista...</option>
              {allTithers.map((t) => (
                <option key={t.id} value={t.id}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data do Pagamento *</label>
              <input
                type="date"
                value={contribForm.paid_at}
                onChange={(e) => setContribForm({ ...contribForm, paid_at: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={contribForm.amount}
                onChange={(e) => setContribForm({ ...contribForm, amount: e.target.value })}
                placeholder="0,00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Forma de Pagamento *</label>
            <select
              value={contribForm.method}
              onChange={(e) => setContribForm({ ...contribForm, method: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
            >
              {Object.entries(METHOD_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>

          {accountPlans.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plano de Contas</label>
              <select
                value={contribForm.account_plan_id}
                onChange={(e) => setContribForm({ ...contribForm, account_plan_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
              >
                <option value="">— Nenhum —</option>
                {accountPlans.map((a) => (
                  <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
            <textarea
              value={contribForm.notes}
              onChange={(e) => setContribForm({ ...contribForm, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={() => setContribOpen(false)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleContribSave}
            disabled={contribSaving || !contribForm.tither_id || !contribForm.paid_at || !contribForm.amount}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-green-300 rounded-lg"
          >
            {contribSaving ? 'Salvando...' : 'Registrar Dízimo'}
          </button>
        </div>
      </Modal>

      {/* ── Form Modal (dizimista) ──────────────────────────────────── */}
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
