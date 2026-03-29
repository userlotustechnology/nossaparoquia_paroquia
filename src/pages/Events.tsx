import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import DataTable from '@/components/DataTable';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import type { Event as EventType, PaginatedResponse } from '@/types';

export default function Events() {
  const { hasPermission } = useAuth();
  const [data, setData] = useState<EventType[]>([]);
  const [meta, setMeta] = useState<PaginatedResponse<EventType>['meta'] | undefined>();
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<EventType | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: '',
    description: '',
    starts_at: '',
    ends_at: '',
    location: '',
    type: '',
    max_participants: '',
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/parish-admin/events', {
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
    setForm({ title: '', description: '', starts_at: '', ends_at: '', location: '', type: '', max_participants: '' });
    setImageFile(null);
    setImagePreview(null);
    setFormOpen(true);
  };

  const openEdit = (item: EventType) => {
    setSelected(item);
    setForm({
      title: item.title || '',
      description: item.description || '',
      starts_at: item.starts_at ? item.starts_at.slice(0, 16) : '',
      ends_at: item.ends_at ? item.ends_at.slice(0, 16) : '',
      location: item.location || '',
      type: item.type || '',
      max_participants: item.max_participants?.toString() || '',
    });
    setImageFile(null);
    setImagePreview((item as any).banner_path || null);
    setFormOpen(true);
  };

  const toDatetime = (val: string) => {
    if (!val) return val;
    return val.replace('T', ' ') + (val.length === 16 ? ':00' : '');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setImageFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title);
      fd.append('description', form.description);
      fd.append('starts_at', toDatetime(form.starts_at));
      if (form.ends_at) fd.append('ends_at', toDatetime(form.ends_at));
      else fd.append('ends_at', '');
      fd.append('location', form.location);
      fd.append('type', form.type);
      if (form.max_participants) fd.append('max_participants', form.max_participants);
      if (imageFile) fd.append('banner', imageFile);

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      if (selected) {
        fd.append('_method', 'PUT');
        await api.post(`/parish-admin/events/${selected.id}`, fd, config);
      } else {
        await api.post('/parish-admin/events', fd, config);
      }
      setFormOpen(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      const errors = err?.response?.data?.errors;
      const msg = errors
        ? Object.values(errors).flat().join('\n')
        : (err?.response?.data?.message || 'Erro ao salvar evento.');
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await api.delete(`/parish-admin/events/${selected.id}`);
      setDeleteOpen(false);
      setSelected(null);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir evento.');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: 'title', label: 'Título', render: (e: EventType) => (
      <div className="font-medium text-gray-900">{e.title}</div>
    )},
    { key: 'starts_at', label: 'Data/Hora', render: (e: EventType) =>
      new Date(e.starts_at).toLocaleDateString('pt-BR', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      }),
    },
    { key: 'location', label: 'Local', render: (e: EventType) => e.location || '—' },
    { key: 'type', label: 'Tipo', render: (e: EventType) => e.type || '—' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Eventos</h1>
        <p className="text-gray-500">Gerencie os eventos e celebrações da paróquia</p>
      </div>

      <DataTable
        title="Lista de Eventos"
        columns={columns}
        data={data}
        loading={loading}
        meta={meta}
        onPageChange={setPage}
        onSearch={setSearch}
        onCreate={hasPermission('events.create') ? openCreate : undefined}
        onEdit={hasPermission('events.update') ? openEdit : undefined}
        onDelete={hasPermission('events.delete') ? (item) => { setSelected(item); setDeleteOpen(true); } : undefined}
        canCreate={hasPermission('events.create')}
        canEdit={hasPermission('events.update')}
        canDelete={hasPermission('events.delete')}
        createLabel="Novo Evento"
        searchPlaceholder="Buscar eventos..."
        keyExtractor={(e) => e.id}
      />

      {/* Form Modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={selected ? 'Editar Evento' : 'Novo Evento'}
        size="lg"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Imagem do Evento</label>
            <p className="text-xs text-gray-400 mb-1">Recomendado: 1200x630px (formato paisagem 1.91:1)</p>
            <input type="file" accept="image/*" onChange={handleImageChange} className="text-sm" />
            {imagePreview && <img src={imagePreview} className="mt-2 rounded-lg max-h-40 object-cover" alt="Preview" />}
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Início *</label>
            <input
              type="datetime-local"
              value={form.starts_at}
              onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Término</label>
            <input
              type="datetime-local"
              value={form.ends_at}
              onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Local</label>
            <input
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
            >
              <option value="">Selecione</option>
              <option value="missa">Missa</option>
              <option value="celebracao">Celebração</option>
              <option value="encontro">Encontro</option>
              <option value="retiro">Retiro</option>
              <option value="festa">Festa</option>
              <option value="outro">Outro</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max. Participantes</label>
            <input
              type="number"
              value={form.max_participants}
              onChange={(e) => setForm({ ...form, max_participants: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
              min={0}
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
            disabled={saving || !form.title || !form.starts_at}
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
        title="Excluir Evento"
        message={`Tem certeza que deseja excluir "${selected?.title}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        loading={saving}
      />
    </div>
  );
}
