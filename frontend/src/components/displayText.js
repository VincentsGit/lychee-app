const entityMap = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

export function decodeDisplayText(value) {
  if (typeof value !== "string" || !value.includes("&")) return value;

  if (typeof document !== "undefined") {
    const textarea = document.createElement("textarea");
    textarea.innerHTML = value;
    return textarea.value;
  }

  return value.replace(/&(#(\d+)|#x([\da-f]+)|[a-z]+);/gi, (match, entity, decimal, hex) => {
    if (decimal) return String.fromCodePoint(Number(decimal));
    if (hex) return String.fromCodePoint(parseInt(hex, 16));
    return entityMap[entity.toLowerCase()] ?? match;
  });
}
