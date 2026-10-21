import superjson from "superjson";
export type SyncState = "draft" | "pending" | "confirmed" | "conflict";
export type Command = {
  id: string;
  userId: number;
  kind: "pickup" | "return" | "problem";
  state: SyncState;
  collectedAt: string;
  payload: Record<string, unknown>;
  error?: string;
  result?: unknown;
};
type Encrypted = {
  id: string;
  userId: number;
  iv: Uint8Array;
  cipher: ArrayBuffer;
};
const database = "arqueofrotas-offline-v1";
function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function open() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(database, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore("records", { keyPath: "id" });
      req.result.createObjectStore("keys");
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function complete(tx: IDBTransaction) {
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () =>
      reject(tx.error ?? new Error("Falha ao salvar no dispositivo"));
    tx.onerror = () => reject(tx.error);
  });
}
async function keyFor(db: IDBDatabase, userId: number) {
  const tx = db.transaction("keys", "readonly");
  const existing = await request(tx.objectStore("keys").get(userId));
  if (existing) return existing as CryptoKey;
  const key = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
  const write = db.transaction("keys", "readwrite");
  const done = complete(write);
  const store = write.objectStore("keys");
  // A read/write transaction prevents two tabs replacing the user's encryption key.
  const current = await request(store.get(userId));
  if (!current) store.put(key, userId);
  await done;
  return (current ?? key) as CryptoKey;
}
export async function saveLocal(userId: number, id: string, value: unknown) {
  const db = await open();
  try {
    const key = await keyFor(db, userId);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const recordId = `${userId}:${id}`;
    const cipher = await crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv,
        additionalData: new TextEncoder().encode(recordId),
      },
      key,
      new TextEncoder().encode(superjson.stringify(value))
    );
    const tx = db.transaction("records", "readwrite");
    const done = complete(tx);
    tx.objectStore("records").put({ id: recordId, userId, iv, cipher });
    await done;
  } finally {
    db.close();
  }
}
export async function readLocal<T>(
  userId: number,
  id: string
): Promise<T | undefined> {
  const db = await open();
  try {
    const tx = db.transaction("records", "readonly");
    const row = (await request(
      tx.objectStore("records").get(`${userId}:${id}`)
    )) as Encrypted | undefined;
    if (!row) return undefined;
    return await decrypt<T>(db, userId, row);
  } finally {
    db.close();
  }
}
async function decrypt<T>(
  db: IDBDatabase,
  userId: number,
  row: Encrypted
): Promise<T> {
  if (row.userId !== userId)
    throw new Error("Registro pertence a outro usuário");
  const key = await keyFor(db, userId);
  const plain = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: row.iv as Uint8Array<ArrayBuffer>,
      additionalData: new TextEncoder().encode(row.id),
    },
    key,
    row.cipher
  );
  return superjson.parse<T>(new TextDecoder().decode(plain));
}
export async function listCommands(userId: number): Promise<Command[]> {
  const db = await open();
  try {
    const rows = (await request(
      db.transaction("records", "readonly").objectStore("records").getAll()
    )) as Encrypted[];
    const own = rows.filter(
      r => r.userId === userId && r.id.startsWith(`${userId}:command:`)
    );
    return await Promise.all(own.map(r => decrypt<Command>(db, userId, r)));
  } finally {
    db.close();
  }
}
export async function saveCommand(command: Command) {
  await saveLocal(command.userId, `command:${command.id}`, command);
}
export async function forgetConfirmed(userId: number, id: string) {
  const current = await readLocal<Command>(userId, `command:${id}`);
  if (current?.state !== "confirmed")
    throw new Error("Evidência pendente não pode ser apagada");
  const db = await open();
  try {
    const tx = db.transaction("records", "readwrite");
    const done = complete(tx);
    tx.objectStore("records").delete(`${userId}:command:${id}`);
    await done;
  } finally {
    db.close();
  }
}
