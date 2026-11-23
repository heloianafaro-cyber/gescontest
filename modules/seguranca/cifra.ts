import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Cifra de campo (RN226): AES-256-GCM, com um IV novo a cada valor.
// Formato guardado no banco: "v1.<iv>.<tag>.<cifrado>", tudo em base64.
// A chave fica só na variável de ambiente DADOS_BANCARIOS_CHAVE (32 bytes em base64),
// nunca no banco nem no código. Gerar com: openssl rand -base64 32

const ALGORITMO = "aes-256-gcm";

export function lerChave(base64 = process.env.DADOS_BANCARIOS_CHAVE): Buffer {
  if (!base64) throw new Error("Falta a variável DADOS_BANCARIOS_CHAVE.");
  const chave = Buffer.from(base64, "base64");
  if (chave.length !== 32) throw new Error("DADOS_BANCARIOS_CHAVE precisa ter 32 bytes (base64).");
  return chave;
}

export function cifrar(texto: string, chave: Buffer = lerChave()): string {
  const iv = randomBytes(12);
  const cifra = createCipheriv(ALGORITMO, chave, iv);
  const cifrado = Buffer.concat([cifra.update(texto, "utf8"), cifra.final()]);
  const tag = cifra.getAuthTag();
  return ["v1", iv.toString("base64"), tag.toString("base64"), cifrado.toString("base64")].join(".");
}

export function decifrar(valor: string, chave: Buffer = lerChave()): string {
  const [versao, iv, tag, cifrado] = valor.split(".");
  if (versao !== "v1" || !iv || !tag || !cifrado) throw new Error("Valor cifrado inválido.");
  const decifra = createDecipheriv(ALGORITMO, chave, Buffer.from(iv, "base64"));
  decifra.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decifra.update(Buffer.from(cifrado, "base64")), decifra.final()]).toString("utf8");
}

// Mostra só o final: "•••••45". Para telas em que a pessoa não precisa ver tudo.
export function mascarar(texto: string, visiveis = 2): string {
  const fim = texto.slice(-visiveis);
  return "•".repeat(Math.max(texto.length - visiveis, 3)) + fim;
}
