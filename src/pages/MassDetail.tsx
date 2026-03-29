import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, Plus, Trash2, Printer, Calendar, Clock, MapPin, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import ConfirmDialog from '@/components/ConfirmDialog';

/* ─── types ─── */
interface MassScale {
  id: number;
  user_id: number;
  role: string;
  user?: { id: number; name: string; email: string };
}

interface MassIntention {
  id: number;
  requester_name: string;
  intention_text: string;
  intention_for: string | null;
  type: string;
  status: string;
}

interface MassData {
  id: number;
  title: string;
  type: string;
  date: string | null;
  scheduled_date: string | null;
  time: string | null;
  location: string | null;
  celebrant: string | null;
  notes: string | null;
  is_active: boolean;
  mass_template?: { id: number; name: string } | null;
  intentions?: MassIntention[];
  scales?: MassScale[];
}

interface ParishUser {
  id: number;
  name: string;
  email: string;
}

/* ─── labels ─── */
const TYPE_LABELS: Record<string, string> = {
  regular: 'Regular', special: 'Especial', funeral: 'Corpo Presente', novena: 'Novena', festive: 'Festiva',
};
const INTENTION_TYPE: Record<string, string> = {
  thanksgiving: 'Ação de Graças', deceased: 'Por Falecido', health: 'Pela Saúde', alive: 'Pessoa Viva', special: 'Especial', other: 'Outra',
};
const INTENTION_STATUS: Record<string, string> = {
  pending: 'Pendente', scheduled: 'Agendada', celebrated: 'Celebrada', cancelled: 'Cancelada',
};
const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800', scheduled: 'bg-blue-100 text-blue-800', celebrated: 'bg-green-100 text-green-800', cancelled: 'bg-gray-100 text-gray-500',
};
const COMMON_ROLES = ['Leitor', 'Ministro da Eucaristia', 'Músico', 'Coroinha', 'Acólito', 'Animador'];

const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d.slice(0, 10) + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

