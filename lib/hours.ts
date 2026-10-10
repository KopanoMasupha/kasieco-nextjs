const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export interface OpenStatus {
  isOpen: boolean | null;
  label: string;
}

export function getOpenStatus(hours: string, now = new Date()): OpenStatus {
  const match = hours.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
  if (!match) return { isOpen: null, label: "Hours not available" };
  const [, opens, closes] = match;
  const range = hours.match(/(every day|daily|mon\s*-\s*sat|mon\s*-\s*fri)/i)?.[0].toLowerCase();
  if (!range) return { isOpen: null, label: "Hours not available" };
  const activeDays = range === "every day" || range === "daily"
    ? DAYS
    : range.includes("sat")
      ? DAYS.slice(1, 7)
      : DAYS.slice(1, 6);
  const parts = new Intl.DateTimeFormat("en-ZA", {
    timeZone: "Africa/Johannesburg",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  const day = part("weekday");
  const time = `${part("hour")}:${part("minute")}`;
  const isOvernight = closes <= opens;
  const yesterday = DAYS[(DAYS.indexOf(day) + DAYS.length - 1) % DAYS.length];
  const todayOpen = activeDays.includes(day) &&
    (isOvernight ? time >= opens : time >= opens && time < closes);
  const overnightCarry = isOvernight && activeDays.includes(yesterday) && time < closes;
  const isOpen = todayOpen || overnightCarry;
  return { isOpen, label: isOpen ? "Open now" : "Closed now" };
}
