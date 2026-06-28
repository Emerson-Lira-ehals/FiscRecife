import { useQuery } from "@tanstack/react-query";
import { FOTO_PLACEHOLDER, isStoredFoto, resolveFoto } from "@/lib/obra-utils";
import { signedObraFotoUrl } from "@/lib/queries";

/**
 * Exibe a foto de uma obra resolvendo automaticamente:
 * - chaves de asset (obra1..obra8) e URLs diretas via resolveFoto;
 * - caminhos do bucket privado "obras-fotos" via URL assinada.
 */
export function ObraImage({
  src,
  alt,
  className,
  loading,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
}) {
  const stored = isStoredFoto(src);
  const { data: signed } = useQuery({
    queryKey: ["obra-foto-url", src],
    queryFn: () => signedObraFotoUrl(src as string),
    enabled: stored,
    staleTime: 1000 * 60 * 30,
  });

  const finalSrc = stored ? (signed ?? FOTO_PLACEHOLDER) : resolveFoto(src);

  return <img src={finalSrc} alt={alt} className={className} loading={loading} />;
}
