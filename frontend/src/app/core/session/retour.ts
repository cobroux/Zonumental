/** Destination après connexion : un chemin interne seulement, jamais `//hôte` ni une URL absolue. */
export function retourSur(valeur: unknown): string {
  return typeof valeur === 'string' && /^\/(?![/\\])/.test(valeur) ? valeur : '/';
}
