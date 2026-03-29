import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '@/lib/api';
import DataTable from '@/components/DataTable';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';

interface CatechismGroup {
  id: number;
  name: string;
  type: string;
  type_label: string;
  year: number | null;
  period: string | null;
  period_label: string;
  meeting_day: string | null;
  day_label: string;
  meeting_time: string | null;
  capacity: number | null;
  status: string;
  status_label: string;
  notes: string | null;
  enrollments_count: number;
}

const TYPES = {
  first_communion: 'Primeira Comunhão',
  confirmation:    'Crisma',
  adult:           'Adultos',
  children:        'Crianças',
  other:           'Outros',
};

const PERIODS = {
  morning:   'Manhã',
  afternoon: 'Tarde',
  evening:   'Noite',
  saturday:  'Sábado',
  sunday:    'Domingo',
};

const DAYS = {
  monday:    'Segunda-feira',
  tuesday:   'Terça-feira',
  wednesday: 'Quarta-feira',
  thursday:  'Quinta-feira',
  friday:    'Sexta-feira',
  saturday:  'Sábado',
  sunday:    'Domingo',
  irregular: 'Irregular',
};

const STATUSES = {
  open:        'Aberta',
  in_progress: 'Em andamento',
  closed:      'Encerrada',
  cancelled:   'Cancelada',
};

const STATUS_COLORS: Record<string, string> = {
  open:        'bg-green-100 text-green-800',
  in_progress: 'bg-blue-100 text-blue-800',
  closed:      'bg-gray-100 text-gray-500',
  cancelled:   'bg-red-100 text-red-500',
};

export default function CatechismGroups() {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<CatechismGroup[]>([]);
  const [meta, setMeta] = useState<any>();
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<CatechismGroup | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    name: '',
    type: 'first_communion',
    year: new Date().getFullYear().toString(),
    period: 'morning',
    meeting_day: 'saturday',
    meeting_time: '',
    capacity: '',
    status: 'open',
    notes: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/parish-admin/catechism-groups', {
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
    setForm({
      name: '',
      type: 'first_communion',
      year: new Date().getFullYear().toString(),
      period: 'morning',
      meeting_day: 'saturday',
      meeting_time: '',
      capacity: '',
      status: 'open',
      notes: '',
    });
    setFormOpen(true);
  };

  const openEdit = (item: CatechismGroup) => {
    setSelected(item);
    setForm({
      name: item.name || '',
      type: item.type || 'first_communion',
      year: item.year?.toString() || new Date().getFullYear().toString(),
      period: item.period || 'morning',
      meeting_day: item.meeting_day || 'saturday',
      meeting_time: item.meeting_time || '',
      capacity: item.capacity?.toString() || '',
      status: item.status || 'open',
      notes: item.notes || '',
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        type: form.type,
        year: form.year ? Number(form.year) : null,
        period: form.period || null,
        meeting_day: form.meeting_day || null,
        meeting_time: form.meeting_time || null,
        capacity: form.capacity ? Number(form.capacity) : null,
        status: form.status,
        notes: form.notes || null,
      };

      if (selected) {
        await api.put(`/parish-admin/catechism-groups/${selected.id}`, payload);
      } else {
        await api.post('/parish-admin/catechism-groups', payload);
      }
      setFormOpen(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      const errors = err?.response?.data?.errors;
      const msg = errors
        ? Object.values(errors).flat().join('\n')
        : (err?.response?.data?.message || 'Erro ao salvar turma.');
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await api.delete(`/parish-admin/catechism-groups/${selected.id}`);
      setDeleteOpen(false);
      setSelected(null);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir turma.');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      key: 'name',
      label: 'Turma',
      render: (g: CatechismGroup) => (
        <div>
          <div className="font-medium text-gray-900">{g.name}</div>
          <div className="text-xs text-gray-500">{g.type_label}{g.year ? ` · ${g.year}` : ''}</div>
        </div>
      ),
    },
    {
      key: 'schedule',
      label: 'Horário',
      render: (g: CatechismGroup) => (
        <div className="text-sm text-gray-600">
          {g.day_label && <div>{g.day_label}</div>}
          {g.meeting_time && <div className="text-xs text-gray-400">{g.meeting_time}</div>}
        </div>
      ),
    },
    {
      key: 'enrollments_count',
      label: 'Inscritos',
      render: (g: CatechismGroup) => (
        <span className="text-sm text-gray-700">
          {g.enrollments_count}{g.capacity ? ` / ${g.capacity}` : ''}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (g: CatechismGroup) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[g.status] || 'bg-gray-100 text-gray-800'}`}>
          {g.status_label}
        </span>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Catequese</h1>
        <p className="text-gray-500">Gerencie as turmas, inscrições e aulas de catequese</p>
      </div>

      <DataTable
        title="Turmas de Catequese"
        columns={columns}
        data={data}
        loading={loading}
        meta={meta}
        onPageChange={setPage}
        onSearch={setSearch}
        onView={(item) => navigate(`/catequese/${item.id}`)}
        onCreate={hasPermission('catechism-groups.create') ? openCreate : undefined}
        onEdit={hasPermission('catechism-groups.update') ? openEdit : undefined}
        onDelete={hasPermission('catechism-groups.delete') ? (item) => { setSelected(item); setDeleteOpen(true); } : undefined}
        canCreate={hasPermission('catechism-groups.create')}
        canEdit={hasPermission('catechism-groups.update')}
        canDelete={hasPermission('catechism-groups.delete')}
        createLabel="Nova Turma"
        searchPlaceholder="Buscar turmas..."
        keyExtractor={(g) => g.id}
      />

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={selected ? 'Editar Turma' : 'Nova Turma'}
        size="lg"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Turma *</label>
            <input
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
            <select
              value={form.type}
              onChange={e => setForm({ ...form, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
            >
              {Object.entries(TYPES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ano</label>
            <input
              type="number"
              value={form.year}
              onChange={e => setForm({ ...form, year: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
              min={2000} max={2100}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dia</label>
            <select
              value={form.meeting_day}
              onChange={e => setForm({ ...form, meeting_day: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
            >
              {Object.entries(DAYS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Horário</label>
            <input
              type="time"
              value={form.meeting_time}
              onChange={e => setForm({ ...form, meeting_time: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Período</label>
            <select
              value={form.period}
              onChange={e => setForm({ ...form, period: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
            >
              {Object.entries(PERIODS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Capacidade</label>
            <input
              type="number"
              value={form.capacity}
              onChange={e => setForm({ ...form, capacity: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
              min={1}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={form.status}
              onChange={e => setForm({ ...form, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
            >
              {Object.entries(STATUSES).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
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
        title="Excluir Turma"
        message={`Excluir a turma "${selected?.name}"? Todas as inscrições serão removidas. Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        loading={saving}
      />
    </div>
  );
}
