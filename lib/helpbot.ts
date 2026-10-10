export const HELP_TOPICS: Record<string, string> = {
  pot: "Bulk-buy pots are a sandbox demo. A verified shop pays its quoted share into a cents-based ledger. If the pot reaches its minimum, the owner can close it; otherwise the owner can cancel and the recorded contributions are refunded. No real money moves.",
  refund: "In the prototype, only the shop that opened a pot can cancel it, and only before the minimum is reached. Every contribution is returned as a ledger refund. Real gateway refunds are not connected.",
  payment: "Payment choices in bulk-buy are Instant EFT, bank card, or KasiEco wallet, all simulated. No payment provider or real funds are connected.",
  ledger: "The pot ledger records contributions, rebates, refunds and settlement entries with references and running balances. The pot page includes a browser-side ledger proof.",
  exchange: "Verified shop owners can post stock they have or need, chat, make stock offers using shelf-price guidance, and both confirm a hand-over before it is recorded complete.",
  fair: "Exchange offers use comparable verified shops' shelf prices as a guide and suggest a cash adjustment. Both shops still decide whether to accept.",
  verification: "Shops can complete the compliance course or submit documents for verifier review. Trading features and customer visibility require a verified status.",
  funding: "The funding page offers a readiness pre-check and application tracker. Programme details change, so always confirm eligibility, dates and terms on the provider's official site.",
  stock: "On My stock, record sales as they happen. The assistant estimates days of stock from the last seven days of logged sales and can highlight nearby verified shops that may need surplus.",
  fee: "The prototype models a 2% fee on pot goods value. All money movements are simulated; production fees and payment handling need a licensed gateway and legal review.",
  delivery: "Closing a qualifying pot records wholesaler, driver and service-fee payouts. The delivery progress shown in this demo is simulated, not connected to a driver.",
  training: "The compliance area includes the course and listed training sessions. Availability should be confirmed with the training provider.",
  offline: "Customers use KasiEco to browse verified shops, available stock and prices, then contact or visit the shop. Online orders and customer payments are not part of this app.",
  reviews: "Reviews and ratings are not available yet; they may be considered for a later version.",
  languages: "The interface currently uses English. Additional South African languages are not available yet and may come in a future version.",
  app: "KasiEco is a responsive web app with PWA support, but there is no separate downloadable Android or iPhone app yet.",
  wholesaler: "The prototype has a small demo wholesaler catalogue. Onboarding real large wholesalers and syncing their live prices is not implemented yet.",
};

export function answerHelp(question: string): string {
  const q = question.toLowerCase();
  const keys: [string[], string][] = [
    [["pot", "bulk", "join", "close"], "pot"],
    [["refund", "cancel"], "refund"],
    [["pay", "payment", "eft", "card", "wallet"], "payment"],
    [["ledger", "proof", "balance"], "ledger"],
    [["exchange", "swap", "offer"], q.includes("fair") || q.includes("value") ? "fair" : "exchange"],
    [["verify", "compliance", "document", "course"], "verification"],
    [["fund", "grant", "loan"], "funding"],
    [["stock", "sale", "surplus", "days"], "stock"],
    [["fee", "charge"], "fee"],
    [["deliver", "driver"], "delivery"],
    [["training", "seta"], "training"],
    [["order", "customer", "buy online", "checkout"], "offline"],
    [["review", "rating"], "reviews"],
    [["language", "isiZulu", "Sesotho", "isiXhosa", "Afrikaans"], "languages"],
    [["download", "app", "install"], "app"],
    [["makro", "wholesaler"], "wholesaler"],
  ];
  for (const [terms, topic] of keys) {
    if (terms.some((term) => q.includes(term))) return HELP_TOPICS[topic];
  }
  return "I can help explain bulk-buy pots, refunds, payments, the ledger, exchanges, verification, funding, stock insights and delivery. If you're asking about something else, I don't have a confirmed answer yet.";
}
