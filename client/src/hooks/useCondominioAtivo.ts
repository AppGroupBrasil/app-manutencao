import { trpc } from "@/lib/trpc";
import { useBootstrap } from "./useBootstrap";

export function useCondominioAtivo() {
  const { data: condominios, isLoading } = trpc.condominio.list.useQuery();
  const { tenant } = useBootstrap();

  // O tenant do bootstrap é o que o servidor efetivamente usa nas rotas.
  // Só caímos no primeiro da lista se o bootstrap ainda não respondeu.
  const condominioAtivo =
    (tenant && condominios?.find((c) => c.id === tenant.id)) || condominios?.[0] || null;

  return {
    condominioAtivo,
    condominios: condominios || [],
    isLoading,
  };
}
