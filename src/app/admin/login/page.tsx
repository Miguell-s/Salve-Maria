import type { Metadata } from "next";
import { AuthForm } from "@/components/AuthForm";

export const metadata: Metadata = { title: "Entrar no painel", robots: { index: false, follow: false } };

export default function AdminLogin() {
  return (
    <div className="container-x max-w-md py-16">
      <h1 className="text-3xl">Painel Salve Maria</h1>
      <p className="mb-6 mt-1 text-fg-2">Acesso restrito. Use e-mail, senha e o código do app autenticador.</p>
      <AuthForm adminMode />
    </div>
  );
}
