import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';

// ─── Interfaces ──────────────────────────────────────────────────

interface ParishData {
  id: number;
  name: string;
  slug: string | null;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  pix_key: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  latitude: string | null;
  longitude: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  facebook_url: string | null;
  description: string | null;
  banner_url: string | null;
  is_active: boolean;
  requires_link_approval: boolean;
}

interface PlanInfo {
  name: string;
  slug: string;
  color: string;
  badge_label: string | null;
  price_monthly: string | null;
  price_yearly: string | null;
}

interface Subscription {
  plan_name: string;
  started_at: string;
  expires_at: string | null;
  status: string;
}

interface UsageItem {
  resource: string;
  label: string;
  current: number;
  max: number | null;
  percentage: number;
  exceeded: boolean;
  unlimited: boolean;
}

interface FeatureItem {
  key: string;
  label: string;
  enabled: boolean;
}

// ─── Constants ──────────────────────────────────────────────────

const TABS = ['Dados Gerais', 'Plano'] as const;
type Tab = typeof TABS[number];

const STATES = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

// ─── Component ──────────────────────────────────────────────────

export default function ParishSettings() {
  const { hasPermission } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>('Dados Gerais');

  const [parish, setParish] = useState<ParishData | null>(null);
  const [plan, setPlan] = useState<PlanInfo | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<UsageItem[]>([]);
  const [features, setFeatures] = useState<FeatureItem[]>([]);

  // Form state
  const [form, setForm] = useState({
    name: '', slug: '', cnpj: '', email: '', phone: '', whatsapp: '',
    pix_key: '', address: '', city: '', state: '', latitude: '', longitude: '',
    instagram_url: '', youtube_url: '', facebook_url: '', description: '',
    is_active: true, requires_link_approval: false,
  });
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/parish-admin/parish');
      const d = res.data.data;
      setParish(d.parish);
      setPlan(d.plan);
      setSubscription(d.subscription);
      setUsage(d.usage || []);
      setFeatures(d.features || []);

      const p = d.parish;
      setForm({
        name: p.name || '', slug: p.slug || '', cnpj: p.cnpj || '',
        email: p.email || '', phone: p.phone || '', whatsapp: p.whatsapp || '',
        pix_key: p.pix_key || '', address: p.address || '', city: p.city || '',
        state: p.state || '', latitude: p.latitude || '', longitude: p.longitude || '',
        instagram_url: p.instagram_url || '', youtube_url: p.youtube_url || '',
        facebook_url: p.facebook_url || '', description: p.description || '',
        is_active: p.is_active, requires_link_approval: p.requires_link_approval,
      });
      setBannerPreview(p.banner_url || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setBannerFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setBannerPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('_method', 'PUT');
      Object.entries(form).forEach(([key, val]) => {
        if (typeof val === 'boolean') {
          fd.append(key, val ? '1' : '0');
        } else {
          fd.append(key, val);
        }
      });
      if (bannerFile) fd.append('banner', bannerFile);

      await api.post('/parish-admin/parish', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setBannerFile(null);
      fetchData();
      alert('Dados salvos com sucesso!');
    } catch (err: any) {
      const errors = err?.response?.data?.errors;
      alert(errors ? Object.values(errors).flat().join('\n') : 'Erro ao salvar.');
    } finally {
      setSaving(false);
    }
  };

  const fmtDate = (d: string | null) =>
    d ? new Date(d + 'T00:00:00').toLocaleDateString('pt-BR') : null;

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-500" />
      </div>
    );
  }

  const canEdit = hasPermission('parishes.update');

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Configurações da Paróquia</h1>

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

      {/* ─── Dados Gerais ──────────────────────────────────────────── */}
      {tab === 'Dados Gerais' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Dados da Paróquia</h2>

          {/* Banner */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 mb-1">Banner / Foto de Capa</label>
            {bannerPreview && (
              <div className="mb-2">
                <img src={bannerPreview} alt="Banner" className="w-full max-h-44 object-cover rounded-lg" />
              </div>
            )}
            {canEdit && (
              <>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleBannerChange}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-600 hover:file:bg-primary-100"
                />
                <p className="text-xs text-gray-400 mt-1">Dimensão recomendada: 16:9 (ex: 1280x720). Máximo 5 MB.</p>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
            {/* Nome */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Paróquia *</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                disabled={!canEdit}
                placeholder="Ex: Paróquia São João Batista"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>

            {/* Slug */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug (identificador na URL)</label>
              <input
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
                disabled={!canEdit}
                placeholder="paroquia-sao-joao-batista"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>

            {/* Descrição */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                disabled={!canEdit}
                rows={3}
                placeholder="Breve descrição da paróquia para o app"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>

            {/* CNPJ / Email / Telefone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ</label>
              <input
                value={form.cnpj}
                onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
                disabled={!canEdit}
                placeholder="00.000.000/0000-00"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                disabled={!canEdit}
                placeholder="paroquia@exemplo.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
              <input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                disabled={!canEdit}
                placeholder="(00) 0000-0000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
              <input
                value={form.whatsapp}
                onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
                disabled={!canEdit}
                placeholder="11999999999"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
              <p className="text-xs text-gray-400 mt-0.5">Somente números, com DDD, sem +55</p>
            </div>

            {/* PIX */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Chave PIX</label>
              <input
                value={form.pix_key}
                onChange={(e) => setForm({ ...form, pix_key: e.target.value })}
                disabled={!canEdit}
                placeholder="E-mail, CPF/CNPJ ou chave aleatória"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
              <p className="text-xs text-gray-400 mt-0.5">Para pagamento de taxas de eventos</p>
            </div>

            {/* Redes sociais */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
              <input
                value={form.instagram_url}
                onChange={(e) => setForm({ ...form, instagram_url: e.target.value })}
                disabled={!canEdit}
                placeholder="https://instagram.com/paroquia"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Facebook</label>
              <input
                value={form.facebook_url}
                onChange={(e) => setForm({ ...form, facebook_url: e.target.value })}
                disabled={!canEdit}
                placeholder="https://facebook.com/paroquia"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">YouTube</label>
              <input
                value={form.youtube_url}
                onChange={(e) => setForm({ ...form, youtube_url: e.target.value })}
                disabled={!canEdit}
                placeholder="https://youtube.com/c/paroquia"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>

            {/* Endereço */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                disabled={!canEdit}
                placeholder="Rua, número, bairro"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cidade</label>
              <input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                disabled={!canEdit}
                placeholder="Ex: João Pessoa"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">UF</label>
              <select
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-500"
              >
                <option value="">Selecione...</option>
                {STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Latitude</label>
              <input
                value={form.latitude}
                onChange={(e) => setForm({ ...form, latitude: e.target.value })}
                disabled={!canEdit}
                placeholder="-7.1645349"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Longitude</label>
              <input
                value={form.longitude}
                onChange={(e) => setForm({ ...form, longitude: e.target.value })}
                disabled={!canEdit}
                placeholder="-34.8585186"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>

            {/* Toggles */}
            <div className="sm:col-span-2 space-y-3 pt-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                  disabled={!canEdit}
                  className="h-4 w-4 text-primary-600 border-gray-300 rounded"
                />
                <div>
                  <label className="text-sm text-gray-700">Paróquia Ativa</label>
                  <p className="text-xs text-gray-400">Paróquias inativas não aparecem no app nem no portal.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.requires_link_approval}
                  onChange={(e) => setForm({ ...form, requires_link_approval: e.target.checked })}
                  disabled={!canEdit}
                  className="h-4 w-4 text-primary-600 border-gray-300 rounded"
                />
                <div>
                  <label className="text-sm text-gray-700">Exigir aprovação para vínculos</label>
                  <p className="text-xs text-gray-400">Quando ativado, os pedidos de vínculo precisam ser aprovados manualmente.</p>
                </div>
              </div>
            </div>

            {/* Save button */}
            {canEdit && (
              <div className="sm:col-span-2 pt-4 border-t border-gray-200">
                <button
                  onClick={handleSave}
                  disabled={saving || !form.name}
                  className="px-5 py-2.5 text-sm font-medium text-white bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 rounded-lg"
                >
                  {saving ? 'Salvando...' : 'Salvar Dados Gerais'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Plano ─────────────────────────────────────────────────── */}
      {tab === 'Plano' && plan && (
        <div className="space-y-6">
          {/* Plan header */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Plano da Paróquia</h2>
              <span
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold text-white"
                style={{ backgroundColor: plan.color || '#6b7280' }}
              >
                {plan.name}
              </span>
            </div>

            {/* Subscription info */}
            {subscription && (
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                <span>Assinatura ativa desde <strong>{fmtDate(subscription.started_at)}</strong></span>
                {subscription.expires_at ? (
                  <span>— vence em <strong>{fmtDate(subscription.expires_at)}</strong></span>
                ) : (
                  <span className="text-green-600">— Sem vencimento</span>
                )}
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                  subscription.status === 'active' ? 'bg-green-100 text-green-800' :
                  subscription.status === 'expired' ? 'bg-gray-100 text-gray-500' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {subscription.status === 'active' ? 'Ativa' :
                   subscription.status === 'expired' ? 'Expirada' : 'Cancelada'}
                </span>
              </div>
            )}

            {/* Pricing */}
            <div className="flex gap-4 text-sm text-gray-600">
              {plan.price_monthly && (
                <span>Mensal: <strong>R$ {parseFloat(plan.price_monthly).toFixed(2).replace('.', ',')}</strong></span>
              )}
              {plan.price_yearly && (
                <span>Anual: <strong>R$ {parseFloat(plan.price_yearly).toFixed(2).replace('.', ',')}</strong></span>
              )}
              {!plan.price_monthly && !plan.price_yearly && (
                <span className="text-green-600 font-medium">Gratuito</span>
              )}
            </div>
          </div>

          {/* Usage */}
          {usage.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-md font-semibold text-gray-900 mb-4">Uso Atual</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {usage.map((u) => (
                  <div key={u.resource}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">{u.label}</span>
                      <span className={u.exceeded ? 'text-red-600' : 'text-gray-500'}>
                        {u.unlimited
                          ? `${u.current} (Ilimitado)`
                          : `${u.current} / ${u.max} (${u.percentage}%)`}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${
                          u.unlimited ? 'bg-green-500' :
                          u.exceeded ? 'bg-red-500' :
                          u.percentage >= 80 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${u.unlimited ? 30 : Math.min(100, u.percentage)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Features */}
          {features.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-md font-semibold text-gray-900 mb-4">Recursos Incluídos</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {features.map((f) => (
                  <div
                    key={f.key}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${
                      f.enabled
                        ? 'bg-green-50 text-green-800'
                        : 'bg-gray-50 text-gray-400'
                    }`}
                  >
                    <span>{f.enabled ? '✓' : '✗'}</span>
                    <span>{f.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-gray-400 text-center">
            Para alterar o plano, entre em contato com o suporte.
          </p>
        </div>
      )}
    </div>
  );
}
