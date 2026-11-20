import { randomInt } from "node:crypto";

// Sem letras e números parecidos (0/O, 1/l/I), para ficar fácil de ditar e anotar.
const caracteres = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

export function gerarSenhaProvisoria(tamanho = 10) {
  let senha = "";
  for (let i = 0; i < tamanho; i++) senha += caracteres[randomInt(caracteres.length)];
  return senha;
}