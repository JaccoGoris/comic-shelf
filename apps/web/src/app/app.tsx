import { Route, Routes } from 'react-router-dom'
import { Layout } from './layout'
import { HomePage } from './pages/home'
import { ComicsListPage } from './pages/comic-list/comics-list'
import { ComicDetailPage } from './pages/comic-detail'
import { LoginPage } from './pages/login'
import { SetupPage } from './pages/setup'
import { SettingsPage } from './pages/settings'
import { RequireAuth } from '../auth/require-auth'
import { RequireSetup } from '../auth/require-setup'

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
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
