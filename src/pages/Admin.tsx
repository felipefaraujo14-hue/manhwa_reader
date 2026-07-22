import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Edit, Upload, Image, Users, Bug, CheckCircle, Search, X } from "lucide-react";

const GENRES = ["Ação", "Romance", "Fantasia", "Drama", "Comédia", "Terror", "Aventura", "Sci-Fi"];

const normalizeSearchText = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

export default function Admin() {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return <div className="container py-8 text-center text-destructive font-bold">Acesso negado.</div>;
  }

  return (
    <div className="container py-6 space-y-6">
      <h1 className="text-2xl font-bold">Painel Admin</h1>
      <Tabs defaultValue="manhwas">
        <TabsList>
          <TabsTrigger value="manhwas">Manhwas</TabsTrigger>
          <TabsTrigger value="chapters">Capítulos</TabsTrigger>
          <TabsTrigger value="users">Usuários</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="manhwas">
          <ManhwaManager />
        </TabsContent>
        <TabsContent value="chapters">
          <ChapterManager />
        </TabsContent>
        <TabsContent value="users">
          <UsersList />
        </TabsContent>
        <TabsContent value="reports">
          <ReportsManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                MANHWA MANAGER                              */
/* -------------------------------------------------------------------------- */

function ManhwaManager() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [status, setStatus] = useState("ongoing");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [open, setOpen] = useState(false);

  const { data: manhwas } = useQuery({
    queryKey: ["admin-manhwas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("manhwas").select("*").order("title");
      if (error) throw error;
      return data || [];
    },
  });

  const saveManhwa = useMutation({
    mutationFn: async () => {
      let cover_url = undefined;

      if (coverFile) {
        const ext = coverFile.name.split(".").pop();
        const path = `covers/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage.from("covers").upload(path, coverFile);
        if (uploadError) throw uploadError;
        cover_url = supabase.storage.from("covers").getPublicUrl(path).data.publicUrl;
      }

      const payload = {
        title,
        synopsis,
        status,
        genres: selectedGenres,
        ...(cover_url && { cover_url }),
      };

      if (editingId) {
        const { error } = await supabase.from("manhwas").update(payload).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("manhwas").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-manhwas"] });
      toast({ title: editingId ? "Manhwa atualizado!" : "Manhwa criado!" });
      resetForm();
    },
    onError: (err: Error) => {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    },
  });

  const deleteManhwa = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("manhwas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-manhwas"] });
      toast({ title: "Manhwa excluído!" });
    },
  });

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setSynopsis("");
    setStatus("ongoing");
    setSelectedGenres([]);
    setCoverFile(null);
    setOpen(false);
  };

  const openEdit = (m: any) => {
    setEditingId(m.id);
    setTitle(m.title);
    setSynopsis(m.synopsis || "");
    setStatus(m.status || "ongoing");
    setSelectedGenres(m.genres || []);
    setOpen(true);
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Gerenciar Obras</h2>
        <Dialog open={open} onOpenChange={(val) => { if (!val) resetForm(); else setOpen(val); }}>
          <DialogTrigger asChild>
            <Button><Plus className="mr-2 h-4 w-4" /> Novo Manhwa</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingId ? "Editar Manhwa" : "Adicionar Manhwa"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <Input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
              <Textarea placeholder="Sinopse" value={synopsis} onChange={(e) => setSynopsis(e.target.value)} />
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ongoing">Em andamento</SelectItem>
                  <SelectItem value="completed">Completo</SelectItem>
                </SelectContent>
              </Select>
              <div>
                <label className="text-sm font-medium">Gêneros</label>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {GENRES.map((g) => (
                    <Badge
                      key={g}
                      variant={selectedGenres.includes(g) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleGenre(g)}
                    >
                      {g}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Capa</label>
                <Input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} className="mt-1" />
              </div>
              <Button className="w-full" onClick={() => saveManhwa.mutate()} disabled={!title || saveManhwa.isPending}>
                {saveManhwa.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {manhwas?.map((m) => (
          <Card key={m.id}>
            <CardContent className="p-3 flex items-center gap-3">
              <div className="w-12 h-16 bg-muted rounded overflow-hidden flex-shrink-0">
                {m.cover_url ? (
                  <img src={m.cover_url} alt={m.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Image className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{m.title}</h3>
                <p className="text-xs text-muted-foreground">
                  {m.status === "ongoing" ? "Em andamento" : "Completo"} · {m.genres?.join(", ") || "Sem gênero"}
                </p>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => openEdit(m)}><Edit className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" onClick={() => deleteManhwa.mutate(m.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                               CHAPTER MANAGER                              */
/* -------------------------------------------------------------------------- */

function ChapterManager() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selectedManhwa, setSelectedManhwa] = useState<string>("");
  const [chapterNumber, setChapterNumber] = useState("");
  const [chapterTitle, setChapterTitle] = useState("");
  const [pageFiles, setPageFiles] = useState<FileList | null>(null);
  const [manhwaSearch, setManhwaSearch] = useState("");
  const [chapterSearch, setChapterSearch] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data: manhwas } = useQuery({
    queryKey: ["admin-manhwas"],
    queryFn: async () => {
      const { data } = await supabase.from("manhwas").select("id, title").order("title");
      return data || [];
    },
  });

  const { data: chapters } = useQuery({
    queryKey: ["admin-chapters", selectedManhwa],
    enabled: !!selectedManhwa,
    queryFn: async () => {
      const { data } = await supabase
        .from("chapters")
        .select("*")
        .eq("manhwa_id", selectedManhwa)
        .order("chapter_number");
      return data || [];
    },
  });

  const filteredManhwas = (manhwas || []).filter((m) =>
    normalizeSearchText(m.title).includes(normalizeSearchText(manhwaSearch))
  );

  const selectedManhwaTitle = manhwas?.find((m) => m.id === selectedManhwa)?.title;
  const normalizedChapterSearch = normalizeSearchText(chapterSearch);

  const filteredChapters = (chapters || []).filter((ch) => {
    if (!normalizedChapterSearch) return true;

    const searchableText = normalizeSearchText(
      [
        `capitulo ${ch.chapter_number}`,
        `cap ${ch.chapter_number}`,
        String(ch.chapter_number),
        ch.title || "",
        `${ch.pages?.length || 0} paginas`,
      ].join(" ")
    );

    return searchableText.includes(normalizedChapterSearch);
  });

  const uploadChapter = async () => {
    if (!selectedManhwa || !chapterNumber || !pageFiles || pageFiles.length === 0) return;
    setUploading(true);
    try {
      const pages: string[] = [];
      for (let i = 0; i < pageFiles.length; i++) {
        const file = pageFiles[i];
        const ext = file.name.split(".").pop();
        const path = `${selectedManhwa}/${chapterNumber}/${String(i + 1).padStart(3, "0")}.${ext}`;
        const { error } = await supabase.storage.from("chapters").upload(path, file, { upsert: true });
        if (error) {
          toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
          setUploading(false);
          return;
        }
        pages.push(supabase.storage.from("chapters").getPublicUrl(path).data.publicUrl);
      }
      const { error } = await supabase.from("chapters").insert({
        manhwa_id: selectedManhwa,
        chapter_number: parseFloat(chapterNumber),
        title: chapterTitle || null,
        pages,
      });

      if (error) {
        toast({ title: "Erro ao salvar capítulo", description: error.message, variant: "destructive" });
      } else {
        setChapterNumber("");
        setChapterTitle("");
        setPageFiles(null);
        const fileInput = document.querySelector('input[type="file"][multiple]') as HTMLInputElement;
        if (fileInput) fileInput.value = "";
        qc.invalidateQueries({ queryKey: ["admin-chapters", selectedManhwa] });
        toast({ title: "Capítulo adicionado!" });
      }
    } catch (err: any) {
      toast({ title: "Erro inesperado", description: err?.message || "Tente novamente", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const deleteChapter = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("chapters").delete().eq("id", id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-chapters", selectedManhwa] });
      toast({ title: "Capítulo excluído" });
    },
  });

  return (
    <div className="space-y-4 mt-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Procurar e Selecionar Manhwa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Filtre a lista abaixo..."
              value={manhwaSearch}
              onChange={(e) => setManhwaSearch(e.target.value)}
              className="pl-9 pr-9"
            />
            {manhwaSearch && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                onClick={() => setManhwaSearch("")}
                aria-label="Limpar busca de manhwa"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Select
            value={selectedManhwa}
            onValueChange={(value) => {
              setSelectedManhwa(value);
              setChapterSearch("");
            }}
          >
            <SelectTrigger><SelectValue placeholder="Selecione um manhwa" /></SelectTrigger>
            <SelectContent>
              {filteredManhwas.length > 0 ? (
                filteredManhwas.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>
                ))
              ) : (
                <div className="px-2 py-3 text-sm text-muted-foreground">Nenhum manhwa encontrado.</div>
              )}
            </SelectContent>
          </Select>
          {selectedManhwaTitle && (
            <p className="text-xs text-muted-foreground">Selecionado: <strong>{selectedManhwaTitle}</strong></p>
          )}
        </CardContent>
      </Card>

      {selectedManhwa && (
        <>
          <Card>
            <CardHeader><CardTitle className="text-base">Adicionar Capítulo</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input
                  placeholder="Número do capítulo"
                  type="number"
                  value={chapterNumber}
                  onChange={(e) => setChapterNumber(e.target.value)}
                />
                <Input
                  placeholder="Título (opcional)"
                  value={chapterTitle}
                  onChange={(e) => setChapterTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Páginas (imagens)</label>
                <Input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setPageFiles(e.target.files)}
                  className="mt-1"
                />
              </div>
              <Button onClick={uploadChapter} disabled={uploading || !chapterNumber || !pageFiles?.length}>
                <Upload className="mr-2 h-4 w-4" /> {uploading ? "Enviando..." : "Enviar Capítulo"}
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="font-medium">Capítulos existentes</h3>
              <span className="text-xs text-muted-foreground">
                {filteredChapters.length} de {chapters?.length || 0} capítulo(s)
              </span>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por número, título ou quantidade de páginas..."
                value={chapterSearch}
                onChange={(e) => setChapterSearch(e.target.value)}
                className="pl-9 pr-9"
              />
              {chapterSearch && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
                  onClick={() => setChapterSearch("")}
                  aria-label="Limpar busca de capítulos"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            {!chapters || chapters.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum capítulo cadastrado nesta obra.</p>
            ) : filteredChapters.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum capítulo encontrado para “{chapterSearch}”.</p>
            ) : (
              filteredChapters.map((ch) => (
                <div key={ch.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm">
                    Cap. {ch.chapter_number}
                    {ch.title ? ` - ${ch.title}` : ""} ({ch.pages?.length || 0} páginas)
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => deleteChapter.mutate(ch.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 USERS LIST                                 */
/* -------------------------------------------------------------------------- */

function UsersList() {
  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*");
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground mt-4">Carregando usuários...</p>;

  return (
    <div className="space-y-3 mt-4">
      {users?.map((u) => (
        <div key={u.id} className="flex items-center gap-3 p-3 border rounded-lg">
          <Avatar className="h-9 w-9">
            <AvatarImage src={u.avatar_url || undefined} />
            <AvatarFallback>{u.display_name?.[0]?.toUpperCase() || "U"}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{u.display_name || "Usuário Sem Nome"}</p>
            <p className="text-xs text-muted-foreground">ID: {u.id}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                               REPORTS MANAGER                              */
/* -------------------------------------------------------------------------- */

function ReportsManager() {
  const { data: reports, isLoading } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: async () => {
      const { data, error } = await supabase.from("reports").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground mt-4">Carregando denúncias...</p>;

  return (
    <div className="space-y-3 mt-4">
      {!reports || reports.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum report cadastrado.</p>
      ) : (
        reports.map((r) => (
          <div key={r.id} className="p-3 border rounded-lg space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{r.reason || "Sem motivo"}</span>
              <Badge variant="outline">{r.status || "Pendente"}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{r.description || "Sem descrição adicional"}</p>
          </div>
        ))
      )}
    </div>
  );
}