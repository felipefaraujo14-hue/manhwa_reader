import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, BookOpen, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ManhwaDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [readChapters, setReadChapters] = useState<string[]>([]);

  // Escuta atualizações dos capítulos lidos no localStorage
  useEffect(() => {
    const loadReadChapters = () => {
      try {
        const saved = JSON.parse(localStorage.getItem("read_chapters") || "[]");
        setReadChapters(saved);
      } catch (e) {
        console.error("Erro ao carregar histórico de leitura", e);
      }
    };

    loadReadChapters();
    window.addEventListener("read_chapters_updated", loadReadChapters);

    return () => {
      window.removeEventListener("read_chapters_updated", loadReadChapters);
    };
  }, []);

  const { data: manhwa, isLoading } = useQuery({
    queryKey: ["manhwa", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("manhwas").select("*").eq("id", id!).single();
      if (error) throw error;
      // Increment view count
      await supabase.from("manhwas").update({ view_count: (data.view_count ?? 0) + 1 }).eq("id", id!);
      return data;
    },
  });

  const { data: chapters } = useQuery({
    queryKey: ["chapters", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("chapters").select("*").eq("manhwa_id", id!).order("chapter_number", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: isFavorited } = useQuery({
    queryKey: ["favorite", id, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("favorites").select("id").eq("manhwa_id", id!).eq("user_id", user!.id).maybeSingle();
      return !!data;
    },
  });

  const toggleFav = useMutation({
    mutationFn: async () => {
      if (isFavorited) {
        await supabase.from("favorites").delete().eq("manhwa_id", id!).eq("user_id", user!.id);
      } else {
        await supabase.from("favorites").insert({ manhwa_id: id!, user_id: user!.id });
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["favorite", id, user?.id] });
      toast({ title: isFavorited ? "Removido dos favoritos" : "Adicionado aos favoritos" });
    },
  });

  if (isLoading) return <div className="container py-8"><Skeleton className="h-64 w-full" /></div>;
  if (!manhwa) return <div className="container py-8 text-center">Manhwa não encontrado.</div>;

  return (
    <div className="container py-8">
      <div className="flex flex-col md:flex-row gap-8">
        <div className="w-full md:w-64 shrink-0">
          <div className="aspect-[3/4] rounded-lg overflow-hidden bg-muted border">
            {manhwa.cover_url ? (
              <img src={manhwa.cover_url} alt={manhwa.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">Sem capa</div>
            )}
          </div>
          {user && (
            <Button variant={isFavorited ? "default" : "outline"} className="w-full mt-4" onClick={() => toggleFav.mutate()}>
              <Heart className={`mr-2 h-4 w-4 ${isFavorited ? "fill-current" : ""}`} />
              {isFavorited ? "Favoritado" : "Favoritar"}
            </Button>
          )}
        </div>
        <div className="flex-1 space-y-4">
          <h1 className="text-3xl font-bold">{manhwa.title}</h1>
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{manhwa.status === "ongoing" ? "Em andamento" : "Completo"}</Badge>
            {manhwa.author && <Badge variant="outline">{manhwa.author}</Badge>}
            {manhwa.genres?.map((g: string) => <Badge key={g} variant="outline">{g}</Badge>)}
          </div>
          {manhwa.synopsis && <p className="text-muted-foreground leading-relaxed">{manhwa.synopsis}</p>}

          <div className="pt-4">
            <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
              <BookOpen className="h-5 w-5" /> Capítulos
            </h2>
            {!chapters || chapters.length === 0 ? (
              <p className="text-muted-foreground">Nenhum capítulo disponível.</p>
            ) : (
              <div className="space-y-1">
                {chapters.map((ch) => {
                  const isRead = readChapters.includes(ch.id);

                  return (
                    <Link
                      key={ch.id}
                      to={`/manhwa/${id}/chapter/${ch.id}`}
                      className={`flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors border ${
                        isRead ? "opacity-75 bg-muted/40" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          Cap. {ch.chapter_number}
                          {ch.title ? ` - ${ch.title}` : ""}
                        </span>
                        {isRead && (
                          <Badge variant="outline" className="border-emerald-500/50 bg-emerald-500/10 text-emerald-400 gap-1 text-[10px] py-0.5 px-1.5 font-medium">
                            <CheckCircle2 className="h-3 w-3" /> Lido
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(ch.created_at).toLocaleDateString("pt-BR")}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}