import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronLeft, ChevronRight, Send, Trash2 } from "lucide-react";

export default function ChapterReader() {
  const { manhwaId, chapterId } = useParams<{ manhwaId: string; chapterId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [comment, setComment] = useState("");

  const { data: chapter } = useQuery({
    queryKey: ["chapter", chapterId],
    queryFn: async () => {
      const { data, error } = await supabase.from("chapters").select("*").eq("id", chapterId!).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: chapters } = useQuery({
    queryKey: ["chapters", manhwaId],
    queryFn: async () => {
      const { data, error } = await supabase.from("chapters").select("id, chapter_number").eq("manhwa_id", manhwaId!).order("chapter_number");
      if (error) throw error;
      return data;
    },
  });

  const { data: comments, isLoading: commentsLoading } = useQuery({
    queryKey: ["chapter-comments", chapterId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chapter_comments")
        .select("*, profiles!chapter_comments_user_id_fkey(display_name, avatar_url)")
        .eq("chapter_id", chapterId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const addComment = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("chapter_comments").insert({
        chapter_id: chapterId!, user_id: user!.id, content: comment,
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
  const pages = chapter?.pages || [];

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b">
        <div className="container flex items-center justify-between h-12">
          <Link to={`/manhwa/${manhwaId}`} className="text-sm text-muted-foreground hover:text-foreground">
            ← Voltar
          </Link>
          <span className="font-medium text-sm">Cap. {chapter?.chapter_number}{chapter?.title ? ` - ${chapter.title}` : ""}</span>
          <div className="w-16" />
        </div>
      </div>

      {/* Reader - scroll only */}
      <div className="container max-w-3xl py-4">
        {pages.length === 0 ? (
          <p className="text-center text-muted-foreground py-20">Nenhuma página neste capítulo.</p>
        ) : (
          <div className="space-y-1">
            {pages.map((page, i) => (
              <img key={i} src={page} alt={`Página ${i + 1}`} className="w-full" loading="lazy" />
            ))}
          </div>
        )}
      </div>

      {/* Chapter nav */}
      <div className="container max-w-3xl flex justify-between py-4 border-t">
        {prevChapter ? (
          <Button variant="outline" onClick={() => navigate(`/manhwa/${manhwaId}/chapter/${prevChapter.id}`)}>
            <ChevronLeft className="mr-1 h-4 w-4" /> Cap. anterior
          </Button>
        ) : <div />}
        {nextChapter ? (
          <Button variant="outline" onClick={() => navigate(`/manhwa/${manhwaId}/chapter/${nextChapter.id}`)}>
            Próx. cap. <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : <div />}
      </div>

      {/* Comments */}
      <div className="container max-w-3xl py-6 space-y-4 border-t">
        <h3 className="font-bold text-lg">Comentários</h3>
        {user && (
          <div className="flex gap-2">
            <Textarea placeholder="Deixe um comentário..." value={comment} onChange={(e) => setComment(e.target.value)} className="min-h-[60px]" />
            <Button size="icon" onClick={() => comment.trim() && addComment.mutate()} disabled={!comment.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}
        {commentsLoading ? (
          <p className="text-muted-foreground text-sm">Carregando...</p>
        ) : !comments || comments.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhum comentário ainda.</p>
        ) : (
          <div className="space-y-3">
            {comments.map((c: any) => (
              <div key={c.id} className="flex gap-3 p-3 rounded-lg border">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={c.profiles?.avatar_url || undefined} />
                  <AvatarFallback>{c.profiles?.display_name?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{c.profiles?.display_name || "Anônimo"}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString("pt-BR")}</span>
                      {user?.id === c.user_id && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteComment.mutate(c.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm mt-1">{c.content}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
