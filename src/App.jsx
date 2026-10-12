import { lazy, Suspense, useEffect, useState } from 'react';
import { Activity, Download, Dumbbell, LayoutDashboard, LogOut, Microscope, RefreshCw, Waves } from 'lucide-react';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { api } from './api';
import { PERIODS } from './periods';
import Auth from './pages/Auth.jsx';
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Weights = lazy(() => import('./pages/Weights.jsx'));
const Exams = lazy(() => import('./pages/Exams.jsx'));
const Workouts = lazy(() => import('./pages/Workouts.jsx'));

const TABS = [
  ['Resumo', '/', Dashboard, LayoutDashboard],
  ['Peso', '/peso', Weights, Activity],
  ['Exames', '/exames', Exams, Microscope],
  ['Treinos', '/treinos', Workouts, Dumbbell],
];

export default function App() {
  return <BrowserRouter><AppShell /></BrowserRouter>;
}

function AppShell() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [apiUnavailable, setApiUnavailable] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [period, setPeriod] = useState('90');
  const [periodRange, setPeriodRange] = useState({ from: '', to: '' });
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = Math.max(0, TABS.findIndex(([, path]) => path === location.pathname));
  const label = TABS[activeTab][0];

  useEffect(() => {
    api.get('/auth/csrf').then(() => api.get('/me')).then(setUser).catch((error) => {
      setUser(null);
      setApiUnavailable(error.name === 'NetworkError' || !navigator.onLine);
    }).finally(() => setReady(true));
  }, []);
  useEffect(() => {
    const expireSession = () => setUser(null);
    const onApiUnavailable = () => setApiUnavailable(true);
    const onApiAvailable = () => setApiUnavailable(false);
    const onInstallPrompt = (event) => { event.preventDefault(); setInstallPrompt(event); };
    const onInstalled = () => setInstallPrompt(null);
    window.addEventListener('auth-expired', expireSession);
    window.addEventListener('api-unavailable', onApiUnavailable);
    window.addEventListener('api-available', onApiAvailable);
    window.addEventListener('beforeinstallprompt', onInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('auth-expired', expireSession);
      window.removeEventListener('api-unavailable', onApiUnavailable);
      window.removeEventListener('api-available', onApiAvailable);
      window.removeEventListener('beforeinstallprompt', onInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  async function logout() {
    try { await api.post('/auth/logout'); } finally { setUser(null); }
  }

  async function installApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  if (!ready) return <p className="center">Carregando…</p>;
  if (!user && apiUnavailable) return (
    <main className="offline-state">
      <span className="offline-mark"><Waves size={24} /></span>
      <span className="eyebrow">MARÉ · MODO OFFLINE</span>
      <h1>Sem conexão com seus dados</h1>
      <p>O aplicativo abriu, mas precisa da API para autenticar e carregar seus registros. Nenhum dado de saúde é salvo neste dispositivo.</p>
      <button className="primary" onClick={() => location.reload()}><RefreshCw size={16} /> Tentar novamente</button>
    </main>
  );
  if (!user) return <Auth onLogin={setUser} installPrompt={installPrompt} onInstall={installApp} />;

  return (
    <div className="app-frame">
      <aside className="sidebar">
        <a className="brand" href="/" onClick={(e) => { e.preventDefault(); navigate('/'); }}>
          <span className="brand-mark"><Waves size={21} strokeWidth={2.2} /></span>
          <span><strong>Maré</strong><small>SAÚDE PESSOAL</small></span>
        </a>
        <span className="nav-label">ACOMPANHAMENTO</span>
        <nav aria-label="Seções">
          {TABS.map(([tabLabel, path, _Page, Icon], i) => (
            <button key={tabLabel} className={i === activeTab ? 'tab on' : 'tab'} aria-current={i === activeTab ? 'page' : undefined} onClick={() => navigate(path)}>
              <Icon size={18} strokeWidth={1.9} /><span>{tabLabel}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="status-dot" /> Seus registros, no seu ritmo
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div><span className="eyebrow">SEU ESPAÇO DE SAÚDE</span><h1>{label}</h1></div>
          <label className="global-period">Período<select value={period} onChange={(e) => setPeriod(e.target.value)}>{PERIODS.map(([value, title]) => <option key={value} value={value}>{title}</option>)}</select></label>
          {period === 'custom' && <div className="period-range"><label>De<input type="date" value={periodRange.from} onChange={(e) => setPeriodRange({ ...periodRange, from: e.target.value })} /></label><label>Até<input type="date" value={periodRange.to} onChange={(e) => setPeriodRange({ ...periodRange, to: e.target.value })} /></label></div>}
          <div className="account">
            <span className="avatar" aria-hidden="true">{user.name?.trim()?.[0]?.toUpperCase() || 'M'}</span>
            <span className="account-name">{user.name}</span>
            {installPrompt && <button className="icon-button" aria-label="Instalar Maré" title="Instalar Maré" onClick={installApp}><Download size={17} /></button>}
            <button className="icon-button" aria-label="Sair da conta" title="Sair" onClick={logout}><LogOut size={18} /></button>
          </div>
        </header>
        {apiUnavailable && <p className="connection-notice" role="status">Sem conexão com o servidor. Seus dados não serão atualizados nem salvos enquanto estiver offline.</p>}
        <main><Suspense fallback={<p className="center">Carregando seção…</p>}><Routes>
          {TABS.map(([, path, Page]) => <Route key={path} path={path} element={<Page user={user} setUser={setUser} onNavigate={(index) => navigate(TABS[index][1])} period={period} periodRange={periodRange} />} />)}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes></Suspense></main>
        <footer>Seus dados de saúde são pessoais. Consulte um profissional para interpretar seus resultados.</footer>
      </div>
    </div>
  );
}
