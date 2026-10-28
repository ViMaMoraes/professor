// sem letras e números que se confundem ao digitar (0/o, 1/l/i)
const CARACTERES = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Senha provisória aleatória (criptograficamente segura), fácil de ler e digitar. */
export function gerarSenha(tamanho = 10) {
  const limite = 256 - (256 % CARACTERES.length); // descarta bytes que deixariam a escolha enviesada
  let senha = "";
  while (senha.length < tamanho) {
    for (const byte of crypto.getRandomValues(new Uint8Array(tamanho * 2))) {
      if (byte < limite && senha.length < tamanho) senha += CARACTERES[byte % CARACTERES.length];
    }
  }
  return senha;
}
