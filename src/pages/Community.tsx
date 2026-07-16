import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, MessageSquare, Send, Trash2 } from "lucide-react";

export default function Community() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [reply, setReply] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<string | null>(null);

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
    }
  });

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
 profiles!community_posts_user_id_fkey(
   display_name,
   avatar_url
 )
`)
        .eq("post_id", selectedPost)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    }
  });

  /* ==========================
     CRIAR TÓPICO
     ========================== */
  const createPost = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("community_posts")
        .insert({
          title,
          content,
          user_id: user!.id
        });

      if (error) throw error;
    },
    onSuccess: () => {
      setTitle("");
      setContent("");
      setDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
      toast({ title: "Tópico criado!" });
    }
  });

  /* ==========================
     CRIAR RESPOSTA
     ========================== */
  const createReply = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Usuário não autenticado");
      if (!selectedPost) throw new Error("Nenhum tópico selecionado");
      if (!reply.trim()) throw new Error("Resposta vazia");

      const { data, error } = await supabase
        .from("community_replies")
        .insert({
          post_id: selectedPost,
          user_id: user.id,
          content: reply.trim()
        })
        .select();

      if (error) {
        console.log("ERRO AO ENVIAR RESPOSTA:", error);
        throw error;
      }

      console.log("RESPOSTA CRIADA:", data);
      return data;
    },
    onSuccess: () => {
      setReply("");
      queryClient.invalidateQueries({
        queryKey: ["community-replies", selectedPost]
      });
      toast({ title: "Resposta enviada!" });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar resposta",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  /* ==========================
     DELETAR POST
     ========================== */
  const deletePost = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("community_posts")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-posts"] });
      setSelectedPost(null);
    }
  });

  /* ==========================
     DELETAR RESPOSTA
     ========================== */
  const deleteReply = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("community_replies")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["community-replies", selectedPost]
      });
    }
  });

  if (!user) {
    return (
      <div className="container py-8 text-center">
        Faça login para acessar a comunidade.
      </div>
    );
  }

  const activePost = posts?.find((p: any) => p.id === selectedPost);

  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Comunidade</h1>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Tópico
            </Button>
          </DialogTrigger>

          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar Tópico</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <Input
                placeholder="Título"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <Textarea
                placeholder="Conteúdo..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
              <Button
                disabled={!title.trim() || !content.trim()}
                onClick={() => createPost.mutate()}
              >
                Publicar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-[1fr_1.2fr] gap-6">
        {/* LISTA DE POSTS */}
        <div className="space-y-3">
          {isLoading ? (
            <p className="text-muted-foreground">Carregando...</p>
          ) : !posts || posts.length === 0 ? (
            <p className="text-muted-foreground">Nenhum tópico ainda.</p>
          ) : (
            posts.map((post: any) => (
              <Card
                key={post.id}
                onClick={() => setSelectedPost(post.id)}
                className={`cursor-pointer hover:bg-muted/50 ${
                  selectedPost === post.id ? "ring-2 ring-primary" : ""
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={post.profiles?.avatar_url || undefined} />
                      <AvatarFallback>
                        {post.profiles?.display_name?.charAt(0)?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <h3 className="font-medium">{post.title}</h3>
                      <p className="text-xs text-muted-foreground">
                        {post.profiles?.display_name || "Usuário"}
                        {" · "}
                        {new Date(post.created_at).toLocaleDateString("pt-BR")}
                      </p>
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
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* AREA DO POST */}
        <Card className="min-h-[400px]">
          {activePost ? (
            <>
              <CardHeader>
                <CardTitle>{activePost.title}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  por {activePost.profiles?.display_name || "Usuário"}
                </p>
              </CardHeader>

              <CardContent className="space-y-5">
                <p className="whitespace-pre-wrap">{activePost.content}</p>

                <div className="border-t pt-4 space-y-4">
                  <h3 className="flex items-center gap-2 font-medium">
                    <MessageSquare size={18} />
                    Respostas
                  </h3>

                  {replies?.map((r: any) => (
                    <div key={r.id} className="border rounded p-3 flex gap-3">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={r.profiles?.avatar_url || undefined} />
                        <AvatarFallback>
                          {r.profiles?.display_name?.charAt(0)?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <div className="flex justify-between">
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
                        <p className="text-sm mt-1">{r.content}</p>
                      </div>
                    </div>
                  ))}

                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Escreva uma resposta..."
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
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="h-full flex items-center justify-center text-muted-foreground">
              Selecione um tópico
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}