import Link from "next/link";
import { RosaryIllustration } from "@/components/RosaryIllustration";

export default function NotFound() {
  return (
    <div className="container-x py-20 text-center">
      <RosaryIllustration className="mx-auto h-40 w-40" />
      <h1 className="mt-4 text-4xl">Página não encontrada</h1>
      <p className="mt-2 text-fg-2">Ela pode ter mudado de lugar.</p>
      <Link href="/" className="btn btn-primary mt-6">Voltar ao início</Link>
    </div>
  );
}
