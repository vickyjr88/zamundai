import Sidebar from '@/components/dashboard/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-gray-950 min-h-screen md:h-screen md:overflow-hidden">
      <Sidebar />
      <main className="min-w-0 flex flex-col min-h-screen md:min-h-0 md:h-full md:overflow-hidden md:ml-64 pt-14 md:pt-0 pb-20 md:pb-0">
        {children}
      </main>
    </div>
  );
}
