import { Route, Routes } from 'react-router-dom'
import { Layout } from './layout'
import { HomePage } from './pages/home'
import { ComicsListPage } from './pages/comic-list/comics-list'
import { ComicDetailPage } from './pages/comic-detail'
import { ImportPage } from './pages/import'
import { MetronAddPage } from './pages/metron-add'
import { LoginPage } from './pages/login'
import { SetupPage } from './pages/setup'
import { UsersPage } from './pages/users'
import { RequireAuth } from '../auth/require-auth'
import { RequireSetup } from '../auth/require-setup'
import { RequireAdmin } from '../auth/require-admin'

export function App() {
  return (
    <Routes>
      <Route element={<RequireSetup />}>
        <Route path="/setup" element={<SetupPage />} />
      </Route>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<Layout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/comics" element={<ComicsListPage />} />
          <Route path="/comics/:id" element={<ComicDetailPage />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/add" element={<MetronAddPage />} />
          <Route element={<RequireAdmin />}>
            <Route path="/users" element={<UsersPage />} />
          </Route>
        </Route>
      </Route>
    </Routes>
  )
}

export default App
