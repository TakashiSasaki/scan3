import { Link } from 'react-router-dom';
import catalog from '../router/surfaceCatalog.json';

export default function DevelopmentShortcuts() {
  if (import.meta.env.DEV !== true) {
    return null;
  }

  const shortcuts = catalog.filter(c => c.shortcutVisible);

  return (
    <nav className="dev-shortcuts" aria-label="Development Shortcuts">
      <div className="dev-shortcuts-header">
        <p>Development shortcuts.</p>
        <p>These links are navigation aids, not authorization boundaries.</p>
      </div>
      <ul className="dev-shortcuts-list">
        {shortcuts.map(c => (
          <li key={c.id} className="dev-shortcuts-item">
            <Link to={c.path} className="dev-shortcuts-link">
              <span className="dev-shortcuts-path">{c.path}</span>
              <span className="dev-shortcuts-label">{c.label}</span>
              <span className="dev-shortcuts-desc">{c.description}</span>
              <span className={`dev-shortcuts-status status-${c.status}`}>[{c.status}]</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
