import { useEffect, useState } from 'react';
import { Activity, ArrowUpRight, Download, Dumbbell, Microscope, Scale, Trash2 } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../api';
import { downloadJson } from '../csv';
import { filterByPeriod } from '../periods';

export const fmtDate = (d) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'UTC' });
const avg = (a) => (a.length ? a.reduce((s, m) => s + m.weightKg, 0) / a.length : null);

export default function Dashboard({ user, setUser, onNavigate, period, periodRange }) {
  const [ms, setMs] = useState([]);
  const [workouts, setWorkouts] = useState([]);
  const [exams, setExams] = useState([]);
  const [p, setP] = useState({ heightCm: user.heightCm ?? '', goalWeightKg: user.goalWeightKg ?? '' });
  const [saved, setSaved] = useState(false);
  const [accountError, setAccountError] = useState('');
  useEffect(() => {
    api.getAll('/measurements').then(setMs);
    api.getAll('/workouts').then(setWorkouts);
    api.getAll('/exams').then(setExams);
  }, []);

  const last = ms.at(-1), first = ms[0], WEEK = 7 * 864e5, now = Date.now();
  const a1 = avg(ms.filter((m) => now - new Date(m.date) <= WEEK));
  const a0 = avg(ms.filter((m) => { const t = now - new Date(m.date); return t > WEEK && t <= 2 * WEEK; }));
  const bmi = last && user.heightCm ? last.weightKg / (user.heightCm / 100) ** 2 : null;
  const one = (n) => (n == null ? '—' : n.toFixed(1).replace('.', ','));
  const sign = (n) => (n == null ? '—' : `${n > 0 ? '+' : ''}${one(n)} kg`);
  const latestWaist = [...ms].reverse().find((m) => m.waistCm != null);
  const latestFat = [...ms].reverse().find((m) => m.bodyFatPct != null);
  const weekStart = new Date(); weekStart.setHours(0, 0, 0, 0); weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
  const thisWeek = workouts.filter((w) => new Date(w.date) >= weekStart);
  const chartMs = filterByPeriod(ms, period, now, periodRange);
  const latestExam = exams.at(-1);

  async function saveProfile(e) {
    e.preventDefault();
    const num = (v) => (v === '' ? null : Number(v));
    setUser(await api.put('/me', { heightCm: num(p.heightCm), goalWeightKg: num(p.goalWeightKg) }));
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  async function exportAccount() {
    setAccountError('');
    try { downloadJson('mare-dados-pessoais.json', await api.get('/me/export')); }
    catch (error) { setAccountError(error.message); }
  }

  async function deleteAccount() {
    if (!window.confirm('Excluir sua conta e todos os registros associados? Esta ação não pode ser desfeita.')) return;
    if (window.prompt('Digite EXCLUIR para confirmar a remoção permanente:') !== 'EXCLUIR') return;
    setAccountError('');
    try { await api.del('/me'); setUser(null); }
    catch (error) { setAccountError(error.message); }
  }

  return (
    <>
      <section className="hero">
        <div>
          <span className="muted">Peso atual</span>
          <strong className="big">{last ? one(last.weightKg) : '—'}<small> kg</small></strong>
          {!last && <p className="muted">Registre seu primeiro peso na aba Peso.</p>}
          {last && <span className="hero-date">Último registro em {new Date(last.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</span>}
        </div>
        <dl className="stats">
          <div><dt>Desde o início</dt><dd>{first && last ? sign(last.weightKg - first.weightKg) : '—'}</dd></div>
          <div><dt>Média 7 dias vs. anteriores</dt><dd>{a1 != null && a0 != null ? sign(a1 - a0) : '—'}</dd></div>
          <div><dt>IMC</dt><dd>{one(bmi)}</dd></div>
          <div><dt>Falta para a meta</dt><dd>{last && user.goalWeightKg ? sign(user.goalWeightKg - last.weightKg) : '—'}</dd></div>
          <div><dt>Cintura mais recente</dt><dd>{latestWaist ? `${one(latestWaist.waistCm)} cm` : '—'}</dd></div>
          <div><dt>Gordura corporal</dt><dd>{latestFat ? `${one(latestFat.bodyFatPct)}%` : '—'}</dd></div>
        </dl>
      </section>

      <section>
        <div className="section-heading"><div><span className="eyebrow">TENDÊNCIA</span><h2>Evolução do peso</h2></div></div>
        {chartMs.length < 2 ? <p className="muted">Com dois registros no período, a evolução aparece aqui.</p> : (
          <div className="chart">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartMs.map((m) => ({ d: fmtDate(m.date), kg: m.weightKg }))}>
                <CartesianGrid stroke="#d9e2e8" vertical={false} />
                <XAxis dataKey="d" /><YAxis domain={['dataMin - 2', 'dataMax + 2']} width={40} />
                <Tooltip formatter={(v) => [`${v} kg`, 'Peso']} />
                {user.goalWeightKg && <ReferenceLine y={user.goalWeightKg} stroke="#2e7d5b" strokeDasharray="5 4" label="Meta" />}
                <Line dataKey="kg" stroke="#0b6e8a" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <section className="activity-section">
        <div className="section-heading"><div><span className="eyebrow">RESUMO DA SEMANA</span><h2>Seu acompanhamento</h2></div></div>
        <div className="summary-grid">
          <article className="summary-item"><span className="summary-icon sea"><Dumbbell size={19} /></span><div><span>Atividade nesta semana</span><strong>{thisWeek.reduce((sum, w) => sum + w.minutes, 0)} <small>min</small></strong><small>{thisWeek.length} {thisWeek.length === 1 ? 'treino' : 'treinos'}</small></div></article>
          <article className="summary-item"><span className="summary-icon coral"><Microscope size={19} /></span><div><span>Exame mais recente</span><strong className="summary-text">{latestExam ? new Date(latestExam.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : 'Nenhum exame'}</strong><small>{latestExam?.items?.map((item) => item.name).slice(0, 2).join(', ') || 'Seus resultados ficam aqui'}</small></div></article>
        </div>
        <div className="quick-actions">
          <button type="button" onClick={() => onNavigate(1)}><Scale size={17} /> Registrar peso <ArrowUpRight size={15} /></button>
          <button type="button" onClick={() => onNavigate(2)}><Microscope size={17} /> Adicionar exame <ArrowUpRight size={15} /></button>
          <button type="button" onClick={() => onNavigate(3)}><Activity size={17} /> Registrar treino <ArrowUpRight size={15} /></button>
        </div>
      </section>

      <section>
        <div className="section-heading"><div><span className="eyebrow">PERFIL</span><h2>Seus dados</h2></div></div>
        <form className="row" onSubmit={saveProfile}>
          <label>Altura (cm)<input type="number" value={p.heightCm} onChange={(e) => setP({ ...p, heightCm: e.target.value })} /></label>
          <label>Meta de peso (kg)<input type="number" step="0.1" value={p.goalWeightKg} onChange={(e) => setP({ ...p, goalWeightKg: e.target.value })} /></label>
          <button className="primary">Salvar dados</button>
          {saved && <span className="ok" role="status">Dados salvos</span>}
        </form>
        <div className="account-actions">
          <button type="button" onClick={exportAccount}><Download size={16} /> Exportar meus dados</button>
          <button type="button" className="danger-action" onClick={deleteAccount}><Trash2 size={16} /> Excluir conta e dados</button>
        </div>
        {accountError && <p className="err" role="alert">{accountError}</p>}
      </section>
    </>
  );
}
