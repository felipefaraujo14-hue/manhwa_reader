import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Search, Star, TrendingUp, Eye, Flame } from "lucide-react";

const GENRES = ["Ação", "Romance", "Fantasia", "Drama", "Comédia", "Terror", "Aventura", "Sci-Fi"];

export default function Index() {
  const [search, setSearch] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);

  const { data: manhwas, isLoading } = useQuery({
    queryKey: ["manhwas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("manhwas").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const featured = manhwas?.filter((m) => m.featured) || [];
  const trending = manhwas?.slice()?.sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0)).slice(0, 10) || [];
  const mostRead = manhwas?.slice()?.sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0)).slice(0, 10) || [];

  const filtered = manhwas?.filter((m) => {
    const matchSearch = m.title.toLowerCase().includes(search.toLowerCase());
    const matchGenre = !selectedGenre || m.genres?.includes(selectedGenre);
    return matchSearch && matchGenre;
  }) || [];

  return (
    <div className="container py-6 space-y-8">
      {/* Search bar on top */}
      <section className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar manhwa..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={selectedGenre === null ? "default" : "outline"} className="cursor-pointer" onClick={() => setSelectedGenre(null)}>
            Todos
          </Badge>
          {GENRES.map((g) => (
            <Badge key={g} variant={selectedGenre === g ? "default" : "outline"} className="cursor-pointer" onClick={() => setSelectedGenre(g === selectedGenre ? null : g)}>
              {g}
            </Badge>
          ))}
        </div>
      </section>

      {/* Destaques */}
      {featured.length > 0 && !search && !selectedGenre && (
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Star className="h-5 w-5 text-primary" /> Destaques
          </h2>
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-4 pb-4">
              {featured.map((m) => (
                <div key={m.id} className="w-[140px] sm:w-[160px] shrink-0">
                  <ManhwaCard manhwa={m} />
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </section>
      )}

      {/* Em Alta - horizontal ranking style */}
      {trending.length > 0 && !search && !selectedGenre && (
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Flame className="h-5 w-5 text-destructive" /> Em Alta
          </h2>
          <div className="space-y-2">
            {trending.map((m, idx) => (
              <RankingCard key={m.id} manhwa={m} rank={idx + 1} />
            ))}
          </div>
        </section>
      )}

      {/* Mais Lidos */}
      {mostRead.length > 0 && !search && !selectedGenre && (
        <section>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" /> Mais Lidos
          </h2>
          <ScrollArea className="w-full whitespace-nowrap">
            <div className="flex gap-4 pb-4">
              {mostRead.map((m) => (
                <div key={m.id} className="w-[140px] sm:w-[160px] shrink-0">
                  <ManhwaCard manhwa={m} showViews />
                </div>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>
        </section>
      )}

      {/* Catálogo (shown when searching/filtering, or always at bottom) */}
      {(search || selectedGenre) && (
        <section>
          <h2 className="text-xl font-bold mb-4">Resultados</h2>
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="aspect-[3/4] rounded-lg" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">Nenhum manhwa encontrado.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filtered.map((m) => (
                <ManhwaCard key={m.id} manhwa={m} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Full catalog when no search */}
      {!search && !selectedGenre && (
        <section>
          <h2 className="text-xl font-bold mb-4">Catálogo</h2>
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="aspect-[3/4] rounded-lg" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {(manhwas || []).map((m) => (
                <ManhwaCard key={m.id} manhwa={m} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function ManhwaCard({ manhwa, showViews }: { manhwa: any; showViews?: boolean }) {
  return (
    <Link to={`/manhwa/${manhwa.id}`} className="group block space-y-2">
      <div className="aspect-[3/4] rounded-lg overflow-hidden bg-muted border relative">
        {manhwa.cover_url ? (
          <img src={manhwa.cover_url} alt={manhwa.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">Sem capa</div>
        )}
        {manhwa.status === "ongoing" && (
          <div className="absolute top-2 right-2">
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5">LANÇANDO</Badge>
          </div>
        )}
      </div>
      <div>
        <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">{manhwa.title}</h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="capitalize">{manhwa.status === "ongoing" ? "Em andamento" : "Completo"}</span>
          {showViews && manhwa.view_count > 0 && (
            <>
              <span>·</span>
              <span className="flex items-center gap-0.5"><Eye className="h-3 w-3" /> {manhwa.view_count.toLocaleString()}</span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

function RankingCard({ manhwa, rank }: { manhwa: any; rank: number }) {
  return (
    <Link to={`/manhwa/${manhwa.id}`} className="group flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
      {/* Rank number */}
      <span className={`text-2xl font-black w-8 text-center shrink-0 ${rank <= 3 ? "text-destructive" : "text-muted-foreground"}`}>
        {rank}
      </span>
      {/* Cover */}
      <div className="h-16 w-12 rounded overflow-hidden bg-muted shrink-0">
        {manhwa.cover_url ? (
          <img src={manhwa.cover_url} alt={manhwa.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[10px]">—</div>
        )}
      </div>
      {/* Info */}
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-sm truncate group-hover:text-primary transition-colors">{manhwa.title}</h3>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
          <span>{manhwa.genres?.slice(0, 2).join(", ") || "—"}</span>
          <span>·</span>
          <span className="capitalize">{manhwa.status === "ongoing" ? "Em andamento" : "Completo"}</span>
        </div>
      </div>
      {/* View count */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
        <Eye className="h-3.5 w-3.5" />
        <span>{(manhwa.view_count ?? 0).toLocaleString()}</span>
      </div>
    </Link>
  );
}
