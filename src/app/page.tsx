import { auth } from "@/lib/auth";
import { LandingPage } from "@/components/landing/LandingPage";
import { Dashboard } from "@/components/dashboard/Dashboard";

export default async function Home() {
  const session = await auth();

  if (!session) {
    return <LandingPage />;
  }

  return <Dashboard />;
}
