'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';
import { User, Mail, Phone, Bell } from 'lucide-react';
import { api } from '@/app/api/client';

const ProfileItem = ({ icon, label, value }) => (
  <div className="flex items-start gap-4 py-3">
    <div className="text-gray-500 mt-1">{icon}</div>
    <div>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="font-medium text-gray-800">{value || '—'}</p>
    </div>
  </div>
);

export const ProfileScreen = ({ user, showToast }) => {
  const [phone, setPhone] = useState(user?.phone_number || '');
  const [savingPhone, setSavingPhone] = useState(false);
  const [prefs, setPrefs] = useState({ minutes_before: 30, whatsapp_enabled: false, in_app_enabled: true });
  const [savingPrefs, setSavingPrefs] = useState(false);

  useEffect(() => {
    api.notifications.getPreferences()
      .then(data => {
        if (data) setPrefs({
          minutes_before: data.minutes_before ?? 30,
          whatsapp_enabled: data.whatsapp_enabled ?? false,
          in_app_enabled: data.in_app_enabled ?? true,
        });
      })
      .catch(() => {});
  }, []);

  const savePhone = async () => {
    setSavingPhone(true);
    try {
      await api.updateUser(user.id, { phone_number: phone });
      showToast('Telefone salvo.', 'success');
    } catch (err) {
      showToast(err.message || 'Erro ao salvar telefone.', 'error');
    } finally {
      setSavingPhone(false);
    }
  };

  const savePrefs = async () => {
    setSavingPrefs(true);
    try {
      await api.notifications.updatePreferences(prefs);
      showToast('Preferências salvas.', 'success');
    } catch (err) {
      showToast(err.message || 'Erro ao salvar preferências.', 'error');
    } finally {
      setSavingPrefs(false);
    }
  };

  const roleLabel = { Admin: 'Administrador do Sistema', Instrutor: 'Instrutor de Direção', Aluno: 'Aluno' };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Meu Perfil</h2>
      <div className="space-y-6">
        <Card>
          <div className="divide-y">
            <ProfileItem icon={<User size={20} />} label="Nome Completo" value={user?.name} />
            <ProfileItem icon={<Mail size={20} />} label="Email" value={user?.email} />
            <ProfileItem icon={<User size={20} />} label="Função" value={roleLabel[user?.type] || user?.type} />
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Phone size={18} /> Telefone
          </h3>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <Input
                id="phone"
                placeholder="+55 11 99999-9999"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
            </div>
            <Button onClick={savePhone} variant="primary" className="w-auto px-6">
              {savingPhone ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Bell size={18} /> Preferências de Notificação
          </h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Aviso com antecedência</label>
              <select
                value={prefs.minutes_before}
                onChange={e => setPrefs(prev => ({ ...prev, minutes_before: parseInt(e.target.value, 10) }))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                <option value={15}>15 minutos</option>
                <option value={30}>30 minutos</option>
                <option value={60}>1 hora</option>
                <option value={120}>2 horas</option>
              </select>
            </div>
            {phone && (
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefs.whatsapp_enabled}
                  onChange={e => setPrefs(prev => ({ ...prev, whatsapp_enabled: e.target.checked }))}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-gray-700">Receber avisos via WhatsApp</span>
              </label>
            )}
            <Button onClick={savePrefs} variant="primary" className="w-full">
              {savingPrefs ? 'Salvando...' : 'Salvar preferências'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};
