import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin } from "lucide-react";
import { fetchObrasMapa, type ObraMapaPonto } from "@/lib/maps.functions";
import { STATUS_LABELS } from "@/lib/obra-utils";
import { Skeleton } from "@/components/ui/skeleton";

// Cores dos marcadores por status da obra (alinhadas ao design system).
const STATUS_PIN: Record<string, string> = {
  planejamento: "#64748b",
  licitacao: "#0ea5e9",
  em_andamento: "#0284c7",
  atrasada: "#d97706",
  paralisada: "#dc2626",
  concluida: "#16a34a",
  cancelada: "#94a3b8",
};

// Centro aproximado do Recife usado como fallback.
const RECIFE_CENTER = { lat: -8.0476, lng: -34.877 };

let mapsLoader: Promise<void> | null = null;
function loadGoogleMaps(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  const w = window as unknown as { google?: { maps?: unknown }; __initFiscMap?: () => void };
  if (w.google?.maps) return Promise.resolve();
  if (mapsLoader) return mapsLoader;

  mapsLoader = new Promise<void>((resolve, reject) => {
    const key = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
    const channel = import.meta.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_TRACKING_ID;
    if (!key) {
      reject(new Error("Chave do Google Maps ausente"));
      return;
    }
    w.__initFiscMap = () => resolve();
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&loading=async&callback=__initFiscMap${
      channel ? `&channel=${channel}` : ""
    }`;
    script.async = true;
    script.onerror = () => reject(new Error("Falha ao carregar o Google Maps"));
    document.head.appendChild(script);
  });
  return mapsLoader;
}

function pinIcon(status: string) {
  const color = STATUS_PIN[status] ?? "#0284c7";
  const g = (window as unknown as { google: any }).google;
  return {
    path: "M12 0C7.03 0 3 4.03 3 9c0 6.5 9 15 9 15s9-8.5 9-15c0-4.97-4.03-9-9-9z",
    fillColor: color,
    fillOpacity: 1,
    strokeColor: "#ffffff",
    strokeWeight: 1.5,
    scale: 1.6,
    anchor: new g.maps.Point(12, 24),
  };
}

function MapaCanvas({ pontos }: { pontos: ObraMapaPonto[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then(() => {
        if (cancelled || !ref.current) return;
        const g = (window as unknown as { google: any }).google;
        const map = new g.maps.Map(ref.current, {
          center: RECIFE_CENTER,
          zoom: 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });

        const bounds = new g.maps.LatLngBounds();
        const info = new g.maps.InfoWindow();

        pontos.forEach((p) => {
          const position = { lat: p.latitude, lng: p.longitude };
          const marker = new g.maps.Marker({
            position,
            map,
            title: p.nome,
            icon: pinIcon(p.status),
          });
          bounds.extend(position);
          marker.addListener("click", () => {
            info.setContent(
              `<div style="max-width:220px;font-family:system-ui,sans-serif">
                <strong style="display:block;margin-bottom:4px;color:#0f172a">${p.nome}</strong>
                <span style="color:#475569;font-size:12px">${p.endereco || p.bairro}</span><br/>
                <span style="color:#475569;font-size:12px">${
                  STATUS_LABELS[p.status as keyof typeof STATUS_LABELS] ?? p.status
                } · ${p.percentual_concluido}% concluído</span><br/>
                <a href="/obras/${p.id}" style="color:#0284c7;font-size:12px;font-weight:600;text-decoration:none">Visualizar obra →</a>
              </div>`,
            );
            info.open({ map, anchor: marker });
          });
        });

        if (pontos.length === 1) {
          map.setCenter({ lat: pontos[0].latitude, lng: pontos[0].longitude });
          map.setZoom(15);
        } else if (pontos.length > 1) {
          map.fitBounds(bounds, 64);
        }
      })
      .catch(() => {
        if (ref.current) {
          ref.current.innerHTML =
            '<div style="display:flex;height:100%;align-items:center;justify-content:center;color:#64748b;font-size:14px">Não foi possível carregar o mapa.</div>';
        }
      });
    return () => {
      cancelled = true;
    };
  }, [pontos]);

  return <div ref={ref} className="h-[420px] w-full" />;
}

export function ObrasMapa() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["obras-mapa"],
    queryFn: () => fetchObrasMapa(),
    staleTime: 1000 * 60 * 10,
  });

  const pontos = data ?? [];

  return (
    <section className="mx-auto max-w-6xl px-4 pb-12">
      <div className="mb-4 flex items-center gap-2">
        <MapPin className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">
            Mapa das obras
          </h2>
          <p className="text-sm text-muted-foreground">
            Localização das obras a partir dos endereços cadastrados.
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
        {isLoading ? (
          <Skeleton className="h-[420px] w-full" />
        ) : error ? (
          <div className="flex h-[420px] items-center justify-center text-sm text-danger">
            Não foi possível carregar o mapa das obras.
          </div>
        ) : pontos.length === 0 ? (
          <div className="flex h-[420px] items-center justify-center text-sm text-muted-foreground">
            Nenhuma obra com endereço localizável no mapa.
          </div>
        ) : (
          <MapaCanvas pontos={pontos} />
        )}
      </div>
    </section>
  );
}
