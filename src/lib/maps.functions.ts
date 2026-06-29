import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

export interface ObraMapaPonto {
  id: string;
  nome: string;
  bairro: string;
  endereco: string;
  status: string;
  percentual_concluido: number;
  latitude: number;
  longitude: number;
}

async function geocodeEndereco(
  endereco: string,
): Promise<{ lat: number; lng: number } | null> {
  const lovableKey = process.env.LOVABLE_API_KEY;
  const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!lovableKey || !mapsKey) return null;
  try {
    const res = await fetch(
      `${GATEWAY_URL}/maps/api/geocode/json?address=${encodeURIComponent(endereco)}`,
      {
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": mapsKey,
        },
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as {
      status?: string;
      results?: { geometry?: { location?: { lat: number; lng: number } } }[];
    };
    const loc = data.results?.[0]?.geometry?.location;
    if (!loc) return null;
    return { lat: loc.lat, lng: loc.lng };
  } catch {
    return null;
  }
}

/**
 * Retorna as obras com coordenadas para exibição no mapa da tela inicial.
 * Geocodifica os endereços ainda sem latitude/longitude e guarda o resultado
 * no banco (cache) para não consumir a cota do Google a cada carregamento.
 */
export const fetchObrasMapa = createServerFn({ method: "GET" }).handler(
  async (): Promise<ObraMapaPonto[]> => {
    const supabasePublic = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );

    const { data: obras, error } = await supabasePublic
      .from("obras")
      .select(
        "id, nome, endereco, bairro, municipio, estado, cep, latitude, longitude, status, percentual_concluido",
      )
      .order("nome");
    if (error) throw new Error(error.message);

    const pontos: ObraMapaPonto[] = [];
    let admin: ReturnType<typeof createClient<Database>> | null = null;

    for (const o of obras ?? []) {
      let lat = o.latitude == null ? null : Number(o.latitude);
      let lng = o.longitude == null ? null : Number(o.longitude);

      if (lat == null || lng == null) {
        const endereco = [o.endereco, o.bairro, o.municipio, o.estado, o.cep]
          .filter(Boolean)
          .join(", ");
        if (endereco) {
          const geo = await geocodeEndereco(endereco);
          if (geo) {
            lat = geo.lat;
            lng = geo.lng;
            try {
              if (!admin) {
                const { supabaseAdmin } = await import(
                  "@/integrations/supabase/client.server"
                );
                admin = supabaseAdmin;
              }
              await admin
                .from("obras")
                .update({ latitude: lat, longitude: lng })
                .eq("id", o.id);
            } catch {
              // cache best-effort: ignora falha ao persistir coordenadas
            }
          }
        }
      }

      if (lat != null && lng != null) {
        pontos.push({
          id: o.id,
          nome: o.nome,
          bairro: o.bairro ?? "",
          endereco: o.endereco ?? "",
          status: o.status,
          percentual_concluido: o.percentual_concluido ?? 0,
          latitude: lat,
          longitude: lng,
        });
      }
    }

    return pontos;
  },
);
