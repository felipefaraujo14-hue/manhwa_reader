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
import {
  BookOpen,
  Compass,
  Eye,
  Flame,
  Layers3,
  Search,
  Sparkles,
  Star,
  TrendingUp,
  Zap,
} from "lucide-react";

const GENRES = [
  "Ação",
  "Romance",
  "Fantasia",
  "Drama",
  "Comédia",
  "Terror",
  "Aventura",
  "Sci-Fi",
  "Escolar",
  "Sobrenatural",
  "Artes Marciais",
  "Slice of Life",
];

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
      const { data, error } = await supabase.from("manhwas").select("*");
      if (error) throw error;
      return data as Manhwa[];
    },
  });

  const library = manhwas || [];
  const featured = library.filter((m) => m.featured);
  const trending = [...library]
    .sort((a, b) => (b.view_count ?? 0) - (a.view_count ?? 0))
    .slice(0, 6);
  const recent = [...library]
    .sort(
      (a, b) =>
        (Date.parse(b.updated_at || "") || 0) -
        (Date.parse(a.updated_at || "") || 0)
    )
    .slice(0, 10);
  const completed = library
    .filter((m) => m.status === "completed")
    .slice(0, 10);
  const totalViews = library.reduce((sum, m) => sum + (m.view_count ?? 0), 0);
  const isFiltering = Boolean(
    search || selectedGenre || statusFilter !== "all" || sortBy !== "updated"
  );

  const filtered = useMemo(() => {
    return library
      .filter((m) => {
        const normalizedSearch = search.trim().toLowerCase();
        const matchSearch =
          !normalizedSearch ||
          m.title.toLowerCase().includes(normalizedSearch) ||
          m.author?.toLowerCase().includes(normalizedSearch);
        const matchGenre =
          !selectedGenre || m.genres?.includes(selectedGenre);
        const matchStatus =
          statusFilter === "all" || m.status === statusFilter;
        return matchSearch && matchGenre && matchStatus;
      })
      .sort((a, b) => {
        if (sortBy === "views")
          return (b.view_count ?? 0) - (a.view_count ?? 0);
        if (sortBy === "title") return a.title.localeCompare(b.title);
        return (
          (Date.parse(b.updated_at || "") || 0) -
          (Date.parse(a.updated_at || "") || 0)
        );
      });
  }, [library, search, selectedGenre, statusFilter, sortBy]);

  const heroManhwa = featured[0] || trending[0] || recent[0];

  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="page-aurora" aria-hidden="true" />
      <div className="container relative z-10 space-y-10 py-8 sm:py-10">
        {/* Hero Section */}
        <section className="hero-shell grid gap-7 overflow-hidden rounded-[2rem] p-5 sm:p-7 md:grid-cols-[1.15fr_0.85fr] lg:p-9">
          <div className="relative z-10 flex flex-col justify-center gap-6">
            <div className="space-y-4">
              <h1 className="max-w-3xl text-balance text-4xl font-black leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
                Leia suas obras com uma vitrine digna das suas histórias favoritas.
              </h1>
              <p className="max-w-2xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
              Suas obras favoritas, mangas, manhwas, novels e etc você encontra aqu
              </p>
            </div>
            <div className="search-panel relative max-w-2xl rounded-2xl p-1.5">
              <Search className="pointer-events-none absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-primary" />
              <Input
                placeholder="Buscar por título ou autor..."
                className="h-14 rounded-[1.1rem] border-white/10 bg-black/30 pl-12 text-base shadow-inner transition-all placeholder:text-muted-foreground/70 focus-visible:border-primary/70 focus-visible:ring-4 focus-visible:ring-primary/20"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
              <StatCard
                icon={BookOpen}
                label="Títulos"
                value={library.length.toLocaleString()}
              />
              <StatCard
                icon={Eye}
                label="Leituras"
                value={totalViews.toLocaleString()}
              />
              <StatCard
                icon={Layers3}
                label="Gêneros"
                value={GENRES.length.toString()}
              />
            </div>
          </div>
          <HeroPreview manhwa={heroManhwa} />
        </section>

        {/* Filtros e Descoberta */}
        <section className="glass-card space-y-5 rounded-[1.75rem] p-5 shadow-2xl shadow-black/20 sm:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-lg font-bold">
                <Compass className="h-5 w-5 text-primary" /> Opções de descoberta
              </h2>
              <p className="text-sm text-muted-foreground">
                Filtre por gênero, status e ordenação sem sair da página
                inicial.
              </p>
            </div>
            <FilterPills
              options={SORT_OPTIONS}
              value={sortBy}
              onChange={(value) => setSortBy(value as SortOption)}
            />
          </div>
          <FilterPills
            options={STATUS_OPTIONS}
            value={statusFilter}
            onChange={(value) => setStatusFilter(value as StatusFilter)}
          />
          <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
            <Badge
              variant={selectedGenre === null ? "default" : "outline"}
              className="cursor-pointer rounded-full px-3.5 py-1 text-xs transition-all hover:border-primary/50"
              onClick={() => setSelectedGenre(null)}
            >
              Todos os gêneros
            </Badge>
            {GENRES.map((g) => (
              <Badge
                key={g}
                variant={selectedGenre === g ? "default" : "outline"}
                className="cursor-pointer rounded-full px-3.5 py-1 text-xs transition-all hover:border-primary/50"
                onClick={() =>
                  setSelectedGenre(g === selectedGenre ? null : g)
                }
              >
                {g}
              </Badge>
            ))}
          </div>
        </section>

        {/* Conteúdo Principal */}
        {isLoading ? (
          <CatalogSkeleton />
        ) : isFiltering ? (
          <CatalogSection title="Resultados encontrados" manhwas={filtered} />
        ) : (
          <HomeSections
            featured={featured}
            trending={trending}
            recent={recent}
            completed={completed}
            all={library}
          />
        )}
      </div>
    </main>
  );
}

