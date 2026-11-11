   // Limite de 4 MB: a hospedagem na Vercel aceita no máximo 4,5 MB por envio.
   export const LIMITE_FICHA = 4 * 1024 * 1024;

   // Confere o conteúdo real do arquivo, e não só o nome (que pode ser falso).
   export function detectarTipo(b: Buffer): { tipo: string; ext: string } | null {
     if (b.subarray(0, 4).toString("latin1") === "%PDF") return { tipo: "application/pdf", ext: "pdf" };
     if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { tipo: "image/jpeg", ext: "jpg" };
     if (b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
       return { tipo: "image/png", ext: "png" };
     return null;
   }