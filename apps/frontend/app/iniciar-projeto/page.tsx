import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { ProjectIntakeForm } from "@/components/ProjectIntakeForm";

export default function IniciarProjetoPage() {
  return (
    <main className="min-h-screen text-white">
      <SiteHeader />
      <ProjectIntakeForm />
      <SiteFooter />
    </main>
  );
}

