import { api } from "./client";
import { Purchase } from "../types/domain";

export interface CalendarDayTotal {
  date: string;
  total: number;
  count: number;
}

export const calendarApi = {
  month: (year: number, month: number) =>
    api.get<{ days: CalendarDayTotal[] }>(`/calendar?year=${year}&month=${month}`).then((r) => r.days),
  day: (date: string) => api.get<{ purchases: (Purchase & { can_edit: boolean })[] }>(`/calendar/day?date=${date}`).then((r) => r.purchases),
};
