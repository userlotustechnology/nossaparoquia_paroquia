import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import DataTable from '@/components/DataTable';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';

interface MassTemplate {
  id: number;
  name: string;
  day_of_week: number;
  time: string;
  location: string | null;
  is_active: boolean;
  parish_id: number;
}

const DAY_LABELS: Record<number, string> = {
  0: 'Domingo',
  1: 'Segunda',
  2: 'Terça',
  3: 'Quarta',
  4: 'Quinta',
  5: 'Sexta',
  6: 'Sábado',
};

export default function MassTemplates() {
  const { hasPermission } = useAuth();
  const [data, setData] = useState<MassTemplate[]>([]);
  const [meta, setMeta] = useState<any>();
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<MassTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    day_of_week: '0',
    time: '',
    location: '',
    is_active: true,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/parish-admin/mass-templates', {
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

  const openCreate = () => {
    setSelected(null);
    setForm({ name: '', day_of_week: '0', time: '', location: '', is_active: true });
    setFormOpen(true);
  };

  const openEdit = (item: MassTemplate) => {
    setSelected(item);
    setForm({
      name: item.name || '',
      day_of_week: String(item.day_of_week),
      time: item.time || '',
      location: item.location || '',
      is_active: item.is_active,
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        day_of_week: parseInt(form.day_of_week),
      };
      if (selected) {
        await api.put(`/parish-admin/mass-templates/${selected.id}`, payload);
      } else {
        await api.post('/parish-admin/mass-templates', payload);
      }
      setFormOpen(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      const errors = err?.response?.data?.errors;
      const msg = errors
        ? Object.values(errors).flat().join('\n')
        : (err?.response?.data?.message || 'Erro ao salvar modelo.');
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await api.delete(`/parish-admin/mass-templates/${selected.id}`);
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
      render: (m: MassTemplate) => <span className="font-medium text-gray-900">{m.name}</span>,
    },
    {
      key: 'day_of_week',
      label: 'Dia da Semana',
      render: (m: MassTemplate) => DAY_LABELS[m.day_of_week] || '—',
    },
    {
      key: 'time',
      label: 'Horário',
      render: (m: MassTemplate) => m.time ? m.time.slice(0, 5) : '—',
    },
    {
      key: 'location',
      label: 'Local',
      render: (m: MassTemplate) => m.location || '—',
    },
    {
      key: 'is_active',
      label: 'Status',
      render: (m: MassTemplate) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${m.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
          {m.is_active ? 'Ativa' : 'Inativa'}
        </span>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Modelos de Missa</h1>
        <p className="text-gray-500">Gerencie os horários recorrentes de missas da paróquia</p>
      </div>

      <DataTable
        title="Modelos de Missa"
        columns={columns}
        data={data}
        loading={loading}
        meta={meta}
        onPageChange={setPage}
        onSearch={setSearch}
        onCreate={hasPermission('mass-templates.create') ? openCreate : undefined}
        onEdit={hasPermission('mass-templates.update') ? openEdit : undefined}
        onDelete={
          hasPermission('mass-templates.delete')
            ? (item) => { setSelected(item); setDeleteOpen(true); }
            : undefined
        }
        canCreate={hasPermission('mass-templates.create')}
        canEdit={hasPermission('mass-templates.update')}
        canDelete={hasPermission('mass-templates.delete')}
        createLabel="Novo Modelo"
        searchPlaceholder="Buscar modelos..."
        keyExtractor={(m) => m.id}
      />

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={selected ? 'Editar Modelo' : 'Novo Modelo de Missa'}
        size="lg"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Missa Dominical das 10h"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dia da Semana *</label>
            <select
              value={form.day_of_week}
              onChange={(e) => setForm({ ...form, day_of_week: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
            >
              {Object.entries(DAY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Horário *</label>
            <input
              type="time"
              value={form.time}
              onChange={(e) => setForm({ ...form, time: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Local</label>
            <input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
            />
          </div>
          <div className="sm:col-span-2 flex items-center gap-2">
            <input
              type="checkbox"
              id="mass_active"
              checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="h-4 w-4 text-primary-600 border-gray-300 rounded"
            />
            <label htmlFor="mass_active" className="text-sm text-gray-700">Modelo ativo</label>
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
            disabled={saving || !form.name || !form.time}
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
        title="Excluir Modelo"
        message={`Excluir "${selected?.name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        loading={saving}
      />
    </div>
  );
}
