/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { PublicSurface } from './app/surfaces/public';
import { AppSurface } from './app/surfaces/app';
import { LegacySurface } from './app/surfaces/legacy';
import { LegacyItemRoute } from './app/surfaces/legacy/LegacyItemRoute';
import { AdminSurface } from './app/surfaces/admin';
import { DevSurface } from './app/surfaces/dev';
import { SchemaSurface } from './app/surfaces/dev/schema';
import { ApiSurface } from './app/surfaces/api';
import { TestSurface } from './app/surfaces/test';
import { DemoSurface } from './app/surfaces/demo';

function Layout() {
  return (
    <div className="layout">
      <main className="main-content">
        <Routes>
          <Route path="/" element={<PublicSurface />} />
          <Route path="/app/legacy/item/:identifier" element={<LegacyItemRoute />} />
          <Route path="/app/legacy" element={<LegacySurface />} />
          <Route path="/app" element={<AppSurface />} />
          <Route path="/admin" element={<AdminSurface />} />
          <Route path="/dev/schema" element={<SchemaSurface />} />
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
