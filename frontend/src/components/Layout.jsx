import { useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  Bell, ChevronDown, ClipboardCheck, Factory, FlaskConical, LayoutDashboard,
  Menu, Package, Search, Settings2, ShoppingCart, Users, X,
} from "lucide-react";
import { useFactory } from "../context/FactoryContext";

const navigation = [
  { to: "/", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/inventory", label: "Inventory", icon: Package },
  { to: "/purchasing", label: "Purchasing", icon: ShoppingCart },
  { to: "/quality", label: "Quality control", icon: FlaskConical },
  { to: "/production", label: "Production", icon: Factory },
  { to: "/reports", label: "Reports", icon: ClipboardCheck },
  { to: "/team", label: "Team & access", icon: Users },
];

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { data } = useFactory();
  const navigate = useNavigate();
  const location = useLocation();

  // Keep global search scoped to the visible factory records.
  const searchResults = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return [
      ...data.inventory.map((item) => ({ ...item, area: "Inventory", route: "/inventory", title: item.name })),
      ...data.purchaseOrders.map((item) => ({ ...item, area: "Purchasing", route: "/purchasing", title: item.id })),
      ...data.qualityChecks.map((item) => ({ ...item, area: "Quality", route: "/quality", title: item.material })),
      ...data.batches.map((item) => ({ ...item, area: "Production", route: "/production", title: item.product })),
    ].filter((item) => JSON.stringify(item).toLowerCase().includes(term)).slice(0, 6);
  }, [data, query]);

  const openResult = (route) => {
    navigate(route);
    setQuery("");
  };

  return (
    <div className="app-shell">
      {menuOpen && <button className="sidebar-scrim" aria-label="Close navigation" onClick={() => setMenuOpen(false)} />}
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <div className="brand-wrap">
          <NavLink to="/" className="brand-logo" aria-label="Aroma Management overview" onClick={() => setMenuOpen(false)}>
            <img src="/aroma-logo.png" alt="Aroma" />
          </NavLink>
          <button className="icon-button mobile-close" aria-label="Close navigation" onClick={() => setMenuOpen(false)}><X size={19} /></button>
          <div className="brand-caption">MANUFACTURING WORKSPACE</div>
        </div>

        <div className="nav-caption">WORKSPACE</div>
        <nav aria-label="Main navigation">
          {navigation.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} onClick={() => setMenuOpen(false)}>
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
              {label === "Quality control" && data.qualityChecks.some((check) => check.status === "Under test") && <i className="nav-dot" />}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-note">
          <div className="sidebar-note-icon"><Factory size={17} /></div>
          <div><strong>Factory floor</strong><span>All systems operational</span></div>
          <i className="online-dot" />
        </div>
        <div className="sidebar-bottom">
          <div className="workspace-mark">A</div>
          <div><strong>Aroma Herbal</strong><small>Nagpur · Plant 01</small></div>
          <ChevronDown size={15} />
        </div>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMenuOpen(true)}><Menu size={21} /></button>
          <div className="breadcrumbs"><span>Plant 01</span><span className="breadcrumb-slash">/</span><strong>{navigation.find((item) => item.to === location.pathname)?.label || "Overview"}</strong></div>
          <div className="topbar-tools">
            <div className="global-search">
              <Search size={17} />
              <input aria-label="Search factory records" placeholder="Search lot, product, order…" value={query} onChange={(event) => setQuery(event.target.value)} />
              {query && <button className="search-clear" aria-label="Clear search" onClick={() => setQuery("")}><X size={14} /></button>}
              {query && <div className="search-results">{searchResults.length ? searchResults.map((item, index) => <button key={`${item.id}-${index}`} onClick={() => openResult(item.route)}><span><strong>{item.title}</strong><small>{item.area} · {item.id}</small></span><span className="result-arrow">↗</span></button>) : <p>No matching factory records</p>}</div>}
            </div>
            <button className="icon-button topbar-notice" aria-label="Quality notifications" onClick={() => navigate("/quality")}><Bell size={19} /><span /></button>
            <div className="topbar-divider" />
            <button className="profile-chip" onClick={() => navigate("/team")} aria-label="View team and access"><span className="avatar">SA</span><span className="profile-copy"><strong>Shravan Awale</strong><small>Administrator</small></span><ChevronDown size={15} /></button>
          </div>
        </header>
        <main><Outlet /></main>
        <footer className="workspace-footer"><span>AROMA MANAGEMENT <i>·</i> DEMO WORKSPACE</span><span><Settings2 size={13} /> Frontend preview · Sample data</span></footer>
      </div>
    </div>
  );
}
