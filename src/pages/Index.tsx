import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { BookOpen, Compass, Eye, Flame, Layers3, Search, Sparkles, Star, TrendingUp } from "lucide-react";

const GENRES = ["Ação", "Romance", "Fantasia", "Drama", "Comédia", "Terror", "Aventura", "Sci-Fi", "Escolar", "Sobrenatural", "Artes Marciais", "Slice of Life"];
const STATUS_OPTIONS = [
  { label: "Todos", value: "all" },
  { label: "Em andamento", value: "ongoing" },
  { label: "Completos", value: "completed" },
];
const SORT_OPTIONS = [
  { label: "Atualizados", value: "updated" },
  { label: "Mais lidos", value: "views" },
  { label: "A-Z", value: "title" },
];

type Manhwa = Database["public"]["Tables"]["manhwas"]["Row"];
type StatusFilter = "all" | "ongoing" | "completed";
type SortOption = "updated" | "views" | "title";

export default function Index() {
  const [search, setSearch] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("updated");

  const { data: manhwas, isLoading } = useQuery({
    queryKey: ["manhwas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("manhwas").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const library = useMemo(() => manhwas || [], [manhwas]);
  const featured = library.filter((m) => m.featured).slice(0, 8);
  const trending = [...library].sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0)).slice(0, 6);
  const recent = [...library].sort((a, b) => (Date.parse(b.updated_at || "") || 0) - (Date.parse(a.updated_at || "") || 0)).slice(0, 10);
  const completed = library.filter((m) => m.status === "completed").slice(0, 10);
  const totalViews = library.reduce((sum, m) => sum + (m.view_count ?? 0), 0);
  const isFiltering = Boolean(search || selectedGenre || statusFilter !== "all" || sortBy !== "updated");

  const filtered = useMemo(() => {
    return library
      .filter((m) => {
        const normalizedSearch = search.trim().toLowerCase();
        const matchSearch = !normalizedSearch || m.title.toLowerCase().includes(normalizedSearch) || m.author?.toLowerCase().includes(normalizedSearch);
        const matchGenre = !selectedGenre || m.genres?.includes(selectedGenre);
        const matchStatus = statusFilter === "all" || m.status === statusFilter;
        return matchSearch && matchGenre && matchStatus;
      })
      .sort((a, b) => {
        if (sortBy === "views") return (b.view_count ?? 0) - (a.view_count ?? 0);
        if (sortBy === "title") return a.title.localeCompare(b.title);
        return (Date.parse(b.updated_at || "") || 0) - (Date.parse(a.updated_at || "") || 0);
      });
  }, [library, search, selectedGenre, statusFilter, sortBy]);

  const heroManhwa = featured[0] || trending[0] || recent[0];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.12),transparent_32rem)]">
      <div className="container py-6 space-y-10">
        <section className="grid gap-6 overflow-hidden rounded-3xl border bg-card/80 p-5 shadow-xl shadow-primary/5 backdrop-blur md:grid-cols-[1.25fr_0.75fr] md:p-8">
          <div className="flex flex-col justify-center gap-5">
            <Badge className="w-fit gap-1 rounded-full px-3 py-1">
              <Sparkles className="h-3.5 w-3.5" /> Biblioteca premium de manhwas
            </Badge>
            <div className="space-y-3">
              <h1 className="max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">Encontre sua próxima leitura favorita em segundos.</h1>
              <p className="max-w-2xl text-muted-foreground sm:text-lg">Explore destaques, rankings, capítulos recentes e novas opções de filtros para navegar pelo catálogo com mais conforto.</p>
            </div>
            <div className="relative max-w-2xl">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Buscar por título ou autor..." className="h-13 rounded-2xl border-primary/20 bg-background/90 pl-12 text-base shadow-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="grid grid-cols-3 gap-3 max-w-xl">
              <StatCard icon={BookOpen} label="Títulos" value={library.length.toLocaleString()} />
              <StatCard icon={Eye} label="Leituras" value={totalViews.toLocaleString()} />
              <StatCard icon={Layers3} label="Gêneros" value={GENRES.length.toString()} />
            </div>
          </div>
          <HeroPreview manhwa={heroManhwa} />
        </section>

        <section className="space-y-4 rounded-2xl border bg-card/70 p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold"><Compass className="h-5 w-5 text-primary" /> Opções de descoberta</h2>
              <p className="text-sm text-muted-foreground">Filtre por gênero, status e ordenação sem sair da página inicial.</p>
            </div>
            <FilterPills options={SORT_OPTIONS} value={sortBy} onChange={(value) => setSortBy(value as SortOption)} />
          </div>
          <FilterPills options={STATUS_OPTIONS} value={statusFilter} onChange={(value) => setStatusFilter(value as StatusFilter)} />
          <div className="flex flex-wrap gap-2">
            <Badge variant={selectedGenre === null ? "default" : "outline"} className="cursor-pointer rounded-full px-3 py-1" onClick={() => setSelectedGenre(null)}>Todos os gêneros</Badge>
            {GENRES.map((g) => (
              <Badge key={g} variant={selectedGenre === g ? "default" : "outline"} className="cursor-pointer rounded-full px-3 py-1" onClick={() => setSelectedGenre(g === selectedGenre ? null : g)}>
                {g}
              </Badge>
            ))}
          </div>
        </section>

        {isLoading ? <CatalogSkeleton /> : isFiltering ? <CatalogSection title="Resultados encontrados" manhwas={filtered} /> : <HomeSections featured={featured} trending={trending} recent={recent} completed={completed} all={library} />}
      </div>
    </div>
  );
}

