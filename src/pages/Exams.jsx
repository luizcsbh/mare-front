import { useEffect, useState } from 'react';
import { Download, FileText, Pencil, Trash2 } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../api';
import { downloadCsv } from '../csv';
import { filterByPeriod, todayInTimeZone } from '../periods';
import { fmtDate } from './Dashboard.jsx';

// Faixas de referência de exemplo (editáveis): siga sempre a faixa impressa no laudo do seu laboratório.
const PRESETS = {
  'Hemoglobina glicada': { unit: '%', refMin: 4, refMax: 6.2 },
  'Glicose em jejum': { unit: 'mg/dL', refMax: 99 },
  'Colesterol total': { unit: 'mg/dL', refMax: 199 },
  'LDL': { unit: 'mg/dL', refMax: 99 },
  'HDL': { unit: 'mg/dL', refMin: 40 },
  'Triglicérides': { unit: 'mg/dL', refMax: 149 },
  'Vitamina D': { unit: 'ng/mL', refMin: 20 },
  'Vitamina B12': { unit: 'pg/mL', refMin: 187, refMax: 883 },
  'Ferritina': { unit: 'ng/mL', refMin: 21.81, refMax: 274.66 },
  'TSH': { unit: 'µUI/mL', refMin: 0.35, refMax: 4.94 },
};
const today = () => todayInTimeZone();
const blank = () => ({ name: '', code: '', category: '', value: '', resultText: '', unit: '', refMin: '', refMax: '', refText: '', method: '', notes: '' });
const numeric = (i) => typeof i.value === 'number' && Number.isFinite(i.value);
const out = (i) => numeric(i) && ((i.refMin != null && i.value < i.refMin) || (i.refMax != null && i.value > i.refMax));
const range = (i) => (i.refText || (i.refMin != null && i.refMax != null ? `${i.refMin}–${i.refMax}` : i.refMax != null ? `até ${i.refMax}` : i.refMin != null ? `a partir de ${i.refMin}` : '—'));