function HomeSections({
  featured,
  trending,
  recent,
  completed,
  all,
}: {
  featured: Manhwa[];
  trending: Manhwa[];
  recent: Manhwa[];
  completed: Manhwa[];
  all: Manhwa[];
}) {
  return (
    <div className="space-y-10">
      {/* 1. Destaques da semana */}
      <ShelfSection title="Destaques da semana" icon={Star} manhwas={featured} />

      {/* 2. Em alta */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-xl font-bold">
          <Flame className="h-5 w-5 text-destructive" /> Em alta
        </h2>
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
          {trending.map((m, idx) => (
            <RankingCard key={m.id} manhwa={m} rank={idx + 1} />
          ))}
        </div>
      </section>

      {/* 3. Capítulos recentes */}
      <ShelfSection
        title="Capítulos recentes"
        icon={TrendingUp}
        manhwas={recent}
      />

      {/* 4. Séries completas */}
      <ShelfSection
        title="Séries completas"
        icon={BookOpen}
        manhwas={completed}
      />

      {/* 5. Catálogo completo */}
      <CatalogSection title="Catálogo completo" manhwas={all} />
    </div>
  );
}

function ShelfSection({
  title,
  icon: Icon,
  manhwas,
  compact = false,
}: {
  title: string;
  icon: typeof Star;
  manhwas: Manhwa[];
  compact?: boolean;
}) {
  if (manhwas.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 text-xl font-bold">
        <Icon className="h-5 w-5 text-primary" /> {title}
      </h2>
      <ScrollArea className="w-full whitespace-nowrap rounded-2xl">
        <div className="flex gap-4 pb-4">
          {manhwas.map((m) => (
            <div
              key={m.id}
              className={compact ? "w-[150px] shrink-0" : "w-[175px] sm:w-[195px] shrink-0"}
            >
              <ManhwaCard manhwa={m} showViews />
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </section>
  );
}

function CatalogSection({
  title,
  manhwas,
}: {
  title: string;
  manhwas: Manhwa[];
}) {
  return (
    <section>
      <h2 className="mb-4 text-xl font-bold">{title}</h2>
      {manhwas.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center text-muted-foreground">
          Nenhum manhwa encontrado.
        </div>
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

function ManhwaCard({
  manhwa,
  showViews,
}: {
  manhwa: Manhwa;
  showViews?: boolean;
}) {
  return (
    <Link
      to={`/manhwa/${manhwa.id}`}
      className="manhwa-card glow-hover group relative block overflow-hidden rounded-[1.35rem] border border-white/10 bg-card/80 shadow-sm hover:border-primary/50"
    >
      <div className="relative aspect-[3/4] overflow-hidden bg-muted">
        {manhwa.cover_url ? (
          <img
            src={manhwa.cover_url}
            alt={manhwa.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
            Sem capa
          </div>
        )}

        {/* Gradient Overlay & Synopsis Hover */}
        <div className="gradient-overlay absolute inset-0 flex items-end p-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <p className="line-clamp-3 text-xs leading-relaxed text-slate-200">
            {manhwa.synopsis ||
              "Toque para ver detalhes e capítulos disponíveis."}
          </p>
        </div>

        {manhwa.status === "ongoing" && (
          <Badge
            variant="destructive"
            className="absolute right-2 top-2 text-[10px] font-bold shadow-md"
          >
            LANÇANDO
          </Badge>
        )}
      </div>

      <div className="space-y-2 p-3">
        <h3 className="line-clamp-2 font-semibold text-sm leading-snug transition-colors group-hover:text-primary">
          {manhwa.title}
        </h3>
        <div className="flex flex-wrap gap-1">
          {manhwa.genres?.slice(0, 2).map((g) => (
            <Badge
              key={g}
              variant="secondary"
              className="rounded-md px-1.5 py-0 text-[10px] bg-secondary/80 text-secondary-foreground"
            >
              {g}
            </Badge>
          ))}
        </div>
        <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground pt-1 border-t border-border/40">
          <span className="capitalize">
            {manhwa.status === "ongoing" ? "Em andamento" : "Completo"}
          </span>
          {showViews && (
            <span className="flex items-center gap-1 font-medium">
              <Eye className="h-3 w-3 text-primary/70" />
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
    <Link
      to={`/manhwa/${manhwa.id}`}
      className="group flex items-center gap-4 rounded-2xl border border-white/10 bg-card/70 p-3 transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:bg-card hover:shadow-xl hover:shadow-primary/10"
    >
      <span
        className={`text-2xl font-black w-8 text-center shrink-0 ${
          rank <= 3 ? "text-primary" : "text-muted-foreground/60"
        }`}
      >
        {rank}
      </span>
      <div className="h-16 w-12 overflow-hidden rounded-xl bg-muted shrink-0 shadow-sm">
        {manhwa.cover_url ? (
          <img
            src={manhwa.cover_url}
            alt={manhwa.title}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] text-muted-foreground">
            —
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold transition-colors group-hover:text-primary">
          {manhwa.title}
        </h3>
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {manhwa.genres?.slice(0, 2).join(" • ") || "Sem gênero"}
        </p>
      </div>
      <div className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex font-medium pr-2">
        <Eye className="h-3.5 w-3.5 text-primary/70" />
        {(manhwa.view_count ?? 0).toLocaleString()}
      </div>
    </Link>
  );
}

function HeroPreview({ manhwa }: { manhwa?: Manhwa }) {
  if (!manhwa)
    return (
      <div className="hidden rounded-3xl border border-dashed border-border bg-muted/20 p-8 text-center text-muted-foreground md:flex md:items-center md:justify-center">
        Adicione manhwas para preencher o destaque.
      </div>
    );

  return (
    <Link
      to={`/manhwa/${manhwa.id}`}
      className="hero-preview-card group relative min-h-[360px] overflow-hidden rounded-[1.75rem] border border-white/10 bg-muted shadow-2xl md:min-h-[430px]"
    >
      <img
        src={manhwa.cover_url || "/placeholder.svg"}
        alt={manhwa.title}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
      />
      <div className="gradient-overlay absolute inset-0" />
      <div className="absolute inset-x-0 bottom-0 space-y-3 p-6 text-white">
        <Badge className="bg-primary/90 text-primary-foreground backdrop-blur-md hover:bg-primary border-none">
          Leitura em destaque
        </Badge>
        <h2 className="text-2xl font-black drop-shadow-md sm:text-3xl">
          {manhwa.title}
        </h2>
        <p className="line-clamp-2 text-xs text-slate-300 sm:text-sm drop-shadow">
          {manhwa.synopsis || "Veja detalhes, capítulos e informações da obra."}
        </p>
        <Button
          size="sm"
          className="rounded-full shadow-lg shadow-primary/25 transition-transform group-hover:scale-105"
        >
          <Zap className="mr-1.5 h-4 w-4" /> Começar a ler
        </Button>
      </div>
    </Link>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof BookOpen;
  label: string;
  value: string;
}) {
  return (
    <div className="stat-tile rounded-2xl border border-white/10 p-4 backdrop-blur-sm">
      <Icon className="mb-1.5 h-4 w-4 text-primary" />
      <p className="text-lg font-black tracking-tight">{value}</p>
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
    </div>
  );
}

function FilterPills({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <Button
          key={option.value}
          type="button"
          size="sm"
          variant={value === option.value ? "default" : "outline"}
          className="rounded-full text-xs h-8 px-3.5"
          onClick={() => onChange(option.value)}
        >
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
        <div key={i} className="space-y-3 rounded-2xl border border-border/50 p-3">
          <Skeleton className="aspect-[3/4] rounded-xl" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      ))}
    </div>
  );
}