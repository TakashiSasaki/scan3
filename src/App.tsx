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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <nav className="bg-white shadow p-4">
        <ul className="flex space-x-4">
          <li><Link to="/" className="text-blue-600 hover:underline">/</Link></li>
          <li><Link to="/app" className="text-blue-600 hover:underline">/app</Link></li>
          <li><Link to="/app/legacy" className="text-blue-600 hover:underline">/app/legacy</Link></li>
          <li><Link to="/admin" className="text-blue-600 hover:underline">/admin</Link></li>
          <li><Link to="/dev" className="text-blue-600 hover:underline">/dev</Link></li>
          <li><Link to="/dev/schema" className="text-blue-600 hover:underline">/dev/schema</Link></li>
          <li><Link to="/api" className="text-blue-600 hover:underline">/api</Link></li>
          <li><Link to="/test" className="text-blue-600 hover:underline">/test</Link></li>
          <li><Link to="/demo" className="text-blue-600 hover:underline">/demo</Link></li>
        </ul>
      </nav>
      <main className="flex-grow">
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

