import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

interface Pastoral {
  id: number;
  name: string;
  description: string | null;
  logo_path: string | null;
  coordinator_id: number | null;
  coordinator?: { id: number; name: string } | null;
  vice_coordinator_id: number | null;
  vice_coordinator?: { id: number; name: string } | null;
  requires_approval: boolean;
  is_active: boolean;
  members?: Member[];
  schedules?: Schedule[];
  notices?: Notice[];
}

interface Member {
  id: number;
  parishioner_id: number;
  parishioner?: { id: number; name: string; phone: string | null; email: string | null };
  role: string;
  joined_at: string;
  status: string;
}

interface Schedule {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

interface Notice {
  id: number;
  title: string;
  content: string;
  expires_at: string | null;
  is_active: boolean;
  order: number;
}

interface ParishionerOption {
  id: number;
  name: string;
}

const DAY_LABELS: Record<number, string> = {
  0: 'Domingo',
  1: 'Segunda-feira',
  2: 'Terça-feira',
  3: 'Quarta-feira',
  4: 'Quinta-feira',
  5: 'Sexta-feira',
  6: 'Sábado',
};

const ROLE_LABELS: Record<string, string> = {
  member: 'Membro',
  coordinator: 'Coordenador(a)',
  vice_coordinator: 'Vice-Coordenador(a)',
  secretary: 'Secretário(a)',
  treasurer: 'Tesoureiro(a)',
};

const TABS = ['Informações', 'Membros', 'Horários', 'Avisos'] as const;
type Tab = typeof TABS[number];

export default function PastoralDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const [pastoral, setPastoral] = useState<Pastoral | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('Informações');
  const [saving, setSaving] = useState(false);

