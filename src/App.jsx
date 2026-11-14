import { useState, useEffect, createContext, useContext, useRef } from 'react';

const API = 'http://localhost:3000/api';
const AuthCtx = createContext(null);

function useApi(tokenRef, setSession) {
  return async (path, opts = {}, retry = true) => {
    const res = await fetch(`${API}${path}`, {
      ...opts,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(tokenRef.current ? { Authorization: `Bearer ${tokenRef.current}` } : {}),
        ...(opts.headers || {}),
      },
    });
    if (res.status === 401 && retry) {
      const r = await fetch(`${API}/auth/refresh`, { method: 'POST', credentials: 'include' });
      if (r.ok) {
        const data = await r.json();
        tokenRef.current = data.token;
        setSession({ token: data.token, user: data.user });
        return useApi(tokenRef, setSession)(path, opts, false);
      }
      setSession(null);
      throw new Error('Sesión expirada');
    }
    let data = null;
    try { data = await res.json(); } catch { data = null; }
    if (!res.ok) throw new Error(data?.error || `Error ${res.status}`);
    return data;
  };
}

function Skeleton({ lines = 3 }) {
  return (
    <div>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton skeleton-text" style={{ width: `${60 + Math.random() * 40}%` }} />
      ))}
    </div>
  );
}
function SkeletonCards({ n = 4 }) {
  return (
    <div className="cards">
      {Array.from({ length: n }).map((_, i) => <div key={i} className="skeleton skeleton-card" />)}
    </div>
  );
}
function Empty({ icon = '📭', title = 'Sin datos', desc = 'No hay registros que mostrar todavía.' }) {
  return (
    <div className="empty">
      <div className="empty-icon">{icon}</div>
      <div className="empty-title">{title}</div>
      <div className="empty-desc">{desc}</div>
    </div>
  );
}

