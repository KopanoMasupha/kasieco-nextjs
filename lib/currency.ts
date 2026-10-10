export function formatRand(amount: number): string {
  const fixed = amount.toFixed(2);
  const [whole, fraction] = fixed.split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `R${grouped}.${fraction}`;
}

export function formatCents(amountCents: number): string {
  return formatRand(amountCents / 100);
}
