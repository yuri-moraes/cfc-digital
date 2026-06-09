'use client';

import { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import { Card } from '@/app/components/ui/Card';
import { Spinner } from '@/app/components/ui/Spinner';
import { api } from '@/app/api/client';
import { expandScheduleToDates } from '@/app/lib/utils';

export const AdminDashboard = () => {
  const [todaysSessions, setTodaysSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = new Date();
    const load = async () => {
      try {
        const users = await api.getUsers();
        const instructors = (Array.isArray(users) ? users : []).filter(u => u.role === 'INSTRUCTOR');

        const sessions = [];
        for (const instructor of instructors) {
          const scheds = await api.getSchedules({ instructorId: instructor.id });
          const todayScheds = expandScheduleToDates(Array.isArray(scheds) ? scheds : [], today);
          for (const s of todayScheds) {
            const enrs = await api.getEnrollments({ classId: s.class_id });
            (Array.isArray(enrs) ? enrs : []).forEach(enr => {
              sessions.push({
                time: s.start_time?.substring(0, 5),
                studentName: enr.student_name,
                instructorName: instructor.name,
              });
            });
          }
        }
        sessions.sort((a, b) => a.time?.localeCompare(b.time));
        setTodaysSessions(sessions);
      } catch {
      } finally {
        setLoading(false);
      }
    };
    load();
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
            <p className="text-4xl font-bold text-gray-800">{todaysSessions.length}</p>
            <p className="text-gray-500">Aulas agendadas para hoje</p>
          </div>
        </Card>
        <Card>
          <h3 className="font-bold text-lg mb-4 text-black">Agenda do Dia</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {todaysSessions.length === 0 ? (
              <p className="text-gray-500">Nenhuma aula hoje.</p>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <span>Horário</span><span>Aluno</span><span>Instrutor</span>
                </div>
                {todaysSessions.map((s, i) => (
                  <div key={i} className="grid grid-cols-3 gap-2 rounded bg-gray-50 p-2 text-sm text-gray-700">
                    <span className="font-semibold text-gray-800">{s.time}</span>
                    <span>{s.studentName}</span>
                    <span>{s.instructorName}</span>
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
