import { FundingProfile, FundingProgramme } from "./types";

export const SEED_FUNDING_PROGRAMMES: FundingProgramme[] = [
  {
    id: "spaza-support",
    name: "Spaza Shop Support Fund",
    provider: "DSBD via NEF and SEDFA",
    type: "Grant + loan",
    summary: "Support for qualifying spaza shops. Confirm the latest package, eligibility and application process with the programme administrator.",
    officialUrl: "https://www.dsbd.gov.za/",
    requiresCipc: true,
    requiresPermit: true,
  },
  {
    id: "trep",
    name: "Township and Rural Entrepreneurship Programme (TREP)",
    provider: "DSBD via SEDFA",
    type: "Blended finance",
    summary: "Financial and non-financial support for qualifying township and rural enterprises. Check current calls and terms with SEDFA.",
    officialUrl: "https://www.dsbd.gov.za/",
    requiresCipc: true,
  },
  {
    id: "nyda-grant",
    name: "NYDA Grant Programme",
    provider: "National Youth Development Agency",
    type: "Grant",
    summary: "Youth enterprise support for eligible applicants; age and business requirements apply.",
    officialUrl: "https://www.nyda.gov.za/",
    ageMin: 18,
    ageMax: 35,
  },
  {
    id: "tholoana",
    name: "Tholoana Enterprise Programme",
    provider: "SAB Foundation",
    type: "Mentorship and growth support",
    summary: "Enterprise development programme. Application rounds and closing dates can change; check the official programme page.",
    deadline: "2026-10-13T23:59:59+02:00",
    officialUrl: "https://sabfoundation.co.za/",
  },
  {
    id: "wrseta",
    name: "Spaza Shop Training & Support",
    provider: "Wholesale & Retail SETA with SEDFA",
    type: "Training",
    summary: "Training opportunities and, for some cohorts, related business support. Confirm availability with the provider.",
    officialUrl: "https://www.wrseta.org.za/",
  },
];

export function fundingFit(
  programme: FundingProgramme,
  profile: FundingProfile,
  verified: boolean
): { status: "fit" | "check" | "not-fit"; note: string } {
  if (programme.ageMin !== undefined && profile.age < programme.ageMin) {
    return { status: "not-fit", note: `This programme requires applicants to be at least ${programme.ageMin}.` };
  }
  if (programme.ageMax !== undefined && profile.age > programme.ageMax) {
    return { status: "not-fit", note: `This programme is for owners aged ${programme.ageMin}–${programme.ageMax}.` };
  }
  if (programme.monthsTradingMin !== undefined && profile.monthsTrading < programme.monthsTradingMin) {
    return { status: "not-fit", note: `The business needs at least ${programme.monthsTradingMin} months of trading.` };
  }
  const missing: string[] = [];
  if (programme.requiresCipc && !profile.cipc) missing.push("CIPC registration");
  if (programme.requiresPermit && !profile.tradingPermit) missing.push("municipal trading permit");
  if (!verified) missing.push("KasiEco compliance verification");
  return missing.length
    ? { status: "check", note: `Check first: ${missing.join(", ")}. Confirm requirements with the programme.` }
    : { status: "fit", note: "Looks like a fit based on your answers. The programme provider makes the final decision." };
}
