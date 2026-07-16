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
import { Plus, Trash2, Edit, Upload, Image, Users, Bug, CheckCircle } from "lucide-react";

const GENRES = ["Ação", "Romance", "Fantasia", "Drama", "Comédia", "Terror", "Aventura", "Sci-Fi"];

export default function Admin() {
  const { isAdmin } = useAuth();

  if (!isAdmin) return <div className="container py-8 text-center text-destructive font-bold">Acesso negado.</div>;

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
        <TabsContent value="manhwas"><ManhwaManager /></TabsContent>
        <TabsContent value="chapters"><ChapterManager /></TabsContent>
        <TabsContent value="users"><UsersList /></TabsContent>
        <TabsContent value="reports"><ReportsManager /></TabsContent>
      </Tabs>
    </div>
  );
}

function UsersList() {
  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*, user_roles(role)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-3 mt-4">
      <h3 className="font-medium flex items-center gap-2"><Users className="h-4 w-4" /> Usuários cadastrados ({users?.length || 0})</h3>
      {isLoading ? <p className="text-muted-foreground text-sm">Carregando...</p> : (
        <div className="grid gap-2">
          {users?.map((u: any) => (
            <Card key={u.id}>
              <CardContent className="flex items-center gap-3 p-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={u.avatar_url || undefined} />
                  <AvatarFallback>{u.display_name?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{u.display_name || "Sem nome"}</p>
                  <p className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString("pt-BR")}</p>
                </div>
                <div className="flex gap-1">
                  {u.user_roles?.map((r: any, i: number) => (
                    <Badge key={i} variant={r.role === "admin" ? "default" : "secondary"} className="text-xs">{r.role}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ReportsManager() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: reports, isLoading } = useQuery({
    queryKey: ["admin-reports"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      // Fetch profile names for each report
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map((r: any) => r.user_id))];
        const { data: profiles } = await supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", userIds);
        const profileMap = new Map(profiles?.map((p: any) => [p.user_id, p]) || []);
        return data.map((r: any) => ({ ...r, profile: profileMap.get(r.user_id) || null }));
      }
      return data;
    },
  });

  const resolveReport = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("reports").update({ status: "resolved", resolved_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reports"] });
      toast({ title: "Report resolvido" });
    },
  });

  return (
    <div className="space-y-3 mt-4">
      <h3 className="font-medium flex items-center gap-2"><Bug className="h-4 w-4" /> Reports ({reports?.length || 0})</h3>
      {isLoading ? <p className="text-muted-foreground text-sm">Carregando...</p> : !reports || reports.length === 0 ? (
        <p className="text-muted-foreground text-sm">Nenhum report recebido.</p>
      ) : (
        <div className="grid gap-2">
          {reports.map((r: any) => (
            <Card key={r.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-medium text-sm">{r.subject}</h4>
                    <p className="text-xs text-muted-foreground">
                      por {r.profile?.display_name || "Anônimo"} · {new Date(r.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={r.status === "pending" ? "destructive" : "secondary"}>{r.status === "pending" ? "Pendente" : "Resolvido"}</Badge>
                    {r.status === "pending" && (
                      <Button size="sm" variant="outline" onClick={() => resolveReport.mutate(r.id)}>
                        <CheckCircle className="mr-1 h-3 w-3" /> Resolver
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{r.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function ManhwaManager() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [synopsis, setSynopsis] = useState("");
  const [author, setAuthor] = useState("");
  const [status, setStatus] = useState("ongoing");
  const [genres, setGenres] = useState<string[]>([]);
  const [featured, setFeatured] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);

  const { data: manhwas } = useQuery({
    queryKey: ["admin-manhwas"],
    queryFn: async () => {
      const { data } = await supabase.from("manhwas").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const resetForm = () => {
    setEditId(null); setTitle(""); setSynopsis(""); setAuthor(""); setStatus("ongoing"); setGenres([]); setFeatured(false); setCoverFile(null);
  };

  const openEdit = (m: any) => {
    setEditId(m.id); setTitle(m.title); setSynopsis(m.synopsis || ""); setAuthor(m.author || "");
    setStatus(m.status); setGenres(m.genres || []); setFeatured(m.featured || false);
    setDialogOpen(true);
  };

  const saveManhwa = useMutation({
    mutationFn: async () => {
      let cover_url: string | undefined;
      if (coverFile) {
        const ext = coverFile.name.split(".").pop();
        const path = `${Date.now()}.${ext}`;
        const { error } = await supabase.storage.from("covers").upload(path, coverFile);
        if (error) throw error;
        cover_url = supabase.storage.from("covers").getPublicUrl(path).data.publicUrl;
      }
      const payload = { title, synopsis, author, status, genres, featured, ...(cover_url ? { cover_url } : {}) };
      if (editId) {
        const { error } = await supabase.from("manhwas").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("manhwas").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-manhwas"] });
      qc.invalidateQueries({ queryKey: ["manhwas"] });
      resetForm(); setDialogOpen(false);
      toast({ title: editId ? "Manhwa atualizado!" : "Manhwa adicionado!" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const deleteManhwa = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("manhwas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-manhwas"] });
      toast({ title: "Manhwa excluído" });
    },
  });

  const toggleGenre = (g: string) => setGenres((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]);

  return (
    <div className="space-y-4 mt-4">
      <Dialog open={dialogOpen} onOpenChange={(o) => { setDialogOpen(o); if (!o) resetForm(); }}>
        <DialogTrigger asChild>
          <Button><Plus className="mr-2 h-4 w-4" /> Adicionar Manhwa</Button>
        </DialogTrigger>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Editar" : "Novo"} Manhwa</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Textarea placeholder="Sinopse" value={synopsis} onChange={(e) => setSynopsis(e.target.value)} />
            <Input placeholder="Autor" value={author} onChange={(e) => setAuthor(e.target.value)} />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ongoing">Em andamento</SelectItem>
                <SelectItem value="completed">Completo</SelectItem>
              </SelectContent>
            </Select>
            <div>
              <label className="text-sm font-medium">Gêneros</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {GENRES.map((g) => (
                  <Badge key={g} variant={genres.includes(g) ? "default" : "outline"} className="cursor-pointer" onClick={() => toggleGenre(g)}>
                    {g}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={featured} onCheckedChange={setFeatured} />
              <label className="text-sm">Destaque</label>
            </div>
            <div>
              <label className="text-sm font-medium">Capa</label>
              <Input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} className="mt-1" />
            </div>
            <Button onClick={() => title.trim() && saveManhwa.mutate()} disabled={!title.trim()}>
              {editId ? "Salvar" : "Adicionar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="grid gap-3">
        {manhwas?.map((m: any) => (
          <Card key={m.id}>
            <CardContent className="flex items-center gap-4 p-4">
              <div className="h-16 w-12 rounded overflow-hidden bg-muted shrink-0">
                {m.cover_url ? <img src={m.cover_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Image className="h-4 w-4 text-muted-foreground" /></div>}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium truncate">{m.title}</h3>
                <p className="text-xs text-muted-foreground">{m.status === "ongoing" ? "Em andamento" : "Completo"} · {m.genres?.join(", ") || "Sem gênero"}</p>
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

function ChapterManager() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [selectedManhwa, setSelectedManhwa] = useState<string>("");
  const [chapterNumber, setChapterNumber] = useState("");
  const [chapterTitle, setChapterTitle] = useState("");
  const [pageFiles, setPageFiles] = useState<FileList | null>(null);
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
      const { data } = await supabase.from("chapters").select("*").eq("manhwa_id", selectedManhwa).order("chapter_number");
      return data || [];
    },
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
        if (error) { toast({ title: "Erro no upload", description: error.message, variant: "destructive" }); setUploading(false); return; }
        pages.push(supabase.storage.from("chapters").getPublicUrl(path).data.publicUrl);
      }
      const { error } = await supabase.from("chapters").insert({
        manhwa_id: selectedManhwa, chapter_number: parseFloat(chapterNumber), title: chapterTitle || null, pages,
      });
      if (error) {
        toast({ title: "Erro ao salvar capítulo", description: error.message, variant: "destructive" });
      } else {
        setChapterNumber(""); setChapterTitle(""); setPageFiles(null);
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
      <Select value={selectedManhwa} onValueChange={setSelectedManhwa}>
        <SelectTrigger><SelectValue placeholder="Selecione um manhwa" /></SelectTrigger>
        <SelectContent>
          {manhwas?.map((m) => <SelectItem key={m.id} value={m.id}>{m.title}</SelectItem>)}
        </SelectContent>
      </Select>

      {selectedManhwa && (
        <>
          <Card>
            <CardHeader><CardTitle className="text-base">Adicionar Capítulo</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Input placeholder="Número do capítulo" type="number" value={chapterNumber} onChange={(e) => setChapterNumber(e.target.value)} />
                <Input placeholder="Título (opcional)" value={chapterTitle} onChange={(e) => setChapterTitle(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-medium">Páginas (imagens)</label>
                <Input type="file" accept="image/*" multiple onChange={(e) => setPageFiles(e.target.files)} className="mt-1" />
              </div>
              <Button onClick={uploadChapter} disabled={uploading || !chapterNumber || !pageFiles?.length}>
                <Upload className="mr-2 h-4 w-4" /> {uploading ? "Enviando..." : "Enviar Capítulo"}
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <h3 className="font-medium">Capítulos existentes</h3>
            {!chapters || chapters.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum capítulo.</p>
            ) : (
              chapters.map((ch) => (
                <div key={ch.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm">Cap. {ch.chapter_number}{ch.title ? ` - ${ch.title}` : ""} ({ch.pages?.length || 0} páginas)</span>
                  <Button variant="ghost" size="icon" onClick={() => deleteChapter.mutate(ch.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
