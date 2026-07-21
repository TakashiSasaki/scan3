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

function Layout() {
  return (
    <div className="layout">
      <nav className="nav">
        <ul className="nav-list">
          <li><Link to="/" className="nav-link">/</Link></li>
          <li><Link to="/app" className="nav-link">/app</Link></li>
          <li><Link to="/app/legacy" className="nav-link">/app/legacy</Link></li>
          <li><Link to="/admin" className="nav-link">/admin</Link></li>
          <li><Link to="/dev" className="nav-link">/dev</Link></li>
          <li><Link to="/dev/schema" className="nav-link">/dev/schema</Link></li>
          <li><Link to="/api" className="nav-link">/api</Link></li>
          <li><Link to="/test" className="nav-link">/test</Link></li>
          <li><Link to="/demo" className="nav-link">/demo</Link></li>
        </ul>
      </nav>
      <main className="main-content">
        <Routes>
          <Route path="/" element={<PublicSurface />} />
          <Route path="/app" element={<AppSurface />} />
          <Route path="/app/legacy" element={<LegacySurface />} />
          <Route path="/admin" element={<AdminSurface />} />
          <Route path="/dev" element={<DevSurface />} />
          <Route path="/dev/schema" element={<SchemaWorkbenchSurface />} />
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

