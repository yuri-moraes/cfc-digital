'use client';

import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Modal } from '@/app/components/ui/Modal';
import { Spinner } from '@/app/components/ui/Spinner';
import { api } from '@/app/api/client';
import { toDateStr } from '@/app/lib/utils';

const EMPTY_FORM = { student_id: '', exam_date: '', vehicle_id: '', result: 'pass', notes: '' };

export const InstructorTestResultScreen = ({ user, showToast }) => {
  const [results, setResults]   = useState([]);
  const [students, setStudents] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [createModal, setCreateModal] = useState(false);
  const [editModal, setEditModal] = useState({ open: false, result: null });
  const [form, setForm]   = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const loadResults = async () => {
    setResults(await api.examResults.list());
  };

  useEffect(() => {
    Promise.all([
      api.examResults.list(),
      api.getUsers(),
      api.vehicles.list(),
    ]).then(([r, u, v]) => {
      setResults(r);
      setStudents(u.filter(x => x.role === 'STUDENT'));
      setVehicles(v);
    }).catch(() => showToast('Erro ao carregar dados.', 'error'))
    .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const studentName = (id) => students.find(s => String(s.id) === String(id))?.name ?? id;
  const vehiclePlate = (id) => vehicles.find(v => String(v.id) === String(id))?.plate ?? '';

  const openCreate = () => { setForm({ ...EMPTY_FORM, exam_date: toDateStr(new Date()) }); setCreateModal(true); };
  const openEdit   = (r) => {
    setForm({ student_id: r.student_id, exam_date: r.exam_date, vehicle_id: r.vehicle_id ?? '', result: r.result, notes: r.notes ?? '' });
    setEditModal({ open: true, result: r });
  };

  const handleCreate = async () => {
    setSaving(true);
    try {
      await api.examResults.create({ ...form, instructor_id: user.id });
      showToast('Resultado registrado.', 'success');
      setCreateModal(false);
      loadResults();
    } catch (err) {
      showToast(err.message || 'Erro ao registrar resultado.', 'error');
    } finally { setSaving(false); }
  };

  const handleEdit = async () => {
    setSaving(true);
    try {
      await api.examResults.update(editModal.result.id, {
        result: form.result, notes: form.notes || null,
        exam_date: form.exam_date, vehicle_id: form.vehicle_id || null,
      });
      showToast('Resultado atualizado.', 'success');
      setEditModal({ open: false, result: null });
      loadResults();
    } catch (err) {
      showToast(err.message || 'Erro ao atualizar resultado.', 'error');
    } finally { setSaving(false); }
  };

  const formFields = (showStudentPicker) => (
    <div className="space-y-3">
      {showStudentPicker && (
        <select value={form.student_id} onChange={e => setForm(p => ({ ...p, student_id: e.target.value }))}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900">
          <option value="">Selecionar aluno...</option>
          {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      )}
      <input type="date" value={form.exam_date} onChange={e => setForm(p => ({ ...p, exam_date: e.target.value }))}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900" />
      <select value={form.vehicle_id} onChange={e => setForm(p => ({ ...p, vehicle_id: e.target.value }))}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900">
        <option value="">Veículo (opcional)</option>
        {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate} · {v.model}</option>)}
      </select>
      <div className="flex gap-3">
        {['pass', 'fail'].map(r => (
          <button key={r} onClick={() => setForm(p => ({ ...p, result: r }))}
            className={`flex-1 py-3 rounded-lg font-semibold text-sm border-2 transition-colors ${form.result === r
              ? r === 'pass' ? 'bg-green-500 text-white border-green-500' : 'bg-red-500 text-white border-red-500'
              : r === 'pass' ? 'border-gray-300 text-gray-600 hover:border-green-400' : 'border-gray-300 text-gray-600 hover:border-red-400'}`}>
            {r === 'pass' ? '✓ Aprovado' : '✗ Reprovado'}
          </button>
        ))}
      </div>
      <textarea placeholder="Observações (opcional)" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
        rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
    </div>
  );

  if (loading) return <div className="p-8"><Spinner /></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Exame Prático</h2>
        <Button onClick={openCreate} variant="primary" className="sm:w-auto flex items-center justify-center gap-2">
          <Plus size={18} /> Novo resultado
        </Button>
      </div>

      <Card>
        {results.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Nenhum resultado registrado.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {results.map(r => (
              <div key={r.id} className="flex justify-between items-center py-3 px-1 gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-gray-800 truncate">{studentName(r.student_id)}</p>
                  <p className="text-sm text-gray-500">{r.exam_date}{r.vehicle_id ? ` · ${vehiclePlate(r.vehicle_id)}` : ''}</p>
                  {r.notes && <p className="text-xs text-gray-400 mt-0.5 truncate">{r.notes}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${r.result === 'pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {r.result === 'pass' ? '✓ Aprovado' : '✗ Reprovado'}
                  </span>
                  <button onClick={() => openEdit(r)} className="text-blue-500 hover:text-blue-700 text-sm py-2 px-2 -mr-2 rounded">Editar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal title="Novo Resultado" isOpen={createModal} onClose={() => setCreateModal(false)}>
        <div className="space-y-3">
          {formFields(true)}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setCreateModal(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleCreate} disabled={saving}>{saving ? 'Salvando...' : 'Registrar'}</Button>
          </div>
        </div>
      </Modal>

      <Modal title="Editar Resultado" isOpen={editModal.open} onClose={() => setEditModal({ open: false, result: null })}>
        <div className="space-y-3">
          {formFields(false)}
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setEditModal({ open: false, result: null })}>Cancelar</Button>
            <Button variant="primary" onClick={handleEdit} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
