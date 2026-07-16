import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Users, Shield, LogOut, User, Bug, Send } from "lucide-react";

export function Header() {
  const { user, isAdmin, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [reportOpen, setReportOpen] = useState(false);
  const [reportSubject, setReportSubject] = useState("");
  const [reportDesc, setReportDesc] = useState("");
  const [sending, setSending] = useState(false);

  const submitReport = async () => {
    if (!reportSubject.trim() || !reportDesc.trim() || !user) return;
    setSending(true);
    const { error } = await supabase.from("reports").insert({ user_id: user.id, subject: reportSubject, description: reportDesc });
    setSending(false);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    setReportSubject(""); setReportDesc(""); setReportOpen(false);
    toast({ title: "Report enviado!", description: "Obrigado pelo feedback." });
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center gap-2 font-bold text-lg">
              <BookOpen className="h-5 w-5 text-primary" />
              <span>ManhwaReader</span>
            </Link>
            {user && (
              <nav className="hidden md:flex items-center gap-4 text-sm">
                <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">Início</Link>
                <Link to="/community" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" /> Comunidade
                </Link>
                {isAdmin && (
                  <Link to="/admin" className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                    <Shield className="h-3.5 w-3.5" /> Admin
                  </Link>
                )}
              </nav>
            )}
          </div>
          <div className="flex items-center gap-2">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback>{profile?.display_name?.[0]?.toUpperCase() || "U"}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    <User className="mr-2 h-4 w-4" /> Perfil
                  </DropdownMenuItem>
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => navigate("/admin")}>
                      <Shield className="mr-2 h-4 w-4" /> Admin
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setReportOpen(true)}>
                    <Bug className="mr-2 h-4 w-4" /> Reportar Bug
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="mr-2 h-4 w-4" /> Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button size="sm" onClick={() => navigate("/auth")}>Entrar</Button>
            )}
          </div>
        </div>
      </header>

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Reportar Bug / Feedback</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Input placeholder="Assunto" value={reportSubject} onChange={(e) => setReportSubject(e.target.value)} />
            <Textarea placeholder="Descreva o problema ou sugestão..." value={reportDesc} onChange={(e) => setReportDesc(e.target.value)} />
            <Button onClick={submitReport} disabled={sending || !reportSubject.trim() || !reportDesc.trim()}>
              <Send className="mr-2 h-4 w-4" /> {sending ? "Enviando..." : "Enviar Report"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
