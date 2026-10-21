import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  saveLocal,
  readLocal,
  saveCommand,
  listCommands,
  forgetConfirmed,
  type Command,
} from "@/offline/store";
import { synchronize } from "@/offline/sync";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../../server/routers";
import {
  Car,
  LogIn,
  LogOut,
  AlertTriangle,
  CloudOff,
  RefreshCw,
} from "lucide-react";

type Context = inferRouterOutputs<AppRouter>["driver"]["context"];
type Response = {
  templateItemId: number;
  response: "ok" | "nao_ok" | "na";
  comment?: string;
  photoData?: string;
  photoFileName?: string;
};
type Form = {
  vehicleId: number;
  reservationId?: number;
  projectId: number;
  templateId: number;
  id?: number;
  km: string;
  fuel: string;
  endDate: string;
  responses: Response[];
  description: string;
  severity: "baixa" | "media" | "alta";
  photoData?: string;
  photoFileName?: string;
};
const labels = {
  draft: "Rascunho local",
  pending: "Pendente de sincronização",
  confirmed: "Confirmado pelo servidor",
  conflict: "Rejeitado ou em conflito",
};
const field =
  "block w-full min-h-12 rounded-lg border bg-background p-3 mt-1 text-base";
const button =
  "min-h-12 rounded-lg border px-4 py-3 font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50";
