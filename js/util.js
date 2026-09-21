// Tagged template die niets extra's doet; alleen voor leesbaarheid en editor-highlighting
export const html = (delen, ...waarden) => delen.reduce((s, d, i) => s + d + (waarden[i] ?? ''), '');
