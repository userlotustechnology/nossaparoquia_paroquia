import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import DataTable from '@/components/DataTable';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';

interface Pastoral {
  id: number;
  name: string;
  description: string | null;
  requires_approval: boolean;
  is_active: boolean;
  members_count?: number;
  parish_id: number;
}

export default function Pastorals() {
  const { hasPermission } = useAuth();
  const [data, setData] = useState<Pastoral[]>([]);
  const [meta, setMeta] = useState<any>();
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<Pastoral | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    requires_approval: false,
    is_active: true,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/parish-admin/pastorals', {
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

  const openCreate = () => {
    setSelected(null);
    setForm({
      name: '',
      description: '',
      requires_approval: false,
      is_active: true,
    });
    setFormOpen(true);
  };

  const openEdit = (item: Pastoral) => {
    setSelected(item);
    setForm({
      name: item.name || '',
      description: item.description || '',
      requires_approval: item.requires_approval,
      is_active: item.is_active,
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (selected) {
        await api.put(`/parish-admin/pastorals/${selected.id}`, form);
      } else {
        await api.post('/parish-admin/pastorals', form);
      }
      setFormOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar pastoral.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await api.delete(`/parish-admin/pastorals/${selected.id}`);
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
      key: 'name',
      label: 'Nome',
      render: (p: Pastoral) => (
        <span className="font-medium text-gray-900">{p.name}</span>
      ),
    },
    {
      key: 'members_count',
      label: 'Membros',
      render: (p: Pastoral) => (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
          {p.members_count ?? 0}
        </span>
      ),
    },
    {
      key: 'requires_approval',
      label: 'Requer Aprovação',
      render: (p: Pastoral) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
            p.requires_approval
              ? 'bg-yellow-100 text-yellow-800'
              : 'bg-green-100 text-green-800'
          }`}
        >
          {p.requires_approval ? 'Sim' : 'Não'}
        </span>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (p: Pastoral) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
            p.is_active
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-500'
          }`}
        >
          {p.is_active ? 'Ativa' : 'Inativa'}
        </span>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Pastorais</h1>
        <p className="text-gray-500">Gerencie as pastorais da paróquia</p>
      </div>

      <DataTable
        title="Lista de Pastorais"
        columns={columns}
        data={data}
        loading={loading}
        meta={meta}
        onPageChange={setPage}
        onSearch={setSearch}
        onCreate={hasPermission('pastorals.create') ? openCreate : undefined}
        onEdit={
          hasPermission('pastorals.update')
            ? openEdit
            : undefined
        }
        onDelete={
          hasPermission('pastorals.delete')
            ? (item) => {
                setSelected(item);
                setDeleteOpen(true);
              }
            : undefined
        }
        canCreate={hasPermission('pastorals.create')}
        canEdit={hasPermission('pastorals.update')}
        canDelete={hasPermission('pastorals.delete')}
        createLabel="Nova Pastoral"
        searchPlaceholder="Buscar pastorais..."
        keyExtractor={(p) => p.id}
      />

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={selected ? 'Editar Pastoral' : 'Nova Pastoral'}
        size="lg"
      >
        <div className="grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nome *
            </label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descrição
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
            />
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="requires_approval"
                checked={form.requires_approval}
                onChange={(e) =>
                  setForm({ ...form, requires_approval: e.target.checked })
                }
                className="h-4 w-4 text-primary-600 border-gray-300 rounded"
              />
              <label htmlFor="requires_approval" className="text-sm text-gray-700">
                Requer aprovação para participação
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="pastoral_active"
                checked={form.is_active}
                onChange={(e) =>
                  setForm({ ...form, is_active: e.target.checked })
                }
                className="h-4 w-4 text-primary-600 border-gray-300 rounded"
              />
              <label htmlFor="pastoral_active" className="text-sm text-gray-700">
                Pastoral ativa
              </label>
            </div>
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
            disabled={saving || !form.name}
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
        title="Excluir Pastoral"
        message={`Excluir "${selected?.name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        loading={saving}
      />
    </div>
  );
}
