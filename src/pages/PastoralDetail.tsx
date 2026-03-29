import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Eye, Users, UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import ImageUpload from '@/components/ImageUpload';
import Modal from '@/components/Modal';

// ─── Interfaces ──────────────────────────────────────────────────

interface Catechist {
  id: number;
  name: string;
  email: string;
  role: string;
}

interface CatechismGroup {
  id: number;
  name: string;
  type: string;
  type_label: string;
  year: number | null;
  period: string | null;
  period_label: string | null;
  meeting_day: string | null;
  day_label: string | null;
  meeting_time: string | null;
  capacity: number | null;
  status: string;
  status_label: string;
  enrollments_count: number;
  catechists_count: number;
  catechists?: Catechist[];
}

interface Pastoral {
  id: number;
  name: string;
  description: string | null;
  logo_path: string | null;
  logo_url: string | null;
  slug: string | null;
  is_default: boolean;
  coordinator_id: number | null;
  coordinator?: { id: number; name: string } | null;
  vice_coordinator_id: number | null;
  vice_coordinator?: { id: number; name: string } | null;
  requires_approval: boolean;
  is_active: boolean;
  members?: Member[];
  schedules?: Schedule[];
  notices?: Notice[];
  catechism_groups?: CatechismGroup[];
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

interface UserOption {
  id: number;
  name: string;
  email: string;
}

// ─── Constants ──────────────────────────────────────────────────

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

const GROUP_TYPES: Record<string, string> = {
  first_communion: 'Primeira Comunhão',
  confirmation: 'Crisma',
  adult: 'Adultos',
  children: 'Crianças',
  other: 'Outro',
};

const GROUP_PERIODS: Record<string, string> = {
  morning: 'Manhã',
  afternoon: 'Tarde',
  evening: 'Noite',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

const GROUP_DAYS: Record<string, string> = {
  monday: 'Segunda',
  tuesday: 'Terça',
  wednesday: 'Quarta',
  thursday: 'Quinta',
  friday: 'Sexta',
  saturday: 'Sábado',
  sunday: 'Domingo',
  irregular: 'Irregular',
};

const GROUP_STATUSES: Record<string, string> = {
  open: 'Aberta',
  in_progress: 'Em andamento',
  closed: 'Encerrada',
  cancelled: 'Cancelada',
};

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-green-100 text-green-800',
  in_progress: 'bg-blue-100 text-blue-800',
  closed: 'bg-gray-100 text-gray-500',
  cancelled: 'bg-red-100 text-red-800',
};

const BASE_TABS = ['Informações', 'Membros', 'Horários', 'Avisos'] as const;
type Tab = string;

// ─── Component ──────────────────────────────────────────────────

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

  // Turmas (catequese)
  const [groupFormOpen, setGroupFormOpen] = useState(false);
  const [groupForm, setGroupForm] = useState({
    name: '', type: 'first_communion', year: new Date().getFullYear().toString(),
    period: 'morning', meeting_day: 'saturday', meeting_time: '', capacity: '', status: 'open', notes: '',
  });
  const [catechistModalGroupId, setCatechistModalGroupId] = useState<number | null>(null);
  const [catechistForm, setCatechistForm] = useState({ user_id: '', role: 'lead' });
  const [users, setUsers] = useState<UserOption[]>([]);
  const [enrollmentModalGroupId, setEnrollmentModalGroupId] = useState<number | null>(null);
  const [enrollments, setEnrollments] = useState<any[]>([]);
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(false);

