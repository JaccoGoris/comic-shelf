import { Route, Routes } from 'react-router-dom';
import { Layout } from './layout';
import { HomePage } from './pages/home';
import { ComicsListPage } from './pages/comics-list';
import { ComicDetailPage } from './pages/comic-detail';
import { ImportPage } from './pages/import';
import { MetronAddPage } from './pages/metron-add';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/comics" element={<ComicsListPage />} />
        <Route path="/comics/:id" element={<ComicDetailPage />} />
        <Route path="/import" element={<ImportPage />} />
        <Route path="/add" element={<MetronAddPage />} />
      </Route>
    </Routes>
  );
}

export default App;

