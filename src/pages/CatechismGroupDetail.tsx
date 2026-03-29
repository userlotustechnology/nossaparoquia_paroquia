import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Check,
  X,
  BookOpen,
  Users,
  Info,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

interface GroupInfo {
  id: number;
  name: string;
  type_label: string;
  year: number | null;
  day_label: string;
  meeting_time: string | null;
  period_label: string;
  capacity: number | null;
  status: string;
  status_label: string;
  notes: string | null;
  enrollments_count: number;
}

interface Enrollment {
  id: number;
  parishioner_id: number;
  parishioner_name: string;
  enrolled_at: string;
  status: string;
  status_label: string;
  notes: string | null;
}

interface Session {
  id: number;
  session_date: string;
  session_time: string | null;
  topic: string | null;
  notes: string | null;
  attendance_locked: boolean;
  attendances_count: number;
  present_count: number;
}

interface AttendanceRecord {
  enrollment_id: number;
  parishioner_id: number;
  parishioner_name: string;
  present: boolean;
}

interface Parishioner {
  id: number;
  name: string;
}

interface Meta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

const ENROLLMENT_STATUS_COLORS: Record<string, string> = {
  pending:   'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-500',
  completed: 'bg-blue-100 text-blue-800',
};

type Tab = 'info' | 'enrollments' | 'sessions';

