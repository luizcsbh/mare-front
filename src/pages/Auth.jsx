import { useState } from 'react';
import { ArrowRight, Download, Waves } from 'lucide-react';
import { api } from '../api';

export default function Auth({ onLogin, installPrompt, onInstall }) {
  const [mode, setMode] = useState('login');
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setErr('');
    try {
      await api.get('/auth/csrf');
      const r = await api.post(`/auth/${mode === 'login' ? 'login' : 'register'}`, f);
      onLogin(r.user);
    } catch (x) { setErr(x.message); }
  }

  return (
    <main className="auth-layout">
      <aside className="auth-brand">
        <div className="auth-brand-name"><Waves size={25} /><span>Maré</span></div>
        <div className="auth-message"><span>SAÚDE, NO SEU TEMPO</span><h1>Pequenos registros.<br />Uma visão mais clara.</h1></div>
        <div className="auth-install">
          {installPrompt && <button type="button" className="install-button" onClick={onInstall}><Download size={17} /> Instalar aplicativo</button>}
          <details>
            <summary>Como instalar no dispositivo</summary>
            <p>No iPhone ou iPad, abra no Safari, toque em Compartilhar e escolha “Adicionar à Tela de Início”. Em outros navegadores, procure “Instalar aplicativo” ou “Adicionar à tela inicial” no menu.</p>
          </details>
        </div>
        <div className="auth-baseline"><span /> Acompanhamento pessoal, feito por você.</div>
      </aside>
      <form className="auth-form" onSubmit={submit}>
        <div className="auth-heading"><span className="eyebrow">BEM-VINDO À MARÉ</span><h2>{mode === 'login' ? 'Acesse sua conta' : 'Crie sua conta'}</h2><p>Entre para continuar seu acompanhamento.</p></div>
        {mode === 'register' && <label>Nome<input autoComplete="name" value={f.name} onChange={set('name')} required /></label>}
        <label>E-mail<input type="email" autoComplete="email" value={f.email} onChange={set('email')} required /></label>
        <label>Senha<input type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} minLength={8} value={f.password} onChange={set('password')} required /></label>
        {err && <p className="err" role="alert">{err}</p>}
        <button className="primary auth-submit">{mode === 'login' ? 'Entrar' : 'Criar conta'}<ArrowRight size={17} /></button>
        <button type="button" className="auth-switch" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'Ainda não tem conta? Criar conta' : 'Já tem uma conta? Entrar'}
        </button>
      </form>
    </main>
  );
}
