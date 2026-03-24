const text = `
Context
11,849 tokens
6% used
$0.00 spent
`;

const ANSI_STRIP_RE = /\x1b\[[0-9;]*[mGKHFABCDJsu]|\x1b\][^\x07]*\x07|\x1b[()][AB012]/g;
const clean = text.replace(ANSI_STRIP_RE, "");
const safeText = clean
  .replace(/session tokens[\s:~\d.,kK]+/gi, "")
  .replace(/workspace tokens[\s:~\d.,kK]+/gi, "");

const patterns = [
  { rx: /([\d]{1,3}(?:,[\d]{3})+)\s+\d+%/gi, type: "raw" }, // OpenCode: "64,101 31%"
  { rx: /↑\s*([\d.,]+)(k)?\s*tokens/gi, type: "k-suffix" }, // OpenCode Loading / Generic
  { rx: /\(\s*([\d.,]+)(k)?\s*tokens\s*\)/gi, type: "k-suffix" }, // Aider: "(5.2k tokens)"
  { rx: /tokens\s+used:\s*([\d,]+)/gi, type: "raw" }, // Claude Code
  { rx: /(?<![,\d])([\d,]+)\s+tokens\b/gi, type: "raw" }, // Fallback universal
];

let bestMatch = null;
let bestType = null;
let highestIndex = -1;

for (const { rx, type } of patterns) {
  const matches = [...safeText.matchAll(rx)];
  if (matches.length > 0) {
    const match = matches[matches.length - 1];
    if (match.index !== undefined && match.index > highestIndex) {
      highestIndex = match.index;
      bestMatch = match;
      bestType = type;
    }
  }
}

console.log("bestMatch:", bestMatch ? bestMatch[0] : null);
console.log("bestType:", bestType);
if (bestMatch && bestType) {
  if (bestType === "raw") {
    console.log("result:", parseInt(bestMatch[1].replace(/,/g, "")));
  }
}
