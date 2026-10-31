// Fără diacritice și fără diferențe de majuscule, ca „stefan” să găsească „Ștefan”.
export const normalize = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
