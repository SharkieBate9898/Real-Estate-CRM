import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

export default function HomePage() {
  const user = getSessionUser();
  if (user) {
    redirect("/app");
  }
  redirect("/login");
}
