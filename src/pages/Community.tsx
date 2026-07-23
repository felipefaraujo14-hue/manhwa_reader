import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

import {
  ChevronDown,
  ChevronUp,
  Flame,
  MessageSquare,
  Plus,
  Search,
  Send,
  Sparkles,
  Trash2,
  TrendingUp,
  Users,
} from "lucide-react";

type ProfileSummary = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "display_name" | "avatar_url"
>;

type CommunityPost = Database["public"]["Tables"]["community_posts"]["Row"] & {
  profiles: ProfileSummary | null;
};

type CommunityReply = Database["public"]["Tables"]["community_replies"]["Row"] & {
  profiles: ProfileSummary | null;
};

const formatDate = (date: string) =>
  new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));

const getScore = (postId: string) => {
  const seed = postId.split("").reduce((total, char) => total + char.charCodeAt(0), 0);
  return 12 + (seed % 380);
};

export default function Community() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [reply, setReply] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"recentes" | "populares">("recentes");

  /* ==========================
     BUSCAR POSTS
     ========================== */
  const { data: posts, isLoading } = useQuery({
    queryKey: ["community-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_posts")
        .select(`
          *,
          profiles (
            display_name,
            avatar_url
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  /* ==========================
     BUSCAR RESPOSTAS
     ========================== */
  /* ==========================
   BUSCAR RESPOSTAS
   ========================== */
const { data: replies } = useQuery({
  queryKey: ["community-replies", selectedPost],
  enabled: !!selectedPost,
  queryFn: async () => {
    const { data, error } = await supabase
      .from("community_replies")
      .select(`
        *,
        profiles (
          display_name,
          avatar_url
        )
      `)
      .eq("post_id", selectedPost)
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data;
  },
});

  const filteredPosts = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    const visiblePosts = ((posts || []) as CommunityPost[]).filter((post) => {
      const searchableText = `${post.title} ${post.content} ${
        post.profiles?.display_name || ""
      }`.toLowerCase();
      return searchableText.includes(normalizedSearch);
    });

    if (sortBy === "populares") {
      return [...visiblePosts].sort((a, b) => getScore(b.id) - getScore(a.id));
    }

    return visiblePosts;
  }, [posts, search, sortBy]);

  /* ==========================
     CRIAR TÓPICO
     ========================== */
  const createPost = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("community_posts").insert({
        title,
        content,
        user_id: user!.id,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      setTitle("");
      setContent("");
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
      toast({ title: "Tópico criado!" });
    },
  });

  /* ==========================
     CRIAR RESPOSTA
     ========================== */
  const createReply = useMutation({
    mutationFn: async () => {
      if (!selectedPost || !user) return;

      const { data, error } = await supabase
        .from("community_replies")
        .insert({
          post_id: selectedPost,
          user_id: user.id,
          content: reply.trim(),
        })
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      setReply("");
      queryClient.invalidateQueries({
        queryKey: ["community-replies", selectedPost],
      });
      toast({ title: "Resposta enviada!" });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao enviar resposta",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  /* ==========================
     DELETAR POST
     ========================== */
  const deletePost = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("community_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
      setSelectedPost(null);
    },
  });

  /* ==========================
     DELETAR RESPOSTA
     ========================== */
  const deleteReply = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("community_replies").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["community-replies", selectedPost],
      });
    },
  });

  if (!user) {
    return (
      <div className="container py-8 text-center">
        Faça login para acessar a comunidade.
      </div>
    );
  }

  const activePost = ((posts || []) as CommunityPost[]).find((p) => p.id === selectedPost);
  const totalReplies = replies?.length || 0;

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="container py-6 space-y-5">
        {/* HEADER DA COMUNIDADE */}
        <div className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-medium text-primary">
                <Sparkles className="h-4 w-4" />
                r/ManhwaReader
              </div>
              <h1 className="mt-1 text-3xl font-bold">Comunidade</h1>
              <p className="text-muted-foreground">
                Descubra recomendações, teorias e discussões da comunidade.
              </p>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="rounded-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Criar post
                </Button>
              </DialogTrigger>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Criar post na comunidade</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <Input
                    placeholder="Um título interessante para chamar atenção"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                  <Textarea
                    className="min-h-36"
                    placeholder="Compartilhe uma recomendação, dúvida, teoria ou opinião..."
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                  />
                  <Button
                    className="w-full"
                    disabled={!title.trim() || !content.trim()}
                    onClick={() => createPost.mutate()}
                  >
                    Publicar
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* FEED E PAINEL LATERAL */}
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* FEED PRINCIPAL */}
          <main className="space-y-4">
            {/* BARRA DE PESQUISA E FILTROS */}
            <Card>
              <CardContent className="flex flex-col gap-3 p-3 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Buscar posts, autores ou assuntos"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="flex rounded-full bg-muted p-1">
                  <Button
                    variant={sortBy === "recentes" ? "secondary" : "ghost"}
                    className="rounded-full"
                    onClick={() => setSortBy("recentes")}
                  >
                    <Flame className="mr-2 h-4 w-4" />
                    Recentes
                  </Button>
                  <Button
                    variant={sortBy === "populares" ? "secondary" : "ghost"}
                    className="rounded-full"
                    onClick={() => setSortBy("populares")}
                  >
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Populares
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* LISTA DE POSTS */}
            {isLoading ? (
              <Card>
                <CardContent className="p-6 text-muted-foreground">
                  Carregando posts...
                </CardContent>
              </Card>
            ) : filteredPosts.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-muted-foreground">
                  Nenhum post encontrado.
                </CardContent>
              </Card>
            ) : (
              filteredPosts.map((post) => (
                <Card
                  key={post.id}
                  onClick={() => setSelectedPost(post.id)}
                  className={`overflow-hidden transition hover:border-primary/60 hover:shadow-md ${
                    selectedPost === post.id ? "border-primary shadow-md" : ""
                  }`}
                >
                  <CardContent className="grid grid-cols-[56px_1fr] p-0">
                    {/* CONTADOR DE UPVOTES */}
                    <div className="flex flex-col items-center gap-1 bg-muted/60 py-4 text-muted-foreground">
                      <ChevronUp className="h-5 w-5" />
                      <span className="text-sm font-bold text-foreground">
                        {getScore(post.id)}
                      </span>
                      <ChevronDown className="h-5 w-5" />
                    </div>

                    {/* CONTEÚDO DO POST */}
                    <div className="cursor-pointer space-y-3 p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="secondary" className="rounded-full">
                            Discussão
                          </Badge>
                          <span>postado por {post.profiles?.display_name || "Usuário"}</span>
                          <span>•</span>
                          <span>{formatDate(post.created_at)}</span>
                        </div>

                        {user.id === post.user_id && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              deletePost.mutate(post.id);
                            }}
                          >
                            <Trash2 size={16} />
                          </Button>
                        )}
                      </div>

                      <div className="flex gap-3">
                        <Avatar className="h-10 w-10 border">
                          <AvatarImage src={post.profiles?.avatar_url || undefined} />
                          <AvatarFallback>
                            {post.profiles?.display_name?.charAt(0)?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <h2 className="text-lg font-semibold leading-snug">{post.title}</h2>
                          <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">
                            {post.content}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1 rounded-full bg-muted px-3 py-1">
                          <MessageSquare className="h-4 w-4" />
                          Abrir comentários
                        </span>
                        <span>Compartilhar</span>
                        <span>Salvar</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </main>

          {/* PAINEL LATERAL (SOBRE E COMENTÁRIOS) */}
          <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
            {/* CARD DE INFORMAÇÕES DA COMUNIDADE */}
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-orange-500 to-red-500 p-4 text-primary-foreground">
                <p className="text-sm font-medium">Sobre a comunidade</p>
                <h2 className="text-xl font-bold">ManhwaGeek</h2>
              </div>
              <CardContent className="space-y-4 p-4">
                <p className="text-sm text-muted-foreground">
                  Um espaço para recomendações, reviews, dúvidas e teorias sobre suas obras favoritos.
                </p>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xl font-bold">{posts?.length || 0}</p>
                    <p className="text-xs text-muted-foreground">posts</p>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-xl font-bold">4</p>
                    <p className="text-xs text-muted-foreground">leitores</p>
                  </div>
                </div>
                <Button className="w-full rounded-full" onClick={() => setDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo post
                </Button>
              </CardContent>
            </Card>

            {/* SEÇÃO DE COMENTÁRIOS DO POST SELECIONADO */}
            <Card className="min-h-[360px]">
              {activePost ? (
                <>
                  <CardHeader>
                    <CardTitle className="text-lg">Comentários</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {totalReplies} resposta{totalReplies === 1 ? "" : "s"} em “{activePost.title}”
                    </p>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <p className="rounded-lg bg-muted p-3 text-sm whitespace-pre-wrap">
                      {activePost.content}
                    </p>

                    {((replies || []) as CommunityReply[]).map((r) => (
                      <div key={r.id} className="flex gap-3 rounded-lg border p-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={r.profiles?.avatar_url || undefined} />
                          <AvatarFallback>
                            {r.profiles?.display_name?.charAt(0)?.toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium">
                              {r.profiles?.display_name || "Usuário"}
                            </span>

                            {user.id === r.user_id && (
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => deleteReply.mutate(r.id)}
                              >
                                <Trash2 size={14} />
                              </Button>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground whitespace-pre-wrap">
                            {r.content}
                          </p>
                        </div>
                      </div>
                    ))}

                    <div className="flex gap-2">
                      <Textarea
                        className="min-h-24"
                        placeholder="Entrar na conversa..."
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                      />
                      <Button
                        size="icon"
                        disabled={!reply.trim()}
                        onClick={() => createReply.mutate()}
                      >
                        <Send size={18} />
                      </Button>
                    </div>
                  </CardContent>
                </>
              ) : (
                <CardContent className="flex h-full min-h-[360px] flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                  <Users className="h-10 w-10" />
                  <p>Selecione um post para ler e responder aos comentários.</p>
                </CardContent>
              )}
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}