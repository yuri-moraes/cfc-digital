'use client';

import { useState, useEffect, useCallback } from 'react';
import { Car, Pencil, Trash2, Plus } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Modal } from '@/app/components/ui/Modal';
import { Spinner } from '@/app/components/ui/Spinner';
import { api } from '@/app/api/client';

const EMPTY_FORM = { plate: '', model: '', year: '', category: 'B', color: '' };

export const AdminVehicleManagement = ({ showToast }) => {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ open: false, vehicle: null });
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const load = useCallback(async () => {
    try {
      setVehicles(await api.vehicles.list());
    } catch {
      showToast('Erro ao carregar veículos.', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setForm(EMPTY_FORM); setModal({ open: true, vehicle: null }); };
  const openEdit   = (v) => {
    setForm({ plate: v.plate, model: v.model, year: String(v.year ?? ''), category: v.category, color: v.color ?? '' });
    setModal({ open: true, vehicle: v });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...form, year: form.year ? Number(form.year) : null };
      if (modal.vehicle) {
        await api.vehicles.update(modal.vehicle.id, payload);
        showToast('Veículo atualizado.', 'success');
      } else {
        await api.vehicles.create(payload);
        showToast('Veículo criado.', 'success');
      }
      setModal({ open: false, vehicle: null });
      load();
    } catch (err) {
      showToast(err.message || 'Erro ao salvar veículo.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.vehicles.delete(id);
      showToast('Veículo removido.', 'success');
      setDeleteConfirm(null);
      load();
    } catch (err) {
      showToast(err.message || 'Erro ao remover veículo.', 'error');
    }
  };

  if (loading) return <div className="p-8"><Spinner /></div>;

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Veículos</h2>
        <Button onClick={openCreate} variant="primary" className="sm:w-auto flex items-center justify-center gap-2">
          <Plus size={18} /> Novo veículo
        </Button>
      </div>

      <Card>
        {vehicles.length === 0 ? (
          <p className="text-gray-400 text-sm py-4 text-center">Nenhum veículo cadastrado.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {vehicles.map(v => (
              <div key={v.id} className="flex justify-between items-center py-3 px-1 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Car size={18} className="text-gray-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">{v.plate}</p>
                    <p className="text-sm text-gray-500 truncate">
                      {v.model}{v.year ? ` · ${v.year}` : ''} · Cat. {v.category}{v.color ? ` · ${v.color}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => openEdit(v)} className="text-blue-500 hover:text-blue-700 p-2 rounded"><Pencil size={16} /></button>
                  <button onClick={() => setDeleteConfirm(v)} className="text-red-400 hover:text-red-600 p-2 rounded"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal title={modal.vehicle ? 'Editar Veículo' : 'Novo Veículo'} isOpen={modal.open} onClose={() => setModal({ open: false, vehicle: null })}>
        <div className="space-y-3">
          <Input id="v-plate" placeholder="Placa (ex: ABC-1234)" value={form.plate} onChange={e => setForm(p => ({ ...p, plate: e.target.value }))} />
          <Input id="v-model" placeholder="Modelo (ex: Gol, HB20)" value={form.model} onChange={e => setForm(p => ({ ...p, model: e.target.value }))} />
          <Input id="v-year" type="number" placeholder="Ano (ex: 2022)" value={form.year} onChange={e => setForm(p => ({ ...p, year: e.target.value }))} />
          <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900">
            {['A', 'B', 'AB', 'C', 'D', 'E'].map(c => <option key={c} value={c}>Categoria {c}</option>)}
          </select>
          <Input id="v-color" placeholder="Cor (opcional)" value={form.color} onChange={e => setForm(p => ({ ...p, color: e.target.value }))} />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setModal({ open: false, vehicle: null })}>Cancelar</Button>
            <Button variant="primary" onClick={handleSave}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </div>
        </div>
      </Modal>

      <Modal title="Remover Veículo" isOpen={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
        <div className="space-y-4">
          <p className="text-gray-700">Remover <strong>{deleteConfirm?.plate}</strong> — {deleteConfirm?.model}?</p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="danger" onClick={() => handleDelete(deleteConfirm.id)}>Remover</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