export default function CatechismGroupDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('enrollments');

  // Enrollments
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [enrollMeta, setEnrollMeta] = useState<Meta | null>(null);
  const [enrollPage, setEnrollPage] = useState(1);
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [enrollFormOpen, setEnrollFormOpen] = useState(false);
  const [enrollSaving, setEnrollSaving] = useState(false);
  const [enrollForm, setEnrollForm] = useState({ parishioner_id: '', notes: '' });
  const [deleteEnrollOpen, setDeleteEnrollOpen] = useState(false);
  const [selectedEnroll, setSelectedEnroll] = useState<Enrollment | null>(null);
  const [parishioners, setParishioners] = useState<Parishioner[]>([]);
  const [parishSearch, setParishSearch] = useState('');

  // Sessions
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionFormOpen, setSessionFormOpen] = useState(false);
  const [sessionSaving, setSessionSaving] = useState(false);
  const [sessionForm, setSessionForm] = useState({ session_date: '', session_time: '', topic: '', notes: '' });
  const [deleteSessionOpen, setDeleteSessionOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);

  // Attendance
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [attendanceSaving, setAttendanceSaving] = useState(false);
  const [attendanceSession, setAttendanceSession] = useState<Session | null>(null);

  const fetchGroup = useCallback(async () => {
    if (!id) return;
    try {
      const res = await api.get(`/parish-admin/catechism-groups/${id}`);
      setGroup(res.data.data);
    } catch (err) { console.error(err); }
  }, [id]);

  const fetchEnrollments = useCallback(async () => {
    if (!id) return;
    setEnrollLoading(true);
    try {
      const res = await api.get(`/parish-admin/catechism-groups/${id}/enrollments`, {
        params: { page: enrollPage, per_page: 20 },
      });
      setEnrollments(res.data.data);
      setEnrollMeta(res.data.meta);
    } catch (err) { console.error(err); }
    finally { setEnrollLoading(false); }
  }, [id, enrollPage]);

  const fetchSessions = useCallback(async () => {
    if (!id) return;
    setSessionsLoading(true);
    try {
      const res = await api.get(`/parish-admin/catechism-groups/${id}/sessions`);
      setSessions(res.data.data);
    } catch (err) { console.error(err); }
    finally { setSessionsLoading(false); }
  }, [id]);

  const fetchParishioners = useCallback(async (search: string) => {
    try {
      const res = await api.get('/parish-admin/parishioners', {
        params: { search: search || undefined, per_page: 30 },
      });
      setParishioners(res.data.data.map((p: any) => ({ id: p.id, name: p.name })));
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { fetchGroup(); }, [fetchGroup]);
  useEffect(() => { if (activeTab === 'enrollments') fetchEnrollments(); }, [fetchEnrollments, activeTab]);
  useEffect(() => { if (activeTab === 'sessions') fetchSessions(); }, [fetchSessions, activeTab]);
  useEffect(() => {
    const timer = setTimeout(() => fetchParishioners(parishSearch), 300);
    return () => clearTimeout(timer);
  }, [parishSearch, fetchParishioners]);

  // --- Enrollments ---
  const handleAddEnrollment = async () => {
    if (!id || !enrollForm.parishioner_id) return;
    setEnrollSaving(true);
    try {
      await api.post(`/parish-admin/catechism-groups/${id}/enrollments`, {
        parishioner_id: Number(enrollForm.parishioner_id),
        notes: enrollForm.notes || null,
      });
      setEnrollFormOpen(false);
      setEnrollForm({ parishioner_id: '', notes: '' });
      fetchEnrollments();
      fetchGroup();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Erro ao inscrever.';
      alert(msg);
    } finally { setEnrollSaving(false); }
  };

  const handleRemoveEnrollment = async () => {
    if (!id || !selectedEnroll) return;
    setEnrollSaving(true);
    try {
      await api.delete(`/parish-admin/catechism-groups/${id}/enrollments/${selectedEnroll.id}`);
      setDeleteEnrollOpen(false);
      setSelectedEnroll(null);
      fetchEnrollments();
      fetchGroup();
    } catch (err) {
      alert('Erro ao remover inscrição.');
    } finally { setEnrollSaving(false); }
  };

  const handleEnrollStatus = async (enrollment: Enrollment, action: 'confirm' | 'cancel') => {
    if (!id) return;
    try {
      await api.patch(`/parish-admin/catechism-groups/${id}/enrollments/${enrollment.id}/${action}`);
      fetchEnrollments();
    } catch (err) { alert('Erro ao atualizar status.'); }
  };

  // --- Sessions ---
  const handleAddSession = async () => {
    if (!id || !sessionForm.session_date) return;
    setSessionSaving(true);
    try {
      await api.post(`/parish-admin/catechism-groups/${id}/sessions`, {
        session_date: sessionForm.session_date,
        session_time: sessionForm.session_time || null,
        topic: sessionForm.topic || null,
        notes: sessionForm.notes || null,
      });
      setSessionFormOpen(false);
      setSessionForm({ session_date: '', session_time: '', topic: '', notes: '' });
      fetchSessions();
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Erro ao criar aula.';
      alert(msg);
    } finally { setSessionSaving(false); }
  };

  const handleDeleteSession = async () => {
    if (!id || !selectedSession) return;
    setSessionSaving(true);
    try {
      await api.delete(`/parish-admin/catechism-groups/${id}/sessions/${selectedSession.id}`);
      setDeleteSessionOpen(false);
      setSelectedSession(null);
      fetchSessions();
    } catch (err) { alert('Erro ao excluir aula.'); }
    finally { setSessionSaving(false); }
  };

  const openAttendance = async (session: Session) => {
    if (!id) return;
    setAttendanceSession(session);
    setAttendanceOpen(true);
    setAttendanceLoading(true);
    try {
      const res = await api.get(`/parish-admin/catechism-groups/${id}/sessions/${session.id}/attendance`);
      setAttendance(res.data.data);
    } catch (err) { console.error(err); }
    finally { setAttendanceLoading(false); }
  };

  const togglePresent = (enrollmentId: number) => {
    setAttendance(prev => prev.map(a =>
      a.enrollment_id === enrollmentId ? { ...a, present: !a.present } : a
    ));
  };

  const saveAttendance = async () => {
    if (!id || !attendanceSession) return;
    setAttendanceSaving(true);
    try {
      await api.post(`/parish-admin/catechism-groups/${id}/sessions/${attendanceSession.id}/attendance`, {
        attendance: attendance.map(a => ({ enrollment_id: a.enrollment_id, present: a.present })),
      });
      setAttendanceOpen(false);
      fetchSessions();
    } catch (err) { alert('Erro ao salvar frequência.'); }
    finally { setAttendanceSaving(false); }
  };

  const canUpdate = hasPermission('catechism-groups.update');
  const canDelete = hasPermission('catechism-groups.delete');

  const fmtDate = (d: string) =>
    new Date(d + 'T00:00:00').toLocaleDateString('pt-BR');

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/catequese')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar às Turmas
        </button>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{group?.name ?? 'Carregando...'}</h1>
            {group && (
              <p className="text-gray-500 mt-0.5">
                {group.type_label}
                {group.year ? ` · ${group.year}` : ''}
                {group.day_label ? ` · ${group.day_label}` : ''}
                {group.meeting_time ? ` às ${group.meeting_time}` : ''}
              </p>
            )}
          </div>
          {group && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {group.enrollments_count} inscritos
              {group.capacity ? ` / ${group.capacity}` : ''}
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-1">
          {([
            { id: 'enrollments', label: 'Inscrições', icon: Users },
            { id: 'sessions', label: 'Aulas', icon: BookOpen },
            { id: 'info', label: 'Informações', icon: Info },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* --- Enrollments Tab --- */}
      {activeTab === 'enrollments' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Inscrições</h2>
            {canUpdate && (
              <button
                onClick={() => { setEnrollForm({ parishioner_id: '', notes: '' }); setEnrollFormOpen(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg"
              >
                <Plus className="h-4 w-4" />
                Inscrever
              </button>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {enrollLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-5 w-5 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
              </div>
            ) : enrollments.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">Nenhuma inscrição.</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Catequizando</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 hidden sm:table-cell">Inscrição</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Status</th>
                    {(canUpdate || canDelete) && (
                      <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Ações</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {enrollments.map(e => (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 text-sm">{e.parishioner_name}</div>
                        {e.notes && <div className="text-xs text-gray-400">{e.notes}</div>}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-xs text-gray-500">{e.enrolled_at}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ENROLLMENT_STATUS_COLORS[e.status] || 'bg-gray-100 text-gray-600'}`}>
                          {e.status_label}
                        </span>
                      </td>
                      {(canUpdate || canDelete) && (
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            {canUpdate && e.status === 'pending' && (
                              <button onClick={() => handleEnrollStatus(e, 'confirm')} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg" title="Confirmar">
                                <Check className="h-4 w-4" />
                              </button>
                            )}
                            {canUpdate && (e.status === 'pending' || e.status === 'confirmed') && (
                              <button onClick={() => handleEnrollStatus(e, 'cancel')} className="p-1.5 text-orange-500 hover:bg-orange-50 rounded-lg" title="Cancelar">
                                <X className="h-4 w-4" />
                              </button>
                            )}
                            {canDelete && (
                              <button onClick={() => { setSelectedEnroll(e); setDeleteEnrollOpen(true); }} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Remover">
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {enrollMeta && enrollMeta.last_page > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                <span className="text-sm text-gray-500">
                  Página {enrollMeta.current_page} de {enrollMeta.last_page} · {enrollMeta.total} inscrições
                </span>
                <div className="flex items-center gap-1">
                  <button onClick={() => setEnrollPage(p => p - 1)} disabled={enrollMeta.current_page <= 1} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button onClick={() => setEnrollPage(p => p + 1)} disabled={enrollMeta.current_page >= enrollMeta.last_page} className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- Sessions Tab --- */}
      {activeTab === 'sessions' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-700">Aulas</h2>
            {canUpdate && (
              <button
                onClick={() => { setSessionForm({ session_date: '', session_time: '', topic: '', notes: '' }); setSessionFormOpen(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium rounded-lg"
              >
                <Plus className="h-4 w-4" />
                Nova Aula
              </button>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {sessionsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-5 w-5 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm">Nenhuma aula registrada.</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Data</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 hidden sm:table-cell">Tema</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-3 hidden md:table-cell">Presença</th>
                    <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sessions.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 text-sm">{fmtDate(s.session_date)}</div>
                        {s.session_time && <div className="text-xs text-gray-400">{s.session_time}</div>}
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-sm text-gray-600">{s.topic || '—'}</td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {s.attendances_count > 0 ? (
                          <span className="text-sm text-gray-700">{s.present_count} / {s.attendances_count}</span>
                        ) : (
                          <span className="text-xs text-gray-400">Não registrada</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          {canUpdate && (
                            <button
                              onClick={() => openAttendance(s)}
                              className="text-xs px-2.5 py-1 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
                            >
                              Frequência
                            </button>
                          )}
                          {canDelete && (
                            <button onClick={() => { setSelectedSession(s); setDeleteSessionOpen(true); }} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* --- Info Tab --- */}
      {activeTab === 'info' && group && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'Tipo', value: group.type_label },
              { label: 'Ano', value: group.year?.toString() ?? '—' },
              { label: 'Período', value: group.period_label },
              { label: 'Dia', value: group.day_label },
              { label: 'Horário', value: group.meeting_time ?? '—' },
              { label: 'Capacidade', value: group.capacity?.toString() ?? '—' },
              { label: 'Status', value: group.status_label },
              { label: 'Inscritos', value: group.enrollments_count.toString() },
            ].map(({ label, value }) => (
              <div key={label}>
                <dt className="text-xs font-medium text-gray-400 uppercase">{label}</dt>
                <dd className="mt-0.5 text-sm font-medium text-gray-900">{value}</dd>
              </div>
            ))}
            {group.notes && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-medium text-gray-400 uppercase">Observações</dt>
                <dd className="mt-0.5 text-sm text-gray-700 whitespace-pre-wrap">{group.notes}</dd>
              </div>
            )}
          </dl>
        </div>
      )}

      {/* Enrollment Form Modal */}
      <Modal open={enrollFormOpen} onClose={() => setEnrollFormOpen(false)} title="Inscrever Catequizando" size="md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Buscar Paroquiano</label>
            <input
              placeholder="Digite o nome..."
              value={parishSearch}
              onChange={e => setParishSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm mb-2"
            />
            <select
              value={enrollForm.parishioner_id}
              onChange={e => setEnrollForm({ ...enrollForm, parishioner_id: e.target.value })}
              size={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
            >
              <option value="">— Selecione —</option>
              {parishioners.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
            <input
              value={enrollForm.notes}
              onChange={e => setEnrollForm({ ...enrollForm, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
          <button onClick={() => setEnrollFormOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
          <button
            onClick={handleAddEnrollment}
            disabled={enrollSaving || !enrollForm.parishioner_id}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 rounded-lg"
          >
            {enrollSaving ? 'Salvando...' : 'Inscrever'}
          </button>
        </div>
      </Modal>

      {/* Session Form Modal */}
      <Modal open={sessionFormOpen} onClose={() => setSessionFormOpen(false)} title="Nova Aula" size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data *</label>
              <input
                type="date"
                value={sessionForm.session_date}
                onChange={e => setSessionForm({ ...sessionForm, session_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Horário</label>
              <input
                type="time"
                value={sessionForm.session_time}
                onChange={e => setSessionForm({ ...sessionForm, session_time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tema</label>
            <input
              value={sessionForm.topic}
              onChange={e => setSessionForm({ ...sessionForm, topic: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
            <textarea
              value={sessionForm.notes}
              onChange={e => setSessionForm({ ...sessionForm, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
          <button onClick={() => setSessionFormOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
          <button
            onClick={handleAddSession}
            disabled={sessionSaving || !sessionForm.session_date}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 rounded-lg"
          >
            {sessionSaving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </Modal>

      {/* Attendance Modal */}
      <Modal open={attendanceOpen} onClose={() => setAttendanceOpen(false)} title={`Frequência — ${attendanceSession ? fmtDate(attendanceSession.session_date) : ''}`} size="md">
        {attendanceLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
          </div>
        ) : attendance.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">Nenhum inscritos ativo encontrado.</p>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-gray-500">
                {attendance.filter(a => a.present).length} / {attendance.length} presentes
              </span>
              <button
                onClick={() => setAttendance(prev => {
                  const allPresent = prev.every(a => a.present);
                  return prev.map(a => ({ ...a, present: !allPresent }));
                })}
                className="text-xs text-primary-600 hover:text-primary-800"
              >
                {attendance.every(a => a.present) ? 'Desmarcar todos' : 'Marcar todos'}
              </button>
            </div>
            <div className="space-y-1 max-h-80 overflow-y-auto">
              {attendance.map(a => (
                <label key={a.enrollment_id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={a.present}
                    onChange={() => togglePresent(a.enrollment_id)}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-900">{a.parishioner_name}</span>
                </label>
              ))}
            </div>
          </div>
        )}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
          <button onClick={() => setAttendanceOpen(false)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Fechar</button>
          {!attendanceLoading && attendance.length > 0 && (
            <button
              onClick={saveAttendance}
              disabled={attendanceSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 rounded-lg"
            >
              {attendanceSaving ? 'Salvando...' : 'Salvar Frequência'}
            </button>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteEnrollOpen}
        onClose={() => setDeleteEnrollOpen(false)}
        onConfirm={handleRemoveEnrollment}
        title="Remover Inscrição"
        message={`Remover a inscrição de "${selectedEnroll?.parishioner_name}"?`}
        confirmLabel="Remover"
        loading={enrollSaving}
      />
      <ConfirmDialog
        open={deleteSessionOpen}
        onClose={() => setDeleteSessionOpen(false)}
        onConfirm={handleDeleteSession}
        title="Excluir Aula"
        message={`Excluir a aula de ${selectedSession ? fmtDate(selectedSession.session_date) : ''}? A frequência registrada será perdida.`}
        confirmLabel="Excluir"
        loading={sessionSaving}
      />
    </div>
  );
}
