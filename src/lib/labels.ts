export const positionLabels = {
  portar: "Portar",
  fundas: "Fundaș",
  mijlocas: "Mijlocaș",
  atacant: "Atacant",
} as const;

export type Position = keyof typeof positionLabels;
