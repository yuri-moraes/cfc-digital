'use client';

import { useState } from 'react';
import { Card } from '@/app/components/ui/Card';
import { Button } from '@/app/components/ui/Button';
import { Input } from '@/app/components/ui/Input';

export const LoginScreen = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    onLogin(email);
  };

  const demoLogin = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('123456');
    onLogin(demoEmail);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800">CFC Digital</h1>
          <p className="text-gray-500 mt-2">Sistema de Agendamento de Aulas</p>
        </div>
        <Card>
          <form onSubmit={handleLogin} className="space-y-6">
            <Input 
              id="email" 
              type="email" 
              placeholder="Email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
            />
            <Input 
              id="password" 
              type="password" 
              placeholder="Senha" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
            />
            <Button type="submit">Entrar</Button>
            <a href="#" className="block text-center text-sm text-blue-600 hover:underline mt-4">
              Esqueci minha senha
            </a>
          </form>
        </Card>
        <div className="mt-6 text-center text-sm text-gray-500">
          <p className="font-semibold mb-2">Para demonstração, use:</p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button onClick={() => demoLogin('admin@cfc.com')} className="text-blue-600 hover:underline">Admin</button>
            <span className="hidden sm:inline">|</span>
            <button onClick={() => demoLogin('instrutor@cfc.com')} className="text-blue-600 hover:underline">Instrutor</button>
            <span className="hidden sm:inline">|</span>
            <button onClick={() => demoLogin('aluno@cfc.com')} className="text-blue-600 hover:underline">Aluno</button>
          </div>
        </div>
      </div>
    </div>
  );
};