import { redirect } from "next/navigation";

export default function RootPage() {
  // Middleware gates auth; signed-in users land on the dashboard.
  redirect("/dashboard");
}
