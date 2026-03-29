import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

interface Tither {
  id: number;
  tither_number: string;
  parishioner_id: number;
  parishioner?: { id: number; name: string; phone: string | null; email: string | null };
  joined_at: string;
  periodicity: string;
  suggested_amount: number | null;
  status: string;
  notes: string | null;
  preferred_day: number | null;
  reminder_enabled: boolean;
  contributions?: Contribution[];
}

interface Contribution {
  id: number;
  paid_at: string;
  amount: number;
  method: string;
  notes: string | null;
}

const PERIOD_LABELS: Record<string, string> = {
  monthly: 'Mensal',
  bimonthly: 'Bimestral',
  quarterly: 'Trimestral',
  yearly: 'Anual',
};

const METHOD_LABELS: Record<string, string> = {
  cash: 'Dinheiro',
  pix: 'Pix',
  bank_transfer: 'Transferência',
  credit_card: 'Cartão de Crédito',
  debit_card: 'Cartão de Débito',
  boleto: 'Boleto',
};

const fmt = (v: number | null) =>
  v != null
    ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
    : '—';

const fmtDate = (d: string | null) =>
  d ? new Date(d.slice(0, 10) + 'T00:00:00').toLocaleDateString('pt-BR') : '—';

export default function TitherDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const [tither, setTither] = useState<Tither | null>(null);
  const [loading, setLoading] = useState(true);

  // Contributions with separate pagination
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [contribMeta, setContribMeta] = useState<any>(null);
  const [contribPage, setContribPage] = useState(1);
  const [contribLoading, setContribLoading] = useState(false);

  // New contribution form
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ paid_at: '', amount: '', method: 'pix', notes: '' });
  const [saving, setSaving] = useState(false);

  // Fetch tither details
  const fetchTither = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/parish-admin/tithers/${id}`);
      setTither(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Fetch contributions (paginated)
  const fetchContributions = useCallback(async () => {
    setContribLoading(true);
    try {
      const res = await api.get('/parish-admin/tithe-contributions', {
        params: { tither_id: id, page: contribPage, per_page: 15 },
      });
      setContributions(res.data.data);
      setContribMeta(res.data.meta);
    } catch (err) {
      console.error(err);
    } finally {
      setContribLoading(false);
    }
  }, [id, contribPage]);

  useEffect(() => {
    fetchTither();
  }, [fetchTither]);

  useEffect(() => {
    fetchContributions();
  }, [fetchContributions]);

  const openContribForm = () => {
    setForm({ paid_at: new Date().toISOString().slice(0, 10), amount: '', method: 'pix', notes: '' });
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!tither) return;
    setSaving(true);
    try {
      await api.post('/parish-admin/tithe-contributions', {
        tither_id: tither.id,
        paid_at: form.paid_at,
        amount: parseFloat(form.amount),
        method: form.method,
        notes: form.notes || null,
      });
      setFormOpen(false);
      fetchContributions();
      fetchTither();
    } catch (err: any) {
      const errors = err?.response?.data?.errors;
      alert(errors ? Object.values(errors).flat().join('\n') : 'Erro ao registrar dízimo.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
      </div>
    );
  }

  if (!tither) {
    return (
      <div className="text-center py-24">
        <p className="text-gray-500">Dizimista não encontrado.</p>
        <button onClick={() => navigate('/dizimistas')} className="mt-4 text-primary-500 hover:underline text-sm">
          Voltar para a lista
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/dizimistas')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="h-5 w-5 text-gray-500" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{tither.parishioner?.name}</h1>
          <p className="text-sm text-gray-500">Dizimista #{tither.tither_number}</p>
        </div>
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${tither.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
          {tither.status === 'active' ? 'Ativo' : 'Inativo'}
        </span>
        {hasPermission('tithers.update') && (
          <button
            onClick={() => navigate('/dizimistas')}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-primary-600 border border-primary-300 rounded-lg hover:bg-primary-50"
          >
            <Pencil className="h-4 w-4" />
            Editar
          </button>
        )}
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Data de Adesão</p>
          <p className="text-sm font-semibold text-gray-900">{fmtDate(tither.joined_at)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Periodicidade</p>
          <p className="text-sm font-semibold text-gray-900">{PERIOD_LABELS[tither.periodicity] || tither.periodicity}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Valor Sugerido</p>
          <p className="text-sm font-semibold text-gray-900">{fmt(tither.suggested_amount)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Dia Preferido</p>
          <p className="text-sm font-semibold text-gray-900">{tither.preferred_day ? `Dia ${tither.preferred_day}` : '—'}</p>
        </div>
        {tither.parishioner?.phone && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">Telefone</p>
            <p className="text-sm font-semibold text-gray-900">{tither.parishioner.phone}</p>
          </div>
        )}
        {tither.parishioner?.email && (
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">E-mail</p>
            <p className="text-sm font-semibold text-gray-900 truncate">{tither.parishioner.email}</p>
          </div>
        )}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Lembrete</p>
          <p className="text-sm font-semibold text-gray-900">{tither.reminder_enabled ? 'Ativado' : 'Desativado'}</p>
        </div>
      </div>

      {tither.notes && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
          <p className="text-xs font-medium text-yellow-800 mb-1">Observações</p>
          <p className="text-sm text-yellow-700">{tither.notes}</p>
        </div>
      )}

      {/* Contributions section */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Histórico de Contribuições</h2>
          {hasPermission('tithes.create') && (
            <button
              onClick={openContribForm}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 rounded-lg"
            >
              <Plus className="h-4 w-4" />
              Registrar Dízimo
            </button>
          )}
        </div>

        {/* Inline form */}
        {formOpen && (
          <div className="p-4 bg-blue-50 border-b border-blue-200">
            <p className="text-xs font-semibold text-blue-800 mb-3">Novo Registro de Dízimo</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Data *</label>
                <input
                  type="date"
                  value={form.paid_at}
                  onChange={(e) => setForm({ ...form, paid_at: e.target.value })}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Valor *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="0,00"
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Forma *</label>
                <select
                  value={form.method}
                  onChange={(e) => setForm({ ...form, method: e.target.value })}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs outline-none focus:ring-1 focus:ring-primary-500"
                >
                  {Object.entries(METHOD_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Obs.</label>
                <input
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-2 py-1.5 border border-gray-300 rounded-md text-xs outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleSave}
                disabled={saving || !form.paid_at || !form.amount}
                className="px-3 py-1.5 text-xs font-medium text-white bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 rounded-md"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
              <button
                onClick={() => setFormOpen(false)}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        {contribLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" />
          </div>
        ) : contributions.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-12">
            Nenhuma contribuição registrada ainda.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Data</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Valor</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Forma</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Obs.</th>
                  </tr>
                </thead>
                <tbody>
                  {contributions.map((c) => (
                    <tr key={c.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-700">{fmtDate(c.paid_at)}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{fmt(c.amount)}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                          {METHOD_LABELS[c.method] || c.method}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">{c.notes || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {contribMeta && contribMeta.last_page > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Página {contribMeta.current_page} de {contribMeta.last_page} · {contribMeta.total} registro{contribMeta.total !== 1 ? 's' : ''}
                </p>
                <div className="flex gap-1">
                  <button
                    onClick={() => setContribPage((p) => Math.max(1, p - 1))}
                    disabled={contribPage <= 1}
                    className="px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <button
                    onClick={() => setContribPage((p) => p + 1)}
                    disabled={contribPage >= contribMeta.last_page}
                    className="px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
