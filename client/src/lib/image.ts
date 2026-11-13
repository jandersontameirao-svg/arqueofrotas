// Redimensiona/comprime a imagem no próprio navegador antes de enviar. Fotos de
// celular facilmente passam de 8 MB (o limite do servidor) e deixam o upload
// lento; aqui a maior dimensão vira no máx. 1600px em JPEG, caindo pra poucas
// centenas de KB. Se algo falhar, cai no base64 cru do arquivo original.
export async function fileToUploadDataUrl(file: File): Promise<string> {
  const readRaw = () =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error("Falha ao ler o arquivo"));
      reader.readAsDataURL(file);
    });
  try {
    const bitmap = await createImageBitmap(file);
    const maxDim = 1600;
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return await readRaw();
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close?.();
    return canvas.toDataURL("image/jpeg", 0.82);
  } catch {
    return await readRaw();
  }
}
