'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, XCircle } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Modal } from '@/app/components/ui/Modal';
import { Button } from '@/app/components/ui/Button';
import { Spinner } from '@/app/components/ui/Spinner';
import { api } from '@/app/api/client';
import { expandScheduleToDates, toDateStr } from '@/app/lib/utils';

export const InstructorAgendaScreen = ({ user, showToast, refreshUnreadCount }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [schedules, setSchedules] = useState([]);
  const [enrollmentsByClassId, setEnrollmentsByClassId] = useState({});
  const [attendanceByKey, setAttendanceByKey] = useState({});
  const [cancellationsByScheduleId, setCancellationsByScheduleId] = useState({});
  const [platesMap, setPlatesMap] = useState({});
  const [cancelModal, setCancelModal] = useState({ open: false, scheduleId: null, reason: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    api.getSchedules({ instructorId: user.id })
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setSchedules(list);
        list.forEach(s => {
          api.cancellations.list(s.id)
            .then(c => setCancellationsByScheduleId(prev => ({ ...prev, [s.id]: Array.isArray(c) ? c : [] })))
            .catch(() => {});
        });
      })
      .catch(() => showToast('Erro ao carregar agenda.', 'error'))
      .finally(() => setIsLoading(false));
  }, [user.id]);

  const dateStr = toDateStr(currentDate);
  const todaySchedules = expandScheduleToDates(schedules, currentDate)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  useEffect(() => {
    todaySchedules.forEach(s => {
      if (!enrollmentsByClassId[s.class_id]) {
        api.getEnrollments({ classId: s.class_id })
          .then(enrs => setEnrollmentsByClassId(prev => ({ ...prev, [s.class_id]: Array.isArray(enrs) ? enrs : [] })))
          .catch(() => setEnrollmentsByClassId(prev => ({ ...prev, [s.class_id]: [] })));
      }
      api.attendance.list({ scheduleId: s.id, date: dateStr })
        .then(att => setAttendanceByKey(prev => ({ ...prev, [`${s.id}-${dateStr}`]: Array.isArray(att) ? att : [] })))
        .catch(() => setAttendanceByKey(prev => ({ ...prev, [`${s.id}-${dateStr}`]: [] })));
    });
  }, [currentDate, schedules]);

  const getAttendanceForStudent = (scheduleId, studentId) =>
    (attendanceByKey[`${scheduleId}-${dateStr}`] || []).find(a => a.student_id === studentId);

  const isCancelled = (scheduleId) =>
    (cancellationsByScheduleId[scheduleId] || []).some(c => c.date === dateStr);

  const handleMarkPresent = async (schedule, student) => {
    const plateKey = `${schedule.id}-${student.student_id}`;
    try {
      await api.attendance.mark({
        scheduleId: schedule.id,
        studentId: student.student_id,
        attendanceDate: dateStr,
        plate: platesMap[plateKey] || null,
      });
      const att = await api.attendance.list({ scheduleId: schedule.id, date: dateStr });
      setAttendanceByKey(prev => ({ ...prev, [`${schedule.id}-${dateStr}`]: Array.isArray(att) ? att : [] }));
      showToast('Presença registrada.', 'success');
    } catch (err) {
      showToast(err.message || 'Erro ao registrar presença.', 'error');
    }
  };

  const handleCancelClass = async () => {
    if (!cancelModal.scheduleId) return;
    try {
      await api.cancellations.create(cancelModal.scheduleId, { date: dateStr, reason: cancelModal.reason });
      setCancellationsByScheduleId(prev => ({
        ...prev,
        [cancelModal.scheduleId]: [...(prev[cancelModal.scheduleId] || []), { date: dateStr, reason: cancelModal.reason }],
      }));
      await refreshUnreadCount?.();
      showToast('Aula cancelada com sucesso.', 'success');
    } catch (err) {
      showToast(err.message || 'Erro ao cancelar aula.', 'error');
    } finally {
      setCancelModal({ open: false, scheduleId: null, reason: '' });
    }
  };

  const handleValidate = async () => {
    setIsValidating(true);
    let count = 0;
    let failed = 0;
    for (const s of todaySchedules) {
      for (const rec of (attendanceByKey[`${s.id}-${dateStr}`] || []).filter(r => r.status === 'pending')) {
        try {
          await api.attendance.validate(rec.id);
          count++;
        } catch {
          failed++;
        }
      }
    }
    setIsValidating(false);
    const msg = count > 0
      ? `${count} sessão(ões) validada(s)${failed > 0 ? `, ${failed} erro(s)` : ''}.`
      : 'Nenhuma sessão pendente para validar.';
    showToast(msg, 'success');
    todaySchedules.forEach(s => {
      api.attendance.list({ scheduleId: s.id, date: dateStr })
        .then(att => setAttendanceByKey(prev => ({ ...prev, [`${s.id}-${dateStr}`]: Array.isArray(att) ? att : [] })))
        .catch(() => {});
    });
  };

  const changeDay = (amount) => {
    setCurrentDate(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + amount);
      return d;
    });
  };

  const hasPendingRecords = todaySchedules.some(s =>
    (attendanceByKey[`${s.id}-${dateStr}`] || []).some(r => r.status === 'pending')
  );

  if (isLoading) return <div className="p-8"><Spinner /></div>;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Minha Agenda</h2>
      <Card>
        <div className="flex justify-between items-center mb-6">
          <button onClick={() => changeDay(-1)} className="p-2 rounded-full hover:bg-gray-100">
            <ChevronLeft />
          </button>
          <h3 className="text-lg font-semibold capitalize">
            {currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
          </h3>
          <button onClick={() => changeDay(1)} className="p-2 rounded-full hover:bg-gray-100">
            <ChevronRight />
          </button>
        </div>

        {todaySchedules.length === 0 && (
          <p className="text-gray-500 text-center py-8">Nenhuma aula agendada para este dia.</p>
        )}

        <div className="space-y-4">
          {todaySchedules.map(schedule => {
            const cancelled = isCancelled(schedule.id);
            const students = enrollmentsByClassId[schedule.class_id] || [];

            return (
              <div key={schedule.id} className={`border rounded-lg p-4 ${cancelled ? 'border-red-200 bg-red-50' : 'border-gray-200'}`}>
                <div className="flex justify-between items-center mb-3">
                  <span className="font-semibold text-gray-800 text-lg">
                    {schedule.start_time?.substring(0, 5)}
                    {cancelled && <span className="ml-3 text-sm font-medium text-red-600">Cancelada</span>}
                  </span>
                  {!cancelled && (
                    <button
                      onClick={() => setCancelModal({ open: true, scheduleId: schedule.id, reason: '' })}
                      className="text-red-500 hover:text-red-700 text-sm flex items-center gap-1"
                    >
                      <XCircle size={14} /> Cancelar aula
                    </button>
                  )}
                </div>

                {!cancelled && students.map(student => {
                  const record = getAttendanceForStudent(schedule.id, student.student_id);
                  const plateKey = `${schedule.id}-${student.student_id}`;
                  const statusBadge = {
                    pending: { cls: 'bg-yellow-100 text-yellow-800', label: 'pendente' },
                    validated: { cls: 'bg-green-100 text-green-800', label: 'presente' },
                    rejected: { cls: 'bg-red-100 text-red-800', label: 'rejeitado' },
                  };
                  const badge = record ? statusBadge[record.status] : { cls: 'bg-gray-100 text-gray-600', label: 'pendente' };

                  return (
                    <div key={student.student_id} className={`border rounded-lg p-3 mt-2 ${record ? (record.status === 'validated' ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200') : 'bg-white border-gray-100'}`}>
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-gray-800">{student.student_name}</span>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${badge.cls}`}>{badge.label}</span>
                      </div>
                      <div className="flex gap-2 items-center flex-wrap">
                        <span className="text-xs text-gray-500">Placa:</span>
                        <input
                          type="text"
                          maxLength={10}
                          placeholder="ABC-1234"
                          value={platesMap[plateKey] ?? record?.plate ?? ''}
                          onChange={e => setPlatesMap(prev => ({ ...prev, [plateKey]: e.target.value }))}
                          disabled={!!record}
                          className="border border-gray-300 rounded px-2 py-1 text-sm w-28 disabled:bg-gray-100 disabled:text-gray-500"
                        />
                        {!record && (
                          <div className="ml-auto flex gap-2">
                            <button
                              onClick={() => handleMarkPresent(schedule, student)}
                              className="bg-green-100 text-green-800 border border-green-300 rounded px-3 py-1 text-sm font-medium hover:bg-green-200"
                            >
                              ✓ Presente
                            </button>
                            <span className="bg-gray-100 text-gray-600 border border-gray-200 rounded px-3 py-1 text-sm">
                              ✗ Ausente
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {!cancelled && students.length === 0 && (
                  <p className="text-sm text-gray-400 italic">Nenhum aluno matriculado.</p>
                )}
              </div>
            );
          })}
        </div>

        {hasPendingRecords && (
          <div className="mt-6">
            <Button onClick={handleValidate} variant="primary" className="w-full">
              {isValidating ? 'Validando...' : 'Validar sessões do dia'}
            </Button>
          </div>
        )}
      </Card>

      <Modal
        title="Cancelar Aula"
        isOpen={cancelModal.open}
        onClose={() => setCancelModal({ open: false, scheduleId: null, reason: '' })}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Cancelar a aula do dia <strong>{currentDate.toLocaleDateString('pt-BR')}</strong>?
          </p>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Motivo (opcional)</label>
            <textarea
              placeholder="Ex: Indisponibilidade do instrutor"
              value={cancelModal.reason}
              onChange={e => setCancelModal(prev => ({ ...prev, reason: e.target.value }))}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            />
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setCancelModal({ open: false, scheduleId: null, reason: '' })}>
              Voltar
            </Button>
            <Button variant="danger" onClick={handleCancelClass}>
              Confirmar cancelamento
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
