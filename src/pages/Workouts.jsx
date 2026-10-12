import { useEffect, useState } from 'react';
import { Download, Pencil, Trash2 } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../api';
import { downloadCsv } from '../csv';
import { filterByPeriod, todayInTimeZone } from '../periods';

const today = () => todayInTimeZone();
const TYPES = ['Natação', 'Musculação', 'Caminhada', 'Corrida', 'Ciclismo', 'Outro'];
const monday = () => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d; };
const blank = () => ({ date: today(), startTime: '', type: 'Natação', minutes: '', distanceKm: '', intensity: '', notes: '' });
const localDate = (value) => {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new Date(year, month - 1, day);
};

export default function Workouts({ period, periodRange }) {
  const [list, setList] = useState([]);
  const [f, setF] = useState(blank());
  const [customType, setCustomType] = useState('');
  const [editing, setEditing] = useState('');
  const [err, setErr] = useState('');
  const load = () => api.getAll('/workouts').then(setList);
  const visibleList = filterByPeriod(list, period, Date.now(), periodRange);
  useEffect(() => { load(); }, []);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const edit = (w) => {
    const type = TYPES.includes(w.type) ? w.type : 'Outro';
    setF({ date: new Date(w.date).toISOString().slice(0, 10), startTime: w.startTime ?? '', type, minutes: w.minutes, distanceKm: w.distanceKm ?? '', intensity: w.intensity ?? '', notes: w.notes ?? '' });
    setCustomType(type === 'Outro' && !TYPES.includes(w.type) ? w.type : '');
    setEditing(w._id); setErr('');
  };
  const cancelEdit = () => { setF(blank()); setCustomType(''); setEditing(''); setErr(''); };
  async function remove(workout) {
    if (!window.confirm('Excluir este treino?')) return;
    try { await api.del(`/workouts/${workout._id}`); await load(); }
    catch (error) { setErr(error.message); }
  }
  const currentWeek = monday();
  const week = visibleList.filter((w) => localDate(w.date) >= currentWeek).reduce((s, w) => s + w.minutes, 0);
  const weeklyData = Array.from({ length: 6 }, (_, index) => {
    const start = new Date(currentWeek);
    start.setDate(start.getDate() - (5 - index) * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return {
      week: start.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      minutes: visibleList.filter((w) => { const date = localDate(w.date); return date >= start && date < end; }).reduce((sum, w) => sum + w.minutes, 0),
    };
  });

  async function submit(e) {
    e.preventDefault(); setErr('');
    try {
      const body = {
        ...f,
        type: f.type === 'Outro' ? customType.trim() || 'Outro' : f.type,
        minutes: Number(f.minutes),
        distanceKm: f.distanceKm === '' ? (editing ? null : undefined) : Number(f.distanceKm),
        intensity: f.intensity === '' ? (editing ? null : undefined) : Number(f.intensity),
        startTime: f.startTime || undefined,
      };
      if (editing) await api.put(`/workouts/${editing}`, body);
      else await api.post('/workouts', body);
      setF(blank()); setCustomType(''); setEditing(''); load();
    }
    catch (x) { setErr(x.message); }
  }

  return (
    <>
      <section>
        <h2>{editing ? 'Editar treino' : 'Registrar treino'}</h2>
        <form className="row" onSubmit={submit}>
          <label>Data<input type="date" value={f.date} onChange={set('date')} required /></label>
          <label>Horário<input type="time" value={f.startTime} onChange={set('startTime')} /></label>
          <label>Tipo<select value={f.type} onChange={set('type')}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select></label>
          {f.type === 'Outro' && <label>Atividade personalizada<input value={customType} onChange={(e) => setCustomType(e.target.value)} maxLength="80" /></label>}
          <label>Minutos<input type="number" min="1" value={f.minutes} onChange={set('minutes')} required /></label>
          <label>Distância (km)<input type="number" min="0" step="0.1" value={f.distanceKm} onChange={set('distanceKm')} /></label>
          <label>Intensidade (1–10)<input type="number" min="1" max="10" value={f.intensity} onChange={set('intensity')} /></label>
          <label className="grow">Observação<input value={f.notes} onChange={set('notes')} /></label>
          <button className="primary">{editing ? 'Salvar alterações' : 'Salvar treino'}</button>
          {editing && <button type="button" onClick={cancelEdit}>Cancelar</button>}
        </form>
        {err && <p className="err" role="alert">{err}</p>}
      </section>
      <section>
        <div className="section-heading"><div><span className="eyebrow">CONSISTÊNCIA</span><h2>Minutos por semana</h2></div></div>
        {!visibleList.length ? <p className="muted">Registre treinos neste período para acompanhar sua frequência.</p> : (
          <div className="chart"><ResponsiveContainer width="100%" height={240}>
            <BarChart data={weeklyData}>
              <CartesianGrid stroke="#dce5df" vertical={false} /><XAxis dataKey="week" /><YAxis allowDecimals={false} width={42} />
              <Tooltip formatter={(value) => [`${value} min`, 'Atividade']} />
              <Bar dataKey="minutes" fill="#187563" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer></div>
        )}
      </section>
      <section>
        <div className="section-heading"><div><span className="eyebrow">TREINOS</span><h2>Esta semana: {week} min</h2></div>
          {!!visibleList.length && <button type="button" onClick={() => downloadCsv('mare-treinos.csv', ['Data', 'Horário', 'Atividade', 'Duração (min)', 'Distância (km)', 'Intensidade', 'Observação'], visibleList.map((w) => [w.date.slice(0, 10), w.startTime, w.type, w.minutes, w.distanceKm, w.intensity, w.notes]))}><Download size={16} /> Exportar CSV</button>}
        </div>
        {!visibleList.length ? <p className="muted">Nenhum treino neste período.</p> : (
          <div className="scroll"><table>
            <thead><tr><th>Data</th><th>Tipo</th><th>Duração</th><th>Distância</th><th>Intensidade</th><th>Observação</th><th></th></tr></thead>
            <tbody>{[...visibleList].reverse().map((w) => (
              <tr key={w._id}>
                <td>{new Date(w.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</td><td>{w.type}</td>
                <td>{w.minutes} min</td><td>{w.distanceKm != null ? `${w.distanceKm} km` : '—'}</td><td>{w.intensity ?? '—'}</td><td>{w.notes}</td>
                <td className="row-actions">
                  <button type="button" className="icon-action" aria-label="Editar treino" title="Editar" onClick={() => edit(w)}><Pencil size={16} /></button>
                  <button type="button" className="icon-action danger-action" aria-label="Excluir treino" title="Excluir" onClick={() => remove(w)}><Trash2 size={16} /></button>
                </td>
              </tr>))}
            </tbody></table></div>
        )}
      </section>
    </>
  );
}