  // Info form
  const [infoForm, setInfoForm] = useState({
    name: '',
    description: '',
    requires_approval: false,
    is_active: true,
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Members
  const [memberFormOpen, setMemberFormOpen] = useState(false);
  const [memberForm, setMemberForm] = useState({ parishioner_id: '', role: 'member', joined_at: '' });
  const [parishioners, setParishioners] = useState<ParishionerOption[]>([]);

  // Schedules
  const [scheduleFormOpen, setScheduleFormOpen] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({ day_of_week: '0', start_time: '', end_time: '' });

  // Notices
  const [noticeFormOpen, setNoticeFormOpen] = useState(false);
  const [noticeForm, setNoticeForm] = useState({ title: '', content: '', expires_at: '', is_active: true });

  const fetchPastoral = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/parish-admin/pastorals/${id}`);
      const data = res.data.data;
      setPastoral(data);
      setInfoForm({
        name: data.name || '',
        description: data.description || '',
        requires_approval: data.requires_approval,
        is_active: data.is_active,
      });
      setLogoPreview(data.logo_path || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPastoral();
  }, [fetchPastoral]);

  const loadParishioners = async () => {
    if (parishioners.length > 0) return;
    try {
      const res = await api.get('/parish-admin/parishioners', { params: { per_page: 200 } });
      setParishioners(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  // ─── Info Tab ───────────────────────────────────────────────────
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setLogoFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSaveInfo = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', infoForm.name);
      fd.append('description', infoForm.description);
      fd.append('requires_approval', infoForm.requires_approval ? '1' : '0');
      fd.append('is_active', infoForm.is_active ? '1' : '0');
      if (logoFile) fd.append('logo', logoFile);
      fd.append('_method', 'PUT');
      await api.post(`/parish-admin/pastorals/${id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      fetchPastoral();
    } catch (err: any) {
      const errors = err?.response?.data?.errors;
      alert(errors ? Object.values(errors).flat().join('\n') : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  // ─── Members Tab ────────────────────────────────────────────────
  const handleAddMember = async () => {
    setSaving(true);
    try {
      await api.post(`/parish-admin/pastorals/${id}/members`, {
        parishioner_id: parseInt(memberForm.parishioner_id),
        role: memberForm.role,
        joined_at: memberForm.joined_at,
      });
      setMemberFormOpen(false);
      fetchPastoral();
    } catch (err: any) {
      const errors = err?.response?.data?.errors;
      alert(errors ? Object.values(errors).flat().join('\n') : 'Erro ao adicionar membro.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveMember = async (memberId: number) => {
    if (!confirm('Remover este membro?')) return;
    try {
      await api.delete(`/parish-admin/pastorals/${id}/members/${memberId}`);
      fetchPastoral();
    } catch (err) {
      alert('Erro ao remover membro.');
    }
  };

  // ─── Schedules Tab ──────────────────────────────────────────────
  const handleAddSchedule = async () => {
    setSaving(true);
    try {
      await api.post(`/parish-admin/pastorals/${id}/schedules`, {
        day_of_week: parseInt(scheduleForm.day_of_week),
        start_time: scheduleForm.start_time,
        end_time: scheduleForm.end_time,
      });
      setScheduleFormOpen(false);
      fetchPastoral();
    } catch (err: any) {
      const errors = err?.response?.data?.errors;
      alert(errors ? Object.values(errors).flat().join('\n') : 'Erro ao adicionar horário.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSchedule = async (scheduleId: number) => {
    if (!confirm('Remover este horário?')) return;
    try {
      await api.delete(`/parish-admin/pastorals/${id}/schedules/${scheduleId}`);
      fetchPastoral();
    } catch (err) {
      alert('Erro ao remover horário.');
    }
  };

  // ─── Notices Tab ────────────────────────────────────────────────
  const handleAddNotice = async () => {
    setSaving(true);
    try {
      await api.post(`/parish-admin/pastorals/${id}/notices`, {
        title: noticeForm.title,
        content: noticeForm.content,
        expires_at: noticeForm.expires_at || null,
        is_active: noticeForm.is_active,
      });
      setNoticeFormOpen(false);
      fetchPastoral();
    } catch (err: any) {
      const errors = err?.response?.data?.errors;
      alert(errors ? Object.values(errors).flat().join('\n') : 'Erro ao adicionar aviso.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveNotice = async (noticeId: number) => {
    if (!confirm('Remover este aviso?')) return;
    try {
      await api.delete(`/parish-admin/pastorals/${id}/notices/${noticeId}`);
      fetchPastoral();
    } catch (err) {
      alert('Erro ao remover aviso.');
    }
  };

  const fmtDate = (d: string | null) =>
    d ? new Date(d.slice(0, 10) + 'T00:00:00').toLocaleDateString('pt-BR') : '—';

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (!pastoral) {
    return (
      <div className="text-center py-24">
        <p className="text-gray-500">Pastoral não encontrada.</p>
        <button onClick={() => navigate('/pastorais')} className="mt-4 text-primary-500 hover:underline text-sm">
          Voltar para a lista
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/pastorais')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </button>
        <div className="flex items-center gap-3 flex-1">
          {pastoral.logo_path && (
            <img src={pastoral.logo_path} alt="" className="h-10 w-10 rounded-full object-cover" />
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{pastoral.name}</h1>
            <p className="text-sm text-gray-500">
              {pastoral.is_active ? 'Ativa' : 'Inativa'}
              {pastoral.coordinator && ` · Coord.: ${pastoral.coordinator.name}`}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {tab === 'Informações' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="grid grid-cols-1 gap-4 max-w-lg">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
              <input
                value={infoForm.name}
                onChange={(e) => setInfoForm({ ...infoForm, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <textarea
                value={infoForm.description}
                onChange={(e) => setInfoForm({ ...infoForm, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Logo</label>
              <input type="file" accept="image/*" onChange={handleLogoChange} className="text-sm" />
              {logoPreview && <img src={logoPreview} className="mt-2 h-16 w-16 rounded-full object-cover" alt="Logo" />}
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={infoForm.requires_approval}
                  onChange={(e) => setInfoForm({ ...infoForm, requires_approval: e.target.checked })}
                  className="h-4 w-4 text-primary-600 border-gray-300 rounded"
                />
                <label className="text-sm text-gray-700">Requer aprovação para participação</label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={infoForm.is_active}
                  onChange={(e) => setInfoForm({ ...infoForm, is_active: e.target.checked })}
                  className="h-4 w-4 text-primary-600 border-gray-300 rounded"
                />
                <label className="text-sm text-gray-700">Pastoral ativa</label>
              </div>
            </div>
            <div>
              <button
                onClick={handleSaveInfo}
                disabled={saving || !infoForm.name}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 rounded-lg"
              >
                {saving ? 'Salvando...' : 'Salvar Informações'}
              </button>
            </div>
          </div>
        </div>
      )}

      {tab === 'Membros' && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Membros</h2>
            {hasPermission('pastorals.update') && (
              <button
                onClick={async () => {
                  await loadParishioners();
                  setMemberForm({ parishioner_id: '', role: 'member', joined_at: new Date().toISOString().slice(0, 10) });
                  setMemberFormOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg"
              >
                <Plus className="h-4 w-4" />
                Adicionar Membro
              </button>
            )}
          </div>

          {memberFormOpen && (
            <div className="p-4 bg-blue-50 border-b border-blue-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Paroquiano *</label>
                  <select
                    value={memberForm.parishioner_id}
                    onChange={(e) => setMemberForm({ ...memberForm, parishioner_id: e.target.value })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    <option value="">Selecione...</option>
                    {parishioners.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Função *</label>
                  <select
                    value={memberForm.role}
                    onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    {Object.entries(ROLE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Data de Entrada</label>
                  <input
                    type="date"
                    value={memberForm.joined_at}
                    onChange={(e) => setMemberForm({ ...memberForm, joined_at: e.target.value })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleAddMember}
                  disabled={saving || !memberForm.parishioner_id}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 rounded-md"
                >
                  {saving ? 'Salvando...' : 'Adicionar'}
                </button>
                <button
                  onClick={() => setMemberFormOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {!pastoral.members || pastoral.members.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">Nenhum membro cadastrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Nome</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Função</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Data de Entrada</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {pastoral.members.map((m) => (
                    <tr key={m.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{m.parishioner?.name || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                          {ROLE_LABELS[m.role] || m.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{fmtDate(m.joined_at)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${m.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                          {m.status === 'active' ? 'Ativo' : m.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {hasPermission('pastorals.update') && (
                          <button onClick={() => handleRemoveMember(m.id)} className="text-red-500 hover:text-red-700">
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

      {tab === 'Horários' && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Horários</h2>
            {hasPermission('pastorals.update') && (
              <button
                onClick={() => {
                  setScheduleForm({ day_of_week: '0', start_time: '', end_time: '' });
                  setScheduleFormOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg"
              >
                <Plus className="h-4 w-4" />
                Adicionar Horário
              </button>
            )}
          </div>

          {scheduleFormOpen && (
            <div className="p-4 bg-blue-50 border-b border-blue-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Dia da Semana *</label>
                  <select
                    value={scheduleForm.day_of_week}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, day_of_week: e.target.value })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    {Object.entries(DAY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Horário Início *</label>
                  <input
                    type="time"
                    value={scheduleForm.start_time}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, start_time: e.target.value })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Horário Fim *</label>
                  <input
                    type="time"
                    value={scheduleForm.end_time}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, end_time: e.target.value })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleAddSchedule}
                  disabled={saving || !scheduleForm.start_time || !scheduleForm.end_time}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 rounded-md"
                >
                  {saving ? 'Salvando...' : 'Adicionar'}
                </button>
                <button
                  onClick={() => setScheduleFormOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {!pastoral.schedules || pastoral.schedules.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">Nenhum horário cadastrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Dia</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Horário Início</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Horário Fim</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {pastoral.schedules.map((s) => (
                    <tr key={s.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{DAY_LABELS[s.day_of_week] || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{s.start_time?.slice(0, 5)}</td>
                      <td className="px-4 py-3 text-gray-600">{s.end_time?.slice(0, 5)}</td>
                      <td className="px-4 py-3 text-right">
                        {hasPermission('pastorals.update') && (
                          <button onClick={() => handleRemoveSchedule(s.id)} className="text-red-500 hover:text-red-700">
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

      {tab === 'Avisos' && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Avisos</h2>
            {hasPermission('pastorals.update') && (
              <button
                onClick={() => {
                  setNoticeForm({ title: '', content: '', expires_at: '', is_active: true });
                  setNoticeFormOpen(true);
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg"
              >
                <Plus className="h-4 w-4" />
                Novo Aviso
              </button>
            )}
          </div>

          {noticeFormOpen && (
            <div className="p-4 bg-blue-50 border-b border-blue-200">
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Título *</label>
                  <input
                    value={noticeForm.title}
                    onChange={(e) => setNoticeForm({ ...noticeForm, title: e.target.value })}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Conteúdo *</label>
                  <textarea
                    value={noticeForm.content}
                    onChange={(e) => setNoticeForm({ ...noticeForm, content: e.target.value })}
                    rows={3}
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Expira em</label>
                    <input
                      type="date"
                      value={noticeForm.expires_at}
                      onChange={(e) => setNoticeForm({ ...noticeForm, expires_at: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                  <div className="flex items-end pb-1">
                    <label className="flex items-center gap-2 text-xs text-gray-700">
                      <input
                        type="checkbox"
                        checked={noticeForm.is_active}
                        onChange={(e) => setNoticeForm({ ...noticeForm, is_active: e.target.checked })}
                        className="h-3.5 w-3.5 text-primary-600 border-gray-300 rounded"
                      />
                      Ativo
                    </label>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleAddNotice}
                  disabled={saving || !noticeForm.title || !noticeForm.content}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 rounded-md"
                >
                  {saving ? 'Salvando...' : 'Adicionar'}
                </button>
                <button
                  onClick={() => setNoticeFormOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {!pastoral.notices || pastoral.notices.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-12">Nenhum aviso cadastrado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Título</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Conteúdo</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Expira em</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {pastoral.notices.map((n) => (
                    <tr key={n.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{n.title}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs truncate">{n.content}</td>
                      <td className="px-4 py-3 text-gray-600">{fmtDate(n.expires_at)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${n.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                          {n.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {hasPermission('pastorals.update') && (
                          <button onClick={() => handleRemoveNotice(n.id)} className="text-red-500 hover:text-red-700">
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
    </div>
  );
}
