export function assertNoOrphanTokens(rendered: string): void {
  if (rendered.includes('{{') || rendered.includes('}}')) {
    throw new Error('O texto renderizado contém tokens não resolvidos');
  }
}
