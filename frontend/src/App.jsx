import { useState, useEffect, useCallback } from "react";
import { ArrowRight, ClipboardList, Factory, FlaskConical, Home, LogOut, MessageSquare, Package, ShieldCheck, Truck, UserPlus } from "lucide-react";
import "./styles/workflow.css";
import StoreGRNs from "./pages/StoreGRNs.jsx";
import QualityInspections from "./pages/QualityInspections.jsx";
import ProductionFlow from "./pages/ProductionFlow.jsx";
import Messages from "./pages/Messages.jsx";
import { useAuth } from "./context/AuthContext.jsx";
import messagesApi from "./services/messagesApi.js";
import api from "./services/api.js";

const roles = ["Administrator", "Manager", "Production In-charge", "Store In-charge", "Operator", "Quality In-charge"];

/** Map backend role strings to the section each role lands on after login. */
function defaultSection(role) {
  if (role === "Store-Incharge") return "store-grns";
  if (role === "Quality-Incharge") return "quality-inspections";
  if (role === "Production-Incharge") return "production";
  if (role === "Administrator") return "store-grns"; // Admin sees all except inventory flow
  if (role === "Manager") return "store-grns"; // Manager has full access, start with store
  return "store-grns"; // Safe default for any other role
}

/** Factory workflow with real JWT auth via the backend. */
export default function App() {
  const { user, loading, authError, setAuthError, login, register, logout } = useAuth();
  const [loginLoading, setLoginLoading] = useState(false);
  const [mode, setMode] = useState("signin"); // "signin" | "register"
  const [registerSuccess, setRegisterSuccess] = useState("");
  const [backendHealth, setBackendHealth] = useState({ status: "checking", database: "unknown" });
  const [section, setSection] = useState("store-grns");
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Set correct section when user session is restored from localStorage
  useEffect(() => {
    if (user && !loading) {
      setSection(defaultSection(user.role));
    }
  }, [user, loading]);

  // Health check effect - runs every 30 seconds
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || '/api'}/health`);
        if (response.ok) {
          const data = await response.json();
          setBackendHealth({
            status: data.data?.database === 'connected' ? 'connected' : 'degraded',
            database: data.data?.database || 'unknown'
          });
        } else {
          setBackendHealth({ status: 'error', database: 'disconnected' });
        }
      } catch (error) {
        setBackendHealth({ status: 'error', database: 'disconnected' });
      }
    };

    // Check immediately on mount
    checkHealth();

    // Then check every 30 seconds
    const interval = setInterval(checkHealth, 30000);

    return () => clearInterval(interval);
  }, []);

  // Poll unread message count every 60 seconds while logged in
  useEffect(() => {
    if (!user) return;

    const fetchUnread = () => {
      messagesApi.getUnreadCount()
        .then((data) => setUnreadMessages(data?.count ?? 0))
        .catch(() => {});
    };

    fetchUnread();
    const interval = setInterval(fetchUnread, 60000);
    return () => clearInterval(interval);
  }, [user]);
  /** Sign in using the real backend JWT endpoint. */
  const signIn = async (event) => {
    event.preventDefault();
    setAuthError(null);
    const data = new FormData(event.currentTarget);
    const email = data.get("email")?.trim();
    const password = data.get("password");
    if (!email || !password) return;
    setLoginLoading(true);
    try {
      const backendUser = await login(email, password);
      setSection(defaultSection(backendUser.role));
    } catch {
      // authError is already set by AuthContext
    } finally {
      setLoginLoading(false);
    }
  };

  /** Register a new account then auto-switch to the sign-in form. */
  const signUp = async (event) => {
    event.preventDefault();
    setAuthError(null);
    setRegisterSuccess("");
    const data = new FormData(event.currentTarget);
    const name = data.get("name")?.trim();
    const email = data.get("email")?.trim();
    const password = data.get("password");
    const confirm = data.get("confirm");
    const role = data.get("role");

    if (password !== confirm) {
      setAuthError("Passwords do not match.");
      return;
    }
    if (password.length < 6) {
      setAuthError("Password must be at least 6 characters.");
      return;
    }

    setLoginLoading(true);
    try {
      await register({ name, email, password, role });
      setRegisterSuccess("Account created! You can now sign in.");
      setMode("signin");
    } catch {
      // authError is already set by AuthContext
    } finally {
      setLoginLoading(false);
    }
  };

  // Show a blank screen while restoring the stored session.
  if (loading) return null;

  if (!user) return <main className="login-screen">
    <section className="login-story" aria-label="Factory workflow preview">
      <div className="login-story-top">
        <span className="login-story-mark"><Factory size={17} /> AROMA <i /> FACTORY WORKSPACE</span>
      </div>
      <div className="login-story-copy">
        <p className="eyebrow">BUILT AROUND YOUR BATCHES</p>
        <h2>From arrival<br />to <em>approved.</em></h2>
        <p>A clear, considered flow for receiving materials, checking quality, and keeping production moving.</p>
      </div>
      <div className="login-flow" aria-label="Receive, inspect, and store materials">
        <div className="login-flow-connector"><span /></div>
        <div className="login-flow-step"><span className="login-flow-icon"><Truck size={20} /></span><small>01 / RECEIVE</small><b>Materials arrive</b></div>
        <div className="login-flow-step"><span className="login-flow-icon"><FlaskConical size={20} /></span><small>02 / INSPECT</small><b>Quality is checked</b></div>
        <div className="login-flow-step"><span className="login-flow-icon"><Package size={20} /></span><small>03 / STORE</small><b>Stock is ready</b></div>
      </div>
      <div className="login-story-footer"><span>RECEIVE <i>·</i> INSPECT <i>·</i> STORE</span><span>PLANT 01</span></div>
    </section>
    {mode === "signin" ? (
      <form className="login-card" onSubmit={signIn} key="signin">
        <Brand />
        <div className="login-card-heading">
          <h1>Welcome to Aroma</h1>
        </div>
        {registerSuccess && <p className="login-success" role="status">{registerSuccess}</p>}
        <label>Email address<input name="email" type="email" placeholder="you@aromaherbal.com" required autoComplete="email" /></label>
        <label>Password<input name="password" type="password" placeholder="Your password" required autoComplete="current-password" /></label>
        {authError && <p className="login-error" role="alert">{authError}</p>}
        <button className="primary full" disabled={loginLoading}>{loginLoading ? "Signing in…" : <>Sign in <ArrowRight size={18} /></>}</button>
        <div className="login-divider"><span>or</span></div>
        <button type="button" className="login-create-btn" onClick={() => { setAuthError(null); setRegisterSuccess(""); setMode("register"); }}><UserPlus size={18} /> Create account</button>
        <p className="login-toggle">New here? Create an account to get started.</p>
      </form>
    ) : (
      <form className="login-card" onSubmit={signUp} key="register">
        <Brand />
        <div className="login-card-heading">
          <p className="eyebrow">FACTORY WORKSPACE</p>
          <h1>Create account</h1>
          <p className="muted">Fill in your details to request access.</p>
        </div>
        <label>Full name<input name="name" type="text" placeholder="e.g. Nisha Kulkarni" required autoComplete="name" /></label>
        <label>Email address<input name="email" type="email" placeholder="you@aromaherbal.com" required autoComplete="email" /></label>
        <label>Role
          <select name="role" required>
            <option value="">Select your role</option>
            <option value="Administrator">Administrator</option>
            <option value="Manager">Manager</option>
            <option value="Production-Incharge">Production In-charge</option>
            <option value="Store-Incharge">Store In-charge</option>
            <option value="Quality-Incharge">Quality In-charge</option>
          </select>
        </label>
        <label>Password<input name="password" type="password" placeholder="Minimum 12 characters" required autoComplete="new-password" minLength={12} /></label>
        <label>Confirm password<input name="confirm" type="password" placeholder="Repeat your password" required autoComplete="new-password" /></label>
        {authError && <p className="login-error" role="alert">{authError}</p>}
        <button className="primary full" disabled={loginLoading}>{loginLoading ? "Creating account…" : <>Create account <ArrowRight size={18} /></>}</button>
        <div className="login-toggle">
          Already have an account?{" "}
          <button type="button" className="login-toggle-btn" onClick={() => { setAuthError(null); setMode("signin"); }}>Sign in</button>
        </div>
      </form>
    )}
  </main>;

  const navigation = [
    { id: "store-grns", label: "Store GRNs", icon: Truck },
    { id: "quality-inspections", label: "Quality inspections", icon: FlaskConical },
    { id: "production", label: "Production flow", icon: Factory },
    { id: "reports", label: "Inventory reports", icon: ClipboardList },
    { id: "access", label: "Roles & access", icon: ShieldCheck },
    { id: "messages", label: "Messages", icon: MessageSquare },
  ].filter((item) => {
    // Store-Incharge: limited to store and reports
    if (user.role === "Store-Incharge") return ["store-grns", "reports", "messages"].includes(item.id);
    // Quality-Incharge: limited to quality inspections and reports only
    if (user.role === "Quality-Incharge") return ["quality-inspections", "reports", "messages"].includes(item.id);
    // Production-Incharge: limited to production and reports only
    if (user.role === "Production-Incharge") return ["production", "reports", "messages"].includes(item.id);
    // Administrator: access to all sections
    if (user.role === "Administrator") return true;
    // Manager: full access to all sections
    if (user.role === "Manager") return true;
    // Other roles: default access
    return !["store-grns", "quality-inspections"].includes(item.id);
  });
  const goSection = (id) => { setSection(id); };

  return <div className="app-shell"><aside className="sidebar"><Brand /><p className="nav-caption">WORKSPACE</p>{navigation.map(({ id, label, icon: Icon }) => (
    <button key={id} className={`nav-item ${section === id ? "selected" : ""}`} onClick={() => goSection(id)} style={{ position: "relative" }}>
      <Icon size={19} />{label}
      {id === "messages" && unreadMessages > 0 && (
        <span style={{
          position: "absolute",
          top: 10,
          right: 12,
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: "#c0392b",
          border: "2px solid #fff",
          display: "block",
        }} aria-label={`${unreadMessages} unread messages`} />
      )}
    </button>
  ))}<div className="side-note"><span className={`live-dot ${backendHealth.status === 'connected' ? 'connected' : backendHealth.status === 'checking' ? 'checking' : 'disconnected'}`} />{backendHealth.status === 'connected' ? 'Connected' : backendHealth.status === 'checking' ? 'Connecting...' : 'Disconnected'} <small>JWT · {backendHealth.database === 'connected' ? 'MongoDB online' : backendHealth.database === 'unknown' ? 'DB checking...' : 'MongoDB offline'}</small></div><button className="user-card" onClick={logout}><span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span><span><b>{user.name}</b><small>{user.role}</small></span><LogOut size={17} /></button></aside>
    <main className="main-area"><header className="topbar"><div><span className="breadcrumb">Aroma workspace / {navigation.find((item) => item.id === section)?.label}</span><h1>{section === "store-grns" ? "Store · Goods Receipt Notes" : section === "quality-inspections" ? "Quality · Material inspections" : section === "production" ? "Production management" : section === "reports" ? "Inventory reports" : section === "messages" ? "Messages" : "Roles & access"}</h1></div><span className="role-pill">{user.role}</span></header>
      {section === "store-grns" && <StoreGRNs user={user} />}
      {section === "quality-inspections" && <QualityInspections user={user} />}
      {section === "production" && <ProductionFlow user={user} />}
      {section === "reports" && <Reports />}
      {section === "access" && <Access />}
      {section === "messages" && <Messages user={user} onUnreadChange={setUnreadMessages} />}
    </main></div>;
}

function Brand() { return <div className="brand"><div className="login-logo"><img src="/aroma-logo.png" alt="Aroma logo" /></div><span><small>Simple steps. Better batches.</small></span></div>; }

function Reports() {
  const [stockBalances, setStockBalances] = useState([]);
  const [stockTransactions, setStockTransactions] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [finishedGoods, setFinishedGoods] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.allSettled([
      api.get("/inventory/stock-balances?limit=500").then(r => setStockBalances(r.items || [])),
      api.get("/inventory/stock-transactions?limit=500").then(r => setStockTransactions(r.items || [])),
      api.get("/inventory/purchase-orders?limit=200").then(r => setPurchaseOrders(r.items || [])),
      api.get("/finished-goods?status=Available").then(r => setFinishedGoods(Array.isArray(r) ? r : [])),
    ]).finally(() => setLoading(false));
  }, []);

  const totalStock = stockBalances.reduce((s, b) => s + (b.usableStock || 0), 0);
  const stockIn = stockTransactions.filter(t => ["QC_ACCEPTANCE", "MANUAL_RECEIPT"].includes(t.transactionType));
  const stockOut = stockTransactions.filter(t => ["PRODUCTION_ISSUE", "MANUAL_ISSUE"].includes(t.transactionType));
  const totalStockIn = stockIn.reduce((s, t) => s + (t.quantity || 0), 0);
  const totalStockOut = stockOut.reduce((s, t) => s + (t.quantity || 0), 0);
  const lowStockItems = stockBalances.filter(b => b.lowStock && b.usableStock >= 0);

  const rawMaterials = stockBalances.filter(b => b.category === "Raw Material" && b.usableStock > 0);
  const packagingMaterials = stockBalances.filter(b => b.category === "Packaging Material" && b.usableStock > 0);

  if (loading) return <section className="panel"><p className="muted" style={{ padding: 24, textAlign: "center" }}>Loading inventory reports…</p></section>;

  return <section className="panel"><span className="eyebrow">INVENTORY REPORTS</span><h2>Inventory reports</h2><p className="muted">Live data from the backend — stock balances, transactions, purchase orders, and finished goods.</p>
    <div className="stats-grid">
      <Stat label="Materials in stock" value={stockBalances.filter(b => b.usableStock > 0).length} />
      <Stat label="Total usable units" value={totalStock.toFixed(2)} />
      <Stat label="Stock in (units)" value={totalStockIn.toFixed(2)} />
      <Stat label="Low stock items" value={lowStockItems.length} />
    </div>

    <h3>Inventory by Category</h3>
    <div className="stats-grid">
      <Stat label="Raw Materials" value={`${rawMaterials.length} items · ${rawMaterials.reduce((s, b) => s + b.usableStock, 0).toFixed(2)} units`} />
      <Stat label="Packaging Materials" value={`${packagingMaterials.length} items · ${packagingMaterials.reduce((s, b) => s + b.usableStock, 0).toFixed(2)} units`} />
      <Stat label="Finished Goods Lots" value={`${finishedGoods.length} available lots`} />
    </div>

    <div className="report-grid">
      <div>
        <h3>Raw Material Stock</h3>
        <ReportTable rows={rawMaterials.map(b => ({ id: b.materialCode, material: b.name, category: b.category, quantity: `${b.usableStock} ${b.unit}`, location: b.lowStock ? "⚠ Low stock" : "OK" }))} empty="No raw materials in stock." />
      </div>
      <div>
        <h3>Packaging Material Stock</h3>
        <ReportTable rows={packagingMaterials.map(b => ({ id: b.materialCode, material: b.name, category: b.category, quantity: `${b.usableStock} ${b.unit}`, location: b.lowStock ? "⚠ Low stock" : "OK" }))} empty="No packaging materials in stock." />
      </div>
    </div>

    <h3>Finished Goods</h3>
    <ReportTable rows={finishedGoods.map(fg => ({ id: fg.lotNumber, material: fg.productName, category: fg.productCode || "—", quantity: `${fg.availableQuantity} ${fg.unit}`, location: fg.bmrNumber || "—" }))} empty="No finished goods available yet." />

    <div className="report-grid">
      <div>
        <h3>Low Stock / Reorder List</h3>
        {lowStockItems.length
          ? <ul className="report-list">{lowStockItems.map(b => <li key={b.materialId}><b>{b.name}</b><span>{b.usableStock} {b.unit} · reorder level {b.reorderLevel}</span></li>)}</ul>
          : <p className="empty-state">No product is below its reorder threshold.</p>}
      </div>
      <div>
        <h3>Purchase Orders</h3>
        <ReportTable rows={purchaseOrders.map(po => ({ id: po.poNumber, material: po.supplierName || "—", category: po.status, quantity: `${po.items?.length || 0} items`, location: po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString("en-IN") : "—" }))} empty="No purchase orders." />
      </div>
    </div>

    <h3>Stock Transactions</h3>
    <ReportTable rows={stockTransactions.slice(0, 50).map(t => ({ id: t.transactionNumber || t._id, material: t.materialName || "—", category: t.transactionType, quantity: `${t.quantity} ${t.unit}`, location: t.transactionDate ? new Date(t.transactionDate).toLocaleDateString("en-IN") : "—" }))} empty="No stock transactions yet." />
  </section>;
}
function ReportTable({ rows, empty }) { return rows.length ? <div className="table-wrap"><table><thead><tr><th>Reference</th><th>Material / Supplier</th><th>Type / Category</th><th>Quantity</th><th>Location / Date</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td>{row.id}</td><td>{row.material}</td><td>{row.category}</td><td>{row.quantity}</td><td>{row.location}</td></tr>)}</tbody></table></div> : <p className="empty-state">{empty}</p>; }
function Stat({ label, value }) { return <div className="stat-card"><small>{label}</small><b>{value}</b></div>; }
function Access() { return <section className="panel"><span className="eyebrow">ROLE BASED ACCESS</span><h2>People have the access they need</h2><p className="muted">Example roles and permissions from the factory flow.</p><div className="table-wrap"><table><thead><tr><th>Role</th><th>Dashboard</th><th>Inventory</th><th>Production</th><th>Quality</th><th>Reports</th><th>Team</th></tr></thead><tbody>{roles.map((role, i) => <tr key={role}><td><b>{role}</b></td>{[true, i !== 4, [0, 1, 2, 4].includes(i), [0, 1, 5].includes(i), i !== 4, i === 0 || i === 1].map((yes, n) => <td key={n}><span className={yes ? "permission yes" : "permission no"}>{yes ? "✓" : "—"}</span></td>)}</tr>)}</tbody></table></div><div className="info-box"><Home size={18} /> Demo access matrix · Real sign-in and permissions will come from the backend.</div></section>; }