/* ---------- REGISTRO ---------- */
function Register({ onLogin }) {
  const [form, setForm] = useState({ email: '', password: '', full_name: '', company_name: '', invite_code: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code) setForm(f => ({ ...f, invite_code: code.toUpperCase() }));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error de registro');
      onLogin(data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="login-wrap">
      <aside className="login-brand">
        <div className="login-brand-logo">
          <div className="login-brand-logo-icon">📦</div>
          <span>StockFlow</span>
        </div>
        <div className="login-brand-hero">
          <h2>Has sido invitado a StockFlow.</h2>
          <p>Completa el formulario para crear tu cuenta. Tú eliges tu contraseña; nadie más la conocerá.</p>
          <div className="login-brand-features">
            <div className="login-brand-feature"><div className="login-brand-feature-icon">📊</div><span>Dashboard con KPIs en tiempo real</span></div>
            <div className="login-brand-feature"><div className="login-brand-feature-icon">⏰</div><span>Alertas de caducidad y FIFO automático</span></div>
            <div className="login-brand-feature"><div className="login-brand-feature-icon">🛒</div><span>Sugerencias de compra inteligentes</span></div>
            <div className="login-brand-feature"><div className="login-brand-feature-icon">🔒</div><span>Multi-empresa con roles y auditoría</span></div>
          </div>
        </div>
        <div className="login-brand-footer">© {new Date().getFullYear()} StockFlow · Todos los derechos reservados</div>
      </aside>
      <div className="login-form-wrap">
        <form className="login-form" onSubmit={submit}>
          <div className="login-form-header">
            <h1>Crear tu cuenta</h1>
            <p>Usa el código que te han enviado para registrarte</p>
          </div>
          {error && <div className="alert error">{error}</div>}
          <div className="field">
            <label>Código de invitación</label>
            <input value={form.invite_code} onChange={e => setForm({ ...form, invite_code: e.target.value.toUpperCase() })} placeholder="Ej: A1B2C3D4E5F6" required />
          </div>
          <div className="field">
            <label>Nombre completo</label>
            <input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required />
          </div>
          <div className="field">
            <label>Nombre de tu empresa</label>
            <input value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} placeholder="Mi Restaurante" />
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="field">
            <label>Contraseña (mín. 8 caracteres)</label>
            <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={8} placeholder="Elige tu contraseña" />
          </div>
          <button type="submit" disabled={loading}>{loading ? 'Creando cuenta…' : 'Crear cuenta'}</button>
          <div className="login-form-hint">
            ¿Ya tienes cuenta? <a href="/" onClick={e => { e.preventDefault(); window.location.href = '/'; }}>Inicia sesión</a>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------- LOGIN ---------- */
function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error de login');
      onLogin(data);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="login-wrap">
      <aside className="login-brand">
        <div className="login-brand-logo">
          <div className="login-brand-logo-icon">📦</div>
          <span>StockFlow</span>
        </div>
        <div className="login-brand-hero">
          <h2>Controla tu inventario con precisión total.</h2>
          <p>La plataforma que ayuda a restaurantes y empresas a reducir desperdicios, optimizar compras y conocer el valor real de su stock en tiempo real.</p>
          <div className="login-brand-features">
            <div className="login-brand-feature"><div className="login-brand-feature-icon">📊</div><span>Dashboard con KPIs en tiempo real</span></div>
            <div className="login-brand-feature"><div className="login-brand-feature-icon">⏰</div><span>Alertas de caducidad y FIFO automático</span></div>
            <div className="login-brand-feature"><div className="login-brand-feature-icon">🛒</div><span>Sugerencias de compra inteligentes</span></div>
            <div className="login-brand-feature"><div className="login-brand-feature-icon">🔒</div><span>Multi-empresa con roles y auditoría</span></div>
          </div>
        </div>
        <div className="login-brand-footer">© {new Date().getFullYear()} StockFlow · Todos los derechos reservados</div>
      </aside>
      <div className="login-form-wrap">
        <form className="login-form" onSubmit={submit}>
          <div className="login-form-header">
            <h1>Bienvenido de nuevo</h1>
            <p>Accede a tu cuenta para continuar</p>
          </div>
          {error && <div className="alert error">{error}</div>}
          <div className="field">
            <label htmlFor="login-email">Email</label>
            <input id="login-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@empresa.com" autoComplete="username" required />
          </div>
          <div className="field">
            <label htmlFor="login-password">Contraseña</label>
            <input id="login-password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" autoComplete="current-password" required />
          </div>
          <button type="submit" disabled={loading}>{loading ? 'Entrando…' : 'Entrar'}</button>
          <div className="login-form-hint">
            ¿Tienes un código de invitación? <a href="/register" onClick={e => { e.preventDefault(); window.location.href = '/register'; }}>Regístrate aquí</a>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------- PANEL ADMIN ---------- */
function AdminPanel() {
  const { api, user } = useContext(AuthCtx);
  const [invites, setInvites] = useState([]);
  const [form, setForm] = useState({ role: 'admin', restaurant_id: '', expires_hours: 72 });
  const [restaurants, setRestaurants] = useState([]);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastInvite, setLastInvite] = useState(null);

  const load = () => api('/admin/invites').then(setInvites).catch(e => setError(e.message));
  useEffect(() => {
    load();
    api('/restaurants').then(setRestaurants).catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault(); setError(''); setOk(''); setLoading(true);
    try {
      const body = {
        role: form.role,
        expires_hours: Number(form.expires_hours),
        restaurant_id: form.restaurant_id ? Number(form.restaurant_id) : null,
      };
      const res = await api('/admin/invites', { method: 'POST', body: JSON.stringify(body) });
      setLastInvite(res);
      setOk(`Código generado: ${res.code}`);
      load();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const copyLink = (code) => {
    const link = `${window.location.origin}/register?code=${code}`;
    navigator.clipboard.writeText(link).then(() => setOk('Enlace copiado al portapapeles'));
  };

  if (user.role !== 'superadmin') return <div className="alert error">Acceso restringido al superadministrador.</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Panel de administración</h2>
          <div className="page-header-sub">Genera códigos de invitación para nuevos usuarios. Tú no eliges su contraseña: la eligen ellos al registrarse.</div>
        </div>
      </div>
      {error && <div className="alert error">{error}</div>}
      {ok && <div className="alert ok">{ok}</div>}

      {lastInvite && (
        <div className="suggestions" style={{ marginBottom: '1.5rem' }}>
          <div className="suggestions-header">
            <strong>✅ Código generado: {lastInvite.code}</strong>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-primary" onClick={() => copyLink(lastInvite.code)}>Copiar enlace de registro</button>
              <button className="btn-secondary" onClick={() => setLastInvite(null)}>Cerrar</button>
            </div>
          </div>
          <p style={{ fontSize: '.85rem', color: 'var(--text-muted)', margin: 0 }}>
            Enlace: <code>{window.location.origin}/register?code={lastInvite.code}</code>
          </p>
          <p style={{ fontSize: '.85rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Comparte este enlace con el usuario. Al abrirlo, él elegirá su propia contraseña.
          </p>
        </div>
      )}

      <form className="form-inline" onSubmit={submit}>
        <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
          <option value="admin">Admin (dueño de empresa)</option>
          <option value="manager">Manager</option>
          <option value="warehouse">Responsable de almacén</option>
          <option value="kitchen">Cocina</option>
        </select>
        <select value={form.restaurant_id} onChange={e => setForm({ ...form, restaurant_id: e.target.value })}>
          <option value="">Crear empresa nueva</option>
          {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <input type="number" min="1" max="720" value={form.expires_hours} onChange={e => setForm({ ...form, expires_hours: e.target.value })} title="Horas de validez" placeholder="Horas" />
        <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Generando…' : 'Generar código'}</button>
      </form>

      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Código</th><th>Rol</th><th>Empresa</th><th>Estado</th><th>Expira</th><th>Acciones</th></tr></thead>
          <tbody>{invites.map(inv => (
            <tr key={inv.id}>
              <td><code>{inv.code}</code></td>
              <td><span className={`badge ${inv.role}`}>{inv.role}</span></td>
              <td>{inv.restaurant_name || '—'}</td>
              <td>
                {inv.used
                  ? <span className="badge cancelled">usado por {inv.used_by_name}</span>
                  : new Date(inv.expires_at) < new Date()
                    ? <span className="badge cancelled">expirado</span>
                    : <span className="badge received">válido</span>}
              </td>
              <td>{new Date(inv.expires_at).toLocaleString()}</td>
              <td>
                {!inv.used && new Date(inv.expires_at) > new Date() && (
                  <button className="btn-edit" onClick={() => copyLink(inv.code)}>Copiar enlace</button>
                )}
              </td>
            </tr>))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- USUARIOS ---------- */
function Users() {
  const { api, user } = useContext(AuthCtx);
  const [items, setItems] = useState(null); const [restaurants, setRestaurants] = useState([]);
  const [error, setError] = useState(''); const [ok, setOk] = useState('');
  const [showManual, setShowManual] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', full_name: '', role: 'warehouse', restaurant_id: '' });
  const load = () => api('/users').then(setItems).catch(e => setError(e.message));
  useEffect(() => { load(); if (user.role === 'superadmin') api('/restaurants').then(setRestaurants).catch(() => {}); }, []);
  const submit = async (e) => {
    e.preventDefault(); setError(''); setOk('');
    try {
      const body = { ...form };
      if (user.role === 'superadmin' && form.restaurant_id) body.restaurant_id = Number(form.restaurant_id);
      await api('/users', { method: 'POST', body: JSON.stringify(body) });
      setOk('Usuario creado'); setForm({ email: '', password: '', full_name: '', role: 'warehouse', restaurant_id: '' }); setShowManual(false); load();
    } catch (err) { setError(err.message); }
  };
  const toggle = async (u) => {
    setError(''); setOk('');
    try { await api(`/users/${u.id}`, { method: 'PUT', body: JSON.stringify({ active: !u.active }) }); load(); }
    catch (err) { setError(err.message); }
  };
  const reset = async (u) => {
    const pwd = window.prompt(`Nueva contraseña para ${u.email} (mínimo 8 caracteres):`);
    if (!pwd) return;
    setError(''); setOk('');
    try { await api(`/users/${u.id}/reset-password`, { method: 'POST', body: JSON.stringify({ password: pwd }) }); setOk('Contraseña actualizada'); }
    catch (err) { setError(err.message); }
  };
  const roles = user.role === 'superadmin' ? ['admin','manager','warehouse','kitchen','superadmin'] : ['admin','manager','warehouse','kitchen'];
  return (
    <div>
      <div className="page-header">
        <div>
          <h2>Usuarios</h2>
          <div className="page-header-sub">Gestión de accesos y roles</div>
        </div>
        <button className="btn-secondary" onClick={() => setShowManual(!showManual)}>
          {showManual ? 'Cancelar creación manual' : 'Crear usuario manualmente'}
        </button>
      </div>
      {error && <div className="alert error">{error}</div>}
      {ok && <div className="alert ok">{ok}</div>}

      <div className="alert ok" style={{ marginBottom: '1rem' }}>
        💡 <strong>Recomendado:</strong> para nuevos clientes, usa el <strong>Panel admin</strong> y envía un código de invitación. El usuario elegirá su propia contraseña.
      </div>

      {showManual && (
        <form className="form-inline" onSubmit={submit}>
          <input placeholder="Nombre completo" value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} required />
          <input type="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
          <input type="password" placeholder="Contraseña (mín. 8)" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
          <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
            {roles.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          {user.role === 'superadmin' && (
            <select value={form.restaurant_id} onChange={e => setForm({ ...form, restaurant_id: e.target.value })} required={form.role !== 'superadmin'}>
              <option value="">{form.role === 'superadmin' ? 'Sin restaurante (superadmin)' : 'Restaurante…'}</option>
              {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          )}
          <button type="submit" className="btn-primary">Crear usuario</button>
        </form>
      )}

      {items === null ? <Skeleton lines={4} /> : items.length === 0 ? <Empty icon="👥" title="Sin usuarios" desc="Crea el primer usuario del sistema." /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Nombre</th><th>Email</th><th>Rol</th><th>Restaurante</th><th>Estado</th><th></th></tr></thead>
            <tbody>{items.map(u => (
              <tr key={u.id}>
                <td data-label="Nombre">{u.full_name}</td>
                <td data-label="Email">{u.email}</td>
                <td data-label="Rol"><span className={`badge ${u.role}`}>{u.role}</span></td>
                <td data-label="Restaurante">{u.restaurant_name || '—'}</td>
                <td data-label="Estado"><span className={`badge ${u.active ? 'received' : 'cancelled'}`}>{u.active ? 'activo' : 'inactivo'}</span></td>
                <td>
                  <button className="btn-edit" onClick={() => reset(u)}>Reset pwd</button>
                  <button className={u.active ? 'btn-danger' : 'btn-primary'} onClick={() => toggle(u)}>
                    {u.active ? 'Desactivar' : 'Activar'}
                  </button>
                </td>
              </tr>))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------- RESTAURANTES ---------- */
function Restaurants() {
  const { api } = useContext(AuthCtx);
  const [items, setItems] = useState(null); const [error, setError] = useState(''); const [ok, setOk] = useState('');
  const [form, setForm] = useState({ name: '', plan: 'basic', industry: 'food' });
  const load = () => api('/restaurants').then(setItems).catch(e => setError(e.message));
  useEffect(() => { load(); }, []);
  const submit = async (e) => {
    e.preventDefault(); setError(''); setOk('');
    try { await api('/restaurants', { method: 'POST', body: JSON.stringify(form) }); setOk('Restaurante creado'); setForm({ name: '', plan: 'basic', industry: 'food' }); load(); }
    catch (err) { setError(err.message); }
  };
  const toggle = async (r) => {
    setError(''); setOk('');
    try { await api(`/restaurants/${r.id}`, { method: 'PUT', body: JSON.stringify({ active: !r.active }) }); load(); }
    catch (err) { setError(err.message); }
  };
  return (
    <div>
      <div className="page-header"><div><h2>Empresas</h2><div className="page-header-sub">Gestión multi-empresa</div></div></div>
      {error && <div className="alert error">{error}</div>}
      {ok && <div className="alert ok">{ok}</div>}
      <form className="form-inline" onSubmit={submit}>
        <input placeholder="Nombre de la empresa" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
        <select value={form.plan} onChange={e => setForm({ ...form, plan: e.target.value })}>
          <option value="basic">Básico</option><option value="pro">Profesional</option><option value="enterprise">Empresarial</option>
        </select>
        <select value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })}>
          <option value="food">Hostelería</option><option value="retail">Retail</option><option value="services">Servicios</option><option value="other">Otros</option>
        </select>
        <button type="submit" className="btn-primary">Crear empresa</button>
      </form>
      {items === null ? <Skeleton lines={4} /> : items.length === 0 ? <Empty icon="🏢" title="Sin empresas" desc="Crea la primera empresa." /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>ID</th><th>Nombre</th><th>Plan</th><th>Industria</th><th>Suscripción</th><th>Usuarios</th><th>Estado</th><th></th></tr></thead>
            <tbody>{items.map(r => (
              <tr key={r.id}>
                <td data-label="ID">#{r.id}</td>
                <td data-label="Nombre">{r.name}</td>
                <td data-label="Plan"><span className="badge draft">{r.plan}</span></td>
                <td data-label="Industria">{r.industry}</td>
                <td data-label="Suscripción"><span className={`badge ${r.subscription_status === 'active' ? 'received' : r.subscription_status === 'trial' ? 'sent' : 'cancelled'}`}>{r.subscription_status}</span></td>
                <td data-label="Usuarios">{r.user_count}</td>
                <td data-label="Estado"><span className={`badge ${r.active ? 'received' : 'cancelled'}`}>{r.active ? 'activo' : 'inactivo'}</span></td>
                <td><button className={r.active ? 'btn-danger' : 'btn-primary'} onClick={() => toggle(r)}>{r.active ? 'Desactivar' : 'Activar'}</button></td>
              </tr>))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------- DASHBOARD ---------- */
function Dashboard() {
  const { api, user } = useContext(AuthCtx);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [showWelcome, setShowWelcome] = useState(!user.welcomeSeen);
  const [marked, setMarked] = useState(false);

  useEffect(() => {
    api('/dashboard').then(setData).catch(e => setError(e.message));
  }, []);

  const dismissWelcome = async () => {
    setShowWelcome(false);
    if (!marked) {
      try { await api('/auth/welcome-seen', { method: 'POST' }); } catch {}
      setMarked(true);
    }
  };

  if (error) return <div className="alert error">{error}</div>;
  if (!data) return <SkeletonCards n={7} />;

  const cards = [
    { l: 'Valor inventario', v: `€${data.inventoryValue.toFixed(2)}`, c: 'blue', icon: '💶' },
    { l: 'Productos', v: data.productCount, c: 'green', icon: '📦' },
    { l: 'Stock bajo', v: data.lowStock, c: 'orange', icon: '⚠️' },
    { l: 'Agotados', v: data.outOfStock, c: 'red', icon: '🚫' },
    { l: 'Caducan ≤7d', v: data.expiringSoon, c: 'orange', icon: '⏰' },
    { l: 'Compras mes', v: `€${data.purchasesMonth.toFixed(2)}`, c: 'blue', icon: '🛒' },
    { l: 'Mermas mes', v: `€${data.wasteMonth.toFixed(2)}`, c: 'red', icon: '🗑️' },
  ];

  return (
    <div>
      {showWelcome && (
        <div className="welcome-banner">
          <div className="welcome-banner-icon">🎉</div>
          <div className="welcome-banner-content">
            <h3>¡Bienvenido, {user.name?.split(' ')[0] || 'usuario'}!</h3>
            <p>
              {user.companyName
                ? <>Tu cuenta para <strong>{user.companyName}</strong> está lista. Empieza creando tus primeros productos y proveedores.</>
                : <>Tu cuenta está lista. Empieza creando tus primeros productos y proveedores.</>}
            </p>
          </div>
          <button className="welcome-banner-close" onClick={dismissWelcome} aria-label="Cerrar bienvenida">✕</button>
        </div>
      )}
      <div className="page-header"><div><h2>Dashboard</h2><div className="page-header-sub">Resumen general de tu inventario</div></div></div>
      <div className="cards">{cards.map(c => (
        <div key={c.l} className={`card ${c.c}`}>
          <div className="card-icon">{c.icon}</div>
          <div className="card-value">{c.v}</div>
          <div className="card-label">{c.l}</div>
        </div>))}
      </div>
    </div>
  );
}

/* ---------- PRODUCTOS ---------- */
function Products() {
  const { api } = useContext(AuthCtx);
  const [items, setItems] = useState(null);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const emptyForm = { name: '', sku: '', barcode: '', unit: 'kg', purchase_price: 0, stock_min: 0, location: '', description: '', custom_attributes: {} };
  const [form, setForm] = useState(emptyForm);
  const load = () => api('/products').then(setItems).catch(e => setError(e.message));
  useEffect(() => { load(); }, []);
  const submit = async (e) => {
    e.preventDefault(); setError(''); setOk('');
    try {
      const body = { ...form, purchase_price: Number(form.purchase_price), stock_min: Number(form.stock_min) };
      if (editing) await api(`/products/${editing}`, { method: 'PUT', body: JSON.stringify(body) });
      else await api('/products', { method: 'POST', body: JSON.stringify(body) });
      setEditing(null); setForm(emptyForm); setOk('Producto guardado'); load();
    } catch (err) { setError(err.message); }
  };
  const edit = (p) => {
    setEditing(p.id);
    setForm({ name: p.name, sku: p.sku||'', barcode: p.barcode||'', unit: p.unit, purchase_price: Number(p.purchase_price), stock_min: Number(p.stock_min), location: p.location||'', description: p.description||'', custom_attributes: p.custom_attributes||{} });
  };
  const del = async (id) => {
    if (!window.confirm('¿Eliminar este producto?')) return;
    setError(''); setOk('');
    try { await api(`/products/${id}`, { method: 'DELETE' }); load(); }
    catch (err) { setError(err.message); }
  };
  return (
    <div>
      <div className="page-header"><div><h2>Productos</h2><div className="page-header-sub">{items?.length ?? '…'} artículos registrados</div></div></div>
      {error && <div className="alert error">{error}</div>}
      {ok && <div className="alert ok">{ok}</div>}
      <form className="form-inline" onSubmit={submit}>
        <input placeholder="Nombre" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
        <input placeholder="SKU" value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} />
        <input placeholder="Código barras" value={form.barcode} onChange={e => setForm({ ...form, barcode: e.target.value })} />
        <select value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}>
          <option>kg</option><option>g</option><option>L</option><option>ml</option><option>ud</option><option>caja</option>
        </select>
        <input type="number" step="0.01" placeholder="Precio" value={form.purchase_price} onChange={e => setForm({ ...form, purchase_price: +e.target.value })} />
        <input type="number" step="0.1" placeholder="Stock mín" value={form.stock_min} onChange={e => setForm({ ...form, stock_min: +e.target.value })} />
        <input placeholder="Ubicación" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
        <button type="submit" className="btn-primary">{editing ? 'Guardar' : 'Añadir'}</button>
        {editing && <button type="button" className="btn-secondary" onClick={() => { setEditing(null); setForm(emptyForm); }}>Cancelar</button>}
      </form>
      {items === null ? <Skeleton lines={5} /> : items.length === 0 ? <Empty icon="📦" title="Sin productos" desc="Añade tu primer producto con el formulario de arriba." /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Producto</th><th>SKU</th><th>Stock</th><th>Mín</th><th>Precio</th><th>Ubicación</th><th></th></tr></thead>
            <tbody>{items.map(p => (
              <tr key={p.id} className={Number(p.stock_current) <= Number(p.stock_min) ? 'row-warn' : ''}>
                <td data-label="Producto">{p.name}</td>
                <td data-label="SKU">{p.sku}</td>
                <td data-label="Stock">{Number(p.stock_current).toFixed(2)} {p.unit}</td>
                <td data-label="Mín">{p.stock_min}</td>
                <td data-label="Precio">€{p.purchase_price}</td>
                <td data-label="Ubicación">{p.location}</td>
                <td>
                  <button className="btn-edit" onClick={() => edit(p)}>Editar</button>
                  <button className="btn-danger" onClick={() => del(p.id)}>Eliminar</button>
                </td>
              </tr>))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------- MOVIMIENTOS ---------- */
function Movements() {
  const { api } = useContext(AuthCtx);
  const [items, setItems] = useState(null); const [products, setProducts] = useState([]);
  const [error, setError] = useState(''); const [ok, setOk] = useState('');
  const [form, setForm] = useState({ product_id: '', type: 'entrada', quantity: 1, reason: 'purchase', notes: '', expiration_date: '', batch_code: '', unit_cost: 0 });
  const load = () => Promise.all([api('/movements'), api('/products')]).then(([m, p]) => { setItems(m); setProducts(p); }).catch(e => setError(e.message));
  useEffect(() => { load(); }, []);
  const submit = async (e) => {
    e.preventDefault(); setError(''); setOk('');
    try {
      await api('/movements', { method: 'POST', body: JSON.stringify({ ...form, product_id: +form.product_id, quantity: +form.quantity }) });
      setOk('Movimiento registrado'); setForm({ ...form, quantity: 1, notes: '' }); load();
    } catch (err) { setError(err.message); }
  };
  return (
    <div>
      <div className="page-header"><div><h2>Movimientos</h2><div className="page-header-sub">Entradas y salidas de stock</div></div></div>
      {error && <div className="alert error" style={{ whiteSpace: 'pre-line' }}>{error}</div>}
      {ok && <div className="alert ok">{ok}</div>}
      <form className="form-inline" onSubmit={submit}>
        <select value={form.product_id} onChange={e => setForm({ ...form, product_id: e.target.value })} required>
          <option value="">Producto…</option>
          {products.map(p => <option key={p.id} value={p.id}>{p.name} ({Number(p.stock_current).toFixed(2)} {p.unit})</option>)}
        </select>
        <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
          <option value="entrada">Entrada</option><option value="salida">Salida</option>
        </select>
        <input type="number" step="0.01" min="0.01" value={form.quantity} onChange={e => setForm({ ...form, quantity: +e.target.value })} />
        <select value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}>
          <option value="purchase">Compra</option><option value="kitchen_use">Consumo</option>
          <option value="waste">Merma</option><option value="expired">Caducado</option><option value="adjustment">Ajuste</option>
        </select>
        {form.type === 'entrada' && <>
          <input type="date" value={form.expiration_date} onChange={e => setForm({ ...form, expiration_date: e.target.value })} title="Caducidad" />
          <input placeholder="Lote" value={form.batch_code} onChange={e => setForm({ ...form, batch_code: e.target.value })} />
        </>}
        <input placeholder="Notas" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
        <button type="submit" className="btn-primary">Registrar</button>
      </form>
      {items === null ? <Skeleton lines={5} /> : items.length === 0 ? <Empty icon="🔄" title="Sin movimientos" desc="Registra la primera entrada o salida arriba." /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Fecha</th><th>Producto</th><th>Tipo</th><th>Cantidad</th><th>Motivo</th><th>Usuario</th></tr></thead>
            <tbody>{items.map(m => (
              <tr key={m.id}>
                <td data-label="Fecha">{new Date(m.movement_date).toLocaleString()}</td>
                <td data-label="Producto">{m.product_name}</td>
                <td data-label="Tipo"><span className={`badge ${m.type}`}>{m.type}</span></td>
                <td data-label="Cantidad">{m.quantity}</td>
                <td data-label="Motivo">{m.reason}</td>
                <td data-label="Usuario">{m.user_name}</td>
              </tr>))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------- CADUCIDADES ---------- */
function Expiring() {
  const { api } = useContext(AuthCtx);
  const [items, setItems] = useState(null); const [error, setError] = useState('');
  useEffect(() => { api('/batches/expiring').then(setItems).catch(e => setError(e.message)); }, []);
  return (
    <div>
      <div className="page-header"><div><h2>Caducidades</h2><div className="page-header-sub">Lotes que caducan en los próximos 30 días</div></div></div>
      {error && <div className="alert error">{error}</div>}
      {items === null ? <Skeleton lines={4} /> : items.length === 0 ? <Empty icon="✅" title="Todo en orden" desc="No hay lotes próximos a caducar." /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Producto</th><th>Lote</th><th>Cantidad</th><th>Caducidad</th><th>Días restantes</th><th>Estado</th></tr></thead>
            <tbody>{items.map(b => (
              <tr key={b.id}>
                <td data-label="Producto">{b.product_name}</td>
                <td data-label="Lote">{b.batch_code || '—'}</td>
                <td data-label="Cantidad">{Number(b.quantity_remaining).toFixed(2)} {b.unit}</td>
                <td data-label="Caducidad">{b.expiration_date}</td>
                <td data-label="Días restantes">{b.days_left < 0 ? `Caducado hace ${Math.abs(b.days_left)} días` : b.days_left}</td>
                <td data-label="Estado"><span className={`traffic ${b.level}`}>{b.level === 'expired' ? 'Caducado' : b.level === 'danger' ? 'Crítico' : b.level === 'warn' ? 'Próximo' : 'OK'}</span></td>
              </tr>))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------- PROVEEDORES ---------- */
function Suppliers() {
  const { api } = useContext(AuthCtx);
  const [items, setItems] = useState(null); const [error, setError] = useState(''); const [ok, setOk] = useState('');
  const [form, setForm] = useState({ company_name: '', contact_name: '', phone: '', email: '', payment_terms: '' });
  const load = () => api('/suppliers').then(setItems).catch(e => setError(e.message));
  useEffect(() => { load(); }, []);
  const submit = async (e) => {
    e.preventDefault(); setError(''); setOk('');
    try { await api('/suppliers', { method: 'POST', body: JSON.stringify(form) }); setOk('Proveedor creado'); setForm({ company_name: '', contact_name: '', phone: '', email: '', payment_terms: '' }); load(); }
    catch (err) { setError(err.message); }
  };
  return (
    <div>
      <div className="page-header"><div><h2>Proveedores</h2><div className="page-header-sub">Directorio comercial</div></div></div>
      {error && <div className="alert error">{error}</div>}
      {ok && <div className="alert ok">{ok}</div>}
      <form className="form-inline" onSubmit={submit}>
        <input placeholder="Empresa" value={form.company_name} onChange={e => setForm({ ...form, company_name: e.target.value })} required />
        <input placeholder="Contacto" value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} />
        <input placeholder="Teléfono" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
        <input placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        <input placeholder="Condiciones" value={form.payment_terms} onChange={e => setForm({ ...form, payment_terms: e.target.value })} />
        <button type="submit" className="btn-primary">Añadir</button>
      </form>
      {items === null ? <Skeleton lines={3} /> : items.length === 0 ? <Empty icon="🚚" title="Sin proveedores" desc="Añade tu primer proveedor." /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Empresa</th><th>Contacto</th><th>Teléfono</th><th>Email</th><th>Condiciones</th></tr></thead>
            <tbody>{items.map(s => (
              <tr key={s.id}>
                <td data-label="Empresa">{s.company_name}</td>
                <td data-label="Contacto">{s.contact_name}</td>
                <td data-label="Teléfono">{s.phone}</td>
                <td data-label="Email">{s.email}</td>
                <td data-label="Condiciones">{s.payment_terms}</td>
              </tr>))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------- COMPRAS ---------- */
function Purchases() {
  const { api } = useContext(AuthCtx);
  const [items, setItems] = useState(null); const [suppliers, setSuppliers] = useState([]);
  const [products, setProducts] = useState([]); const [suggestions, setSuggestions] = useState([]);
  const [error, setError] = useState(''); const [ok, setOk] = useState('');
  const [form, setForm] = useState({ supplier_id: '', expected_date: '', notes: '' });
  const [lines, setLines] = useState([{ product_id: '', quantity: 1, unit_price: 0 }]);
  const [receiving, setReceiving] = useState(null); const [recvLines, setRecvLines] = useState([]);
  const load = () => Promise.all([api('/purchases'), api('/suppliers'), api('/products'), api('/purchases/suggestions')])
    .then(([p, s, pr, sg]) => { setItems(p); setSuppliers(s); setProducts(pr); setSuggestions(sg); })
    .catch(e => setError(e.message));
  useEffect(() => { load(); }, []);
  const addLine = () => setLines([...lines, { product_id: '', quantity: 1, unit_price: 0 }]);
  const updLine = (i, k, v) => { const l = [...lines]; l[i][k] = v; setLines(l); };
  const submit = async (e) => {
    e.preventDefault(); setError(''); setOk('');
    try {
      const body = { supplier_id: +form.supplier_id, expected_date: form.expected_date || null, notes: form.notes,
        items: lines.map(l => ({ product_id: +l.product_id, quantity: +l.quantity, unit_price: +l.unit_price })) };
      await api('/purchases', { method: 'POST', body: JSON.stringify(body) });
      setOk('Pedido creado'); setLines([{ product_id: '', quantity: 1, unit_price: 0 }]); setForm({ supplier_id: '', expected_date: '', notes: '' }); load();
    } catch (err) { setError(err.message); }
  };
  const createFromSuggestions = async () => {
    if (suggestions.length === 0) return;
    setError(''); setOk('');
    try {
      const bySupplier = {};
      for (const s of suggestions) {
        if (!s.supplier_id) continue;
        if (!bySupplier[s.supplier_id]) bySupplier[s.supplier_id] = [];
        bySupplier[s.supplier_id].push(s);
      }
      let created = 0;
      for (const [supplierId, list] of Object.entries(bySupplier)) {
        const body = { supplier_id: Number(supplierId), expected_date: null, notes: 'Pedido automático por stock bajo',
          items: list.map(s => ({ product_id: s.id, quantity: Number(s.suggested_qty), unit_price: Number(s.purchase_price) })) };
        await api('/purchases', { method: 'POST', body: JSON.stringify(body) });
        created++;
      }
      setOk(`${created} pedido(s) creado(s)`); load();
    } catch (err) { setError(err.message); }
  };
  const openReceive = async (po) => {
    setError(''); setOk('');
    try {
      const full = await api(`/purchases/${po.id}`);
      setReceiving(full);
      setRecvLines(full.items.map(it => ({ item_id: it.id, product_name: it.product_name, quantity: Number(it.quantity) - Number(it.received_quantity), unit_price: it.unit_price, expiration_date: '', batch_code: '' })));
    } catch (err) { setError(err.message); }
  };
  const updRecv = (i, k, v) => { const l = [...recvLines]; l[i][k] = v; setRecvLines(l); };
  const confirmReceive = async (e) => {
    e.preventDefault(); setError(''); setOk('');
    try {
      const body = { items: recvLines.filter(l => Number(l.quantity) > 0).map(l => ({ item_id: l.item_id, quantity: +l.quantity, expiration_date: l.expiration_date || null, batch_code: l.batch_code || null })) };
      await api(`/purchases/${receiving.id}/receive`, { method: 'POST', body: JSON.stringify(body) });
      setOk('Recepción registrada'); setReceiving(null); setRecvLines([]); load();
    } catch (err) { setError(err.message); }
  };
  return (
    <div>
      <div className="page-header"><div><h2>Compras</h2><div className="page-header-sub">Pedidos a proveedores</div></div></div>
      {error && <div className="alert error">{error}</div>}
      {ok && <div className="alert ok">{ok}</div>}
      {suggestions.length > 0 && (
        <div className="suggestions">
          <div className="suggestions-header">
            <strong>💡 Sugerencias de compra ({suggestions.length})</strong>
            <button className="btn-primary" onClick={createFromSuggestions}>Crear pedidos desde sugerencias</button>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Producto</th><th>Stock actual</th><th>Mínimo</th><th>Sugerida</th><th>Proveedor</th></tr></thead>
              <tbody>{suggestions.map(s => (
                <tr key={s.id}>
                  <td data-label="Producto">{s.name}</td>
                  <td data-label="Stock actual">{Number(s.stock_current).toFixed(2)} {s.unit}</td>
                  <td data-label="Mínimo">{Number(s.stock_min).toFixed(2)}</td>
                  <td data-label="Sugerida">{Number(s.suggested_qty).toFixed(2)}</td>
                  <td data-label="Proveedor">{s.supplier_name || '—'}</td>
                </tr>))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <form className="form-inline" onSubmit={submit}>
        <select value={form.supplier_id} onChange={e => setForm({ ...form, supplier_id: e.target.value })} required>
          <option value="">Proveedor…</option>
          {suppliers.map(s => <option key={s.id} value={s.id}>{s.company_name}</option>)}
        </select>
        <input type="date" value={form.expected_date} onChange={e => setForm({ ...form, expected_date: e.target.value })} title="Fecha esperada" />
        {lines.map((l, i) => (
          <span key={i} style={{ display: 'flex', gap: 4 }}>
            <select value={l.product_id} onChange={e => updLine(i, 'product_id', e.target.value)} required>
              <option value="">Producto…</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input type="number" step="0.01" min="0.01" value={l.quantity} onChange={e => updLine(i, 'quantity', +e.target.value)} />
            <input type="number" step="0.01" min="0" value={l.unit_price} onChange={e => updLine(i, 'unit_price', +e.target.value)} />
          </span>
        ))}
        <button type="button" className="btn-secondary" onClick={addLine}>+ Línea</button>
        <button type="submit" className="btn-primary">Crear pedido</button>
      </form>
      {items === null ? <Skeleton lines={4} /> : items.length === 0 ? <Empty icon="🛒" title="Sin pedidos" desc="Crea tu primer pedido de compra." /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>ID</th><th>Proveedor</th><th>Estado</th><th>Total</th><th>Fecha</th><th></th></tr></thead>
            <tbody>{items.map(p => (
              <tr key={p.id}>
                <td data-label="ID">#{p.id}</td>
                <td data-label="Proveedor">{p.supplier_name}</td>
                <td data-label="Estado"><span className={`badge ${p.status}`}>{p.status}</span></td>
                <td data-label="Total">€{Number(p.total_amount).toFixed(2)}</td>
                <td data-label="Fecha">{p.order_date}</td>
                <td>{p.status !== 'received' && <button className="btn-edit" onClick={() => openReceive(p)}>Recibir</button>}</td>
              </tr>))}
            </tbody>
          </table>
        </div>
      )}
      {receiving && (
        <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) { setReceiving(null); setRecvLines([]); } }}>
          <form className="modal" onSubmit={confirmReceive}>
            <h3>Recibir pedido #{receiving.id}</h3>
            {recvLines.map((l, i) => (
              <div key={l.item_id} className="recv-line">
                <strong>{l.product_name}</strong>
                <label>Cantidad<input type="number" step="0.01" min="0" value={l.quantity} onChange={e => updRecv(i, 'quantity', +e.target.value)} /></label>
                <label>Caducidad<input type="date" value={l.expiration_date} onChange={e => updRecv(i, 'expiration_date', e.target.value)} /></label>
                <label>Lote<input value={l.batch_code} onChange={e => updRecv(i, 'batch_code', e.target.value)} /></label>
              </div>
            ))}
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button type="submit" className="btn-primary">Confirmar recepción</button>
              <button type="button" className="btn-secondary" onClick={() => { setReceiving(null); setRecvLines([]); }}>Cancelar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

/* ---------- RECETAS ---------- */
function Recipes() {
  const { api } = useContext(AuthCtx);
  const [items, setItems] = useState(null); const [products, setProducts] = useState([]);
  const [error, setError] = useState(''); const [ok, setOk] = useState('');
  const [form, setForm] = useState({ name: '', selling_price: 0, ingredients: [{ product_id: '', quantity: 0, unit: 'kg' }] });
  const load = () => Promise.all([api('/recipes'), api('/products')]).then(([r, p]) => { setItems(r); setProducts(p); }).catch(e => setError(e.message));
  useEffect(() => { load(); }, []);
  const addIng = () => setForm({ ...form, ingredients: [...form.ingredients, { product_id: '', quantity: 0, unit: 'kg' }] });
  const updIng = (i, k, v) => { const ing = [...form.ingredients]; ing[i][k] = v; setForm({ ...form, ingredients: ing }); };
  const submit = async (e) => {
    e.preventDefault(); setError(''); setOk('');
    try {
      const body = { name: form.name, selling_price: +form.selling_price,
        ingredients: form.ingredients.map(i => ({ ...i, product_id: +i.product_id, quantity: +i.quantity })) };
      await api('/recipes', { method: 'POST', body: JSON.stringify(body) });
      setOk('Receta creada'); setForm({ name: '', selling_price: 0, ingredients: [{ product_id: '', quantity: 0, unit: 'kg' }] }); load();
    } catch (err) { setError(err.message); }
  };
  return (
    <div>
      <div className="page-header"><div><h2>Recetas</h2><div className="page-header-sub">Costes y márgenes</div></div></div>
      {error && <div className="alert error">{error}</div>}
      {ok && <div className="alert ok">{ok}</div>}
      <form className="form-inline" onSubmit={submit}>
        <input placeholder="Nombre plato" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
        <input type="number" step="0.01" placeholder="Precio venta" value={form.selling_price} onChange={e => setForm({ ...form, selling_price: +e.target.value })} />
        {form.ingredients.map((ing, i) => (
          <span key={i} style={{ display: 'flex', gap: 4 }}>
            <select value={ing.product_id} onChange={e => updIng(i, 'product_id', e.target.value)} required>
              <option value="">Ingrediente…</option>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input type="number" step="0.01" min="0.01" value={ing.quantity} onChange={e => updIng(i, 'quantity', +e.target.value)} />
            <select value={ing.unit} onChange={e => updIng(i, 'unit', e.target.value)}>
              <option>kg</option><option>g</option><option>L</option><option>ml</option><option>ud</option>
            </select>
          </span>
        ))}
        <button type="button" className="btn-secondary" onClick={addIng}>+ Ingrediente</button>
        <button type="submit" className="btn-primary">Crear receta</button>
      </form>
      {items === null ? <Skeleton lines={3} /> : items.length === 0 ? <Empty icon="🍳" title="Sin recetas" desc="Crea tu primera receta." /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Plato</th><th>Ingredientes</th><th>Coste</th><th>Precio</th><th>Margen</th></tr></thead>
            <tbody>{items.map(r => (
              <tr key={r.id}>
                <td data-label="Plato">{r.name}</td>
                <td data-label="Ingredientes" className="wrap">{r.ingredients.map(i => `${i.product_name} (${i.quantity} ${i.unit})`).join(', ')}</td>
                <td data-label="Coste">€{r.cost.toFixed(2)}</td>
                <td data-label="Precio">€{Number(r.selling_price).toFixed(2)}</td>
                <td data-label="Margen" className={r.margin > 50 ? 'text-green' : 'text-orange'}>{r.margin.toFixed(1)}%</td>
              </tr>))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------- VENTAS ---------- */
function Sales() {
  const { api } = useContext(AuthCtx);
  const [recipes, setRecipes] = useState([]); const [sales, setSales] = useState(null);
  const [error, setError] = useState(''); const [ok, setOk] = useState('');
  const [form, setForm] = useState({ recipe_id: '', quantity: 1 });
  const load = () => Promise.all([api('/recipes'), api('/sales')]).then(([r, s]) => { setRecipes(r); setSales(s); }).catch(e => setError(e.message));
  useEffect(() => { load(); }, []);
  const submit = async (e) => {
    e.preventDefault(); setError(''); setOk('');
    try {
      await api('/sales', { method: 'POST', body: JSON.stringify({ recipe_id: +form.recipe_id, quantity: +form.quantity }) });
      setOk('Venta registrada'); load();
    } catch (err) { setError(err.message); }
  };
  return (
    <div>
      <div className="page-header"><div><h2>Ventas</h2><div className="page-header-sub">Registro de ventas</div></div></div>
      {error && <div className="alert error" style={{ whiteSpace: 'pre-line' }}>{error}</div>}
      {ok && <div className="alert ok">{ok}</div>}
      <form className="form-inline" onSubmit={submit}>
        <select value={form.recipe_id} onChange={e => setForm({ ...form, recipe_id: e.target.value })} required>
          <option value="">Plato…</option>
          {recipes.map(r => <option key={r.id} value={r.id}>{r.name} (€{r.selling_price})</option>)}
        </select>
        <input type="number" min="1" value={form.quantity} onChange={e => setForm({ ...form, quantity: +e.target.value })} />
        <button type="submit" className="btn-primary">Registrar venta</button>
      </form>
      {sales === null ? <Skeleton lines={4} /> : sales.length === 0 ? <Empty icon="💰" title="Sin ventas" desc="Registra la primera venta." /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Fecha</th><th>Plato</th><th>Cantidad</th><th>Total</th></tr></thead>
            <tbody>{sales.map(s => (
              <tr key={s.id}>
                <td data-label="Fecha">{new Date(s.sale_date).toLocaleString()}</td>
                <td data-label="Plato">{s.recipe_name}</td>
                <td data-label="Cantidad">{s.quantity}</td>
                <td data-label="Total">€{Number(s.total).toFixed(2)}</td>
              </tr>))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------- AUDITORÍA ---------- */
function Audit() {
  const { api } = useContext(AuthCtx);
  const [items, setItems] = useState(null); const [error, setError] = useState('');
  useEffect(() => { api('/audit-logs').then(setItems).catch(e => setError(e.message)); }, []);
  return (
    <div>
      <div className="page-header"><div><h2>Auditoría</h2><div className="page-header-sub">Registro de actividad</div></div></div>
      {error && <div className="alert error">{error}</div>}
      {items === null ? <Skeleton lines={6} /> : items.length === 0 ? <Empty icon="📝" title="Sin actividad" desc="Las acciones aparecerán aquí." /> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Entidad</th><th>ID</th><th>Detalles</th></tr></thead>
            <tbody>{items.map(a => (
              <tr key={a.id}>
                <td data-label="Fecha">{new Date(a.created_at).toLocaleString()}</td>
                <td data-label="Usuario">{a.user_name || '—'}</td>
                <td data-label="Acción">{a.action}</td>
                <td data-label="Entidad">{a.entity}</td>
                <td data-label="ID">{a.entity_id}</td>
                <td data-label="Detalles" className="wrap"><code>{JSON.stringify(a.metadata)}</code></td>
              </tr>))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------- INFORMES ---------- */
function exportCSV(filename, rows, headers) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [headers.map(esc).join(','), ...rows.map(r => headers.map(h => esc(r[h])).join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename; a.click(); URL.revokeObjectURL(a.href);
}
function Reports() {
  const { api } = useContext(AuthCtx);
  const [top, setTop] = useState([]); const [waste, setWaste] = useState([]);
  const [salesSum, setSalesSum] = useState([]); const [error, setError] = useState('');
  useEffect(() => {
    Promise.all([api('/reports/top-consumed'), api('/reports/waste'), api('/reports/sales-summary')])
      .then(([t, w, s]) => { setTop(t); setWaste(w); setSalesSum(s); }).catch(e => setError(e.message));
  }, []);
  return (
    <div>
      <div className="page-header"><div><h2>Informes</h2><div className="page-header-sub">Análisis de rendimiento</div></div></div>
      {error && <div className="alert error">{error}</div>}
      <h3 style={{ margin: '16px 0 12px' }}>Top consumidos <button className="btn-edit" style={{ marginLeft: 8 }} onClick={() => exportCSV('top-consumidos.csv', top, ['name','total'])}>Exportar CSV</button></h3>
      <div className="table-wrap"><table className="table"><thead><tr><th>Producto</th><th>Cantidad</th></tr></thead>
        <tbody>{top.map((t, i) => <tr key={i}><td data-label="Producto">{t.name}</td><td data-label="Cantidad">{Number(t.total).toFixed(2)}</td></tr>)}</tbody>
      </table></div>
      <h3 style={{ margin: '24px 0 12px' }}>Desperdicio <button className="btn-edit" style={{ marginLeft: 8 }} onClick={() => exportCSV('desperdicio.csv', waste, ['name','reason','total','value'])}>Exportar CSV</button></h3>
      <div className="table-wrap"><table className="table"><thead><tr><th>Producto</th><th>Motivo</th><th>Cantidad</th><th>Valor</th></tr></thead>
        <tbody>{waste.map((w, i) => <tr key={i}><td data-label="Producto">{w.name}</td><td data-label="Motivo">{w.reason}</td><td data-label="Cantidad">{Number(w.total).toFixed(2)}</td><td data-label="Valor">€{Number(w.value).toFixed(2)}</td></tr>)}</tbody>
      </table></div>
      <h3 style={{ margin: '24px 0 12px' }}>Ventas últimos 30 días <button className="btn-edit" style={{ marginLeft: 8 }} onClick={() => exportCSV('ventas-30d.csv', salesSum, ['day','count','total'])}>Exportar CSV</button></h3>
      <div className="table-wrap"><table className="table"><thead><tr><th>Día</th><th>Nº ventas</th><th>Total</th></tr></thead>
        <tbody>{salesSum.map((s, i) => <tr key={i}><td data-label="Día">{new Date(s.day).toLocaleDateString()}</td><td data-label="Nº ventas">{s.count}</td><td data-label="Total">€{Number(s.total).toFixed(2)}</td></tr>)}</tbody>
      </table></div>
    </div>
  );
}

/* ---------- LAYOUT ---------- */
const ALL_PAGES = {
  dashboard: { label: 'Dashboard', icon: '📊', comp: Dashboard, roles: ['admin','manager','warehouse','kitchen'] },
  adminPanel: { label: 'Panel admin', icon: '🛡️', comp: AdminPanel, roles: ['superadmin'] },
  users: { label: 'Usuarios', icon: '👥', comp: Users, roles: ['admin','manager','superadmin'] },
  restaurants: { label: 'Empresas', icon: '🏢', comp: Restaurants, roles: ['superadmin'] },
  products: { label: 'Productos', icon: '📦', comp: Products, roles: ['admin','manager','warehouse'] },
  movements: { label: 'Movimientos', icon: '🔄', comp: Movements, roles: ['admin','manager','warehouse','kitchen'] },
  expiring: { label: 'Caducidades', icon: '⏰', comp: Expiring, roles: ['admin','manager','warehouse','kitchen'] },
  suppliers: { label: 'Proveedores', icon: '🚚', comp: Suppliers, roles: ['admin','manager'] },
  purchases: { label: 'Compras', icon: '🛒', comp: Purchases, roles: ['admin','manager','warehouse'] },
  recipes: { label: 'Recetas', icon: '🍳', comp: Recipes, roles: ['admin','manager'] },
  sales: { label: 'Ventas', icon: '💰', comp: Sales, roles: ['admin','manager','kitchen'] },
  audit: { label: 'Auditoría', icon: '📝', comp: Audit, roles: ['admin','manager'] },
  reports: { label: 'Informes', icon: '📈', comp: Reports, roles: ['admin','manager'] },
};

function Layout({ onLogout }) {
  const { user } = useContext(AuthCtx);
  const [page, setPage] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Atajo Ctrl+K para buscar
  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setSearchQuery('');
        setNotifOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const allowed = Object.entries(ALL_PAGES).filter(([, cfg]) => cfg.roles.includes(user.role));
  if (!allowed.find(([k]) => k === page)) {
    const first = allowed[0]?.[0] || 'dashboard';
    if (first !== page) setPage(first);
  }
  const Comp = ALL_PAGES[page]?.comp || Dashboard;
  const initials = (user.name || 'U').split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase();

  const goTo = (k) => { setPage(k); setSidebarOpen(false); };

  const searchResults = searchQuery.trim()
    ? allowed.filter(([, cfg]) => cfg.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  return (
    <div className="app">
      {sidebarOpen && <div className="overlay show" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">📦</div>
          <span>StockFlow</span>
        </div>
        <nav>
          {allowed.map(([k, { label, icon }]) => (
            <button key={k} className={page === k ? 'active' : ''} onClick={() => goTo(k)}>
              <span className="nav-icon">{icon}</span>
              {label}
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="user-box">
            <div className="user-avatar">{initials}</div>
            <div className="user-info">
              <div className="user-info-name">{user.name}</div>
              <div className="user-info-role">{user.role}</div>
            </div>
          </div>
          <button className="btn-logout" onClick={() => setShowLogoutConfirm(true)}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <button className="topbar-menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Menú">☰</button>
          <div className="topbar-search">
            <span className="topbar-search-icon">🔍</span>
            <input
              ref={searchRef}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar en el sistema… (Ctrl+K)"
            />
            {searchResults.length > 0 && (
              <div className="dropdown" style={{ top: 'calc(100% + 8px)', right: 0, left: 0, minWidth: 0 }}>
                {searchResults.map(([k, { label, icon }]) => (
                  <div key={k} className="dropdown-item" style={{ cursor: 'pointer' }} onClick={() => { goTo(k); setSearchQuery(''); }}>
                    <div className="dropdown-item-title">{icon} {label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="topbar-actions">
            <button className="topbar-btn" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} title="Cambiar tema" aria-label="Cambiar tema">
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
            <button className="topbar-btn" onClick={() => setNotifOpen(!notifOpen)} title="Notificaciones" aria-label="Notificaciones">
              🔔<span className="dot" />
            </button>
          </div>
          {notifOpen && (
            <div className="dropdown" onClick={() => setNotifOpen(false)}>
              <div className="dropdown-header">Notificaciones</div>
              <div className="dropdown-item">
                <div className="dropdown-item-title">🔔 Bienvenido</div>
                <div className="dropdown-item-desc">Sistema listo. Las alertas de stock y caducidad aparecerán aquí.</div>
              </div>
            </div>
          )}
        </header>
        <main className="content"><Comp /></main>
      </div>

      {showLogoutConfirm && (
        <div className="modal-backdrop" onClick={(e) => {
          if (e.target === e.currentTarget) setShowLogoutConfirm(false);
        }}>
          <div className="modal" style={{ maxWidth: 400, textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>👋</div>
            <h3>¿Cerrar sesión?</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '.9rem', marginBottom: 16 }}>
              Tendrás que volver a introducir tus credenciales para entrar.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button className="btn-secondary" onClick={() => setShowLogoutConfirm(false)}>
                Cancelar
              </button>
              <button className="btn-danger" onClick={() => { setShowLogoutConfirm(false); onLogout(); }}>
                Sí, cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const tokenRef = useRef(null);
  const api = useApi(tokenRef, setSession);

  // SIN refresh automático: cada vez que se entra en la web, se pasa por login.
  // El usuario solo entra al dashboard tras hacer login manualmente.

  const login = (data) => {
    tokenRef.current = data.token;
    setSession({ token: data.token, user: data.user });
  };
  const logout = async () => {
    try { await fetch(`${API}/auth/logout`, { method: 'POST', credentials: 'include' }); } catch {}
    tokenRef.current = null;
    setSession(null);
  };

  const path = window.location.pathname;
  if (path === '/register') return <Register onLogin={login} />;

  if (!session) return <Login onLogin={login} />;
  return (
    <AuthCtx.Provider value={{ token: session.token, user: session.user, api }}>
      <Layout onLogout={logout} />
    </AuthCtx.Provider>
  );
}