export function DriverPage() {
  const { user } = useAuth();
  const userId = user?.id ?? 0;
  const [online, setOnline] = useState(navigator.onLine);
  const [context, setContext] = useState<Context>();
  const [commands, setCommands] = useState<Command[]>([]);
  const [current, setCurrent] = useState<Command>();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(true);
  const latest = useRef<Command | undefined>(undefined);
  const writes = useRef(Promise.resolve());
  const query = trpc.driver.context.useQuery(undefined, {
    enabled: !!userId && online,
    retry: false,
  });
  const pickup = trpc.reservations.pickup.useMutation();
  const giveBack = trpc.reservations.return.useMutation();
  const report = trpc.reservations.reportProblem.useMutation();
  const refresh = async () => {
    if (userId) setCommands(await listCommands(userId));
  };
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  useEffect(() => {
    setCurrent(undefined);
    setContext(undefined);
    setCommands([]);
    if (!userId) return;
    readLocal<Context>(userId, "context")
      .then(setContext)
      .catch(() => setMessage("Não foi possível recuperar os dados locais."));
    refresh().catch(() =>
      setMessage(
        "Armazenamento local indisponível. Não feche o formulário antes da confirmação."
      )
    );
  }, [userId]);
  useEffect(() => {
    if (query.data && userId) {
      setContext(query.data);
      saveLocal(userId, "context", query.data).catch(() =>
        setMessage("Não foi possível guardar os dados para uso offline.")
      );
    }
  }, [query.data, userId]);
  // Only update the saved indicator for the most recent durable write.
  const persist = (command: Command) => {
    latest.current = command;
    setCurrent(command);
    setSaved(false);
    writes.current = writes.current
      .catch(() => {})
      .then(() => saveCommand(command))
      .then(() => {
        if (latest.current === command) setSaved(true);
      })
      .catch(() => {
        setSaved(false);
        setMessage("Falha ao salvar no aparelho. Mantenha esta tela aberta.");
      });
  };
  const form = current?.payload as unknown as Form | undefined;
  const vehicle = context?.vehicles.find(v => v.id === form?.vehicleId);
  const templates =
    context?.templates.filter(
      t => !t.vehicleType || t.vehicleType === vehicle?.vehicleType
    ) ?? [];
  const template = templates.find(t => t.id === form?.templateId);
  const active = context?.reservations.find(r => r.status === "em_uso");
  const update = (changes: Partial<Form>) => {
    if (current && form)
      persist({
        ...current,
        payload: { ...form, ...changes },
        error: undefined,
      });
  };
  const start = (kind: Command["kind"]) => {
    if (!context) {
      setMessage(
        "Conecte-se uma vez para carregar veículos e modelos de inspeção."
      );
      return;
    }
    if (kind === "return" && !active) {
      setMessage(
        "Nenhum uso ativo encontrado. Atualize online se uma retirada ainda estiver pendente."
      );
      return;
    }
    const selected = context.vehicles.find(
      v => v.id === (active?.vehicleId ?? context.vehicles[0]?.id)
    );
    const defaultTemplate = context.templates.find(
      t => !t.vehicleType || t.vehicleType === selected?.vehicleType
    );
    const initial: Form = {
      vehicleId: selected?.id ?? 0,
      projectId: active?.projectId ?? selected?.defaultProjectId ?? 0,
      templateId: defaultTemplate?.id ?? 0,
      id: kind === "return" ? active?.id : undefined,
      km: "",
      fuel: "",
      endDate: "",
      responses: [],
      description: "",
      severity: "media",
    };
    persist({
      id: crypto.randomUUID(),
      userId,
      kind,
      state: "draft",
      collectedAt: new Date().toISOString(),
      payload: initial as unknown as Record<string, unknown>,
    });
    setMessage("");
  };
  const response = (itemId: number, changes: Partial<Response>) => {
    if (!form) return;
    const old = form.responses.find(r => r.templateItemId === itemId);
    const next = { ...old, ...changes, templateItemId: itemId } as Response;
    update({
      responses: [
        ...form.responses.filter(r => r.templateItemId !== itemId),
        next,
      ],
    });
  };
  const readPhoto = async (
    file: File | undefined,
    apply: (data: string, name: string) => void
  ) => {
    if (!file) return;
    if (
      file.size > 8 * 1024 * 1024 ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    ) {
      setMessage("Use JPEG, PNG ou WebP com até 8 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => apply(String(reader.result), file.name);
    reader.onerror = () =>
      setMessage("Não foi possível ler a foto. Tente novamente.");
    reader.readAsDataURL(file);
  };
  const send = async (
    kind: Command["kind"],
    payload: Record<string, unknown>
  ) => {
    // Session is checked online for every attempt, including a timeout retry.
    const identity = await queryUtils.auth.me.fetch();
    if (!identity || identity.id !== userId)
      throw Object.assign(
        new Error("Entre novamente com o usuário que fez o registro."),
        { data: { code: "UNAUTHORIZED" } }
      );
    if (kind === "pickup")
      return pickup.mutateAsync(
        payload as Parameters<typeof pickup.mutateAsync>[0]
      );
    if (kind === "return")
      return giveBack.mutateAsync(
        payload as Parameters<typeof giveBack.mutateAsync>[0]
      );
    return report.mutateAsync(
      payload as Parameters<typeof report.mutateAsync>[0]
    );
  };
  const queryUtils = trpc.useUtils();
  const attempt = async (command: Command) => {
    if (!online) {
      setMessage(
        "Sem conexão. O registro permanece pendente; nenhuma retirada ou disponibilidade foi confirmada."
      );
      return;
    }
    setBusy(true);
    try {
      await writes.current;
      const updated = await synchronize(command, userId, send);
      if (current?.id === updated.id) setCurrent(updated);
      await refresh();
      setMessage(updated.error ?? "Operação confirmada pelo servidor.");
      if (updated.state === "confirmed") await query.refetch();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Falha de sincronização."
      );
    } finally {
      setBusy(false);
    }
  };
  const submit = async () => {
    if (!current || !form) return;
    if (!form.vehicleId) {
      setMessage("Selecione um veículo.");
      return;
    }
    if (current.kind !== "problem") {
      if (
        !form.km.trim() ||
        !Number.isInteger(Number(form.km)) ||
        Number(form.km) < 0 ||
        !form.fuel.trim() ||
        Number(form.fuel) < 0 ||
        Number(form.fuel) > 100
      ) {
        setMessage(
          "Informe a leitura real do hodômetro e o combustível de 0 a 100%."
        );
        return;
      }
      if (
        !template?.items.length ||
        template.items.some(
          i => !form.responses.find(r => r.templateItemId === i.id)?.response
        )
      ) {
        setMessage("Responda todos os itens da inspeção.");
        return;
      }
      if (form.responses.some(r => r.response === "nao_ok" && !r.photoData)) {
        setMessage("Inclua uma foto em cada item Não OK.");
        return;
      }
      if (
        current.kind === "pickup" &&
        (!form.endDate || new Date(form.endDate) <= new Date())
      ) {
        setMessage("Informe a previsão de devolução futura.");
        return;
      }
    } else if (form.description.trim().length < 3) {
      setMessage("Descreva o problema encontrado.");
      return;
    }
    const metadata = { collectedAt: new Date(current.collectedAt) };
    const inspection = {
      templateId: form.templateId,
      responses: form.responses,
    };
    let payload: Record<string, unknown>;
    if (current.kind === "problem")
      payload = {
        ...metadata,
        vehicleId: form.vehicleId,
        description: form.description,
        severity: form.severity,
        photoData: form.photoData,
        photoFileName: form.photoFileName,
      };
    else if (current.kind === "pickup")
      payload = {
        vehicleId: form.vehicleId,
        reservationId: form.reservationId,
        projectId: form.projectId || undefined,
        endDate: new Date(form.endDate),
        km: Number(form.km),
        fuel: Number(form.fuel),
        inspection,
      };
    else
      payload = {
        ...metadata,
        id: form.id,
        km: Number(form.km),
        fuel: Number(form.fuel),
        inspection,
        problem: form.description.trim()
          ? {
              description: form.description,
              severity: form.severity,
              photoData: form.photoData,
              photoFileName: form.photoFileName,
            }
          : undefined,
      };
    setBusy(true);
    try {
      await writes.current;
      const queued: Command = { ...current, state: "pending", payload };
      await saveCommand(queued);
      setCurrent(queued);
      setSaved(true);
      await refresh();
      setBusy(false);
      await attempt(queued);
    } catch {
      setBusy(false);
      setMessage("Não foi possível guardar o envio. Não feche esta tela.");
    }
  };
  if (!userId) return <p>Entre com sua conta para acessar seus registros.</p>;
  return (
    <section
      className="mx-auto max-w-xl space-y-5 px-1 pb-16"
      aria-label="Operação do motorista"
    >
      <header>
        <h1 className="text-2xl font-bold">
          Olá, {user?.name?.split(" ")[0] || "motorista"}
        </h1>
        <p className="text-muted-foreground">Sua operação de hoje</p>
      </header>
      {!online && (
        <p role="status" className="rounded-lg bg-amber-100 p-3 text-amber-950">
          <CloudOff className="inline h-5 w-5 mr-2" />
          Sem conexão. Os dados ficam neste aparelho. Retirada exige confirmação
          online.
        </p>
      )}
      <p role="status" aria-live="polite" className="break-words">
        {message}
      </p>
      {!context && (
        <p role="status">
          {online
            ? "Carregando veículos e inspeções…"
            : "Conecte-se uma vez para preparar este aparelho."}
        </p>
      )}
      {!current ? (
        <>
          <div className="grid gap-3">
            <button
              className={`${button} bg-primary text-primary-foreground text-left text-lg min-h-20`}
              disabled={!context || busy}
              onClick={() => start("pickup")}
            >
              <LogIn className="inline mr-3" />
              Retirar veículo
            </button>
            <button
              className={`${button} text-left text-lg min-h-20`}
              disabled={!context || busy}
              onClick={() => start("return")}
            >
              <LogOut className="inline mr-3" />
              Devolver veículo
            </button>
            <button
              className={`${button} text-left text-lg min-h-20`}
              disabled={!context || busy}
              onClick={() => start("problem")}
            >
              <AlertTriangle className="inline mr-3" />
              Informar problema
            </button>
          </div>
          {active && (
            <p className="rounded-lg border p-3">
              <Car className="inline mr-2" />
              Em uso:{" "}
              {context?.vehicles.find(v => v.id === active.vehicleId)?.plate}.
              Retirada: {active.checkInKm} km.
            </p>
          )}
          <button
            className={button}
            disabled={!online || busy}
            onClick={() => query.refetch()}
          >
            <RefreshCw className="inline h-4 w-4 mr-2" />
            Atualizar dados
          </button>
        </>
      ) : current.state === "draft" && form ? (
        <section className="space-y-5">
          <h2 className="text-xl font-semibold">
            {current.kind === "pickup"
              ? "Retirar veículo"
              : current.kind === "return"
                ? "Devolver veículo"
                : "Informar problema"}
          </h2>
          <p role="status">
            {saved ? "Rascunho salvo neste aparelho" : "Salvando no aparelho…"}
          </p>
          <label className="block">
            Veículo
            <select
              aria-label="Veículo"
              className={field}
              value={form.vehicleId}
              disabled={current.kind === "return"}
              onChange={e => {
                const id = Number(e.target.value);
                const v = context?.vehicles.find(v => v.id === id);
                update({
                  vehicleId: id,
                  reservationId: undefined,
                  projectId: v?.defaultProjectId ?? 0,
                  responses: [],
                  templateId:
                    context?.templates.find(
                      t => !t.vehicleType || t.vehicleType === v?.vehicleType
                    )?.id ?? 0,
                });
              }}
            >
              {context?.vehicles.map(v => (
                <option key={v.id} value={v.id}>
                  {v.plate} — {v.model}
                </option>
              ))}
            </select>
          </label>
          {vehicle && (
            <p>
              Última leitura confirmada: <strong>{vehicle.currentKm} km</strong>
              . Situação: {vehicle.status}. Confira o hodômetro.
            </p>
          )}
          {!!context?.knownIssues.filter(i => i.vehicleId === form.vehicleId)
            .length && (
            <aside className="rounded-lg border border-amber-400 p-3">
              <h3 className="font-semibold">
                Problemas já registrados — não cadastre novamente
              </h3>
              <ul className="list-disc pl-5">
                {context.knownIssues
                  .filter(i => i.vehicleId === form.vehicleId)
                  .map(i => (
                    <li key={i.id}>
                      {i.description} ({i.severity})
                    </li>
                  ))}
              </ul>
            </aside>
          )}
          {current.kind === "pickup" && (
            <>
              <label className="block">
                Reserva
                <select
                  aria-label="Reserva"
                  className={field}
                  value={form.reservationId ?? ""}
                  onChange={e => {
                    const r = context?.reservations.find(
                      r => r.id === Number(e.target.value)
                    );
                    update({
                      reservationId: r?.id,
                      vehicleId: r?.vehicleId ?? form.vehicleId,
                      projectId: r?.projectId ?? form.projectId,
                      responses: [],
                    });
                  }}
                >
                  <option value="">Retirada sem reserva</option>
                  {context?.reservations
                    .filter(r => r.status === "agendada")
                    .map(r => (
                      <option key={r.id} value={r.id}>
                        Reserva {r.id} —{" "}
                        {
                          context.vehicles.find(v => v.id === r.vehicleId)
                            ?.plate
                        }
                      </option>
                    ))}
                </select>
              </label>
              <label className="block">
                Projeto
                <select
                  aria-label="Projeto"
                  className={field}
                  disabled={!!form.reservationId}
                  value={form.projectId}
                  onChange={e => update({ projectId: Number(e.target.value) })}
                >
                  <option value="0">Selecione</option>
                  {context?.projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                Previsão de devolução
                <input
                  className={field}
                  type="datetime-local"
                  value={form.endDate}
                  onChange={e => update({ endDate: e.target.value })}
                />
              </label>
            </>
          )}
          {current.kind !== "problem" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <label>
                  Leitura (km)
                  <input
                    className={field}
                    type="number"
                    inputMode="numeric"
                    min="0"
                    step="1"
                    value={form.km}
                    onChange={e => update({ km: e.target.value })}
                  />
                </label>
                <label>
                  Combustível (%)
                  <input
                    className={field}
                    type="number"
                    inputMode="numeric"
                    min="0"
                    max="100"
                    step="1"
                    value={form.fuel}
                    onChange={e => update({ fuel: e.target.value })}
                  />
                </label>
              </div>
              <label className="block">
                Inspeção
                <select
                  aria-label="Inspeção"
                  className={field}
                  value={form.templateId}
                  onChange={e =>
                    update({
                      templateId: Number(e.target.value),
                      responses: [],
                    })
                  }
                >
                  <option value="0">Selecione</option>
                  {templates.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <p>
                Inspecione fisicamente cada item. Nenhuma resposta é preenchida
                automaticamente.
              </p>
              {template?.items.map(item => {
                const value = form.responses.find(
                  r => r.templateItemId === item.id
                );
                return (
                  <fieldset
                    key={item.id}
                    className="rounded-lg border p-3 space-y-3"
                  >
                    <legend className="px-1 font-medium">
                      {item.description}
                      {item.isCritical ? " · Segurança" : ""}
                    </legend>
                    <div className="grid grid-cols-3 gap-2">
                      {(["ok", "nao_ok", "na"] as const).map(v => (
                        <button
                          key={v}
                          type="button"
                          aria-pressed={value?.response === v}
                          className={`${button} ${value?.response === v ? "bg-primary text-primary-foreground" : ""}`}
                          onClick={() => response(item.id, { response: v })}
                        >
                          {v === "ok"
                            ? "OK"
                            : v === "nao_ok"
                              ? "Não OK"
                              : "N/A"}
                        </button>
                      ))}
                    </div>
                    {value?.response === "nao_ok" && (
                      <>
                        <label className="block">
                          Detalhe o problema
                          <textarea
                            className={field}
                            value={value.comment ?? ""}
                            onChange={e =>
                              response(item.id, { comment: e.target.value })
                            }
                          />
                        </label>
                        <label className="block">
                          Foto obrigatória
                          <input
                            className={field}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            capture="environment"
                            onChange={e =>
                              readPhoto(e.target.files?.[0], (data, name) =>
                                response(item.id, {
                                  photoData: data,
                                  photoFileName: name,
                                })
                              )
                            }
                          />
                        </label>
                        {value.photoData && (
                          <img
                            className="max-h-48 rounded-lg"
                            src={value.photoData}
                            alt={`Evidência: ${item.description}`}
                          />
                        )}
                      </>
                    )}
                  </fieldset>
                );
              })}
            </>
          )}
          {(current.kind === "problem" || current.kind === "return") && (
            <>
              <label className="block">
                {current.kind === "return"
                  ? "Novo problema encontrado? Descreva se houver."
                  : "Descreva o problema"}
                <textarea
                  className={field}
                  value={form.description}
                  onChange={e => update({ description: e.target.value })}
                />
              </label>
              {!!form.description && (
                <>
                  <label className="block">
                    Gravidade
                    <select
                      aria-label="Gravidade"
                      className={field}
                      value={form.severity}
                      onChange={e =>
                        update({ severity: e.target.value as Form["severity"] })
                      }
                    >
                      <option value="baixa">Baixa — conservação</option>
                      <option value="media">
                        Média — avaliar funcionamento
                      </option>
                      <option value="alta">Alta — risco de segurança</option>
                    </select>
                  </label>
                  <label className="block">
                    Foto do problema
                    <input
                      className={field}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      capture="environment"
                      onChange={e =>
                        readPhoto(e.target.files?.[0], (data, name) =>
                          update({ photoData: data, photoFileName: name })
                        )
                      }
                    />
                  </label>
                  {form.photoData && (
                    <img
                      className="max-h-48 rounded-lg"
                      src={form.photoData}
                      alt="Evidência do problema"
                    />
                  )}
                </>
              )}
            </>
          )}
          <button
            className={`${button} w-full bg-primary text-primary-foreground`}
            disabled={busy || !saved}
            onClick={submit}
          >
            {busy
              ? "Aguardando confirmação…"
              : online
                ? "Enviar para confirmação"
                : "Guardar como pendente"}
          </button>
          <button
            className={`${button} w-full`}
            disabled={busy}
            onClick={async () => {
              await writes.current;
              setCurrent(undefined);
              await refresh();
            }}
          >
            Voltar e manter rascunho
          </button>
        </section>
      ) : (
        <section className="rounded-lg border p-4 space-y-3">
          <h2 className="font-semibold">{labels[current.state]}</h2>
          <p>
            {current.error ??
              (current.state === "confirmed"
                ? "O servidor recebeu este registro."
                : "Aguarde confirmação antes de considerar a operação efetivada.")}
          </p>
          <button
            className={button}
            onClick={() => {
              setCurrent(undefined);
              refresh();
            }}
          >
            Voltar
          </button>
        </section>
      )}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Registros deste aparelho</h2>
        {commands.length === 0 && <p>Nenhum registro salvo.</p>}
        {commands.map(c => (
          <article key={c.id} className="rounded-lg border p-3 space-y-2">
            <p className="font-medium">
              {c.kind === "pickup"
                ? "Retirada"
                : c.kind === "return"
                  ? "Devolução"
                  : "Problema"}{" "}
              · {labels[c.state]}
            </p>
            <p className="text-sm">
              {new Date(c.collectedAt).toLocaleString("pt-BR")}
            </p>
            {c.error && <p role="status">{c.error}</p>}
            <div className="flex flex-wrap gap-2">
              {c.state === "draft" && (
                <button
                  className={button}
                  onClick={() => {
                    setCurrent(c);
                    setSaved(true);
                  }}
                >
                  Continuar
                </button>
              )}
              {c.state === "pending" && (
                <button
                  className={button}
                  disabled={busy || !online}
                  onClick={() => attempt(c)}
                >
                  Confirmar envio online
                </button>
              )}
              {c.state === "conflict" && (
                <p>
                  O registro original foi preservado. Informe o identificador{" "}
                  {c.id} ao gestor para conciliar a leitura, reserva ou
                  inspeção.
                </p>
              )}
              {c.state === "conflict" && (
                <button
                  className={button}
                  disabled={busy || !online}
                  onClick={async () => {
                    const pending: Command = { ...c, state: "pending" };
                    await saveCommand(pending);
                    await attempt(pending);
                  }}
                >
                  Reenviar após revisão do gestor
                </button>
              )}
              {c.state === "confirmed" && (
                <button
                  className={button}
                  onClick={async () => {
                    await forgetConfirmed(userId, c.id);
                    await refresh();
                  }}
                >
                  Remover cópia local confirmada
                </button>
              )}
            </div>
          </article>
        ))}
      </section>
    </section>
  );
}
