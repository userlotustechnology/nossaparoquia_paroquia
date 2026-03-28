import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import DataTable from '@/components/DataTable';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';

interface Space {
  id: number;
  name: string;
  type: string;
  description: string | null;
  capacity: number | null;
  is_active: boolean;
  parish_id: number;
}

const TYPE_LABELS: Record<string, string> = {
  hall: 'Salão',
  chapel: 'Capela',
  classroom: 'Sala de Aula',
  office: 'Secretaria',
  courtyard: 'Pátio',
  other: 'Outro',
};

const TYPE_COLORS: Record<string, string> = {
  hall: 'bg-orange-100 text-orange-800',
  chapel: 'bg-purple-100 text-purple-800',
  classroom: 'bg-blue-100 text-blue-800',
  office: 'bg-green-100 text-green-800',
  courtyard: 'bg-yellow-100 text-yellow-800',
  other: 'bg-gray-100 text-gray-800',
};

export default function Spaces() {
  const { hasPermission } = useAuth();
  const [data, setData] = useState<Space[]>([]);
  const [meta, setMeta] = useState<any>();
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<Space | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    type: 'hall',
    description: '',
    capacity: '',
    is_active: true,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/parish-admin/spaces', {
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
      type: 'hall',
      description: '',
      capacity: '',
      is_active: true,
    });
    setFormOpen(true);
  };

  const openEdit = (item: Space) => {
    setSelected(item);
    setForm({
      name: item.name || '',
      type: item.type || 'hall',
      description: item.description || '',
      capacity: item.capacity?.toString() || '',
      is_active: item.is_active,
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        capacity: form.capacity ? parseInt(form.capacity) : null,
      };
      if (selected) {
        await api.put(`/parish-admin/spaces/${selected.id}`, payload);
      } else {
        await api.post('/parish-admin/spaces', payload);
      }
      setFormOpen(false);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar espaço.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await api.delete(`/parish-admin/spaces/${selected.id}`);
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
      render: (s: Space) => (
        <span className="font-medium text-gray-900">{s.name}</span>
      ),
    },
    {
      key: 'type',
      label: 'Tipo',
      render: (s: Space) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
            TYPE_COLORS[s.type] || 'bg-gray-100 text-gray-800'
          }`}
        >
          {TYPE_LABELS[s.type] || s.type}
        </span>
      ),
    },
    {
      key: 'capacity',
      label: 'Capacidade',
      render: (s: Space) => s.capacity ? `${s.capacity} pessoas` : '—',
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (s: Space) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
            s.is_active
              ? 'bg-green-100 text-green-800'
              : 'bg-gray-100 text-gray-500'
          }`}
        >
          {s.is_active ? 'Ativo' : 'Inativo'}
        </span>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Espaços</h1>
        <p className="text-gray-500">Gerencie os espaços da paróquia</p>
      </div>

      <DataTable
        title="Lista de Espaços"
        columns={columns}
        data={data}
        loading={loading}
        meta={meta}
        onPageChange={setPage}
        onSearch={setSearch}
        onCreate={hasPermission('spaces.create') ? openCreate : undefined}
        onEdit={
          hasPermission('spaces.update')
            ? openEdit
            : undefined
        }
        onDelete={
          hasPermission('spaces.delete')
            ? (item) => {
                setSelected(item);
                setDeleteOpen(true);
              }
            : undefined
        }
        canCreate={hasPermission('spaces.create')}
        canEdit={hasPermission('spaces.update')}
        canDelete={hasPermission('spaces.delete')}
        createLabel="Novo Espaço"
        searchPlaceholder="Buscar espaços..."
        keyExtractor={(s) => s.id}
      />

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={selected ? 'Editar Espaço' : 'Novo Espaço'}
        size="lg"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Capacidade
            </label>
            <input
              type="number"
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
            />
          </div>
          <div className="sm:col-span-2">
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
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="space_active"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="h-4 w-4 text-primary-600 border-gray-300 rounded"
            />
            <label htmlFor="space_active" className="text-sm text-gray-700">
              Espaço ativo
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
        title="Excluir Espaço"
        message={`Excluir "${selected?.name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        loading={saving}
      />
    </div>
  );
}
