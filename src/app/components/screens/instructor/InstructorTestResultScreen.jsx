'use client';

import { useState, useEffect } from 'react';
import { Spinner } from '@/app/components/ui/Spinner';
import { Card } from '@/app/components/ui/Card';
import { api } from '@/app/api/client';

export const InstructorTestResultScreen = ({ user, showToast }) => {
  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [enrollments, setEnrollments] = useState([]);
  const [assignmentId, setAssignmentId] = useState(null);
  const [gradesByStudentId, setGradesByStudentId] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});

  useEffect(() => {
    api.getClasses()
      .then(data => {
        const list = Array.isArray(data) ? data : [];
        setClasses(list);
        if (list.length > 0) setSelectedClassId(list[0].id);
      })
      .catch(() => showToast('Erro ao carregar turmas.', 'error'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedClassId) return;
    const load = async () => {
      try {
        const [enrs, assignments] = await Promise.all([
          api.getEnrollments({ classId: selectedClassId }),
          api.assignments.list({ classId: selectedClassId }),
        ]);
        const enrList = Array.isArray(enrs) ? enrs : [];
        setEnrollments(enrList);

        let examAssignment = (Array.isArray(assignments) ? assignments : []).find(a => a.title === 'Exame Prático');
        if (!examAssignment && enrList.length > 0) {
          examAssignment = await api.assignments.create({ class_id: selectedClassId, title: 'Exame Prático', max_score: 10 });
        }
        setAssignmentId(examAssignment?.id ?? null);

        if (examAssignment) {
          const grades = await api.grades.list({ assignmentId: examAssignment.id });
          const byStudent = {};
          (Array.isArray(grades) ? grades : []).forEach(g => { byStudent[g.student_id] = g; });
          setGradesByStudentId(byStudent);
        }
      } catch (err) {
        showToast(err.message || 'Erro ao carregar dados.', 'error');
      }
    };
    load();
  }, [selectedClassId]);

  const handleSetResult = async (studentId, score) => {
    if (!assignmentId) return;
    setSaving(prev => ({ ...prev, [studentId]: true }));
    try {
      const existing = gradesByStudentId[studentId];
      let grade;
      if (existing) {
        grade = await api.grades.update(existing.id, { score });
      } else {
        grade = await api.grades.create({ assignment_id: assignmentId, student_id: studentId, score });
      }
      setGradesByStudentId(prev => ({ ...prev, [studentId]: grade }));
      showToast(score === 10 ? 'Aluno aprovado.' : 'Aluno reprovado.', 'success');
    } catch (err) {
      showToast(err.message || 'Erro ao salvar resultado.', 'error');
    } finally {
      setSaving(prev => ({ ...prev, [studentId]: false }));
    }
  };

  if (loading) return <div className="p-8"><Spinner /></div>;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Exame Prático</h2>

      <Card>
        <div className="mb-6">
          <label className="block text-sm text-gray-600 mb-1">Turma / Classe</label>
          <select
            value={selectedClassId}
            onChange={e => setSelectedClassId(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
          >
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {enrollments.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Nenhum aluno matriculado nesta turma.</p>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 grid grid-cols-3 gap-2 text-xs font-semibold uppercase text-gray-500">
              <span>Aluno</span>
              <span className="text-center">Situação</span>
              <span className="text-center">Resultado</span>
            </div>
            {enrollments.map(enr => {
              const grade = gradesByStudentId[enr.student_id];
              const isSaving = saving[enr.student_id];

              return (
                <div key={enr.student_id} className="px-4 py-3 border-t border-gray-100 grid grid-cols-3 gap-2 items-center">
                  <span className="font-medium text-gray-800">{enr.student_name}</span>
                  <span className={`text-center text-xs px-2 py-1 rounded-full font-medium mx-auto ${grade ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {grade ? 'realizado' : 'pendente'}
                  </span>
                  <div className="flex justify-center gap-2">
                    {grade ? (
                      <span className={`text-xs px-3 py-1 rounded-full font-semibold ${grade.score === 10 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {grade.score === 10 ? '✓ Aprovado' : '✗ Reprovado'}
                      </span>
                    ) : (
                      <>
                        <button
                          disabled={isSaving}
                          onClick={() => handleSetResult(enr.student_id, 10)}
                          className="bg-green-100 text-green-800 border border-green-300 rounded px-3 py-1 text-sm hover:bg-green-200 disabled:opacity-50"
                        >✓</button>
                        <button
                          disabled={isSaving}
                          onClick={() => handleSetResult(enr.student_id, 0)}
                          className="bg-red-100 text-red-800 border border-red-300 rounded px-3 py-1 text-sm hover:bg-red-200 disabled:opacity-50"
                        >✗</button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};