export default function Exams({ period, periodRange }) {
  const [list, setList] = useState([]);
  const [date, setDate] = useState(today());
  const [lab, setLab] = useState('');
  const [items, setItems] = useState([blank()]);
  const [file, setFile] = useState(null);
  const [editing, setEditing] = useState('');
  const [sel, setSel] = useState('');
  const [err, setErr] = useState('');
  const load = () => api.getAll('/exams').then(setList);
  const visibleList = filterByPeriod(list, period, Date.now(), periodRange);
  useEffect(() => { load(); }, []);
  const edit = (exam) => {
    setDate(new Date(exam.date).toISOString().slice(0, 10));
    setLab(exam.lab ?? '');
    setItems(exam.items.map((item) => ({ ...blank(), ...item, value: item.value ?? '', resultText: item.resultText ?? '', unit: item.unit ?? '', refMin: item.refMin ?? '', refMax: item.refMax ?? '' })));
    setFile(null); setEditing(exam._id); setErr('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const cancelEdit = () => { setDate(today()); setLab(''); setItems([blank()]); setFile(null); setEditing(''); setErr(''); };
  async function remove(exam) {
    if (!window.confirm('Excluir esta coleta e o laudo associado?')) return;
    try { await api.del(`/exams/${exam._id}`); await load(); }
    catch (error) { setErr(error.message); }
  }

  const setItem = (i, k, v) => setItems((all) => all.map((x, j) => {
    if (j !== i) return x;
    const n = { ...x, [k]: v };
    if (k === 'name' && PRESETS[v]) Object.assign(n, { refMin: '', refMax: '' }, PRESETS[v]);
    return n;
  }));

  async function submit(e) {
    e.preventDefault(); setErr('');
    const n = (v) => (v === '' || v == null ? undefined : Number(v));
    const clean = items.filter((i) => i.name.trim() && (i.value !== '' || i.resultText.trim()))
      .map((i) => ({
        name: i.name.trim(), code: i.code.trim(), category: i.category.trim(),
        value: n(i.value), resultText: i.resultText.trim(), unit: i.unit.trim(),
        refMin: n(i.refMin), refMax: n(i.refMax), refText: i.refText.trim(),
        method: i.method.trim(), notes: i.notes.trim(),
      }));
    if (!clean.length) return setErr('Adicione pelo menos um resultado numérico ou textual');
    const fd = new FormData();
    fd.append('date', date); fd.append('lab', lab); fd.append('items', JSON.stringify(clean));
    if (file) fd.append('file', file);
    try {
      if (editing) await api.put(`/exams/${editing}`, fd);
      else await api.post('/exams', fd);
      setDate(today()); setLab(''); setItems([blank()]); setFile(null); setEditing(''); e.target.reset(); load();
    }
    catch (x) { setErr(x.message); }
  }

  const names = [...new Set(visibleList.flatMap((e) => e.items.filter(numeric).map((i) => i.name)))];
  const selected = names.includes(sel) ? sel : '';
  const allSeries = visibleList.flatMap((e) => e.items.filter((i) => i.name === selected && numeric(i)).map((i) => ({ d: fmtDate(e.date), v: i.value, ref: i })));
  const firstRef = allSeries[0]?.ref;
  const series = allSeries.filter(({ ref: item }) => item.unit === firstRef?.unit && item.method === firstRef?.method);
  const ref = series.at(-1)?.ref;
  const excludedSeries = allSeries.length - series.length;

  return (
    <>
      <section>
        <h2>{editing ? 'Editar exame' : 'Novo exame'}</h2>
        <form onSubmit={submit}>
          <div className="row">
            <label>Data da coleta<input type="date" value={date} onChange={(e) => setDate(e.target.value)} required /></label>
            <label className="grow">Laboratório<input value={lab} onChange={(e) => setLab(e.target.value)} /></label>
            <label>Laudo (PDF ou imagem)<input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" onChange={(e) => setFile(e.target.files[0])} /></label>
          </div>
          <datalist id="exam-names">{Object.keys(PRESETS).map((k) => <option key={k} value={k} />)}</datalist>
          {items.map((it, i) => (
            <div className="row" key={i}>
              <label className="grow">Exame<input list="exam-names" value={it.name} onChange={(e) => setItem(i, 'name', e.target.value)} /></label>
              <label>Código<input value={it.code} onChange={(e) => setItem(i, 'code', e.target.value)} /></label>
              <label>Categoria<input value={it.category} onChange={(e) => setItem(i, 'category', e.target.value)} /></label>
              <label>Valor<input type="number" step="any" value={it.value} onChange={(e) => setItem(i, 'value', e.target.value)} /></label>
              <label>Resultado textual<input value={it.resultText} onChange={(e) => setItem(i, 'resultText', e.target.value)} maxLength="500" /></label>
              <label>Unidade<input value={it.unit} onChange={(e) => setItem(i, 'unit', e.target.value)} /></label>
              <label>Ref. mín.<input type="number" step="any" value={it.refMin} onChange={(e) => setItem(i, 'refMin', e.target.value)} /></label>
              <label>Ref. máx.<input type="number" step="any" value={it.refMax} onChange={(e) => setItem(i, 'refMax', e.target.value)} /></label>
              <label>Referência textual<input value={it.refText} onChange={(e) => setItem(i, 'refText', e.target.value)} maxLength="120" /></label>
              <label>Método<input value={it.method} onChange={(e) => setItem(i, 'method', e.target.value)} maxLength="120" /></label>
              {items.length > 1 && <button type="button" className="link" onClick={() => setItems(items.filter((_, j) => j !== i))}>Remover</button>}
            </div>
          ))}
          <div className="row">
            <button type="button" onClick={() => setItems([...items, blank()])}>Adicionar resultado</button>
            <button className="primary">{editing ? 'Salvar alterações' : 'Salvar exame'}</button>
            {editing && <button type="button" onClick={cancelEdit}>Cancelar</button>}
          </div>
        </form>
        {err && <p className="err" role="alert">{err}</p>}
      </section>

      <section>
        <h2>Evolução de um resultado</h2>
        {!names.length ? <p className="muted">Cadastre exames em datas diferentes para comparar a evolução.</p> : (
          <>
            <label>Exame<select value={selected} onChange={(e) => setSel(e.target.value)}><option value="">Escolha…</option>{names.map((n) => <option key={n}>{n}</option>)}</select></label>
            {selected && (
              <>
              {excludedSeries > 0 && <p className="muted">{excludedSeries} resultado(s) com unidade ou método diferente(s) não foram comparados.</p>}
              {series.length < 2 ? <p className="muted">Este resultado tem só um registro comparável até agora.</p> : (
              <div className="chart"><ResponsiveContainer width="100%" height={260}>
                <LineChart data={series}>
                  <CartesianGrid stroke="#d9e2e8" vertical={false} /><XAxis dataKey="d" /><YAxis domain={['auto', 'auto']} width={48} />
                  <Tooltip formatter={(v) => [`${v} ${ref.unit || ''}`, selected]} />
                  {ref.refMax != null && <ReferenceLine y={ref.refMax} stroke="#b4452b" strokeDasharray="5 4" />}
                  {ref.refMin != null && <ReferenceLine y={ref.refMin} stroke="#b4452b" strokeDasharray="5 4" />}
                  <Line dataKey="v" stroke="#0b6e8a" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart></ResponsiveContainer></div>
              )}
              </>
            )}
          </>
        )}
      </section>

      <section>
        <div className="section-heading"><div><span className="eyebrow">RESULTADOS</span><h2>Exames salvos</h2></div>
          {!!visibleList.length && <button type="button" onClick={() => downloadCsv('mare-exames.csv', ['Data', 'Laboratório', 'Exame', 'Código', 'Categoria', 'Resultado numérico', 'Resultado textual', 'Unidade', 'Referência mínima', 'Referência máxima', 'Referência textual', 'Método'], visibleList.flatMap((e) => e.items.map((item) => [e.date.slice(0, 10), e.lab, item.name, item.code, item.category, item.value, item.resultText, item.unit, item.refMin, item.refMax, item.refText, item.method])))}><Download size={16} /> Exportar CSV</button>}
        </div>
        {!visibleList.length && <p className="muted">Nenhum exame neste período.</p>}
        {[...visibleList].reverse().map((e) => (
          <article className="exam" key={e._id}>
            <header>
              <h3>{new Date(e.date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}{e.lab ? ` — ${e.lab}` : ''}</h3>
              <span className="row-actions">
                {e.file && <button type="button" className="icon-action" aria-label="Abrir laudo" title="Abrir laudo" onClick={() => api.openFile(`/exams/${e._id}/file`)}><FileText size={16} /></button>}
                <button type="button" className="icon-action" aria-label="Editar exame" title="Editar" onClick={() => edit(e)}><Pencil size={16} /></button>
                <button type="button" className="icon-action danger-action" aria-label="Excluir exame" title="Excluir" onClick={() => remove(e)}><Trash2 size={16} /></button>
              </span>
            </header>
            <div className="scroll"><table>
              <thead><tr><th>Exame</th><th>Resultado</th><th>Referência</th><th>Classificação</th></tr></thead>
              <tbody>{e.items.map((i) => (
                <tr key={i._id} className={out(i) ? 'flag' : ''}>
                  <td>{i.name}</td><td>{numeric(i) ? `${i.value} ${i.unit || ''}` : i.resultText}</td><td>{range(i)}</td><td>{out(i) ? 'Fora da referência' : numeric(i) && (i.refMin != null || i.refMax != null) ? 'Dentro da referência informada' : 'Não classificado'}</td>
                </tr>))}</tbody></table></div>
          </article>
        ))}
      </section>
    </>
  );
}
