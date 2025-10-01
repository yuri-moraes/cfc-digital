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
  { 
    id: 'aluno4', 
    name: 'Rafael Souza', 
    instructorId: 'instrutor1',
    cpf: '222.333.444-55',
    phone: '71 91234-0001',
    classesBought: 18,
    licenseDueDate: '2025-09-18'
  },
  { 
    id: 'aluno5', 
    name: 'Larissa Pereira', 
    instructorId: 'instrutor2',
    cpf: '444.555.666-77',
    phone: '41 99990-8855',
    classesBought: 12,
    licenseDueDate: '2025-08-25'
  },
  { 
    id: 'aluno6', 
    name: 'Eduardo Ramos', 
    instructorId: 'instrutor2',
    cpf: '666.777.888-99',
    phone: '85 98888-7766',
    classesBought: 22,
    licenseDueDate: '2025-10-12'
  },
];

export const MOCKED_SCHEDULE = {
  'instrutor1': [
    { date: '2024-10-02', time: '08:00', studentId: 'aluno4', studentName: 'Rafael Souza' },
    { date: '2024-10-10', time: '09:00', studentId: 'aluno1', studentName: 'Carlos Andrade' },
    { date: '2024-10-14', time: '11:00', studentId: 'aluno3', studentName: 'Fernanda Lima' },
    { date: '2024-10-21', time: '09:30', studentId: 'aluno4', studentName: 'Rafael Souza' },
    { date: '2024-10-28', time: '08:00', studentId: 'aluno1', studentName: 'Carlos Andrade' },
    { date: '2024-10-28', time: '09:30', studentId: 'aluno4', studentName: 'Rafael Souza' },
    { date: '2024-10-28', time: '11:00', studentId: 'aluno3', studentName: 'Fernanda Lima' },
    { date: '2024-10-30', time: '08:00', studentId: 'aluno1', studentName: 'Carlos Andrade' },
    { date: '2024-11-04', time: '09:00', studentId: 'aluno1', studentName: 'Carlos Andrade' },
    { date: '2024-11-12', time: '09:30', studentId: 'aluno3', studentName: 'Fernanda Lima' },
    { date: '2024-11-20', time: '15:00', studentId: 'aluno4', studentName: 'Rafael Souza' },
  ],
  'instrutor2': [
    { date: '2024-10-05', time: '10:00', studentId: 'aluno2', studentName: 'Beatriz Costa' },
    { date: '2024-10-12', time: '13:00', studentId: 'aluno5', studentName: 'Larissa Pereira' },
    { date: '2024-10-18', time: '10:00', studentId: 'aluno6', studentName: 'Eduardo Ramos' },
    { date: '2024-10-28', time: '10:00', studentId: 'aluno2', studentName: 'Beatriz Costa' },
    { date: '2024-10-28', time: '16:00', studentId: 'aluno6', studentName: 'Eduardo Ramos' },
    { date: '2024-10-29', time: '15:00', studentId: null, studentName: null },
    { date: '2024-11-02', time: '10:00', studentId: 'aluno2', studentName: 'Beatriz Costa' },
    { date: '2024-11-09', time: '13:00', studentId: 'aluno5', studentName: 'Larissa Pereira' },
    { date: '2024-11-16', time: '16:00', studentId: 'aluno6', studentName: 'Eduardo Ramos' },
  ],
};
