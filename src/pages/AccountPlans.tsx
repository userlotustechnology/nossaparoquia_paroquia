import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import DataTable from '@/components/DataTable';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';

interface AccountPlan {
  id: number;
  code: string;
  name: string;
  type: string;
  parent_id: number | null;
  parent?: { id: number; name: string };
  is_active: boolean;
  parish_id: number;
}

const TYPE_LABELS: Record<string, string> = {
  revenue: 'Receita',
  expense: 'Despesa',
};

const TYPE_COLORS: Record<string, string> = {
  revenue: 'bg-green-100 text-green-800',
  expense: 'bg-red-100 text-red-800',
};

export default function AccountPlans() {
  const { hasPermission } = useAuth();
  const [data, setData] = useState<AccountPlan[]>([]);
  const [meta, setMeta] = useState<any>();
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<AccountPlan | null>(null);
  const [saving, setSaving] = useState(false);
  const [plans, setPlans] = useState<AccountPlan[]>([]);
  const [form, setForm] = useState({
    code: '',
    name: '',
    type: 'revenue',
    parent_id: '',
    is_active: true,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/parish-admin/account-plans', {
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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const loadPlans = async () => {
    if (plans.length > 0) return;
    try {
      const res = await api.get('/parish-admin/account-plans', {
        params: { per_page: 200 },
      });
      setPlans(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const openCreate = async () => {
    await loadPlans();
    setSelected(null);
    setForm({
      code: '',
      name: '',
      type: 'revenue',
      parent_id: '',
      is_active: true,
    });
    setFormOpen(true);
  };

  const openEdit = async (item: AccountPlan) => {
    await loadPlans();
    setSelected(item);
    setForm({
      code: item.code || '',
      name: item.name || '',
      type: item.type || 'revenue',
      parent_id: item.parent_id?.toString() || '',
      is_active: item.is_active,
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        parent_id: form.parent_id ? parseInt(form.parent_id) : null,
      };
      if (selected) {
        await api.put(`/parish-admin/account-plans/${selected.id}`, payload);
      } else {
        await api.post('/parish-admin/account-plans', payload);
      }
      setFormOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar plano de contas.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await api.delete(`/parish-admin/account-plans/${selected.id}`);
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
      key: 'code',
      label: 'Código',
      render: (a: AccountPlan) => (
        <span className="text-xs font-mono text-gray-500">{a.code}</span>
      ),
    },
    {
      key: 'name',
      label: 'Nome',
      render: (a: AccountPlan) => (
        <span className="font-medium text-gray-900">{a.name}</span>
      ),
    },
    {
      key: 'type',
      label: 'Tipo',
      render: (a: AccountPlan) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
            TYPE_COLORS[a.type] || 'bg-gray-100 text-gray-800'
          }`}
        >
          {TYPE_LABELS[a.type] || a.type}
        </span>
      ),
    },
    {
      key: 'parent',
      label: 'Conta Superior',
      render: (a: AccountPlan) => a.parent?.name || '—',
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (a: AccountPlan) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
            a.is_active
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-500'
          }`}
        >
          {a.is_active ? 'Ativa' : 'Inativa'}
        </span>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Plano de Contas</h1>
        <p className="text-gray-500">Gerencie o plano de contas da paróquia</p>
      </div>

      <DataTable
        title="Lista de Contas"
        columns={columns}
        data={data}
        loading={loading}
        meta={meta}
        onPageChange={setPage}
        onSearch={setSearch}
        onCreate={hasPermission('account-plans.create') ? openCreate : undefined}
        onEdit={
          hasPermission('account-plans.update')
            ? openEdit
            : undefined
        }
        onDelete={
          hasPermission('account-plans.delete')
            ? (item) => {
                setSelected(item);
                setDeleteOpen(true);
              }
            : undefined
        }
        canCreate={hasPermission('account-plans.create')}
        canEdit={hasPermission('account-plans.update')}
        canDelete={hasPermission('account-plans.delete')}
        createLabel="Nova Conta"
        searchPlaceholder="Buscar contas..."
        keyExtractor={(a) => a.id}
      />

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={selected ? 'Editar Conta' : 'Nova Conta'}
        size="lg"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Código *
            </label>
            <input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value })}
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
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome *
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Conta Superior
            </label>
            <select
              value={form.parent_id}
              onChange={(e) =>
                setForm({ ...form, parent_id: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
            >
              <option value="">Nenhuma</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="active"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="h-4 w-4 text-primary-600 border-gray-300 rounded"
            />
            <label htmlFor="active" className="text-sm text-gray-700">
              Ativa
            </label>
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
            disabled={saving || !form.code || !form.name}
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
        title="Excluir Conta"
        message={`Excluir "${selected?.name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        loading={saving}
      />
    </div>
  );
}
