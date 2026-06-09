'use client';

import { useState, useEffect } from 'react';
import { Spinner } from '@/app/components/ui/Spinner';
import { Card } from '@/app/components/ui/Card';
import { api } from '@/app/api/client';

export const StudentProgressScreen = ({ user }) => {
  const [enrollments, setEnrollments] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState([]);
  const [examGrade, setExamGrade] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const enrs = await api.getEnrollments({ studentId: user.id });
        const enrList = Array.isArray(enrs) ? enrs : [];
        setEnrollments(enrList);

        const grades = await api.grades.list({ studentId: user.id });
        const gradeList = Array.isArray(grades) ? grades : [];
        if (gradeList.length > 0) {
          const exam = gradeList.find(g => g.score !== undefined && g.score !== null);
          setExamGrade(exam ?? null);
        }

        const allRecords = [];
        for (const enr of enrList) {
          const records = await api.attendance.list({ studentId: user.id, classId: enr.class_id });
          (Array.isArray(records) ? records : []).forEach(r => allRecords.push(r));
        }
        allRecords.sort((a, b) => b.attendance_date.localeCompare(a.attendance_date));
        setAttendanceRecords(allRecords);
      } catch {} finally {
        setLoading(false);
      }
    };
    load();
  }, [user.id]);

  if (loading) return <div className="p-8"><Spinner /></div>;

  const presences = attendanceRecords.filter(r => r.status === 'validated' || r.status === 'pending').length;
  const total = attendanceRecords.length;
  const faltas = total - presences;

  const statusIcon = (status) => {
    if (status === 'validated') return { icon: '✓', color: 'text-green-600' };
    if (status === 'pending') return { icon: '✓', color: 'text-yellow-600' };
    return { icon: '✗', color: 'text-red-500' };
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Meu Histórico</h2>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'aulas', value: total, color: 'bg-blue-50 text-blue-700' },
          { label: 'presenças', value: presences, color: 'bg-green-50 text-green-700' },
          { label: 'faltas', value: faltas, color: 'bg-orange-50 text-orange-700' },
        ].map(stat => (
          <div key={stat.label} className={`${stat.color} rounded-xl p-4 text-center`}>
            <p className="text-3xl font-bold">{stat.value}</p>
            <p className="text-sm mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {examGrade !== null && (
        <div className={`mb-6 border rounded-xl px-4 py-3 flex justify-between items-center ${examGrade.score === 10 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
          <div>
            <p className={`font-semibold ${examGrade.score === 10 ? 'text-green-800' : 'text-red-800'}`}>Exame Prático</p>
            <p className={`text-sm ${examGrade.score === 10 ? 'text-green-600' : 'text-red-600'}`}>
              {examGrade.score === 10 ? 'Aprovado' : 'Reprovado'}
            </p>
          </div>
          <span className={`text-2xl font-bold ${examGrade.score === 10 ? 'text-green-600' : 'text-red-600'}`}>
            {examGrade.score === 10 ? '✓' : '✗'}
          </span>
        </div>
      )}

      <Card>
        <h3 className="font-semibold text-gray-800 mb-4">Histórico de Aulas</h3>
        {attendanceRecords.length === 0 ? (
          <p className="text-gray-400 text-center py-6">Nenhuma aula registrada ainda.</p>
        ) : (
          <div className="space-y-2">
            {attendanceRecords.map(record => {
              const { icon, color } = statusIcon(record.status);
              return (
                <div key={record.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
                  <span className="text-gray-400 text-sm w-16 shrink-0">
                    {new Date(record.attendance_date + 'T12:00:00Z').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </span>
                  <span className="flex-1 text-sm text-gray-700">
                    {record.plate ? `Placa: ${record.plate}` : '—'}
                  </span>
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
