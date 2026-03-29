import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import DataTable from '@/components/DataTable';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';

interface Sacrament {
  id: number;
  parishioner_id: number;
  parishioner?: { id: number; name: string };
  type: string;
  date: string;
  place: string | null;
  notes: string | null;
  celebrant: string | null;
  book_number: string | null;
  page_number: string | null;
  parish_id: number;
}

interface ParishionerOption {
  id: number;
  name: string;
}

const TYPE_LABELS: Record<string, string> = {
  baptism: 'Batismo',
  first_communion: 'Primeira Comunhão',
  confirmation: 'Crisma',
  marriage: 'Matrimônio',
  anointing_of_the_sick: 'Unção dos Enfermos',
  confession: 'Confissão',
  holy_orders: 'Ordem',
};

const TYPE_COLORS: Record<string, string> = {
  baptism: 'bg-blue-100 text-blue-800',
  first_communion: 'bg-yellow-100 text-yellow-800',
  confirmation: 'bg-purple-100 text-purple-800',
  marriage: 'bg-pink-100 text-pink-800',
  anointing_of_the_sick: 'bg-orange-100 text-orange-800',
  confession: 'bg-teal-100 text-teal-800',
  holy_orders: 'bg-indigo-100 text-indigo-800',
};

export default function Sacraments() {
  const { hasPermission } = useAuth();
  const [data, setData] = useState<Sacrament[]>([]);
  const [meta, setMeta] = useState<any>();
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<Sacrament | null>(null);
  const [saving, setSaving] = useState(false);
  const [parishioners, setParishioners] = useState<ParishionerOption[]>([]);
  const [form, setForm] = useState({
    parishioner_id: '',
    type: 'baptism',
    date: '',
    place: '',
    notes: '',
    celebrant: '',
    book_number: '',
    page_number: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/parish-admin/sacraments', {
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

  const loadParishioners = async () => {
    if (parishioners.length > 0) return;
    try {
      const res = await api.get('/parish-admin/parishioners', {
        params: { per_page: 200 },
      });
      setParishioners(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const openCreate = async () => {
    await loadParishioners();
    setSelected(null);
    setForm({
      parishioner_id: '',
      type: 'baptism',
      date: '',
      place: '',
      notes: '',
      celebrant: '',
      book_number: '',
      page_number: '',
    });
    setFormOpen(true);
  };

  const openEdit = async (item: Sacrament) => {
    await loadParishioners();
    setSelected(item);
    setForm({
      parishioner_id: String(item.parishioner_id),
      type: item.type,
      date: item.date ? item.date.slice(0, 10) : '',
      place: item.place || '',
      notes: item.notes || '',
      celebrant: item.celebrant || '',
      book_number: item.book_number || '',
      page_number: item.page_number || '',
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        celebrant: form.celebrant || null,
        book_number: form.book_number || null,
        page_number: form.page_number || null,
      };
      if (selected) {
        await api.put(`/parish-admin/sacraments/${selected.id}`, payload);
      } else {
        await api.post('/parish-admin/sacraments', payload);
      }
      setFormOpen(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      const errors = err?.response?.data?.errors;
      const msg = errors
        ? Object.values(errors).flat().join('\n')
        : (err?.response?.data?.message || 'Erro ao salvar sacramento.');
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await api.delete(`/parish-admin/sacraments/${selected.id}`);
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
      key: 'parishioner',
      label: 'Paroquiano',
      render: (s: Sacrament) => (
        <span className="font-medium text-gray-900">
          {s.parishioner?.name || '—'}
        </span>
      ),
    },
    {
      key: 'type',
      label: 'Sacramento',
      render: (s: Sacrament) => (
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
      key: 'date',
      label: 'Data',
      render: (s: Sacrament) =>
        s.date
          ? new Date(s.date.slice(0, 10) + 'T00:00:00').toLocaleDateString('pt-BR')
          : '—',
    },
    {
      key: 'place',
      label: 'Local',
      render: (s: Sacrament) => s.place || '—',
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sacramentos</h1>
        <p className="text-gray-500">Registros sacramentais dos paroquianos</p>
      </div>

      <DataTable
        title="Registros de Sacramentos"
        columns={columns}
        data={data}
        loading={loading}
        meta={meta}
        onPageChange={setPage}
        onSearch={setSearch}
        onCreate={hasPermission('sacraments.create') ? openCreate : undefined}
        onEdit={
          hasPermission('sacraments.update')
            ? openEdit
            : undefined
        }
        onDelete={
          hasPermission('sacraments.delete')
            ? (item) => {
                setSelected(item);
                setDeleteOpen(true);
              }
            : undefined
        }
        canCreate={hasPermission('sacraments.create')}
        canEdit={hasPermission('sacraments.update')}
        canDelete={hasPermission('sacraments.delete')}
        createLabel="Novo Registro"
        searchPlaceholder="Buscar por paroquiano..."
        keyExtractor={(s) => s.id}
      />

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={selected ? 'Editar Sacramento' : 'Novo Sacramento'}
        size="lg"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Paroquiano *
            </label>
            <select
              value={form.parishioner_id}
              onChange={(e) =>
                setForm({ ...form, parishioner_id: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
            >
              <option value="">Selecione...</option>
              {parishioners.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
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
              Data *
            </label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Local
            </label>
            <input
              value={form.place}
              onChange={(e) => setForm({ ...form, place: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
            />
          </div>
          {/* Celebrante, Livro, Folha */}
          <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Celebrante
              </label>
              <input
                value={form.celebrant}
                onChange={(e) => setForm({ ...form, celebrant: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                N° do Livro
              </label>
              <input
                value={form.book_number}
                onChange={(e) => setForm({ ...form, book_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                N° da Folha
              </label>
              <input
                value={form.page_number}
                onChange={(e) => setForm({ ...form, page_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
              />
            </div>
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
            disabled={saving || !form.parishioner_id || !form.date}
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
        title="Excluir Sacramento"
        message="Excluir este registro sacramental? Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        loading={saving}
      />
    </div>
  );
}
