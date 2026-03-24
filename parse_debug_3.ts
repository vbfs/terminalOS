function getXtermScreen(term: any): string {
  if (!term || !term.buffer || !term.buffer.active) return "";
  const buffer = term.buffer.active;
  const lines = [];
  const start = Math.max(0, buffer.viewportY - 100);
  const end = buffer.baseY + term.rows; // usually viewportY + rows is visible
  for (let i = start; i < end; i++) {
    const line = buffer.getLine(i);
    if (line) {
      lines.push(line.translateToString(true));
    }
  }
  return lines.join("\n");
}
