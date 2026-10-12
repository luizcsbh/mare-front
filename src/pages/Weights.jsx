import { useEffect, useState } from 'react';
import { Download, Pencil, Trash2 } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../api';
import { downloadCsv } from '../csv';
import { filterByPeriod, todayInTimeZone } from '../periods';

const today = () => todayInTimeZone();
const blank = () => ({ date: today(), time: '', weightKg: '', waistCm: '', bodyFatPct: '', muscleMassKg: '', source: '', notes: '' });
const METRICS = { waistCm: ['Cintura', 'cm'], bodyFatPct: ['Gordura corporal', '%'], muscleMassKg: ['Massa muscular', 'kg'] };

export default function Weights({ period, periodRange }) {
  const [list, setList] = useState([]);
  const [f, setF] = useState(blank());
  const [metric, setMetric] = useState('waistCm');
  const [editing, setEditing] = useState('');
  const [err, setErr] = useState('');
  const load = () => api.getAll('/measurements').then(setList);
  const visibleList = filterByPeriod(list, period, Date.now(), periodRange);
  const chartData = visibleList.filter((m) => m[metric] != null).map((m) => ({ date: new Date(m.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' }), value: m[metric] }));
  useEffect(() => { load(); }, []);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const edit = (m) => {
    setF({ date: new Date(m.date).toISOString().slice(0, 10), time: m.time ?? '', weightKg: m.weightKg ?? '', waistCm: m.waistCm ?? '', bodyFatPct: m.bodyFatPct ?? '', muscleMassKg: m.muscleMassKg ?? '', source: m.source ?? '', notes: m.notes ?? '' });
    setEditing(m._id); setErr('');
  };
  const cancelEdit = () => { setF(blank()); setEditing(''); setErr(''); };
  async function remove(m) {
    if (!window.confirm('Excluir este registro de medidas?')) return;
    try { await api.del(`/measurements/${m._id}`); await load(); }
    catch (error) { setErr(error.message); }
  }

  async function submit(e) {
    e.preventDefault(); setErr('');
    const n = (v) => (v === '' ? (editing ? null : undefined) : Number(v));
    try {
      const body = { ...f, weightKg: n(f.weightKg), waistCm: n(f.waistCm), bodyFatPct: n(f.bodyFatPct), muscleMassKg: n(f.muscleMassKg) };
      if (editing) await api.put(`/measurements/${editing}`, body);
      else await api.post('/measurements', body);
      setF(blank()); setEditing(''); load();
    } catch (x) { setErr(x.message); }
  }

  return (
    <>
      <section>
        <h2>{editing ? 'Editar registro' : 'Novo registro'}</h2>
        <form className="row" onSubmit={submit}>
          <label>Data<input type="date" value={f.date} onChange={set('date')} required /></label>
          <label>Horário<input type="time" value={f.time} onChange={set('time')} /></label>
          <label>Peso (kg)<input type="number" step="0.1" value={f.weightKg} onChange={set('weightKg')} required /></label>
          <label>Cintura (cm)<input type="number" step="0.1" value={f.waistCm} onChange={set('waistCm')} /></label>
          <label>Gordura (%)<input type="number" step="0.1" value={f.bodyFatPct} onChange={set('bodyFatPct')} /></label>
          <label>Massa muscular (kg)<input type="number" min="1" step="0.1" value={f.muscleMassKg} onChange={set('muscleMassKg')} /></label>
          <label>Origem<input value={f.source} onChange={set('source')} maxLength="80" placeholder="Ex.: balança, avaliação" /></label>
          <label className="grow">Observação<input value={f.notes} onChange={set('notes')} /></label>
          <button className="primary">{editing ? 'Salvar alterações' : 'Salvar registro'}</button>
          {editing && <button type="button" onClick={cancelEdit}>Cancelar</button>}
        </form>
        {err && <p className="err" role="alert">{err}</p>}
      </section>
      <section>
        <div className="section-heading"><div><span className="eyebrow">COMPOSIÇÃO CORPORAL</span><h2>Evolução das medidas</h2></div>
          <label>Indicador<select value={metric} onChange={(e) => setMetric(e.target.value)}>{Object.entries(METRICS).map(([value, [title]]) => <option key={value} value={value}>{title}</option>)}</select></label>
        </div>
        {chartData.length < 2 ? <p className="muted">Registre duas medições no período para comparar {METRICS[metric][0].toLowerCase()}.</p> : (
          <div className="chart"><ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid stroke="#dce5df" vertical={false} /><XAxis dataKey="date" /><YAxis domain={['auto', 'auto']} width={48} />
              <Tooltip formatter={(value) => [`${value} ${METRICS[metric][1]}`, METRICS[metric][0]]} />
              <Line dataKey="value" stroke="#187563" strokeWidth={2.5} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer></div>
        )}
      </section>
      <section>
        <div className="section-heading"><div><span className="eyebrow">MEDIDAS</span><h2>Histórico</h2></div>
          {!!visibleList.length && <button type="button" onClick={() => downloadCsv('mare-medidas.csv', ['Data', 'Horário', 'Peso (kg)', 'Cintura (cm)', 'Gordura (%)', 'Massa muscular (kg)', 'Origem', 'Observação'], visibleList.map((m) => [m.date.slice(0, 10), m.time, m.weightKg, m.waistCm, m.bodyFatPct, m.muscleMassKg, m.source, m.notes]))}><Download size={16} /> Exportar CSV</button>}
        </div>
        {!visibleList.length ? <p className="muted">Nenhum registro neste período.</p> : (
          <div className="scroll"><table>
            <thead><tr><th>Data / hora</th><th>Peso</th><th>Cintura</th><th>Gordura</th><th>Massa muscular</th><th>Origem</th><th>Observação</th><th></th></tr></thead>
            <tbody>{[...visibleList].reverse().map((m) => (
              <tr key={m._id}>
                <td>{new Date(m.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}{m.time && <><br /><span className="muted">{m.time}</span></>}</td>
                <td>{m.weightKg} kg</td><td>{m.waistCm ? `${m.waistCm} cm` : '—'}</td>
                <td>{m.bodyFatPct ? `${m.bodyFatPct}%` : '—'}</td><td>{m.muscleMassKg ? `${m.muscleMassKg} kg` : '—'}</td><td>{m.source || '—'}</td><td>{m.notes}</td>
                <td className="row-actions">
                  <button type="button" className="icon-action" aria-label="Editar registro" title="Editar" onClick={() => edit(m)}><Pencil size={16} /></button>
                  <button type="button" className="icon-action danger-action" aria-label="Excluir registro" title="Excluir" onClick={() => remove(m)}><Trash2 size={16} /></button>
                </td>
              </tr>))}
            </tbody></table></div>
        )}
      </section>
    </>
  );
}
