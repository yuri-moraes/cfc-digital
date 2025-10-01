export const MOCKED_USERS = {
  'admin@cfc.com': { type: 'Admin', name: 'Admin Geral' },
  'aluno@cfc.com': { 
    type: 'Aluno', 
    name: 'Carlos Andrade', 
    id: 'aluno1',
    instructorId: 'instrutor1',
    cpf: '123.456.789-00',
    phone: '31 98390-1251',
    classesBought: 20,
    licenseDueDate: '2025-12-15'
  },
  'instrutor@cfc.com': { 
    type: 'Instrutor', 
    name: 'João Silva', 
    id: 'instrutor1' 
  },
};

export const MOCKED_INSTRUCTORS = [
  { id: 'instrutor1', name: 'João Silva' },
  { id: 'instrutor2', name: 'Maria Oliveira' },
];

export const MOCKED_STUDENTS = [
  { 
    id: 'aluno1', 
    name: 'Carlos Andrade', 
    instructorId: 'instrutor1',
    cpf: '123.456.789-00',
    phone: '31 98390-1251',
    classesBought: 20,
    licenseDueDate: '2025-12-15'
  },
  { 
    id: 'aluno2', 
    name: 'Beatriz Costa', 
    instructorId: 'instrutor2',
    cpf: '987.654.321-01',
    phone: '21 99876-5432',
    classesBought: 15,
    licenseDueDate: '2026-03-20'
  },
  { 
    id: 'aluno3', 
    name: 'Fernanda Lima', 
    instructorId: 'instrutor1',
    cpf: '111.222.333-44',
    phone: '11 91234-5678',
    classesBought: 25,
    licenseDueDate: '2025-11-01'
  },
];

export const MOCKED_SCHEDULE = {
  'instrutor1': [
    { date: '2024-10-28', time: '09:00', studentId: 'aluno1', studentName: 'Carlos Andrade' },
    { date: '2024-10-28', time: '11:00', studentId: 'aluno3', studentName: 'Fernanda Lima' },
    { date: '2024-10-29', time: '14:00', studentId: null, studentName: null },
    { date: '2024-10-30', time: '08:00', studentId: 'aluno1', studentName: 'Carlos Andrade' },
    { date: '2024-11-04', time: '09:00', studentId: 'aluno1', studentName: 'Carlos Andrade' },
  ],
  'instrutor2': [
    { date: '2024-10-28', time: '10:00', studentId: 'aluno2', studentName: 'Beatriz Costa' },
    { date: '2024-10-29', time: '15:00', studentId: null, studentName: null },
  ],
};
