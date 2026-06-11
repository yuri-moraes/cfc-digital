'use client';

import { useState, useEffect } from 'react';
import { Spinner } from '@/app/components/ui/Spinner';
import { Card } from '@/app/components/ui/Card';
import { api } from '@/app/api/client';

const CHARGED = new Set(['scheduled', 'completed', 'no_show', 'absent_charged']);

const STATUS_ICON = {
  completed:      { icon: '✓', color: 'text-green-600' },
  no_show:        { icon: '✗', color: 'text-red-500'   },
  absent_valid:   { icon: '—', color: 'text-gray-400'  },
  absent_charged: { icon: '✗', color: 'text-orange-500'},
  cancelled:      { icon: '—', color: 'text-gray-400'  },
};

export const StudentProgressScreen = ({ user }) => {
  const [profile, setProfile]       = useState(null);
  const [slots, setSlots]           = useState([]);
  const [examResults, setExamResults] = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    Promise.all([
      api.getUser(user.id),
      api.lessonSlots.list({ limit: 500 }),
      api.examResults.list(),
    ]).then(([p, s, e]) => {
      setProfile(p);
      setSlots(s);
      setExamResults(e);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [user.id]);

  if (loading) return <div className="p-8"><Spinner /></div>;

  const purchased = profile?.purchased_lessons ?? 0;
  const used      = slots.filter(s => CHARGED.has(s.status)).length;
  const balance   = purchased - used;

  const history = slots
    .filter(s => s.status !== 'scheduled')
    .sort((a, b) => b.scheduled_date.localeCompare(a.scheduled_date));

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Meu Histórico</h2>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'compradas',  value: purchased, color: 'bg-blue-50 text-blue-700'   },
          { label: 'utilizadas', value: used,      color: 'bg-purple-50 text-purple-700'},
          { label: 'restantes',  value: balance,   color: balance > 0 ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700' },
        ].map(stat => (
          <div key={stat.label} className={`${stat.color} rounded-xl p-4 text-center`}>
            <p className="text-3xl font-bold">{stat.value}</p>
            <p className="text-sm mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {examResults.length > 0 && (
        <div className="mb-6 space-y-2">
          {examResults.map(exam => (
            <div key={exam.id}
              className={`border rounded-xl px-4 py-3 flex justify-between items-center ${exam.result === 'pass' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div>
                <p className={`font-semibold ${exam.result === 'pass' ? 'text-green-800' : 'text-red-800'}`}>Exame Prático</p>
                <p className={`text-sm ${exam.result === 'pass' ? 'text-green-600' : 'text-red-600'}`}>
                  {exam.result === 'pass' ? 'Aprovado' : 'Reprovado'} · {exam.exam_date}
                </p>
                {exam.notes && <p className="text-xs text-gray-500 mt-0.5">{exam.notes}</p>}
              </div>
              <span className={`text-2xl font-bold ${exam.result === 'pass' ? 'text-green-600' : 'text-red-600'}`}>
                {exam.result === 'pass' ? '✓' : '✗'}
              </span>
            </div>
          ))}
        </div>
      )}

      <Card>
        <h3 className="font-semibold text-gray-800 mb-4">Histórico de Aulas</h3>
        {history.length === 0 ? (
          <p className="text-gray-400 text-center py-6">Nenhuma aula registrada ainda.</p>
        ) : (
          <div className="space-y-2">
            {history.map(slot => {
              const { icon, color } = STATUS_ICON[slot.status] ?? { icon: '·', color: 'text-gray-400' };
              return (
                <div key={slot.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                  <span className="text-gray-400 text-sm w-20 shrink-0">
                    {new Date(`${slot.scheduled_date}T12:00:00Z`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </span>
                  <span className="text-sm text-gray-500 shrink-0">{slot.start_time?.substring(0, 5)}</span>
                  <span className="flex-1 text-sm text-gray-700">{slot.instructor_name ?? '—'}</span>
                  <span className={`font-bold ${color}`}>{icon}</span>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};
