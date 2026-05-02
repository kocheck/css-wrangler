const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

export function nanoid(size = 8): string {
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  let id = "";
  for (const byte of bytes) {
    id += ALPHABET[byte % ALPHABET.length];
  }
  return id;
}
