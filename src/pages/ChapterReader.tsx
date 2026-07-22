import { useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, ChevronsUp, Images, Send, Trash2, Loader2, AlertCircle } from "lucide-react";

const READER_WIDTHS = {
  compact: "max-w-2xl",
  comfortable: "max-w-3xl",
  wide: "max-w-5xl",
};

const PAGE_GAPS = {
  seamless: "gap-0",
  cozy: "gap-2 sm:gap-3",
};

type ReaderWidth = keyof typeof READER_WIDTHS;
type PageGap = keyof typeof PAGE_GAPS;

type ChapterComment = {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: {
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

export default function ChapterReader() {
  const { manhwaId, chapterId } = useParams<{ manhwaId: string; chapterId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [comment, setComment] = useState("");
  const [readerWidth, setReaderWidth] = useState<ReaderWidth>("comfortable");
  const [pageGap, setPageGap] = useState<PageGap>("seamless");

  // Fetch do capítulo atual com validação de ID
  const { data: chapter, isLoading: isChapterLoading, isError: isChapterError, error: chapterError } = useQuery({
    queryKey: ["chapter", chapterId],
    queryFn: async () => {
      if (!chapterId) throw new Error("ID do capítulo não informado.");
      const { data, error } = await supabase.from("chapters").select("*").eq("id", chapterId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!chapterId,
  });

  // Fetch da lista de capítulos da obra
  const { data: chapters } = useQuery({
    queryKey: ["chapters", manhwaId],
    queryFn: async () => {
      if (!manhwaId) return [];
      const { data, error } = await supabase
        .from("chapters")
        .select("id, chapter_number")
        .eq("manhwa_id", manhwaId)
        .order("chapter_number", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!manhwaId,
  });

  // Fetch dos comentários
  const { data: comments, isLoading: commentsLoading } = useQuery({
    queryKey: ["chapter-comments", chapterId],
    queryFn: async () => {
      if (!chapterId) return [];
      const { data, error } = await supabase
        .from("chapter_comments")
        .select("*, profiles!chapter_comments_user_id_fkey(display_name, avatar_url)")
        .eq("chapter_id", chapterId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ChapterComment[];
    },
    enabled: !!chapterId,
  });

  const addComment = useMutation({
    mutationFn: async () => {
      if (!chapterId || !user) return;
      const { error } = await supabase.from("chapter_comments").insert({
        chapter_id: chapterId,
        user_id: user.id,
        content: comment,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setComment("");
      qc.invalidateQueries({ queryKey: ["chapter-comments", chapterId] });
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      await supabase.from("chapter_comments").delete().eq("id", commentId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["chapter-comments", chapterId] }),
  });

  const currentIndex = chapters?.findIndex((c) => c.id === chapterId) ?? -1;
  const prevChapter = currentIndex > 0 ? chapters?.[currentIndex - 1] : null;
  const nextChapter = currentIndex >= 0 && chapters && currentIndex < chapters.length - 1 ? chapters[currentIndex + 1] : null;
  const pages: string[] = chapter?.pages || [];

  const progressLabel = useMemo(() => {
    if (!chapters?.length || currentIndex < 0) return "Carregando...";
    return `${currentIndex + 1} de ${chapters.length}`;
  }, [chapters?.length, currentIndex]);

  // Se estiver carregando o capítulo principal
  if (isChapterLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Carregando capítulo...</p>
      </div>
    );
  }

  // Se deu algum erro no banco de dados ou no parâmetro da URL
  if (isChapterError || !chapter) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4 text-center">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <div>
          <h2 className="text-lg font-semibold">Erro ao carregar o capítulo</h2>
          <p className="text-sm text-muted-foreground">
            {(chapterError as Error)?.message || "O capítulo não foi encontrado ou a URL é inválida."}
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to={manhwaId ? `/manhwa/${manhwaId}` : "/"}>
            <ChevronLeft className="mr-2 h-4 w-4" /> Voltar para a página da obra
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="reader-shell min-h-screen">
      {/* Topbar */}
      <div className="reader-topbar sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="container flex min-h-16 flex-col gap-3 py-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center justify-between gap-3">
            <Button variant="ghost" size="sm" asChild className="reader-nav-link">
              <Link to={`/manhwa/${manhwaId}`}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Voltar à obra
              </Link>
            </Button>
            <Badge variant="secondary" className="lg:hidden">
              {progressLabel}
            </Badge>
          </div>

          <div className="min-w-0 text-center lg:flex-1">
            <p className="text-xs uppercase tracking-[0.3em] text-primary/80">Modo leitura</p>
            <h1 className="truncate text-base font-semibold sm:text-lg">
              Cap. {chapter?.chapter_number}
              {chapter?.title ? ` - ${chapter.title}` : ""}
            </h1>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 lg:justify-end">
            <Badge variant="secondary" className="hidden lg:inline-flex">
              {progressLabel}
            </Badge>
            <div className="reader-controls flex gap-1" aria-label="Preferências de leitura">
              <Button size="sm" variant={readerWidth === "compact" ? "default" : "ghost"} onClick={() => setReaderWidth("compact")}>
                Foco
              </Button>
              <Button size="sm" variant={readerWidth === "comfortable" ? "default" : "ghost"} onClick={() => setReaderWidth("comfortable")}>
                Padrão
              </Button>
              <Button size="sm" variant={readerWidth === "wide" ? "default" : "ghost"} onClick={() => setReaderWidth("wide")}>
                Amplo
              </Button>
            </div>
            <Button size="sm" variant="outline" onClick={() => setPageGap(pageGap === "seamless" ? "cozy" : "seamless")}>
              <Images className="mr-1 h-4 w-4" /> {pageGap === "seamless" ? "Sem gap" : "Com gap"}
            </Button>
          </div>
        </div>
      </div>

      {/* Áreas de Leitura */}
      <main className={`reader-stage container ${READER_WIDTHS[readerWidth]} py-4 sm:py-6`}>
        {pages.length === 0 ? (
          <div className="reader-empty py-20 text-center">
            <Images className="mx-auto mb-4 h-10 w-10 text-primary/70" />
            <p className="font-medium">Nenhuma página neste capítulo.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Quando as páginas forem publicadas, elas aparecerão aqui em leitura vertical.
            </p>
          </div>
        ) : (
          <div className={`reader-pages flex flex-col ${PAGE_GAPS[pageGap]}`}>
            {pages.map((page, i) => (
              <figure key={i} className="reader-page-frame">
                <img
                  src={page}
                  alt={`Página ${i + 1} do capítulo ${chapter?.chapter_number || ""}`}
                  className="reader-page-image w-full"
                  loading={i < 2 ? "eager" : "lazy"}
                />
              </figure>
            ))}
          </div>
        )}
      </main>

      {/* Navegação entre capítulos */}
      <div className="reader-footer-nav container max-w-3xl border-t py-5 flex justify-between items-center">
        {prevChapter ? (
          <Button variant="outline" onClick={() => navigate(`/manhwa/${manhwaId}/chapter/${prevChapter.id}`)}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Cap. anterior
          </Button>
        ) : (
          <div />
        )}

        <Button variant="ghost" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <ChevronsUp className="mr-1 h-4 w-4" /> Topo
        </Button>

        {nextChapter ? (
          <Button onClick={() => navigate(`/manhwa/${manhwaId}/chapter/${nextChapter.id}`)}>
            Próx. cap. <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <div />
        )}
      </div>

      {/* Comentários */}
      <section className="reader-comments container max-w-3xl space-y-4 border-t py-6">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-primary/80">Comunidade</p>
          <h2 className="text-xl font-bold">Comentários</h2>
        </div>

        {user && (
          <div className="comment-composer flex gap-2 rounded-2xl border p-2">
            <Textarea
              placeholder="Deixe um comentário..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="min-h-[68px] border-0 bg-transparent focus-visible:ring-0"
            />
            <Button
              size="icon"
              onClick={() => comment.trim() && addComment.mutate()}
              disabled={!comment.trim() || addComment.isPending}
              aria-label="Enviar comentário"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}

        {commentsLoading ? (
          <p className="text-sm text-muted-foreground">Carregando comentários...</p>
        ) : !comments || comments.length === 0 ? (
          <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            Nenhum comentário ainda. Seja o primeiro a comentar este capítulo.
          </p>
        ) : (
          <div className="space-y-3">
            {comments.map((c) => (
              <div key={c.id} className="comment-card flex gap-3 rounded-2xl border p-3">
                <Avatar className="h-9 w-9 ring-2 ring-primary/20">
                  <AvatarImage src={c.profiles?.avatar_url || undefined} />
                  <AvatarFallback>{c.profiles?.display_name?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold">{c.profiles?.display_name || "Anônimo"}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        {new Date(c.created_at).toLocaleDateString("pt-BR")}
                      </span>
                      {user?.id === c.user_id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => deleteComment.mutate(c.id)}
                          aria-label="Excluir comentário"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-relaxed text-muted-foreground">
                    {c.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}