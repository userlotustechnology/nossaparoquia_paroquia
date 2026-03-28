import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import DataTable from '@/components/DataTable';
import Modal from '@/components/Modal';
import ConfirmDialog from '@/components/ConfirmDialog';
import type { FinancialTransaction, PaginatedResponse } from '@/types';
import { TrendingUp, TrendingDown } from 'lucide-react';

export default function Financial() {
  const { hasPermission } = useAuth();
  const [data, setData] = useState<FinancialTransaction[]>([]);
  const [meta, setMeta] = useState<PaginatedResponse<FinancialTransaction>['meta'] | undefined>();
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState<FinancialTransaction | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    type: 'income' as 'income' | 'expense',
    amount: '',
    description: '',
    date: '',
    category: '',
    payment_method: '',
    reference: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/parish-admin/financial-transactions', {
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
    setForm({ type: 'income', amount: '', description: '', date: '', category: '', payment_method: '', reference: '' });
    setFormOpen(true);
  };

  const openEdit = (item: FinancialTransaction) => {
    setSelected(item);
    setForm({
      type: item.type,
      amount: item.amount.toString(),
      description: item.description || '',
      date: item.date ? item.date.slice(0, 10) : '',
      category: item.category || '',
      payment_method: item.payment_method || '',
      reference: item.reference || '',
    });
    setFormOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        ...form,
        amount: parseFloat(form.amount),
      };
      if (selected) {
        await api.put(`/parish-admin/financial-transactions/${selected.id}`, payload);
      } else {
        await api.post('/parish-admin/financial-transactions', payload);
      }
      setFormOpen(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      const errors = err?.response?.data?.errors;
      const msg = errors
        ? Object.values(errors).flat().join('\n')
        : (err?.response?.data?.message || 'Erro ao salvar lançamento.');
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await api.delete(`/parish-admin/financial-transactions/${selected.id}`);
      setDeleteOpen(false);
      setSelected(null);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir lançamento.');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const columns = [
    { key: 'type', label: 'Tipo', render: (t: FinancialTransaction) => (
      <div className="flex items-center gap-1.5">
        {t.type === 'income' ? (
          <TrendingUp className="h-4 w-4 text-green-500" />
        ) : (
          <TrendingDown className="h-4 w-4 text-red-500" />
        )}
        <span className={t.type === 'income' ? 'text-green-700' : 'text-red-700'}>
          {t.type === 'income' ? 'Receita' : 'Despesa'}
        </span>
      </div>
    )},
    { key: 'description', label: 'Descrição', render: (t: FinancialTransaction) => (
      <div className="font-medium text-gray-900 max-w-[200px] truncate">{t.description}</div>
    )},
    { key: 'amount', label: 'Valor', render: (t: FinancialTransaction) => (
      <span className={t.type === 'income' ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>
        {formatCurrency(t.amount)}
      </span>
    )},
    { key: 'date', label: 'Data', render: (t: FinancialTransaction) =>
      t.date ? new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR') : '—',
    },
    { key: 'category', label: 'Categoria', render: (t: FinancialTransaction) => t.category || '—' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>
        <p className="text-gray-500">Controle de receitas e despesas da paróquia</p>
      </div>

      <DataTable
        title="Lançamentos Financeiros"
        columns={columns}
        data={data}
        loading={loading}
        meta={meta}
        onPageChange={setPage}
        onSearch={setSearch}
        onCreate={hasPermission('financial-transactions.create') ? openCreate : undefined}
        onEdit={hasPermission('financial-transactions.update') ? openEdit : undefined}
        onDelete={hasPermission('financial-transactions.delete') ? (item) => { setSelected(item); setDeleteOpen(true); } : undefined}
        canCreate={hasPermission('financial-transactions.create')}
        canEdit={hasPermission('financial-transactions.update')}
        canDelete={hasPermission('financial-transactions.delete')}
        createLabel="Novo Lançamento"
        searchPlaceholder="Buscar lançamentos..."
        keyExtractor={(t) => t.id}
      />

      {/* Form Modal */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={selected ? 'Editar Lançamento' : 'Novo Lançamento'}
        size="lg"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
            <select
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as 'income' | 'expense' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
            >
              <option value="income">Receita</option>
              <option value="expense">Despesa</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Valor *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
              placeholder="0,00"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição *</label>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Data *</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
            >
              <option value="">Selecione</option>
              <option value="dizimo">Dízimo</option>
              <option value="oferta">Oferta</option>
              <option value="doacao">Doação</option>
              <option value="evento">Evento</option>
              <option value="manutencao">Manutenção</option>
              <option value="salario">Salário</option>
              <option value="conta">Conta (água, luz, etc.)</option>
              <option value="outros">Outros</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Forma de Pagamento</label>
            <select
              value={form.payment_method}
              onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
            >
              <option value="">Selecione</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="pix">PIX</option>
              <option value="cartao">Cartão</option>
              <option value="boleto">Boleto</option>
              <option value="transferencia">Transferência</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Referência</label>
            <input
              value={form.reference}
              onChange={(e) => setForm({ ...form, reference: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none text-sm"
              placeholder="Nº do recibo, comprovante..."
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
            disabled={saving || !form.description || !form.amount || !form.date}
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
        title="Excluir Lançamento"
        message={`Tem certeza que deseja excluir "${selected?.description}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        loading={saving}
      />
    </div>
  );
}
