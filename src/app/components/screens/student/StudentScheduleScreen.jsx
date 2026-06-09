'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Modal } from '@/app/components/ui/Modal';
import { Button } from '@/app/components/ui/Button';
import { Spinner } from '@/app/components/ui/Spinner';
import { api } from '@/app/api/client';
import { expandScheduleToDates, getWeekDates, toDateStr } from '@/app/lib/utils';

export const StudentScheduleScreen = ({ user, showToast, refreshUnreadCount }) => {
  const [weekOffset, setWeekOffset] = useState(0);
  const [schedules, setSchedules] = useState([]);
  const [cancellationsByScheduleId, setCancellationsByScheduleId] = useState({});
  const [absenceModal, setAbsenceModal] = useState({ open: false, scheduleId: null, dateStr: null, time: null });
  const [declaring, setDeclaring] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const enrollments = await api.getEnrollments({ studentId: user.id });
        const allSchedules = [];
        for (const enr of (Array.isArray(enrollments) ? enrollments : [])) {
          const scheds = await api.getSchedules({ classId: enr.class_id });
          (Array.isArray(scheds) ? scheds : []).forEach(s => {
            allSchedules.push({ ...s, class_name: enr.class_name, instructor_name: enr.instructor_name });
          });
        }
        setSchedules(allSchedules);
        for (const s of allSchedules) {
          api.cancellations.list(s.id)
            .then(c => setCancellationsByScheduleId(prev => ({ ...prev, [s.id]: Array.isArray(c) ? c : [] })))
            .catch(() => {});
        }
      } catch {
        showToast('Erro ao carregar horário.', 'error');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [user.id]);

  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() + weekOffset * 7);
  const weekDates = getWeekDates(baseDate);

  const sessions = weekDates.flatMap(date =>
    expandScheduleToDates(schedules, date).map(s => ({ ...s, date }))
  ).sort((a, b) => {
    const dA = toDateStr(a.date);
    const dB = toDateStr(b.date);
    return dA === dB ? a.start_time.localeCompare(b.start_time) : dA.localeCompare(dB);
  });

  const isCancelled = (scheduleId, dateStr) =>
    (cancellationsByScheduleId[scheduleId] || []).some(c => c.date === dateStr);

  const handleDeclareAbsence = async () => {
    if (!absenceModal.scheduleId || !absenceModal.dateStr) return;
    setDeclaring(true);
    try {
      const res = await api.absences.declare(absenceModal.scheduleId, { date: absenceModal.dateStr });
      await refreshUnreadCount?.();
      showToast(
        res?.charged
          ? 'Ausência registrada — aula será cobrada (declaração tardia).'
          : 'Ausência registrada — aula não cobrada.',
        'success'
      );
    } catch (err) {
      showToast(err.message || 'Erro ao declarar ausência.', 'error');
    } finally {
      setDeclaring(false);
      setAbsenceModal({ open: false, scheduleId: null, dateStr: null, time: null });
    }
  };

  if (isLoading) return <div className="p-8"><Spinner /></div>;

  const today = toDateStr(new Date());

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Meu Horário</h2>

      <div className="flex justify-between items-center mb-4">
        <button onClick={() => setWeekOffset(prev => prev - 1)} className="p-2 rounded-full hover:bg-gray-100">
          <ChevronLeft />
        </button>
        <span className="font-semibold text-gray-700">
          {weekDates[0].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })} –{' '}
          {weekDates[6].toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
        <button onClick={() => setWeekOffset(prev => prev + 1)} className="p-2 rounded-full hover:bg-gray-100">
          <ChevronRight />
        </button>
      </div>

      {sessions.length === 0 ? (
        <Card><p className="text-gray-500 text-center py-8">Nenhuma aula nesta semana.</p></Card>
      ) : (
        <div className="space-y-3">
          {sessions.map((session, i) => {
            const dateStr = toDateStr(session.date);
            const cancelled = isCancelled(session.id, dateStr);
            const isPast = dateStr < today;

            return (
              <Card key={`${session.id}-${dateStr}-${i}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <p className={`font-semibold ${cancelled ? 'line-through text-red-400' : 'text-gray-800'}`}>
                      {session.date.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short' })}
                      {' às '}
                      {session.start_time?.substring(0, 5)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {session.instructor_name ? `Instrutor: ${session.instructor_name}` : session.class_name}
                    </p>
                    {cancelled && (
                      <span className="inline-block mt-1 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                        Cancelada
                      </span>
                    )}
                  </div>
                  {!cancelled && !isPast && (
                    <Button
                      variant="secondary"
                      className="w-auto text-sm px-4 py-2"
                      onClick={() => setAbsenceModal({ open: true, scheduleId: session.id, dateStr, time: session.start_time?.substring(0, 5) })}
                    >
                      Declarar ausência
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        title="Declarar Ausência"
        isOpen={absenceModal.open}
        onClose={() => setAbsenceModal({ open: false, scheduleId: null, dateStr: null, time: null })}
      >
        <div className="space-y-4">
          <p className="text-gray-700">
            Confirmar ausência para <strong>{absenceModal.dateStr}</strong> às <strong>{absenceModal.time}</strong>?
          </p>
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Declarações com menos de 1 hora de antecedência são registradas como ausência tardia e a aula é cobrada.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setAbsenceModal({ open: false, scheduleId: null, dateStr: null, time: null })}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleDeclareAbsence}>
              {declaring ? 'Registrando...' : 'Confirmar ausência'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
