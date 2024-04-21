import MainNavTabs from "@/components/navigation/MainNavTabs";
import Navbar from "@/components/navigation/Navbar";

export default function AccountsPage() {
  return (
    <div>
      <Navbar />
      <div className="flex h-12 items-center border-b">
        <MainNavTabs />
      </div>

      <main className="container space-y-6 py-6">
        <h1 className="text-2xl font-semibold">Overview</h1>
      </main>
    </div>
  );
}