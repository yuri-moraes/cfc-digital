'use client';

import { useState, useEffect } from 'react';
import { PlusCircle } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Modal } from '@/app/components/ui/Modal';
import { Button } from '@/app/components/ui/Button';
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

export const StudentScheduleScreen = ({ user, showToast, refreshUnreadCount }) => {
  const [slots, setSlots] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [absenceModal, setAbsenceModal] = useState({ open: false, slot: null });
  const [declaring, setDeclaring] = useState(false);
  const [bookingModal, setBookingModal] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [bookingSlotKey, setBookingSlotKey] = useState(null);

  const loadSlots = async () => {
    try {
      const data = await api.lessonSlots.list({ limit: 100 });
      setSlots(data.sort((a, b) => {
        const d = a.scheduled_date.localeCompare(b.scheduled_date);
        return d !== 0 ? d : a.start_time.localeCompare(b.start_time);
      }));
    } catch {
      showToast('Erro ao carregar aulas.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadSlots(); }, []);

  const openBooking = async () => {
    setBookingModal(true);
    setLoadingAvailable(true);
    try {
      const today = toDateStr(new Date());
      const nextWeek = toDateStr(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
      setAvailableSlots(await api.slots.available({ date_from: today, date_to: nextWeek }));
    } catch {
      showToast('Erro ao buscar horários disponíveis.', 'error');
      setAvailableSlots([]);
    } finally {
      setLoadingAvailable(false);
    }
  };

  const handleBook = async (slot) => {
    const key = `${slot.scheduled_date}-${slot.start_time}-${slot.instructor_id}`;
    setBookingSlotKey(key);
    try {
      await api.lessonSlots.create({
        instructor_id:  slot.instructor_id,
        vehicle_id:     slot.vehicle_id,
        scheduled_date: slot.scheduled_date,
        start_time:     slot.start_time,
      });
      showToast('Aula agendada com sucesso!', 'success');
      setBookingModal(false);
      loadSlots();
    } catch (err) {
      showToast(err.message || 'Erro ao agendar aula.', 'error');
    } finally {
      setBookingSlotKey(null);
    }
  };

  const handleAbsence = async () => {
    if (!absenceModal.slot) return;
    setDeclaring(true);
    try {
      const res = await api.lessonSlots.absence(absenceModal.slot.id);
      await refreshUnreadCount?.();
      showToast(
        res?.status === 'absent_charged'
          ? 'Ausência registrada — aula será cobrada (declaração tardia).'
          : 'Ausência registrada — aula não cobrada.',
        'success'
      );
      loadSlots();
    } catch (err) {
      showToast(err.message || 'Erro ao declarar ausência.', 'error');
    } finally {
      setDeclaring(false);
      setAbsenceModal({ open: false, slot: null });
    }
  };

  const availableByDate = availableSlots.reduce((acc, s) => {
    if (!acc[s.scheduled_date]) acc[s.scheduled_date] = [];
    acc[s.scheduled_date].push(s);
    return acc;
  }, {});

  const today = toDateStr(new Date());

  const formatDate = (d) =>
    new Date(`${d}T12:00:00Z`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });

  if (isLoading) return <div className="p-8"><Spinner /></div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Meu Horário</h2>
        <Button onClick={openBooking} variant="primary" className="flex items-center gap-2 w-auto">
          <PlusCircle size={18} /> Agendar nova aula
        </Button>
      </div>

      {slots.length === 0 ? (
        <Card><p className="text-gray-500 text-center py-8">Nenhuma aula agendada.</p></Card>
      ) : (
        <div className="space-y-3">
          {slots.map(slot => (
            <Card key={slot.id}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold text-gray-800 capitalize">
                    {formatDate(slot.scheduled_date)} às {slot.start_time?.substring(0, 5)}
                  </p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Instrutor: {slot.instructor_name ?? '—'} · Veículo: {slot.plate ?? '—'}
                  </p>
                  <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[slot.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABELS[slot.status] ?? slot.status}
                  </span>
                </div>
                {slot.status === 'scheduled' && slot.scheduled_date >= today && (
                  <Button variant="secondary" className="w-auto text-sm px-3 py-1.5 shrink-0"
                    onClick={() => setAbsenceModal({ open: true, slot })}>
                    Declarar ausência
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Absence Modal */}
      <Modal title="Declarar Ausência" isOpen={absenceModal.open} onClose={() => setAbsenceModal({ open: false, slot: null })}>
        <div className="space-y-4">
          <p className="text-gray-700">
            Confirmar ausência para <strong>{absenceModal.slot?.scheduled_date}</strong> às <strong>{absenceModal.slot?.start_time?.substring(0, 5)}</strong>?
          </p>
          <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Declarações com menos de 1 hora de antecedência são registradas como ausência tardia e a aula é cobrada.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setAbsenceModal({ open: false, slot: null })}>Cancelar</Button>
            <Button variant="primary" onClick={handleAbsence}>{declaring ? 'Registrando...' : 'Confirmar ausência'}</Button>
          </div>
        </div>
      </Modal>

      {/* Booking Modal */}
      <Modal title="Agendar Nova Aula" isOpen={bookingModal} onClose={() => setBookingModal(false)}>
        {loadingAvailable ? (
          <div className="p-4 flex justify-center"><Spinner /></div>
        ) : Object.keys(availableByDate).length === 0 ? (
          <p className="text-gray-500 text-center py-6">Nenhum horário disponível nos próximos 7 dias.</p>
        ) : (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {Object.entries(availableByDate)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([date, dateSlots]) => (
                <div key={date}>
                  <p className="text-sm font-semibold text-gray-700 mb-2 capitalize">{formatDate(date)}</p>
                  <div className="space-y-2">
                    {dateSlots
                      .sort((a, b) => a.start_time.localeCompare(b.start_time))
                      .map((slot) => {
                        const key = `${slot.scheduled_date}-${slot.start_time}-${slot.instructor_id}`;
                        return (
                          <div key={key}
                            className="flex justify-between items-center bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                            <div className="text-sm">
                              <span className="font-medium text-gray-800">{slot.start_time?.substring(0, 5)}</span>
                              <span className="text-gray-500 ml-2">{slot.instructor_name} · {slot.plate}</span>
                            </div>
                            <Button variant="primary" className="w-auto text-xs px-3 py-1.5"
                              onClick={() => handleBook(slot)} disabled={bookingSlotKey !== null}>
                              {bookingSlotKey === key ? '...' : 'Agendar'}
                            </Button>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ))}
          </div>
        )}
      </Modal>
    </div>
  );
};
