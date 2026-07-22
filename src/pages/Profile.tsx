import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  BookMarked,
  CalendarDays,
  Camera,
  Clock3,
  Copy,
  Heart,
  LibraryBig,
  Mail,
  Save,
  Search,
  Sparkles,
  Trash2,
  TrendingUp,
  UserRound
} from "lucide-react";

type FavoriteWithManhwa = {
  id: string;
  created_at: string;
  manhwa_id: string;
  manhwas: {
    author: string | null;
    cover_url: string | null;
    genres: string[] | null;
    status: string;
    title: string;
    view_count: number | null;
  } | null;
};

const formatDate = (date?: string) =>
  date
    ? new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      }).format(new Date(date))
    : "Agora";

export default function Profile() {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [favoriteSearch, setFavoriteSearch] = useState("");
  const [favoriteStatus, setFavoriteStatus] = useState("all");

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setBio(profile.bio || "");
    }
  }, [profile]);

  const { data: favorites, isLoading: loadingFavorites } = useQuery({
    queryKey: ["my-favorites", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("favorites")
        .select("*, manhwas(author, cover_url, genres, status, title, view_count)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.log(error);
        return [];
      }

      return (data || []) as FavoriteWithManhwa[];
    }
  });

  const removeFavorite = useMutation({
    mutationFn: async (manhwaId: string) => {
      if (!user) return;

      const { error } = await supabase
        .from("favorites")
        .delete()
        .eq("manhwa_id", manhwaId)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-favorites", user?.id] });
      toast({ title: "Favorito removido" });
    },
    onError: (error) => {
      toast({
        title: "Erro ao remover favorito",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const filteredFavorites = useMemo(() => {
    const search = favoriteSearch.toLowerCase().trim();

    return (favorites || []).filter((favorite) => {
      const title = favorite.manhwas?.title?.toLowerCase() || "";
      const author = favorite.manhwas?.author?.toLowerCase() || "";
      const matchesSearch = !search || title.includes(search) || author.includes(search);
      const matchesStatus = favoriteStatus === "all" || favorite.manhwas?.status === favoriteStatus;

      return matchesSearch && matchesStatus;
    });
  }, [favoriteSearch, favoriteStatus, favorites]);

  const profileCompletion = useMemo(() => {
    const checks = [profile?.avatar_url, displayName.trim(), bio.trim(), user?.email];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [bio, displayName, profile?.avatar_url, user?.email]);

  const totalViews = useMemo(
    () => (favorites || []).reduce((total, item) => total + (item.manhwas?.view_count || 0), 0),
    [favorites]
  );

  const favoriteGenres = useMemo(() => {
    const counter = new Map<string, number>();

    (favorites || []).forEach((favorite) => {
      favorite.manhwas?.genres?.forEach((genre) => {
        counter.set(genre, (counter.get(genre) || 0) + 1);
      });
    });

    return [...counter.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [favorites]);

  const copyEmail = async () => {
    if (!user?.email) return;

    await navigator.clipboard.writeText(user.email);
    toast({ title: "E-mail copiado!" });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);

    try {
      const path = `${user.id}/avatar.png`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, {
          upsert: true,
          contentType: file.type
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);

      const publicUrl = data.publicUrl;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          avatar_url: `${publicUrl}?t=${Date.now()}`
        })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      await refreshProfile();
      toast({ title: "Foto atualizada!" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Tente novamente em alguns instantes.";

      console.error(error);
      toast({
        title: "Erro ao atualizar foto",
        description: message,
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName,
        bio
      })
      .eq("user_id", user.id);

    setSaving(false);

    if (error) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive"
      });
    } else {
      await refreshProfile();
      toast({ title: "Perfil atualizado!" });
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-[calc(100vh-4rem)] overflow-hidden bg-[radial-gradient(circle_at_top_left,hsl(var(--primary)/0.2),transparent_30%),radial-gradient(circle_at_bottom_right,hsl(var(--accent)/0.18),transparent_28%)]">
      <div className="container max-w-6xl py-8 space-y-8">
        <section className="relative overflow-hidden rounded-[2rem] border bg-card/70 p-6 shadow-2xl shadow-primary/10 backdrop-blur md:p-8">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -bottom-24 left-20 h-56 w-56 rounded-full bg-violet-500/10 blur-3xl" />

          <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div className="flex flex-col gap-6 md:flex-row md:items-center">
              <div className="relative mx-auto md:mx-0">
                <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary via-fuchsia-500 to-cyan-400 blur-xl opacity-50" />
                <Avatar className="relative h-32 w-32 border-4 border-background shadow-2xl">
                  <AvatarImage
                    src={profile?.avatar_url ? `${profile.avatar_url}?t=${Date.now()}` : undefined}
                    alt="Avatar"
                  />
                  <AvatarFallback className="bg-primary/20 text-4xl font-bold">
                    {profile?.display_name?.charAt(0)?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>

                <label className="absolute bottom-2 right-1 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-white/20 bg-primary text-primary-foreground shadow-lg transition hover:scale-105 hover:bg-primary/90">
                  <Camera className="h-5 w-5" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleAvatarUpload}
                    disabled={uploading}
                  />
                </label>
              </div>

              <div className="space-y-4 text-center md:text-left">
                <div className="space-y-2">
                  <Badge className="gap-1 rounded-full bg-primary/15 text-primary hover:bg-primary/20">
                    <Sparkles className="h-3.5 w-3.5" /> Leitor Premium
                  </Badge>
                  <h1 className="text-4xl font-black tracking-tight md:text-5xl">
                    {profile?.display_name || "Seu perfil"}
                  </h1>
                  <p className="mx-auto max-w-xl text-muted-foreground md:mx-0">
                    {profile?.bio || "Personalize sua bio, organize favoritos e acompanhe seu gosto por manhwas em um painel mais completo."}
                  </p>
                </div>

                <div className="flex flex-wrap justify-center gap-3 md:justify-start">
                  <Button asChild className="rounded-full shadow-lg shadow-primary/20">
                    <Link to="/">Explorar biblioteca</Link>
                  </Button>
                  <Button variant="outline" className="rounded-full bg-background/40" onClick={copyEmail}>
                    <Copy className="mr-2 h-4 w-4" /> Copiar e-mail
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <StatCard icon={Heart} label="Favoritos" value={favorites?.length || 0} />
              <StatCard icon={TrendingUp} label="Views somadas" value={totalViews.toLocaleString("pt-BR")} />
              <StatCard icon={CalendarDays} label="Membro desde" value={formatDate(user.created_at)} />
              <StatCard icon={UserRound} label="Perfil" value={`${profileCompletion}%`} />
            </div>
          </div>
        </section>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 rounded-2xl bg-card/70 p-1 backdrop-blur md:w-[520px]">
            <TabsTrigger value="overview" className="rounded-xl">Visão geral</TabsTrigger>
            <TabsTrigger value="edit" className="rounded-xl">Editar perfil</TabsTrigger>
            <TabsTrigger value="favorites" className="rounded-xl">Favoritos</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <Card className="overflow-hidden border-white/10 bg-card/80 shadow-xl backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><BookMarked className="h-5 w-5 text-primary" /> Progresso do perfil</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Completar perfil</span>
                    <span className="font-semibold">{profileCompletion}%</span>
                  </div>
                  <Progress value={profileCompletion} className="h-3" />
                </div>
                <div className="grid gap-3 text-sm">
                  <CheckRow done={!!profile?.avatar_url} label="Adicionar foto de perfil" />
                  <CheckRow done={!!displayName.trim()} label="Definir nome de exibição" />
                  <CheckRow done={!!bio.trim()} label="Escrever uma bio" />
                  <CheckRow done={!!user.email} label="Conta com e-mail conectado" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/10 bg-card/80 shadow-xl backdrop-blur">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><LibraryBig className="h-5 w-5 text-primary" /> Gêneros favoritos</CardTitle>
              </CardHeader>
              <CardContent>
                {favoriteGenres.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Favorite alguns títulos para descobrir seus gêneros mais lidos.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {favoriteGenres.map(([genre, count]) => (
                      <Badge key={genre} variant="secondary" className="rounded-full px-3 py-1">
                        {genre} · {count}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="edit">
            <Card className="border-white/10 bg-card/80 shadow-xl backdrop-blur">
              <CardHeader>
                <CardTitle>Editar dados</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome de exibição</label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Como você quer aparecer?"
                    className="h-12 rounded-xl bg-background/60"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">E-mail</label>
                  <div className="flex gap-2">
                    <Input value={user.email || ""} readOnly className="h-12 rounded-xl bg-background/60" />
                    <Button variant="outline" size="icon" className="h-12 w-12 rounded-xl" onClick={copyEmail}>
                      <Mail className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Bio</label>
                  <Textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Conte algo sobre você, seus gêneros favoritos ou o que está lendo agora..."
                    className="min-h-32 rounded-xl bg-background/60"
                    maxLength={180}
                  />
                  <p className="text-right text-xs text-muted-foreground">{bio.length}/180</p>
                </div>

                <div className="md:col-span-2">
                  <Button onClick={handleSave} disabled={saving} className="h-12 rounded-full px-8">
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? "Salvando..." : "Salvar alterações"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="favorites">
            <Card className="border-white/10 bg-card/80 shadow-xl backdrop-blur">
              <CardHeader className="gap-4 md:flex-row md:items-center md:justify-between">
                <CardTitle>Meus Favoritos</CardTitle>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={favoriteSearch}
                      onChange={(e) => setFavoriteSearch(e.target.value)}
                      placeholder="Buscar título ou autor"
                      className="h-11 rounded-full bg-background/60 pl-9"
                    />
                  </div>
                  <select
                    value={favoriteStatus}
                    onChange={(e) => setFavoriteStatus(e.target.value)}
                    className="h-11 rounded-full border border-input bg-background/60 px-4 text-sm"
                  >
                    <option value="all">Todos</option>
                    <option value="ongoing">Em andamento</option>
                    <option value="completed">Completos</option>
                  </select>
                </div>
              </CardHeader>

              <CardContent>
                {loadingFavorites ? (
                  <p className="text-muted-foreground">Carregando favoritos...</p>
                ) : filteredFavorites.length === 0 ? (
                  <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
                    Nenhum favorito encontrado com esses filtros.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                    {filteredFavorites.map((favorite) => (
                      <article key={favorite.id} className="group relative overflow-hidden rounded-2xl border bg-background/50 shadow-lg transition hover:-translate-y-1 hover:border-primary/40 hover:shadow-primary/10">
                        <Link to={`/manhwa/${favorite.manhwa_id}`}>
                          <div className="aspect-[3/4] overflow-hidden bg-muted">
                            {favorite.manhwas?.cover_url ? (
                              <img
                                src={favorite.manhwas.cover_url}
                                alt={favorite.manhwas.title}
                                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">Sem capa</div>
                            )}
                          </div>
                          <div className="space-y-2 p-3">
                            <p className="line-clamp-2 text-sm font-semibold">{favorite.manhwas?.title}</p>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock3 className="h-3.5 w-3.5" /> {formatDate(favorite.created_at)}
                            </div>
                          </div>
                        </Link>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute right-2 top-2 h-8 w-8 rounded-full opacity-0 transition group-hover:opacity-100"
                          onClick={() => removeFavorite.mutate(favorite.manhwa_id)}
                          disabled={removeFavorite.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </article>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Heart; label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-background/50 p-4 shadow-lg backdrop-blur">
      <Icon className="mb-3 h-5 w-5 text-primary" />
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function CheckRow({ done, label }: { done: boolean; label: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-background/50 px-4 py-3">
      <span>{label}</span>
      <Badge variant={done ? "default" : "outline"} className="rounded-full">
        {done ? "OK" : "Pendente"}
      </Badge>
    </div>
  );
}
