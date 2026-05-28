import Sidebar from '../components/Sidebar';
import AmbientBackground from '../components/layout/AmbientBackground';
import { Outlet } from 'react-router-dom';

function Layout() {
  return (
    <div className="flex h-[100dvh] relative overflow-hidden">
      <AmbientBackground />

      <Sidebar />

      <main
        className="flex-1 min-h-0 overflow-y-auto scroll-y-touch touch-pan-y custom-scrollbar md:pl-64 pt-[4rem] md:pt-0 relative safe-pb"
        id="main-content"
        role="main"
      >
        <div className="w-full min-h-full p-4 sm:p-6 md:p-8 lg:p-10 safe-pl safe-pr">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export default Layout;
