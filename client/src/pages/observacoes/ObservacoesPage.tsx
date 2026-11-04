import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageSquarePlus,
  Sparkles,
  Trash2,
  Loader2,
  ImagePlus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  OBSERVACAO_CATEGORIES,
  OBSERVACAO_STATUSES,
  LABELS,
  type ObservacaoCategory,
} from "@shared/const";

const categoriaColor: Record<string, string> = {
  reclamacao: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  melhoria: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  bug: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  caracteristica:
    "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
};

const statusColor: Record<string, string> = {
  aberta: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  em_analise: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  resolvida:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
};

export function ObservacoesPage() {
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState<ObservacaoCategory>("melhoria");
  const [area, setArea] = useState("");
  const [imagens, setImagens] = useState<string[]>([]);
  const [ideia, setIdeia] = useState("");

  const { data: lista, isLoading, refetch } = trpc.observacoes.list.useQuery();

  const createMut = trpc.observacoes.create.useMutation({
    onSuccess: () => {
      toast.success("Observação registrada. Obrigado pelo feedback!");
      setOpen(false);
      setTitulo("");
      setDescricao("");
      setCategoria("melhoria");
      setArea("");
      setImagens([]);
      setIdeia("");
      refetch();
    },
    onError: err => toast.error(err.message),
  });

  const statusMut = trpc.observacoes.updateStatus.useMutation({
    onSuccess: () => refetch(),
    onError: err => toast.error(err.message),
  });

  const deleteMut = trpc.observacoes.delete.useMutation({
    onSuccess: () => refetch(),
    onError: err => toast.error(err.message),
  });

  const organizarMut = trpc.observacoes.organizarComAtena.useMutation({
    onSuccess: res => {
      setTitulo(res.titulo);
      setDescricao(res.descricao);
      if ((OBSERVACAO_CATEGORIES as readonly string[]).includes(res.categoria))
        setCategoria(res.categoria as ObservacaoCategory);
      setArea(res.area);
      toast.success("A Atena organizou sua ideia. Revise e salve.");
    },
    onError: err => toast.error(err.message),
  });

  const onPaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (!file) continue;
        const reader = new FileReader();
        reader.onload = () => {
          setImagens(prev =>
            prev.length >= 8 ? prev : [...prev, String(reader.result)]
          );
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const submit = () => {
    if (!titulo.trim() || !descricao.trim()) {
      toast.error("Preencha título e descrição.");
      return;
    }
    createMut.mutate({
      titulo,
      descricao,
      categoria,
      area: area || undefined,
      imagens: imagens.length ? imagens : undefined,
    });
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Observações"
        description="Canal interno: registre bugs, reclamações, melhorias e ideias sobre o sistema."
        icon={MessageSquarePlus}
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <MessageSquarePlus className="h-4 w-4 mr-2" />
                Nova observação
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Nova observação</DialogTitle>
              </DialogHeader>

              {/* Organizar com a Atena */}
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
                <Label className="text-xs flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Descreva à vontade e deixe a Atena estruturar
                </Label>
                <Textarea
                  value={ideia}
                  onChange={e => setIdeia(e.target.value)}
                  placeholder="Ex.: tá difícil achar o botão de salvar na tela de proposta…"
                  className="min-h-[60px] resize-none"
                />
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={!ideia.trim() || organizarMut.isPending}
                  onClick={() => organizarMut.mutate({ ideia })}
                >
                  {organizarMut.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-2" />
                  )}
                  Organizar com a Atena
                </Button>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Título</Label>
                  <Input value={titulo} onChange={e => setTitulo(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label>Descrição</Label>
                  <Textarea
                    value={descricao}
                    onChange={e => setDescricao(e.target.value)}
                    onPaste={onPaste}
                    placeholder="Contexto, comportamento esperado e critério de pronto. Cole prints com Ctrl+V."
                    className="min-h-[100px]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Categoria</Label>
                    <Select
                      value={categoria}
                      onValueChange={v => setCategoria(v as ObservacaoCategory)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OBSERVACAO_CATEGORIES.map(c => (
                          <SelectItem key={c} value={c}>
                            {LABELS.observacaoCategories[c]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Área (opcional)</Label>
                    <Input
                      value={area}
                      onChange={e => setArea(e.target.value)}
                      placeholder="Ex.: Veículos"
                    />
                  </div>
                </div>

                {imagens.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {imagens.map((src, i) => (
                      <div key={i} className="relative">
                        <img
                          src={src}
                          alt={`print ${i + 1}`}
                          className="h-16 w-16 object-cover rounded border"
                        />
                        <button
                          onClick={() =>
                            setImagens(prev => prev.filter((_, j) => j !== i))
                          }
                          className="absolute -top-1 -right-1 bg-destructive text-white rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <ImagePlus className="h-3.5 w-3.5" />
                  Cole prints (Ctrl+V) no campo de descrição — até 8 imagens.
                </p>
              </div>

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setOpen(false)}
                  disabled={createMut.isPending}
                >
                  Cancelar
                </Button>
                <Button onClick={submit} disabled={createMut.isPending}>
                  {createMut.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  Salvar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : lista && lista.length > 0 ? (
        <div className="space-y-3">
          {lista.map(o => (
            <Card key={o.id}>
              <CardContent className="py-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${categoriaColor[o.categoria] ?? ""}`}
                      >
                        {LABELS.observacaoCategories[o.categoria]}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor[o.status] ?? ""}`}
                      >
                        {LABELS.observacaoStatuses[o.status]}
                      </span>
                      {o.area && (
                        <Badge variant="outline" className="text-[10px]">
                          {o.area}
                        </Badge>
                      )}
                    </div>
                    <p className="font-medium">{o.titulo}</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {o.descricao}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive hover:text-destructive shrink-0"
                    onClick={() => deleteMut.mutate({ id: o.id })}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {Array.isArray(o.imagens) && o.imagens.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {(o.imagens as string[]).map((src, i) => (
                      <img
                        key={i}
                        src={src}
                        alt={`anexo ${i + 1}`}
                        className="h-20 w-20 object-cover rounded border"
                      />
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <p className="text-xs text-muted-foreground">
                    {o.criadoPorNome ?? "—"} ·{" "}
                    {format(new Date(o.createdAt), "dd/MM/yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </p>
                  <Select
                    value={o.status}
                    onValueChange={v =>
                      statusMut.mutate({ id: o.id, status: v as never })
                    }
                  >
                    <SelectTrigger className="h-8 w-40 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OBSERVACAO_STATUSES.map(s => (
                        <SelectItem key={s} value={s}>
                          {LABELS.observacaoStatuses[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <MessageSquarePlus className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">Nenhuma observação ainda</p>
            <p className="text-sm text-muted-foreground max-w-md">
              Encontrou um bug, tem uma reclamação ou uma ideia de melhoria?
              Registre aqui — vira um backlog do próprio sistema.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
