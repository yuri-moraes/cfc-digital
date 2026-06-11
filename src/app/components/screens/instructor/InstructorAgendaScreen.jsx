'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Spinner } from '@/app/components/ui/Spinner';
import { api } from '@/app/api/client';
import { toDateStr } from '@/app/lib/utils';

const STATUS_LABELS = {
  scheduled:      'Agendada',
  completed:      'Realizada',
  cancelled:      'Cancelada',
  no_show:        'Não compareceu',
  absent_valid:   'Ausência justificada',
  absent_charged: 'Ausência cobrada',
};

const STATUS_COLORS = {
  scheduled:      'bg-blue-100 text-blue-700',
  completed:      'bg-green-100 text-green-700',
  cancelled:      'bg-gray-100 text-gray-600',
  no_show:        'bg-red-100 text-red-700',
  absent_valid:   'bg-yellow-100 text-yellow-700',
  absent_charged: 'bg-orange-100 text-orange-700',
};

export const InstructorAgendaScreen = ({ user, showToast }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [slots, setSlots] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [plates, setPlates] = useState({});
  const [acting, setActing] = useState({});

  const loadSlots = useCallback(async (date) => {
    setIsLoading(true);
    try {
      setSlots(await api.lessonSlots.list({ date: toDateStr(date) }));
    } catch {
      showToast('Erro ao carregar agenda.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => { loadSlots(currentDate); }, [currentDate, loadSlots]);

  const changeDay = (n) => setCurrentDate(prev => {
    const d = new Date(prev);
    d.setDate(d.getDate() + n);
    return d;
  });

  const handleCheckin = async (slot) => {
    setActing(p => ({ ...p, [slot.id]: 'checkin' }));
    try {
      await api.lessonSlots.checkin(slot.id, plates[slot.id] || null);
      showToast('Check-in registrado.', 'success');
      loadSlots(currentDate);
    } catch (err) {
      showToast(err.message || 'Erro ao registrar check-in.', 'error');
    } finally {
      setActing(p => ({ ...p, [slot.id]: null }));
    }
  };

  const handleNoShow = async (slot) => {
    setActing(p => ({ ...p, [slot.id]: 'noshow' }));
    try {
      await api.lessonSlots.noShow(slot.id);
      showToast('Não comparecimento registrado.', 'success');
      loadSlots(currentDate);
    } catch (err) {
      showToast(err.message || 'Erro ao registrar não comparecimento.', 'error');
    } finally {
      setActing(p => ({ ...p, [slot.id]: null }));
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Minha Agenda</h2>
      <Card>
        <div className="flex justify-between items-center mb-6">
          <button aria-label="Dia anterior" onClick={() => changeDay(-1)} className="p-2 rounded-full hover:bg-gray-100"><ChevronLeft /></button>
          <h3 className="text-lg font-semibold capitalize">
            {currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </h3>
          <button aria-label="Próximo dia" onClick={() => changeDay(1)} className="p-2 rounded-full hover:bg-gray-100"><ChevronRight /></button>
        </div>

        {isLoading ? (
          <div className="py-8 flex justify-center"><Spinner /></div>
        ) : slots.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Nenhuma aula agendada para este dia.</p>
        ) : (
          <div className="space-y-4">
            {[...slots].sort((a, b) => a.start_time.localeCompare(b.start_time)).map(slot => (
              <div key={slot.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold text-gray-800 text-lg">{slot.start_time?.substring(0, 5)}</span>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[slot.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABELS[slot.status] ?? slot.status}
                  </span>
                </div>
                <p className="text-sm text-gray-700 mb-3">{slot.student_name ?? '—'}</p>

                {slot.status === 'scheduled' && (
                  <div className="flex gap-2 items-center flex-wrap">
                    <span className="text-xs text-gray-500">Placa:</span>
                    <input
                      type="text" maxLength={10} placeholder="ABC-1234"
                      value={plates[slot.id] ?? ''}
                      onChange={e => setPlates(p => ({ ...p, [slot.id]: e.target.value }))}
                      className="border border-gray-300 rounded px-2 py-1 text-sm w-28"
                    />
                    <div className="ml-auto flex gap-2">
                      <button onClick={() => handleCheckin(slot)} disabled={!!acting[slot.id]}
                        className="bg-green-100 text-green-800 border border-green-300 rounded px-3 py-1 text-sm font-medium hover:bg-green-200 disabled:opacity-50">
                        {acting[slot.id] === 'checkin' ? '...' : '✓ Check-in'}
                      </button>
                      <button onClick={() => handleNoShow(slot)} disabled={!!acting[slot.id]}
                        className="bg-red-100 text-red-800 border border-red-300 rounded px-3 py-1 text-sm font-medium hover:bg-red-200 disabled:opacity-50">
                        {acting[slot.id] === 'noshow' ? '...' : '✗ Não veio'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
