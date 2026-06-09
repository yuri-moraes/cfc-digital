'use client';

import { useState, useEffect } from 'react';
import { UserPlus } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { Modal } from '@/app/components/ui/Modal';
import { Spinner } from '@/app/components/ui/Spinner';
import { api } from '@/app/api/client';

export const AdminUserManagement = ({ showToast }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addModal, setAddModal] = useState(false);
  const [detailModal, setDetailModal] = useState({ open: false, user: null, enrollments: [] });
  const [form, setForm] = useState({ name: '', email: '', role: 'STUDENT' });
  const [tempPassword, setTempPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const loadUsers = async () => {
    try {
      const data = await api.getUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      showToast('Erro ao carregar usuários.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const openAdd = () => {
    const pin = String(Math.floor(1000 + Math.random() * 9000));
    const pwd = `CFC@${pin}`;
    setTempPassword(pwd);
    setForm({ name: '', email: '', role: 'STUDENT' });
    setAddModal(true);
  };

  const handleAdd = async () => {
    setSaving(true);
    try {
      await api.createUser({ name: form.name, email: form.email, password: tempPassword, role: form.role });
      showToast('Usuário criado com sucesso.', 'success');
      setAddModal(false);
      loadUsers();
    } catch (err) {
      showToast(err.message || 'Erro ao criar usuário.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (u) => {
    let enrollments = [];
    if (u.role === 'STUDENT') {
      enrollments = await api.getEnrollments({ studentId: u.id }).catch(() => []);
    }
    setDetailModal({ open: true, user: u, enrollments: Array.isArray(enrollments) ? enrollments : [] });
  };

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
                <div>
                  <p className="font-medium text-gray-900">{u.name}</p>
                  <p className="text-sm text-gray-500">{u.email}</p>
                </div>
                <button onClick={() => openDetail(u)} className="text-blue-600 text-sm font-semibold hover:text-blue-700">
                  Ver detalhes
                </button>
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
                <div>
                  <p className="font-medium text-gray-900">{u.name}</p>
                  <p className="text-sm text-gray-500">{u.email}</p>
                </div>
                <button onClick={() => openDetail(u)} className="text-blue-600 text-sm font-semibold hover:text-blue-700">
                  Ver detalhes
                </button>
              </div>
            ))}
          </Card>
        </div>
      </div>

      <Modal title="Novo Usuário" isOpen={addModal} onClose={() => setAddModal(false)}>
        <div className="space-y-4">
          <Input id="new-name" placeholder="Nome Completo" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          <Input id="new-email" type="email" placeholder="Email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
          <select
            value={form.role}
            onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          >
            <option value="STUDENT">Aluno</option>
            <option value="INSTRUCTOR">Instrutor</option>
          </select>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Senha temporária (copie e envie ao usuário)</label>
            <input
              readOnly
              value={tempPassword}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 font-mono text-gray-800 select-all"
              onClick={e => e.target.select()}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button onClick={() => setAddModal(false)} variant="secondary">Cancelar</Button>
            <Button onClick={handleAdd} variant="primary">{saving ? 'Salvando...' : 'Criar usuário'}</Button>
          </div>
        </div>
      </Modal>

      <Modal
        title={detailModal.user?.name || 'Detalhes'}
        isOpen={detailModal.open}
        onClose={() => setDetailModal({ open: false, user: null, enrollments: [] })}
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600">Email: <span className="text-gray-900">{detailModal.user?.email}</span></p>
          <p className="text-sm text-gray-600">Função: <span className="text-gray-900">{detailModal.user?.role}</span></p>
          {detailModal.user?.phone_number && (
            <p className="text-sm text-gray-600">Telefone: <span className="text-gray-900">{detailModal.user.phone_number}</span></p>
          )}
          {detailModal.enrollments.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mt-3 mb-2">Turmas matriculadas:</p>
              <ul className="space-y-1">
                {detailModal.enrollments.map(e => (
                  <li key={e.id} className="text-sm text-gray-700 bg-gray-50 rounded px-3 py-2">
                    {e.class_name} — Instrutor: {e.instructor_name || '—'}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
