/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import PublicSurface from './app/surfaces/public';
import AppSurface from './app/surfaces/app';
import LegacySurface from './app/surfaces/legacy';
import AdminSurface from './app/surfaces/admin';
import DevSurface from './app/surfaces/dev';
import SchemaWorkbenchSurface from './app/surfaces/dev/schema';
import ApiSurface from './app/surfaces/api';
import TestSurface from './app/surfaces/test';
import DemoSurface from './app/surfaces/demo';
import catalog from './app/router/surfaceCatalog.json';

function DevelopmentShortcuts() {
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

function Layout() {
  return (
    <div className="layout">
      <DevelopmentShortcuts />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<PublicSurface />} />
          <Route path="/app/legacy" element={<LegacySurface />} />
          <Route path="/app" element={<AppSurface />} />
          <Route path="/admin" element={<AdminSurface />} />
          <Route path="/dev/schema" element={<SchemaWorkbenchSurface />} />
          <Route path="/dev" element={<DevSurface />} />
          <Route path="/api" element={<ApiSurface />} />
          <Route path="/test" element={<TestSurface />} />
          <Route path="/demo" element={<DemoSurface />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}