/* ─── component ─── */
export default function MassDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const [mass, setMass] = useState<MassData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'details' | 'intentions' | 'scales'>('details');

  /* ─── details edit ─── */
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ title: '', date: '', time: '', location: '', celebrant: '', is_active: true });
  const [editSaving, setEditSaving] = useState(false);

  /* ─── intention form ─── */
  const [intForm, setIntForm] = useState({ requester_name: '', intention_for: '', type: 'thanksgiving', intention_text: '', status: 'scheduled' });
  const [intSaving, setIntSaving] = useState(false);

  /* ─── scale form ─── */
  const [scaleForm, setScaleForm] = useState({ user_id: '', role: '' });
  const [scaleSaving, setScaleSaving] = useState(false);
  const [parishUsers, setParishUsers] = useState<ParishUser[]>([]);

  /* ─── delete ─── */
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'intention' | 'scale'; id: number } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchMass = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/parish-admin/masses/${id}`);
      setMass(res.data.data);
    } catch {
      console.error('Erro ao buscar missa');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchMass(); }, [fetchMass]);

  /* load parish users for scales */
  const loadUsers = async () => {
    if (parishUsers.length > 0) return;
    try {
      const res = await api.get('/parish-admin/parishioners', { params: { per_page: 200 } });
      // fallback: try users endpoint
    } catch { /* ignore */ }
    try {
      const res = await api.get('/parish-admin/masses/' + id + '/scales');
      // users loaded from scale endpoint — we'll load separately
    } catch { /* ignore */ }
  };

  const loadParishUsers = async () => {
    if (parishUsers.length > 0) return;
    try {
      // Try to get pastoral users or parish members
      const res = await api.get('/parish-admin/pastorals', { params: { per_page: 1 } });
      // Need a better endpoint - let's use the parishioners list
    } catch { /* ignore */ }
  };

  /* ─── details save ─── */
  const handleEditSave = async () => {
    setEditSaving(true);
    try {
      await api.put(`/parish-admin/masses/${id}`, editForm);
      setEditOpen(false);
      fetchMass();
    } catch (err: any) {
      const errors = err?.response?.data?.errors;
      alert(errors ? Object.values(errors).flat().join('\n') : 'Erro ao salvar.');
    } finally {
      setEditSaving(false);
    }
  };

  /* ─── intention save ─── */
  const handleIntSave = async () => {
    setIntSaving(true);
    try {
      await api.post('/parish-admin/mass-intentions', { ...intForm, mass_id: Number(id) });
      setIntForm({ requester_name: '', intention_for: '', type: 'thanksgiving', intention_text: '', status: 'scheduled' });
      fetchMass();
    } catch (err: any) {
      const errors = err?.response?.data?.errors;
      alert(errors ? Object.values(errors).flat().join('\n') : 'Erro ao salvar intenção.');
    } finally {
      setIntSaving(false);
    }
  };

  /* ─── scale save ─── */
  const handleScaleSave = async () => {
    setScaleSaving(true);
    try {
      await api.post(`/parish-admin/masses/${id}/scales`, {
        user_id: parseInt(scaleForm.user_id),
        role: scaleForm.role,
      });
      setScaleForm({ user_id: '', role: '' });
      fetchMass();
    } catch (err: any) {
      const errors = err?.response?.data?.errors;
      alert(errors ? Object.values(errors).flat().join('\n') : 'Erro ao adicionar escala.');
    } finally {
      setScaleSaving(false);
    }
  };

  /* ─── delete handler ─── */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      if (deleteTarget.type === 'intention') {
        await api.delete(`/parish-admin/mass-intentions/${deleteTarget.id}`);
      } else {
        await api.delete(`/parish-admin/masses/${id}/scales/${deleteTarget.id}`);
      }
      setDeleteTarget(null);
      fetchMass();
    } catch {
      alert('Erro ao excluir.');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (!mass) {
    return (
      <div className="text-center py-24">
        <p className="text-gray-500">Missa não encontrada.</p>
        <button onClick={() => navigate('/missas')} className="mt-4 text-primary-500 hover:underline text-sm">Voltar</button>
      </div>
    );
  }

  const openEdit = () => {
    setEditForm({
      title: mass.title || '',
      date: (mass.date || mass.scheduled_date || '').slice(0, 10),
      time: mass.time?.slice(0, 5) || '',
      location: mass.location || '',
      celebrant: mass.celebrant || '',
      is_active: mass.is_active,
    });
    setEditOpen(true);
  };

  const tabs = [
    { id: 'details' as const, label: 'Detalhes' },
    { id: 'intentions' as const, label: `Intenções (${mass.intentions?.length ?? 0})` },
    { id: 'scales' as const, label: `Escalas (${mass.scales?.length ?? 0})` },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={() => navigate('/missas')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{mass.title}</h1>
          <div className="flex flex-wrap gap-3 mt-1 text-sm text-gray-500">
            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {fmtDate(mass.date || mass.scheduled_date)}</span>
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {mass.time?.slice(0, 5) || '—'}</span>
            {mass.location && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {mass.location}</span>}
            {mass.celebrant && <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> {mass.celebrant}</span>}
          </div>
        </div>
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${mass.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
          {TYPE_LABELS[mass.type] || mass.type}
        </span>
        {mass.mass_template && (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
            Template: {mass.mass_template.name}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-0">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ═══ Tab: Detalhes ═══ */}
      {tab === 'details' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          {!editOpen ? (
            <>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Informações da Missa</h2>
                {hasPermission('masses.update') && (
                  <button onClick={openEdit} className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-primary-600 border border-primary-300 rounded-lg hover:bg-primary-50">
                    <Pencil className="h-4 w-4" /> Editar
                  </button>
                )}
              </div>
              <dl className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div><dt className="text-xs text-gray-500">Título</dt><dd className="text-sm font-medium text-gray-900 mt-0.5">{mass.title}</dd></div>
                <div><dt className="text-xs text-gray-500">Tipo</dt><dd className="text-sm font-medium text-gray-900 mt-0.5">{TYPE_LABELS[mass.type] || mass.type}</dd></div>
                <div><dt className="text-xs text-gray-500">Data</dt><dd className="text-sm font-medium text-gray-900 mt-0.5">{fmtDate(mass.date || mass.scheduled_date)}</dd></div>
                <div><dt className="text-xs text-gray-500">Horário</dt><dd className="text-sm font-medium text-gray-900 mt-0.5">{mass.time?.slice(0, 5) || '—'}</dd></div>
                <div><dt className="text-xs text-gray-500">Local</dt><dd className="text-sm font-medium text-gray-900 mt-0.5">{mass.location || '—'}</dd></div>
                <div><dt className="text-xs text-gray-500">Celebrante</dt><dd className="text-sm font-medium text-gray-900 mt-0.5">{mass.celebrant || '—'}</dd></div>
                <div><dt className="text-xs text-gray-500">Status</dt><dd className="text-sm font-medium mt-0.5">{mass.is_active ? <span className="text-green-700">Ativa</span> : <span className="text-gray-500">Inativa</span>}</dd></div>
                {mass.mass_template && <div><dt className="text-xs text-gray-500">Template de Origem</dt><dd className="text-sm font-medium text-gray-900 mt-0.5">{mass.mass_template.name}</dd></div>}
              </dl>
              {mass.notes && (
                <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-xs font-medium text-yellow-800 mb-1">Observações</p>
                  <p className="text-sm text-yellow-700">{mass.notes}</p>
                </div>
              )}
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Editar Missa</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Data *</label>
                  <input type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Horário *</label>
                  <input type="time" value={editForm.time} onChange={(e) => setEditForm({ ...editForm, time: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Celebrante</label>
                  <input value={editForm.celebrant} onChange={(e) => setEditForm({ ...editForm, celebrant: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Título</label>
                  <input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Local</label>
                  <input value={editForm.location} onChange={(e) => setEditForm({ ...editForm, location: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-1 focus:ring-primary-500" />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={editForm.is_active} onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })} className="h-4 w-4 text-primary-600 border-gray-300 rounded" />
                    Missa ativa
                  </label>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={handleEditSave} disabled={editSaving} className="px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 rounded-lg">
                  {editSaving ? 'Salvando...' : 'Salvar alterações'}
                </button>
                <button onClick={() => setEditOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══ Tab: Intenções ═══ */}
      {tab === 'intentions' && (
        <div className="bg-white rounded-xl border border-gray-200">
          {/* Add form */}
          {hasPermission('mass-intentions.create') && (
            <div className="p-4 border-b border-gray-200 bg-blue-50">
              <p className="text-xs font-semibold text-blue-800 mb-3">Nova intenção</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Solicitante *</label>
                  <input value={intForm.requester_name} onChange={(e) => setIntForm({ ...intForm, requester_name: e.target.value })} className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs outline-none focus:ring-1 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Pela pessoa</label>
                  <input value={intForm.intention_for} onChange={(e) => setIntForm({ ...intForm, intention_for: e.target.value })} placeholder="Nome" className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs outline-none focus:ring-1 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
                  <select value={intForm.type} onChange={(e) => setIntForm({ ...intForm, type: e.target.value })} className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs outline-none focus:ring-1 focus:ring-primary-500">
                    {Object.entries(INTENTION_TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Texto da intenção *</label>
                  <input value={intForm.intention_text} onChange={(e) => setIntForm({ ...intForm, intention_text: e.target.value })} placeholder="Ex: Pela alma de João da Silva" className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs outline-none focus:ring-1 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                  <select value={intForm.status} onChange={(e) => setIntForm({ ...intForm, status: e.target.value })} className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs outline-none focus:ring-1 focus:ring-primary-500">
                    {Object.entries(INTENTION_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={handleIntSave} disabled={intSaving || !intForm.requester_name || !intForm.intention_text} className="mt-3 px-3 py-1.5 text-xs font-medium text-white bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 rounded-md">
                {intSaving ? 'Salvando...' : 'Adicionar'}
              </button>
            </div>
          )}

          {/* Table */}
          {(!mass.intentions || mass.intentions.length === 0) ? (
            <p className="text-sm text-gray-400 text-center py-12">Nenhuma intenção registrada.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Tipo</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Solicitante</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Pela pessoa</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Texto</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {mass.intentions.map((i) => (
                    <tr key={i.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3"><span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">{INTENTION_TYPE[i.type] || i.type}</span></td>
                      <td className="px-4 py-3 font-medium text-gray-900">{i.requester_name}</td>
                      <td className="px-4 py-3 text-gray-600">{i.intention_for || '—'}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{i.intention_text}</td>
                      <td className="px-4 py-3"><span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLOR[i.status] || 'bg-gray-100 text-gray-700'}`}>{INTENTION_STATUS[i.status] || i.status}</span></td>
                      <td className="px-4 py-3">
                        {hasPermission('mass-intentions.delete') && (
                          <button onClick={() => setDeleteTarget({ type: 'intention', id: i.id })} className="p-1.5 text-gray-400 hover:text-red-600 rounded" title="Excluir">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ═══ Tab: Escalas ═══ */}
      {tab === 'scales' && (
        <div className="bg-white rounded-xl border border-gray-200">
          {/* Add form */}
          {hasPermission('masses.update') && (
            <div className="p-4 border-b border-gray-200 bg-blue-50">
              <p className="text-xs font-semibold text-blue-800 mb-3">Adicionar à escala</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Servidor (ID do usuário)</label>
                  <input
                    type="number"
                    value={scaleForm.user_id}
                    onChange={(e) => setScaleForm({ ...scaleForm, user_id: e.target.value })}
                    placeholder="ID do usuário"
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Função / Papel *</label>
                  <input
                    list="roles-list"
                    value={scaleForm.role}
                    onChange={(e) => setScaleForm({ ...scaleForm, role: e.target.value })}
                    placeholder="Ex: Leitor, Músico..."
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs outline-none focus:ring-1 focus:ring-primary-500"
                  />
                  <datalist id="roles-list">
                    {COMMON_ROLES.map((r) => <option key={r} value={r} />)}
                  </datalist>
                </div>
                <div>
                  <button onClick={handleScaleSave} disabled={scaleSaving || !scaleForm.user_id || !scaleForm.role} className="px-3 py-1.5 text-xs font-medium text-white bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 rounded-md">
                    {scaleSaving ? 'Salvando...' : 'Adicionar'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Table */}
          {(!mass.scales || mass.scales.length === 0) ? (
            <p className="text-sm text-gray-400 text-center py-12">Nenhum servidor escalado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Nome</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">E-mail</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Função</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {mass.scales.map((s) => (
                    <tr key={s.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{s.user?.name || '—'}</td>
                      <td className="px-4 py-3 text-gray-500">{s.user?.email || '—'}</td>
                      <td className="px-4 py-3"><span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">{s.role}</span></td>
                      <td className="px-4 py-3">
                        {hasPermission('masses.update') && (
                          <button onClick={() => setDeleteTarget({ type: 'scale', id: s.id })} className="p-1.5 text-gray-400 hover:text-red-600 rounded" title="Remover">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={deleteTarget?.type === 'intention' ? 'Excluir Intenção' : 'Remover da Escala'}
        message={deleteTarget?.type === 'intention' ? 'Excluir esta intenção?' : 'Remover este servidor da escala?'}
        confirmLabel={deleteTarget?.type === 'intention' ? 'Excluir' : 'Remover'}
        loading={deleting}
      />
    </div>
  );
}