function HomeSections({ featured, trending, recent, completed, all }: { featured: Manhwa[]; trending: Manhwa[]; recent: Manhwa[]; completed: Manhwa[]; all: Manhwa[] }) {
  return (
    <>
      <ShelfSection title="Destaques da semana" icon={Star} manhwas={featured} />
      <section className="grid gap-6 lg:grid-cols-[1fr_1.35fr]">
        <div className="space-y-3">
          <h2 className="flex items-center gap-2 text-xl font-bold"><Flame className="h-5 w-5 text-destructive" /> Em alta</h2>
          {trending.map((m, idx) => <RankingCard key={m.id} manhwa={m} rank={idx + 1} />)}
        </div>
        <ShelfSection title="Capítulos recentes" icon={TrendingUp} manhwas={recent} compact />
      </section>
      <ShelfSection title="Séries completas" icon={BookOpen} manhwas={completed} />
      <CatalogSection title="Catálogo completo" manhwas={all} />
    </>
  );
}

function ShelfSection({ title, icon: Icon, manhwas, compact = false }: { title: string; icon: typeof Star; manhwas: Manhwa[]; compact?: boolean }) {
  if (manhwas.length === 0) return null;
  return (
    <section>
      <h2 className="mb-4 flex items-center gap-2 text-xl font-bold"><Icon className="h-5 w-5 text-primary" /> {title}</h2>
      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-4 pb-4">
          {manhwas.map((m) => (
            <div key={m.id} className={compact ? "w-[150px] shrink-0" : "w-[170px] sm:w-[190px] shrink-0"}>
              <ManhwaCard manhwa={m} showViews />
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </section>
  );
}

function CatalogSection({ title, manhwas }: { title: string; manhwas: Manhwa[] }) {
  return (
    <section>
      <h2 className="mb-4 text-xl font-bold">{title}</h2>
      {manhwas.length === 0 ? (
        <p className="rounded-2xl border border-dashed py-12 text-center text-muted-foreground">Nenhum manhwa encontrado.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {manhwas.map((m) => (
            <ManhwaCard key={m.id} manhwa={m} showViews />
          ))}
        </div>
      )}
    </section>
  );
}

function ManhwaCard({ manhwa, showViews }: { manhwa: Manhwa; showViews?: boolean }) {
  return (
    <Link to={`/manhwa/${manhwa.id}`} className="group block overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/10">
      <div className="aspect-[3/4] overflow-hidden bg-muted relative">
        {manhwa.cover_url ? (
          <img src={manhwa.cover_url} alt={manhwa.title} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">Sem capa</div>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-3 pt-10 text-white opacity-0 transition-opacity group-hover:opacity-100">
          <p className="line-clamp-3 text-xs text-white/85">{manhwa.synopsis || "Toque para ver detalhes e capítulos disponíveis."}</p>
        </div>
        {manhwa.status === "ongoing" && <Badge variant="destructive" className="absolute right-2 top-2 text-[10px]">LANÇANDO</Badge>}
      </div>
      <div className="space-y-2 p-3">
        <h3 className="line-clamp-2 font-semibold leading-snug group-hover:text-primary">{manhwa.title}</h3>
        <div className="flex flex-wrap gap-1">
          {manhwa.genres?.slice(0, 2).map((g) => (
            <Badge key={g} variant="secondary" className="rounded-full px-2 text-[10px]">{g}</Badge>
          ))}
        </div>
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="capitalize">{manhwa.status === "ongoing" ? "Em andamento" : "Completo"}</span>
          {showViews && (
            <span className="flex items-center gap-1">
              <Eye className="h-3.5 w-3.5" />
              {(manhwa.view_count ?? 0).toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function RankingCard({ manhwa, rank }: { manhwa: Manhwa; rank: number }) {
  return (
    <Link to={`/manhwa/${manhwa.id}`} className="group flex items-center gap-4 rounded-2xl border bg-card/70 p-3 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card hover:shadow-md">
      <span className={`text-3xl font-black w-10 text-center shrink-0 ${rank <= 3 ? "text-destructive" : "text-muted-foreground"}`}>{rank}</span>
      <div className="h-20 w-14 overflow-hidden rounded-xl bg-muted shrink-0">
        {manhwa.cover_url ? (
          <img src={manhwa.cover_url} alt={manhwa.title} className="h-full w-full object-cover transition-transform group-hover:scale-110" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">—</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate font-semibold group-hover:text-primary">{manhwa.title}</h3>
        <p className="mt-1 truncate text-xs text-muted-foreground">{manhwa.genres?.slice(0, 2).join(" • ") || "Sem gênero"}</p>
      </div>
      <div className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
        <Eye className="h-3.5 w-3.5" />
        {(manhwa.view_count ?? 0).toLocaleString()}
      </div>
    </Link>
  );
}

function HeroPreview({ manhwa }: { manhwa?: Manhwa }) {
  if (!manhwa) return <div className="hidden rounded-3xl border border-dashed bg-muted/40 p-8 text-center text-muted-foreground md:flex md:items-center md:justify-center">Adicione manhwas para preencher o destaque.</div>;
  return (
    <Link to={`/manhwa/${manhwa.id}`} className="group relative min-h-[320px] overflow-hidden rounded-3xl border bg-muted">
      <img src={manhwa.cover_url || "/placeholder.svg"} alt={manhwa.title} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 space-y-3 p-5 text-white">
        <Badge className="bg-white/20 text-white hover:bg-white/30">Leitura em destaque</Badge>
        <h2 className="text-2xl font-black">{manhwa.title}</h2>
        <p className="line-clamp-2 text-sm text-white/80">{manhwa.synopsis || "Veja detalhes, capítulos e informações da obra."}</p>
        <Button size="sm" className="rounded-full">Começar a ler</Button>
      </div>
    </Link>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof BookOpen; label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-background/70 p-3">
      <Icon className="mb-2 h-4 w-4 text-primary" />
      <p className="text-lg font-black">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function FilterPills({ options, value, onChange }: { options: { label: string; value: string }[]; value: string; onChange: (value: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <Button key={option.value} type="button" size="sm" variant={value === option.value ? "default" : "outline"} className="rounded-full" onClick={() => onChange(option.value)}>
          {option.label}
        </Button>
      ))}
    </div>
  );
}

function CatalogSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {Array.from({ length: 12 }).map((_, i) => (
        <div key={i} className="space-y-3 rounded-2xl border p-3">
          <Skeleton className="aspect-[3/4] rounded-xl" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}