  // Derived
  const isCatequese = pastoral?.slug === 'catequese';
  const tabs: string[] = isCatequese
    ? ['Turmas', ...BASE_TABS]
    : [...BASE_TABS];

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
      setLogoPreview(data.logo_url || data.logo_path || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPastoral();
  }, [fetchPastoral]);

  // Set default tab to Turmas for catequese pastoral once loaded
  useEffect(() => {
    if (pastoral?.slug === 'catequese' && tab === 'Informações') {
      setTab('Turmas');
    }
  }, [pastoral?.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadParishioners = async () => {
    if (parishioners.length > 0) return;
    try {
      const res = await api.get('/parish-admin/parishioners', { params: { per_page: 200 } });
      setParishioners(res.data.data);
    } catch (err) {
      console.error(err);
    }
  };

  const loadUsers = async () => {
    if (users.length > 0) return;
    try {
      const res = await api.get('/parish-admin/users', { params: { per_page: 200 } });
      const data = res.data.data || res.data;
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      // Fallback: load members of this pastoral as potential catechists
      console.error(err);
    }
  };

  // ─── Info Tab ───────────────────────────────────────────────────
  const handleLogoChange = (file: File | null) => {
    setLogoFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setLogoPreview(null);
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

  // ─── Turmas (Catequese) ─────────────────────────────────────────
  const handleCreateGroup = async () => {
    setSaving(true);
    try {
      await api.post('/parish-admin/catechism-groups', {
        name: groupForm.name,
        type: groupForm.type,
        year: groupForm.year ? parseInt(groupForm.year) : null,
        period: groupForm.period || null,
        meeting_day: groupForm.meeting_day || null,
        meeting_time: groupForm.meeting_time || null,
        capacity: groupForm.capacity ? parseInt(groupForm.capacity) : null,
        status: groupForm.status,
        notes: groupForm.notes || null,
      });
      setGroupFormOpen(false);
      setGroupForm({
        name: '', type: 'first_communion', year: new Date().getFullYear().toString(),
        period: 'morning', meeting_day: 'saturday', meeting_time: '', capacity: '', status: 'open', notes: '',
      });
      fetchPastoral();
    } catch (err: any) {
      const errors = err?.response?.data?.errors;
      alert(errors ? Object.values(errors).flat().join('\n') : 'Erro ao criar turma.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGroup = async (groupId: number) => {
    if (!confirm('Excluir esta turma? Todas as matrículas e aulas serão perdidas.')) return;
    try {
      await api.delete(`/parish-admin/catechism-groups/${groupId}`);
      fetchPastoral();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Erro ao excluir turma.');
    }
  };

  const handleAddCatechist = async () => {
    if (!catechistModalGroupId) return;
    setSaving(true);
    try {
      await api.post(`/parish-admin/catechism-groups/${catechistModalGroupId}/catechists`, {
        user_id: parseInt(catechistForm.user_id),
        role: catechistForm.role,
      });
      setCatechistModalGroupId(null);
      setCatechistForm({ user_id: '', role: 'lead' });
      fetchPastoral();
    } catch (err: any) {
      const errors = err?.response?.data?.errors;
      alert(errors ? Object.values(errors).flat().join('\n') : 'Erro ao adicionar catequista.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveCatechist = async (groupId: number, userId: number) => {
    if (!confirm('Remover este catequista da turma?')) return;
    try {
      await api.delete(`/parish-admin/catechism-groups/${groupId}/catechists/${userId}`);
      fetchPastoral();
    } catch (err) {
      alert('Erro ao remover catequista.');
    }
  };

  const openEnrollmentModal = async (groupId: number) => {
    setEnrollmentModalGroupId(groupId);
    setEnrollmentsLoading(true);
    try {
      const res = await api.get(`/parish-admin/catechism-groups/${groupId}/enrollments`, { params: { per_page: 100 } });
      setEnrollments(res.data.data || []);
    } catch (err) {
      console.error(err);
      setEnrollments([]);
    } finally {
      setEnrollmentsLoading(false);
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

  const groups = pastoral.catechism_groups || [];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/pastorais')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </button>
        <div className="flex items-center gap-3 flex-1">
          {(pastoral.logo_url || pastoral.logo_path) && (
            <img src={pastoral.logo_url || pastoral.logo_path!} alt="" className="h-10 w-10 rounded-full object-cover" />
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
        <nav className="flex gap-6 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
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

      {/* ─── Turmas Tab ──────────────────────────────────────────── */}
      {tab === 'Turmas' && isCatequese && (
        <div>
          {/* Create group form */}
          <div className="bg-white rounded-xl border border-gray-200 mb-4">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Turmas de Catequese
                <span className="ml-2 text-sm font-normal text-gray-400">({groups.length})</span>
              </h2>
              <div className="flex gap-2">
                {hasPermission('catechism-groups.create') && (
                  <button
                    onClick={() => setGroupFormOpen(!groupFormOpen)}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg"
                  >
                    <Plus className="h-4 w-4" />
                    Nova Turma
                  </button>
                )}
              </div>
            </div>

            {groupFormOpen && (
              <div className="p-4 bg-blue-50 border-b border-blue-200">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Nome da Turma *</label>
                    <input
                      value={groupForm.name}
                      onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                      placeholder="Ex: Turma A - Primeira Comunhão 2026"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Tipo *</label>
                    <select
                      value={groupForm.type}
                      onChange={(e) => setGroupForm({ ...groupForm, type: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs outline-none focus:ring-1 focus:ring-primary-500"
                    >
                      {Object.entries(GROUP_TYPES).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Ano</label>
                    <input
                      type="number"
                      value={groupForm.year}
                      onChange={(e) => setGroupForm({ ...groupForm, year: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Período</label>
                    <select
                      value={groupForm.period}
                      onChange={(e) => setGroupForm({ ...groupForm, period: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs outline-none focus:ring-1 focus:ring-primary-500"
                    >
                      {Object.entries(GROUP_PERIODS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Dia da Semana</label>
                    <select
                      value={groupForm.meeting_day}
                      onChange={(e) => setGroupForm({ ...groupForm, meeting_day: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs outline-none focus:ring-1 focus:ring-primary-500"
                    >
                      {Object.entries(GROUP_DAYS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Horário</label>
                    <input
                      type="time"
                      value={groupForm.meeting_time}
                      onChange={(e) => setGroupForm({ ...groupForm, meeting_time: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Capacidade</label>
                    <input
                      type="number"
                      value={groupForm.capacity}
                      onChange={(e) => setGroupForm({ ...groupForm, capacity: e.target.value })}
                      placeholder="Ilimitada"
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs outline-none focus:ring-1 focus:ring-primary-500"
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleCreateGroup}
                    disabled={saving || !groupForm.name}
                    className="px-3 py-1.5 text-xs font-medium text-white bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 rounded-md"
                  >
                    {saving ? 'Criando...' : 'Criar Turma'}
                  </button>
                  <button
                    onClick={() => setGroupFormOpen(false)}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {groups.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-12">Nenhuma turma de catequese cadastrada.</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {groups.map((g) => (
                  <div key={g.id} className="p-4 hover:bg-gray-50">
                    {/* Group header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-semibold text-gray-900">{g.name}</h3>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[g.status] || 'bg-gray-100 text-gray-500'}`}>
                            {g.status_label}
                          </span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                            {g.type_label}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-4 text-xs text-gray-500">
                          {g.year && <span>Ano: {g.year}</span>}
                          {g.day_label && <span>{g.day_label}</span>}
                          {g.meeting_time && <span>{g.meeting_time.slice(0, 5)}</span>}
                          {g.period_label && <span>{g.period_label}</span>}
                          {g.capacity && <span>Cap.: {g.capacity}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEnrollmentModal(g.id)}
                          title="Ver catequisandos"
                          className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md"
                        >
                          <Users className="h-3.5 w-3.5" />
                          {g.enrollments_count}
                        </button>
                        <button
                          onClick={async () => {
                            await loadUsers();
                            setCatechistForm({ user_id: '', role: 'lead' });
                            setCatechistModalGroupId(g.id);
                          }}
                          title="Adicionar catequista"
                          className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-md"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => navigate(`/catequese/${g.id}`)}
                          title="Gerenciar turma"
                          className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-md"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        {hasPermission('catechism-groups.delete') && (
                          <button
                            onClick={() => handleDeleteGroup(g.id)}
                            title="Excluir turma"
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Catechists row */}
                    {g.catechists && g.catechists.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {g.catechists.map((c) => (
                          <span key={c.id} className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-full text-xs text-amber-800">
                            {c.name}
                            <span className="text-amber-500">({c.role === 'lead' ? 'Principal' : 'Auxiliar'})</span>
                            {hasPermission('catechism-groups.update') && (
                              <button
                                onClick={() => handleRemoveCatechist(g.id, c.id)}
                                className="ml-0.5 text-amber-400 hover:text-red-500"
                                title="Remover catequista"
                              >
                                &times;
                              </button>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                    {(!g.catechists || g.catechists.length === 0) && (
                      <p className="mt-1 text-xs text-gray-400 italic">Nenhum catequista vinculado</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Catechist Modal ───────────────────────────────────────── */}
      <Modal
        open={catechistModalGroupId !== null}
        onClose={() => setCatechistModalGroupId(null)}
        title="Adicionar Catequista"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Usuário *</label>
            <select
              value={catechistForm.user_id}
              onChange={(e) => setCatechistForm({ ...catechistForm, user_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Selecione um usuário...</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Função *</label>
            <select
              value={catechistForm.role}
              onChange={(e) => setCatechistForm({ ...catechistForm, role: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="lead">Catequista Principal</option>
              <option value="assistant">Catequista Auxiliar</option>
            </select>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setCatechistModalGroupId(null)}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleAddCatechist}
              disabled={saving || !catechistForm.user_id}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 rounded-lg"
            >
              {saving ? 'Adicionando...' : 'Adicionar'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ─── Enrollments (Catequisandos) Modal ──────────────────────── */}
      <Modal
        open={enrollmentModalGroupId !== null}
        onClose={() => { setEnrollmentModalGroupId(null); setEnrollments([]); }}
        title="Catequisandos Matriculados"
        size="lg"
      >
        {enrollmentsLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
          </div>
        ) : enrollments.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-400">Nenhum catequisando matriculado nesta turma.</p>
            <button
              onClick={() => {
                setEnrollmentModalGroupId(null);
                navigate(`/catequese/${enrollmentModalGroupId}`);
              }}
              className="mt-3 text-sm text-primary-500 hover:underline"
            >
              Ir para a turma para matricular
            </button>
          </div>
        ) : (
          <div>
            <p className="text-xs text-gray-500 mb-3">{enrollments.length} catequisando(s) matriculado(s)</p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Catequisando</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Responsável</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="text-left px-3 py-2 text-xs font-medium text-gray-500 uppercase">Data Matrícula</th>
                  </tr>
                </thead>
                <tbody>
                  {enrollments.map((e: any) => (
                    <tr key={e.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium text-gray-900">{e.parishioner?.name || '—'}</td>
                      <td className="px-3 py-2 text-gray-600">{e.responsible_user?.name || e.responsible?.name || '—'}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          e.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                          e.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          e.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                          'bg-gray-100 text-gray-500'
                        }`}>
                          {e.status === 'confirmed' ? 'Confirmado' :
                           e.status === 'pending' ? 'Pendente' :
                           e.status === 'completed' ? 'Concluído' :
                           e.status === 'cancelled' ? 'Cancelado' : e.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-600">{fmtDate(e.enrolled_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3 text-right">
              <button
                onClick={() => {
                  const gId = enrollmentModalGroupId;
                  setEnrollmentModalGroupId(null);
                  navigate(`/catequese/${gId}`);
                }}
                className="text-sm text-primary-500 hover:underline"
              >
                Gerenciar turma completa
              </button>
            </div>
          </div>
        )}
      </Modal>

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
              <ImageUpload
                label="Logo"
                hint="Recomendado: imagem quadrada (ex: 200×200px)"
                preview={logoPreview}
                onChange={handleLogoChange}
              />
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
