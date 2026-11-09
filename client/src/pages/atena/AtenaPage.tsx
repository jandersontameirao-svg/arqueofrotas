import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Bot,
  Send,
  Lightbulb,
  Zap,
  Trash2,
  Power,
  Loader2,
  User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";
import { LABELS } from "@shared/const";

type ChatMsg = {
  id: number | string;
  role: "user" | "assistant";
  content: string;
};

type Acao = { tipo: string; titulo?: string; dados?: Record<string, unknown> } | null;

type Pending = {
  memoriaSugerida: string;
  categoria: string;
  acaoSugerida: Acao;
};

export function AtenaPage() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: history } = trpc.atena.history.useQuery({ limit: 50 });
  const memoriesQuery = trpc.atena.listMemories.useQuery();

  useEffect(() => {
    if (history)
      setMessages(
        history.map(m => ({ id: m.id, role: m.role, content: m.content }))
      );
  }, [history]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, pending]);

  const chat = trpc.atena.chat.useMutation({
    onSuccess: res => {
      setMessages(prev => [
        ...prev,
        { id: `a-${Date.now()}`, role: "assistant", content: res.resposta },
      ]);
      if (res.memoriaSugerida || res.acaoSugerida) {
        setPending({
          memoriaSugerida: res.memoriaSugerida,
          categoria: res.categoria,
          acaoSugerida: res.acaoSugerida as Acao,
        });
      } else {
        setPending(null);
      }
    },
    onError: err => toast.error(err.message),
  });

  const saveMemory = trpc.atena.saveMemory.useMutation({
    onSuccess: () => {
      toast.success("Diretriz salva. A Atena vai segui-la daqui pra frente.");
      memoriesQuery.refetch();
      setPending(p => (p ? { ...p, memoriaSugerida: "" } : p));
    },
    onError: err => toast.error(err.message),
  });

  const executeAction = trpc.atena.executeAction.useMutation({
    onSuccess: res => {
      toast.success(
        res.tipo === "criar_os"
          ? `Ordem de serviço criada (aguardando aprovação).`
          : `Ocorrência registrada.`
      );
      setPending(p => (p ? { ...p, acaoSugerida: null } : p));
    },
    onError: err => toast.error(err.message),
  });

  const setMemoryActive = trpc.atena.setMemoryActive.useMutation({
    onSuccess: () => memoriesQuery.refetch(),
    onError: err => toast.error(err.message),
  });
  const deleteMemory = trpc.atena.deleteMemory.useMutation({
    onSuccess: () => memoriesQuery.refetch(),
    onError: err => toast.error(err.message),
  });

  const send = () => {
    const text = input.trim();
    if (!text || chat.isPending) return;
    setMessages(prev => [...prev, { id: `u-${Date.now()}`, role: "user", content: text }]);
    setPending(null);
    setInput("");
    chat.mutate({ message: text });
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Atena"
        description="Assistente operacional com IA — pergunte sobre a frota, ensine regras e proponha ações."
        icon={Bot}
      />

      <Tabs defaultValue="chat">
        <TabsList>
          <TabsTrigger value="chat">Conversa</TabsTrigger>
          <TabsTrigger value="memorias">
            Diretrizes {memoriesQuery.data ? `(${memoriesQuery.data.length})` : ""}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="space-y-3">
          <Card>
            <CardContent className="p-0">
              <div
                ref={scrollRef}
                className="h-[52vh] overflow-y-auto p-4 space-y-4"
              >
                {messages.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                    <Bot className="h-10 w-10 mb-3" />
                    <p className="font-medium">Fale com a Atena</p>
                    <p className="text-sm max-w-md">
                      Ex.: "Quantos veículos estão em manutenção?", "Sempre que
                      abrir OS corretiva, priorize alta", "Abra uma OS corretiva
                      para o veículo 3: barulho no freio".
                    </p>
                  </div>
                )}
                {messages.map(m => (
                  <div
                    key={m.id}
                    className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {m.role === "assistant" && (
                      <div className="h-8 w-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div
                      className={`rounded-lg px-3 py-2 text-sm max-w-[80%] whitespace-pre-wrap ${
                        m.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      {m.content}
                    </div>
                    {m.role === "user" && (
                      <div className="h-8 w-8 shrink-0 rounded-full bg-muted flex items-center justify-center">
                        <UserIcon className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                ))}
                {chat.isPending && (
                  <div className="flex gap-3 justify-start">
                    <div className="h-8 w-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="rounded-lg px-3 py-2 bg-muted">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>

              {/* Sugestões: memória + ação, sempre com confirmação do usuário */}
              {pending?.memoriaSugerida && (
                <div className="border-t p-3">
                  <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 dark:bg-amber-900/20 p-3">
                    <Lightbulb className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">A Atena quer aprender:</p>
                      <p className="text-sm text-muted-foreground">
                        "{pending.memoriaSugerida}"
                      </p>
                    </div>
                    <Button
                      size="sm"
                      disabled={saveMemory.isPending}
                      onClick={() =>
                        saveMemory.mutate({
                          directive: pending.memoriaSugerida,
                          category: pending.categoria as never,
                        })
                      }
                    >
                      Salvar diretriz
                    </Button>
                  </div>
                </div>
              )}
              {pending?.acaoSugerida && (
                <div className="border-t p-3">
                  <div className="flex items-start gap-3 rounded-lg border border-primary/40 bg-primary/5 p-3">
                    <Zap className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        Ação proposta: {pending.acaoSugerida.titulo || pending.acaoSugerida.tipo}
                      </p>
                      <p className="text-xs text-muted-foreground break-words">
                        {JSON.stringify(pending.acaoSugerida.dados ?? {})}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      disabled={executeAction.isPending}
                      onClick={() =>
                        executeAction.mutate({
                          tipo: pending.acaoSugerida!.tipo as never,
                          dados: (pending.acaoSugerida!.dados ?? {}) as Record<
                            string,
                            unknown
                          >,
                        })
                      }
                    >
                      Confirmar e aplicar
                    </Button>
                  </div>
                </div>
              )}

              <div className="border-t p-3 flex gap-2">
                <Textarea
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder="Escreva para a Atena… (Enter envia, Shift+Enter quebra linha)"
                  className="min-h-[44px] max-h-32 resize-none"
                />
                <Button onClick={send} disabled={chat.isPending || !input.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
          <p className="text-xs text-muted-foreground">
            A Atena responde sobre os dados reais da frota. Para eventos que não
            constam nos registros, ela diz que não consta — nunca inventa. Ações
            só são aplicadas após sua confirmação.
          </p>
        </TabsContent>

        <TabsContent value="memorias" className="space-y-3">
          {memoriesQuery.data && memoriesQuery.data.length > 0 ? (
            memoriesQuery.data.map(m => (
              <Card key={m.id} className={m.active ? "" : "opacity-60"}>
                <CardContent className="flex items-start gap-3 py-3">
                  <Lightbulb className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-[10px]">
                        {LABELS.atenaMemoryCategories[
                          m.category as keyof typeof LABELS.atenaMemoryCategories
                        ] ?? m.category}
                      </Badge>
                      {!m.active && (
                        <span className="text-xs text-muted-foreground">(inativa)</span>
                      )}
                    </div>
                    <p className="text-sm">{m.directive}</p>
                    {m.createdByName && (
                      <p className="text-xs text-muted-foreground mt-1">
                        por {m.createdByName}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      title={m.active ? "Desativar" : "Ativar"}
                      aria-label={m.active ? "Desativar diretriz" : "Ativar diretriz"}
                      onClick={() =>
                        setMemoryActive.mutate({ id: m.id, active: !m.active })
                      }
                    >
                      <Power className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          aria-label="Excluir diretriz"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir diretriz</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir esta diretriz? A Atena
                            deixará de segui-la. Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => deleteMemory.mutate({ id: m.id })}
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Lightbulb className="h-10 w-10 text-muted-foreground mb-3" />
                <p className="font-medium">Nenhuma diretriz ainda</p>
                <p className="text-sm text-muted-foreground max-w-md">
                  Ensine regras à Atena na conversa (ex.: "nossa franquia de km
                  por revisão é 10.000"). Quando ela sugerir uma diretriz, salve
                  aqui — passa a valer em todas as respostas.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
