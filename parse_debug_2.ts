const text = "Context\n75,960tokens\n37%";

const clean = text;
const safeText = clean;

const patterns = [
    { rx: /(?<![\d.,])([\d]+(?:,[\d]{3})*|\d+)\s*tokens\b/gi, type: "raw" }, // Fallback universal
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
console.log({ bestMatch: bestMatch ? bestMatch[0] : null });
