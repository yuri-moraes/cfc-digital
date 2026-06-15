'use client';

import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
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

export const AdminDashboard = () => {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.lessonSlots.list({ date: toDateStr(new Date()), limit: 100 })
      .then(setSlots)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8"><Spinner /></div>;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="flex items-center gap-4">
          <div className="bg-green-100 p-3 rounded-full">
            <Calendar className="text-green-600" size={24} />
          </div>
          <div>
            <p className="text-4xl font-bold text-gray-800">{slots.length}</p>
            <p className="text-gray-500">Aulas agendadas para hoje</p>
          </div>
        </Card>
        <Card>
          <h3 className="font-bold text-lg mb-4 text-black">Agenda do Dia</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {slots.length === 0 ? (
              <p className="text-gray-500">Nenhuma aula hoje.</p>
            ) : (
              <>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <span>Horário</span><span>Aluno</span><span className="hidden sm:block">Instrutor</span><span>Status</span>
                </div>
                {slots.map(s => (
                  <div key={s.id} className="grid grid-cols-3 sm:grid-cols-4 gap-2 rounded bg-gray-50 p-2 text-sm text-gray-700">
                    <span className="font-semibold text-gray-800">{s.start_time?.substring(0, 5)}</span>
                    <span className="truncate">{s.student_name}</span>
                    <span className="hidden sm:block truncate">{s.instructor_name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[s.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABELS[s.status] ?? s.status}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};
