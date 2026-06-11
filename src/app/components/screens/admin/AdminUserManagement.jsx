'use client';

import { useState, useEffect } from 'react';
import { UserPlus } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Modal } from '@/app/components/ui/Modal';
import { Spinner } from '@/app/components/ui/Spinner';
import { api } from '@/app/api/client';

const DAY_OPTIONS = [
  { value: 0, label: 'Domingo' }, { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },   { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' },
];

export const AdminUserManagement = ({ showToast }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add user modal
  const [addModal, setAddModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'STUDENT', purchased_lessons: '0', category: 'B' });
  const [tempPassword, setTempPassword] = useState('');
  const [saving, setSaving] = useState(false);

  // Student detail modal
  const [studentModal, setStudentModal] = useState({ open: false, user: null });

  // Instructor detail modal
  const [instrModal, setInstrModal] = useState({
    open: false, instructor: null, tab: 'dados',
    availability: [], vehicles: [], fleet: [], loadingData: false,
  });
  const [showAvailForm, setShowAvailForm] = useState(false);
  const [availForm, setAvailForm] = useState({ day_of_week: 1, vehicle_id: '', start_time: '08:00', end_time: '12:00' });
  const [savingAvail, setSavingAvail] = useState(false);
  const [selectedFleetId, setSelectedFleetId] = useState('');
  const [savingVehicle, setSavingVehicle] = useState(false);

  const loadUsers = async () => {
    try {
      setUsers(await api.getUsers());
    } catch {
      showToast('Erro ao carregar usuários.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const openAdd = () => {
    const pin = String(Math.floor(1000 + Math.random() * 9000));
    setTempPassword(`CFC@${pin}`);
    setForm({ name: '', email: '', role: 'STUDENT', purchased_lessons: '0', category: 'B' });
    setAddModal(true);
  };

  const handleAdd = async () => {
    setSaving(true);
    try {
      const payload = {
        name: form.name, email: form.email, password: tempPassword, role: form.role,
        ...(form.role === 'STUDENT' ? { purchased_lessons: Number(form.purchased_lessons), category: form.category } : {}),
      };
      await api.createUser(payload);
      showToast('Usuário criado com sucesso.', 'success');
      setAddModal(false);
      loadUsers();
    } catch (err) {
      showToast(err.message || 'Erro ao criar usuário.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openInstructor = async (instructor) => {
    setInstrModal({ open: true, instructor, tab: 'dados', availability: [], vehicles: [], fleet: [], loadingData: true });
    setShowAvailForm(false);
    setSelectedFleetId('');
    try {
      const [avail, assigned, fleet] = await Promise.all([
        api.instructors.availability.list(instructor.id),
        api.instructors.vehicles.list(instructor.id),
        api.vehicles.list(),
      ]);
      setInstrModal(p => ({ ...p, availability: avail, vehicles: assigned, fleet, loadingData: false }));
    } catch {
      showToast('Erro ao carregar dados do instrutor.', 'error');
      setInstrModal(p => ({ ...p, loadingData: false }));
    }
  };

  const handleAddAvailability = async () => {
    if (!availForm.vehicle_id) { showToast('Selecione um veículo.', 'error'); return; }
    setSavingAvail(true);
    try {
      const w = await api.instructors.availability.add(instrModal.instructor.id, {
        ...availForm, day_of_week: Number(availForm.day_of_week),
      });
      setInstrModal(p => ({ ...p, availability: [...p.availability, w] }));
      setShowAvailForm(false);
      showToast('Janela adicionada.', 'success');
    } catch (err) {
      showToast(err.message || 'Erro ao adicionar janela.', 'error');
    } finally {
      setSavingAvail(false);
    }
  };

  const handleDeleteAvailability = async (windowId) => {
    try {
      await api.instructors.availability.delete(instrModal.instructor.id, windowId);
      setInstrModal(p => ({ ...p, availability: p.availability.filter(a => a.id !== windowId) }));
      showToast('Janela removida.', 'success');
    } catch (err) {
      showToast(err.message || 'Erro ao remover janela.', 'error');
    }
  };

  const handleAddVehicle = async () => {
    if (!selectedFleetId) return;
    setSavingVehicle(true);
    try {
      await api.instructors.vehicles.add(instrModal.instructor.id, selectedFleetId);
      const v = instrModal.fleet.find(x => x.id === selectedFleetId);
      setInstrModal(p => ({ ...p, vehicles: [...p.vehicles, v] }));
      setSelectedFleetId('');
      showToast('Veículo vinculado.', 'success');
    } catch (err) {
      showToast(err.message || 'Erro ao vincular veículo.', 'error');
    } finally {
      setSavingVehicle(false);
    }
  };

  const handleRemoveVehicle = async (vehicleId) => {
    try {
      await api.instructors.vehicles.remove(instrModal.instructor.id, vehicleId);
      setInstrModal(p => ({ ...p, vehicles: p.vehicles.filter(v => v.vehicle_id !== vehicleId) }));
      showToast('Veículo desvinculado.', 'success');
    } catch (err) {
      showToast(err.message || 'Erro ao desvincular veículo.', 'error');
    }
  };

  const assignedVehicleIds = new Set(instrModal.vehicles.map(v => v.vehicle_id));
  const unassignedFleet = instrModal.fleet.filter(v => !assignedVehicleIds.has(v.id));
  const instructors = users.filter(u => u.role === 'INSTRUCTOR');
  const students = users.filter(u => u.role === 'STUDENT');

  if (loading) return <div className="p-8"><Spinner /></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Gerenciar Usuários</h2>
        <Button onClick={openAdd} variant="primary" className="flex items-center gap-2 w-auto">
          <UserPlus size={18} /> Novo Usuário
        </Button>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="text-xl font-semibold mb-4 text-gray-900">Instrutores</h3>
          <Card className="space-y-2">
            {instructors.length === 0 && <p className="text-gray-400 text-sm py-2">Nenhum instrutor cadastrado.</p>}
            {instructors.map(u => (
              <div key={u.id} className="flex justify-between items-center p-3 rounded hover:bg-gray-50">
                <div><p className="font-medium text-gray-900">{u.name}</p><p className="text-sm text-gray-500">{u.email}</p></div>
                <button onClick={() => openInstructor(u)} className="text-blue-600 text-sm font-semibold hover:text-blue-700">Ver detalhes</button>
              </div>
            ))}
          </Card>
        </div>
        <div>
          <h3 className="text-xl font-semibold mb-4 text-gray-900">Alunos</h3>
          <Card className="space-y-2">
            {students.length === 0 && <p className="text-gray-400 text-sm py-2">Nenhum aluno cadastrado.</p>}
            {students.map(u => (
              <div key={u.id} className="flex justify-between items-center p-3 rounded hover:bg-gray-50">
                <div><p className="font-medium text-gray-900">{u.name}</p><p className="text-sm text-gray-500">{u.email}</p></div>
                <button onClick={() => setStudentModal({ open: true, user: u })} className="text-blue-600 text-sm font-semibold hover:text-blue-700">Ver detalhes</button>
              </div>
            ))}
          </Card>
        </div>
      </div>

      {/* Add User Modal */}
      <Modal title="Novo Usuário" isOpen={addModal} onClose={() => setAddModal(false)}>
        <div className="space-y-4">
          <Input id="new-name" placeholder="Nome Completo" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          <Input id="new-email" type="email" placeholder="Email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
          <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900">
            <option value="STUDENT">Aluno</option>
            <option value="INSTRUCTOR">Instrutor</option>
          </select>
          {form.role === 'STUDENT' && (
            <>
              <Input id="new-lessons" type="number" placeholder="Aulas contratadas" value={form.purchased_lessons}
                onChange={e => setForm(p => ({ ...p, purchased_lessons: e.target.value }))} />
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900">
                {['A', 'B', 'AB', 'C', 'D', 'E'].map(c => <option key={c} value={c}>Categoria {c}</option>)}
              </select>
            </>
          )}
          <div>
            <label className="block text-sm text-gray-600 mb-1">Senha temporária</label>
            <input readOnly value={tempPassword} onClick={e => e.target.select()}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 font-mono text-gray-800 select-all" />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={() => setAddModal(false)}>Cancelar</Button>
            <Button variant="primary" onClick={handleAdd}>{saving ? 'Salvando...' : 'Criar usuário'}</Button>
          </div>
        </div>
      </Modal>

      {/* Student Detail Modal */}
      <Modal title={studentModal.user?.name || 'Detalhes'} isOpen={studentModal.open} onClose={() => setStudentModal({ open: false, user: null })}>
        {studentModal.user && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">Email: <span className="text-gray-900">{studentModal.user.email}</span></p>
            {studentModal.user.phone_number && <p className="text-sm text-gray-600">Telefone: <span className="text-gray-900">{studentModal.user.phone_number}</span></p>}
            <p className="text-sm text-gray-600">Categoria: <span className="text-gray-900">{studentModal.user.category ?? '—'}</span></p>
            <p className="text-sm text-gray-600">Aulas contratadas: <span className="text-gray-900">{studentModal.user.purchased_lessons ?? 0}</span></p>
          </div>
        )}
      </Modal>

      {/* Instructor Detail Modal */}
      <Modal title={instrModal.instructor?.name || 'Instrutor'} isOpen={instrModal.open} onClose={() => setInstrModal(p => ({ ...p, open: false }))}>
        {instrModal.loadingData ? <div className="p-4"><Spinner /></div> : (
          <div>
            <div className="flex border-b border-gray-200 mb-4 gap-1">
              {[['dados', 'Dados'], ['disponibilidade', 'Disponibilidade'], ['veiculos', 'Veículos']].map(([key, label]) => (
                <button key={key} onClick={() => setInstrModal(p => ({ ...p, tab: key }))}
                  className={`px-4 py-2 text-sm font-medium ${instrModal.tab === key ? 'border-b-2 border-blue-500 text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
                  {label}
                </button>
              ))}
            </div>

            {instrModal.tab === 'dados' && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">Email: <span className="text-gray-900">{instrModal.instructor?.email}</span></p>
                {instrModal.instructor?.phone_number && <p className="text-sm text-gray-600">Telefone: <span className="text-gray-900">{instrModal.instructor.phone_number}</span></p>}
              </div>
            )}

            {instrModal.tab === 'disponibilidade' && (
              <div className="space-y-3">
                {instrModal.availability.length === 0 && !showAvailForm && (
                  <p className="text-sm text-gray-400">Nenhuma janela de disponibilidade.</p>
                )}
                {instrModal.availability.map(w => (
                  <div key={w.id} className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-sm text-gray-700">
                      {DAY_OPTIONS.find(d => d.value === w.day_of_week)?.label ?? w.day_of_week} · {w.start_time?.substring(0, 5)} – {w.end_time?.substring(0, 5)} · {w.plate}
                    </span>
                    <button onClick={() => handleDeleteAvailability(w.id)} className="text-red-400 hover:text-red-600 text-xs ml-2">Remover</button>
                  </div>
                ))}
                {showAvailForm ? (
                  <div className="border border-gray-200 rounded-lg p-3 space-y-2">
                    <select value={availForm.day_of_week} onChange={e => setAvailForm(p => ({ ...p, day_of_week: Number(e.target.value) }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {DAY_OPTIONS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                    <select value={availForm.vehicle_id} onChange={e => setAvailForm(p => ({ ...p, vehicle_id: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Selecionar veículo...</option>
                      {instrModal.vehicles.map(v => <option key={v.vehicle_id} value={v.vehicle_id}>{v.plate} · {v.model}</option>)}
                    </select>
                    {instrModal.vehicles.length === 0 && (
                      <p className="text-xs text-amber-600">Vincule veículos na aba Veículos primeiro.</p>
                    )}
                    <div className="flex gap-2">
                      <input type="time" value={availForm.start_time} onChange={e => setAvailForm(p => ({ ...p, start_time: e.target.value }))}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                      <span className="self-center text-gray-500">–</span>
                      <input type="time" value={availForm.end_time} onChange={e => setAvailForm(p => ({ ...p, end_time: e.target.value }))}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => setShowAvailForm(false)} className="text-sm py-2">Cancelar</Button>
                      <Button variant="primary" onClick={handleAddAvailability} className="text-sm py-2">{savingAvail ? 'Salvando...' : 'Adicionar'}</Button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowAvailForm(true)} className="text-blue-600 text-sm hover:underline">+ Adicionar janela</button>
                )}
              </div>
            )}

            {instrModal.tab === 'veiculos' && (
              <div className="space-y-3">
                {instrModal.vehicles.length === 0 && <p className="text-sm text-gray-400">Nenhum veículo vinculado.</p>}
                {instrModal.vehicles.map(v => (
                  <div key={v.vehicle_id} className="flex justify-between items-center bg-gray-50 rounded-lg px-3 py-2">
                    <span className="text-sm text-gray-700">{v.plate} · {v.model}</span>
                    <button onClick={() => handleRemoveVehicle(v.vehicle_id)} className="text-red-400 hover:text-red-600 text-xs">Remover</button>
                  </div>
                ))}
                {unassignedFleet.length > 0 ? (
                  <div className="flex gap-2">
                    <select value={selectedFleetId} onChange={e => setSelectedFleetId(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Selecionar veículo...</option>
                      {unassignedFleet.map(v => <option key={v.id} value={v.id}>{v.plate} · {v.model}</option>)}
                    </select>
                    <Button variant="primary" onClick={handleAddVehicle} className="w-auto px-3 text-sm py-2">
                      {savingVehicle ? '...' : 'Vincular'}
                    </Button>
                  </div>
                ) : instrModal.fleet.length === 0 ? (
                  <p className="text-xs text-gray-400">Nenhum veículo na frota. Adicione em Veículos primeiro.</p>
                ) : (
                  <p className="text-xs text-gray-400">Todos os veículos da frota já estão vinculados.</p>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};
