import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Calendar, Clock, Users, BarChart3, Plus, Trash2, LogOut, Download, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

const App = () => {
  const [user, setUser] = useState(null);
  const [data, setData] = useState({ users: {}, projects: {}, entries: {} });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('myHours');

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get('ts-data').catch(() => null);
        if (res?.value) setData(JSON.parse(res.value));
      } catch (e) {}
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!loading && Object.keys(data.users).length > 0) {
      window.storage.set('ts-data', JSON.stringify(data)).catch(() => {});
    }
  }, [data, loading]);

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><Clock className="w-12 h-12 text-indigo-600 animate-spin" /></div>;
  if (!user) return <Login setUser={setUser} data={data} setData={setData} />;
  return <Main user={user} setUser={setUser} data={data} setData={setData} tab={tab} setTab={setTab} />;
};

const Login = ({ setUser, data, setData }) => {
  const [form, setForm] = useState({ email: '', pass: '', name: '', err: '' });
  const [reg, setReg] = useState(false);

  const auth = () => {
    const { email, pass, name } = form;
    setForm({ ...form, err: '' });
    
    if (reg) {
      if (!email.endsWith('@lxgcapital.com')) return setForm({ ...form, err: 'Solo @lxgcapital.com' });
      if (pass.length < 6) return setForm({ ...form, err: 'Mínimo 6 caracteres' });
      if (!name.trim()) return setForm({ ...form, err: 'Ingresa tu nombre' });
      if (data.users[email]) return setForm({ ...form, err: 'Email registrado' });
      
      const newUser = { name: name.trim(), password: pass, isAdmin: email === 'jose.correa@lxgcapital.com' };
      setData({ ...data, users: { ...data.users, [email]: newUser } });
      setUser({ email, ...newUser });
    } else {
      if (!data.users[email] || data.users[email].password !== pass) {
        return setForm({ ...form, err: 'Credenciales incorrectas' });
      }
      setUser({ email, ...data.users[email] });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="flex items-center justify-center mb-6">
          <div className="bg-indigo-600 p-3 rounded-xl mr-3"><Clock className="w-8 h-8 text-white" /></div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Time Tracker LXG</h1>
        </div>
        <div className="flex mb-6 bg-gray-100 rounded-xl p-1">
          {['Login', 'Registro'].map(t => (
            <button key={t} onClick={() => { setReg(t === 'Registro'); setForm({ ...form, err: '' }); }} className={`flex-1 py-2 rounded-lg font-medium ${(t === 'Registro') === reg ? 'bg-white shadow text-indigo-600' : 'text-gray-600'}`}>{t}</button>
          ))}
        </div>
        <div className="space-y-4">
          {reg && <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nombre" className="w-full px-4 py-3 border-2 rounded-xl" />}
          <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="tu@lxgcapital.com" className="w-full px-4 py-3 border-2 rounded-xl" />
          <input type="password" value={form.pass} onChange={e => setForm({ ...form, pass: e.target.value })} placeholder="••••••••" onKeyPress={e => e.key === 'Enter' && auth()} className="w-full px-4 py-3 border-2 rounded-xl" />
          {form.err && <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{form.err}</div>}
          <button onClick={auth} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-xl font-semibold">{reg ? 'Crear' : 'Entrar'}</button>
        </div>
      </div>
    </div>
  );
};

const Main = ({ user, setUser, data, setData, tab, setTab }) => {
  const getWeek = () => { const d = new Date(), s = new Date(d.getFullYear(), 0, 1), w = Math.ceil((d - s) / 604800000); return `${d.getFullYear()}-W${String(w).padStart(2, '0')}`; };
  
  const [state, setState] = useState({ week: getWeek(), proj: '', hrs: '', desc: '', newProj: '', fProj: 'all', fUser: 'all', fStat: 'all', startWeek: '', endWeek: '' });

  const weekHrs = useCallback((email, wk) => Object.values(data.entries).filter(e => e.userEmail === email && e.week === wk && e.status === 'approved').reduce((s, e) => s + e.hours, 0), [data.entries]);
  const myHrs = useMemo(() => weekHrs(user.email, state.week), [weekHrs, user.email, state.week]);

  const addEntry = () => {
    if (!state.proj || !state.hrs || parseFloat(state.hrs) <= 0) return;
    const hrs = parseFloat(state.hrs), id = Date.now().toString(), status = myHrs + hrs > 70 ? 'pending' : 'approved';
    setData({ ...data, entries: { ...data.entries, [id]: { userEmail: user.email, userName: user.name, projectId: state.proj, projectName: data.projects[state.proj]?.name, week: state.week, hours: hrs, description: state.desc.trim(), status, createdAt: new Date().toISOString() } } });
    setState({ ...state, proj: '', hrs: '', desc: '' });
    if (status === 'pending') alert('Excede 70h, requiere aprobación');
  };

  const delEntry = (id) => {
    if (!user.isAdmin && data.entries[id].userEmail !== user.email) return alert('Sin permisos');
    if (!confirm('¿Eliminar?')) return;
    const e = { ...data.entries }; delete e[id]; setData({ ...data, entries: e });
  };

  const updateStatus = (id, status, by) => setData({ ...data, entries: { ...data.entries, [id]: { ...data.entries[id], status, [`${status}By`]: user.email, [`${status}At`]: new Date().toISOString() } } });

  const addProj = () => {
    if (!state.newProj.trim()) return;
    setData({ ...data, projects: { ...data.projects, [Date.now()]: { name: state.newProj.trim(), createdBy: user.email } } });
    setState({ ...state, newProj: '' });
  };

  const delProj = (id) => {
    if (!user.isAdmin) return alert('Solo admins');
    if (!confirm('¿Eliminar?')) return;
    const p = { ...data.projects }; delete p[id]; setData({ ...data, projects: p });
  };

  const myEntries = useMemo(() => Object.entries(data.entries).filter(([k, e]) => e.userEmail === user.email).map(([id, e]) => ({ id, ...e })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)), [data.entries, user.email]);
  const filtered = useMemo(() => Object.entries(data.entries).filter(([k, e]) => (state.fProj === 'all' || e.projectId === state.fProj) && (state.fUser === 'all' || e.userEmail === state.fUser) && (state.fStat === 'all' || e.status === state.fStat)).map(([id, e]) => ({ id, ...e })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)), [data.entries, state.fProj, state.fUser, state.fStat]);
  const pending = useMemo(() => Object.entries(data.entries).filter(([k, e]) => e.status === 'pending').map(([id, e]) => ({ id, ...e })).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)), [data.entries]);

  const stats = useMemo(() => {
    const s = {};
    Object.values(data.entries).forEach(e => {
      if (e.status !== 'approved' || (state.startWeek && e.week < state.startWeek) || (state.endWeek && e.week > state.endWeek)) return;
      if (!s[e.projectId]) s[e.projectId] = { hrs: 0, users: {}, userDetails: {} };
      s[e.projectId].hrs += e.hours;
      s[e.projectId].users[e.userEmail] = (s[e.projectId].users[e.userEmail] || 0) + e.hours;
      s[e.projectId].userDetails[e.userEmail] = e.userName;
    });
    return s;
  }, [data.entries, state.startWeek, state.endWeek]);

  const total = useMemo(() => {
    const approved = Object.values(data.entries).filter(e => e.status === 'approved');
    return { hrs: approved.reduce((s, e) => s + e.hours, 0), users: new Set(approved.map(e => e.userEmail)).size, pending: pending.length };
  }, [data.entries, pending.length]);

  const exp = () => {
    const d = user.isAdmin ? filtered : myEntries;
    const csv = [['Semana', 'Usuario', 'Email', 'Proyecto', 'Horas', 'Desc', 'Estado'], ...d.map(e => [e.week, e.userName, e.userEmail, e.projectName || 'N/A', e.hours, e.description || '', e.status === 'approved' ? 'Aprobado' : e.status === 'pending' ? 'Pendiente' : 'Rechazado'])].map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `timesheet-${new Date().toISOString().split('T')[0]}.csv`; a.click();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg"><Clock className="w-6 h-6 text-white" /></div>
            <div><h1 className="font-bold text-gray-800">Time Tracker LXG</h1><p className="text-xs text-gray-500">LXG Capital</p></div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block"><div className="font-semibold text-sm">{user.name}</div><div className="text-xs text-gray-500">{user.isAdmin ? 'Admin' : 'Usuario'}</div></div>
            <button onClick={() => setUser(null)} className="p-2 hover:bg-gray-100 rounded-lg"><LogOut className="w-5 h-5" /></button>
          </div>
        </div>
      </nav>

      {user.isAdmin && (
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[{ l: 'Total Horas', v: total.hrs.toFixed(1) }, { l: 'Usuarios', v: total.users }, { l: 'Proyectos', v: Object.keys(data.projects).length }, { l: 'Pendientes', v: total.pending }].map((i, x) => (
                <div key={x} className="bg-white bg-opacity-20 rounded-lg p-3"><div className="text-xs">{i.l}</div><div className="text-2xl font-bold">{i.v}</div></div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button onClick={() => setTab('myHours')} className={`px-4 py-2 rounded-lg whitespace-nowrap ${tab === 'myHours' ? 'bg-indigo-600 text-white' : 'bg-white'}`}><Calendar className="w-4 h-4 inline mr-1" />Mis Horas</button>
          {user.isAdmin && (
            <>
              <button onClick={() => setTab('approvals')} className={`px-4 py-2 rounded-lg whitespace-nowrap relative ${tab === 'approvals' ? 'bg-indigo-600 text-white' : 'bg-white'}`}><AlertCircle className="w-4 h-4 inline mr-1" />Aprobar {total.pending > 0 && <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{total.pending}</span>}</button>
              <button onClick={() => setTab('reports')} className={`px-4 py-2 rounded-lg whitespace-nowrap ${tab === 'reports' ? 'bg-indigo-600 text-white' : 'bg-white'}`}><BarChart3 className="w-4 h-4 inline mr-1" />Reportes</button>
              <button onClick={() => setTab('projects')} className={`px-4 py-2 rounded-lg whitespace-nowrap ${tab === 'projects' ? 'bg-indigo-600 text-white' : 'bg-white'}`}><Users className="w-4 h-4 inline mr-1" />Proyectos</button>
            </>
          )}
        </div>

        {tab === 'myHours' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-xl font-bold mb-4">Registrar Horas</h2>
              {Object.keys(data.projects).length === 0 && <div className="mb-4 p-4 bg-amber-50 border-2 border-amber-200 rounded-lg text-amber-800 text-sm">⚠️ No hay proyectos. {user.isAdmin ? 'Ve a Proyectos.' : 'Contacta al admin.'}</div>}
              <div className="mb-4 p-3 bg-blue-50 rounded-lg flex justify-between items-center">
                <span className="text-sm">Horas aprobadas esta semana:</span>
                <span className={`font-bold text-lg ${myHrs > 70 ? 'text-red-600' : myHrs > 60 ? 'text-amber-600' : 'text-green-600'}`}>{myHrs.toFixed(1)}/70h</span>
              </div>
              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div><label className="block text-sm font-semibold mb-1">Semana</label><input type="week" value={state.week} onChange={e => setState({ ...state, week: e.target.value })} className="w-full px-4 py-2 border-2 rounded-lg" /></div>
                <div><label className="block text-sm font-semibold mb-1">Proyecto</label><select value={state.proj} onChange={e => setState({ ...state, proj: e.target.value })} className="w-full px-4 py-2 border-2 rounded-lg"><option value="">Seleccionar...</option>{Object.entries(data.projects).map(([id, p]) => <option key={id} value={id}>{p.name}</option>)}</select></div>
                <div><label className="block text-sm font-semibold mb-1">Horas</label><input type="number" step="0.5" value={state.hrs} onChange={e => setState({ ...state, hrs: e.target.value })} placeholder="8.0" className="w-full px-4 py-2 border-2 rounded-lg" /></div>
                <div><label className="block text-sm font-semibold mb-1">Descripción</label><input type="text" value={state.desc} onChange={e => setState({ ...state, desc: e.target.value })} placeholder="Opcional" className="w-full px-4 py-2 border-2 rounded-lg" /></div>
              </div>
              <button onClick={addEntry} disabled={!state.proj || !state.hrs} className="px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold disabled:opacity-50"><Plus className="w-4 h-4 inline mr-1" />Agregar</button>
            </div>

            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Mis Registros</h2>
                <button onClick={exp} className="px-4 py-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"><Download className="w-4 h-4 inline mr-1" />CSV</button>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {myEntries.map(e => (
                  <div key={e.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="font-semibold">{e.projectName || 'Eliminado'}</div>
                      <div className="text-sm text-gray-600">{e.week} • {e.hours}h • {e.status === 'approved' ? '✓ Aprobado' : e.status === 'pending' ? '⏳ Pendiente' : '✗ Rechazado'}</div>
                      {e.description && <div className="text-sm text-gray-500">{e.description}</div>}
                    </div>
                    <button onClick={() => delEntry(e.id)} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
                {!myEntries.length && <div className="text-center py-12 text-gray-400">No hay registros</div>}
              </div>
            </div>
          </div>
        )}

        {tab === 'approvals' && user.isAdmin && (
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-bold mb-4">Aprobaciones Pendientes</h2>
            <div className="space-y-3">
              {pending.map(e => (
                <div key={e.id} className="p-4 bg-amber-50 border-2 border-amber-200 rounded-lg">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="font-semibold">{e.userName}</div>
                      <div className="text-sm text-gray-600">{e.projectName} • {e.week} • {e.hours}h</div>
                      {e.description && <div className="text-sm text-gray-500 mt-1">{e.description}</div>}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => updateStatus(e.id, 'approved')} className="p-2 bg-green-500 text-white rounded hover:bg-green-600"><CheckCircle className="w-5 h-5" /></button>
                      <button onClick={() => updateStatus(e.id, 'rejected')} className="p-2 bg-red-500 text-white rounded hover:bg-red-600"><XCircle className="w-5 h-5" /></button>
                    </div>
                  </div>
                </div>
              ))}
              {!pending.length && <div className="text-center py-12 text-gray-400">No hay pendientes</div>}
            </div>
          </div>
        )}

        {tab === 'reports' && user.isAdmin && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="text-xl font-bold mb-4">Estadísticas</h2>
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div><label className="block text-sm font-semibold mb-1">Desde</label><input type="week" value={state.startWeek} onChange={e => setState({ ...state, startWeek: e.target.value })} className="w-full px-4 py-2 border-2 rounded-lg" /></div>
                <div><label className="block text-sm font-semibold mb-1">Hasta</label><input type="week" value={state.endWeek} onChange={e => setState({ ...state, endWeek: e.target.value })} className="w-full px-4 py-2 border-2 rounded-lg" /></div>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(stats).map(([id, s]) => (
                  <div key={id} className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg border-2 border-indigo-100">
                    <h3 className="font-bold mb-3 text-lg">{data.projects[id]?.name || 'Eliminado'}</h3>
                    <div className="text-sm space-y-2">
                      <div className="flex justify-between border-b pb-2"><span className="font-semibold">Total:</span><span className="font-bold text-indigo-600">{s.hrs.toFixed(1)}h</span></div>
                      <div className="space-y-1">
                        <div className="font-semibold text-gray-700 mb-1">Por usuario:</div>
                        {Object.entries(s.users).map(([email, hrs]) => (
                          <div key={email} className="flex justify-between pl-2"><span className="text-gray-600">{s.userDetails[email]}:</span><span className="font-semibold text-indigo-600">{hrs.toFixed(1)}h</span></div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                {!Object.keys(stats).length && <div className="col-span-full text-center py-12 text-gray-400">No hay datos</div>}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow p-6">
              <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                <h2 className="text-xl font-bold">Todos los Registros</h2>
                <div className="flex gap-2 flex-wrap">
                  <select value={state.fProj} onChange={e => setState({ ...state, fProj: e.target.value })} className="px-3 py-2 border rounded-lg text-sm"><option value="all">Todos</option>{Object.entries(data.projects).map(([id, p]) => <option key={id} value={id}>{p.name}</option>)}</select>
                  <select value={state.fUser} onChange={e => setState({ ...state, fUser: e.target.value })} className="px-3 py-2 border rounded-lg text-sm"><option value="all">Todos</option>{Object.entries(data.users).map(([e, u]) => <option key={e} value={e}>{u.name}</option>)}</select>
                  <select value={state.fStat} onChange={e => setState({ ...state, fStat: e.target.value })} className="px-3 py-2 border rounded-lg text-sm"><option value="all">Todos</option><option value="approved">Aprobados</option><option value="pending">Pendientes</option><option value="rejected">Rechazados</option></select>
                  <button onClick={exp} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm"><Download className="w-4 h-4 inline" /></button>
                </div>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filtered.map(e => (
                  <div key={e.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-semibold text-sm">{e.userName} • {e.projectName}</div>
                        <div className="text-xs text-gray-600">{e.week} • {e.hours}h • {e.status === 'approved' ? '✓' : e.status === 'pending' ? '⏳' : '✗'}</div>
                      </div>
                      <button onClick={() => delEntry(e.id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))}
                {!filtered.length && <div className="text-center py-12 text-gray-400">No hay registros</div>}
              </div>
            </div>
          </div>
        )}

        {tab === 'projects' && user.isAdmin && (
          <div className="bg-white rounded-xl shadow p-6">
            <h2 className="text-xl font-bold mb-4">Gestión de Proyectos</h2>
            <div className="flex gap-2 mb-6">
              <input type="text" value={state.newProj} onChange={e => setState({ ...state, newProj: e.target.value })} onKeyPress={e => e.key === 'Enter' && addProj()} placeholder="Nuevo proyecto..." className="flex-1 px-4 py-2 border-2 rounded-lg" />
              <button onClick={addProj} disabled={!state.newProj.trim()} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-semibold disabled:opacity-50"><Plus className="w-4 h-4 inline mr-1" />Agregar</button>
            </div>
            {Object.keys(data.projects).length === 0 && <div className="text-center py-12 text-gray-400"><Users className="w-16 h-16 mx-auto mb-3 opacity-50" /><p className="text-lg font-semibold mb-1">No hay proyectos</p><p className="text-sm">Crea tu primer proyecto arriba</p></div>}
            <div className="space-y-2">
              {Object.entries(data.projects).map(([id, p]) => (
                <div key={id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg hover:bg-gray-100">
                  <div className="font-semibold">{p.name}</div>
                  <button onClick={() => delProj(id)} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
