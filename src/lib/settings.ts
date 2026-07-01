import { prisma } from "@/lib/prisma";

export const SETTING_KEYS = {
  hourlyRateCustomer: "HOURLY_RATE_CUSTOMER",
  hourlyRateNonCustomer: "HOURLY_RATE_NON_CUSTOMER",
} as const;

const DEFAULT_HOURLY_RATE_CUSTOMER = 95;
const DEFAULT_HOURLY_RATE_NON_CUSTOMER = 125;

export interface HourlyRates {
  customer: number;
  nonCustomer: number;
}

export async function getHourlyRates(): Promise<HourlyRates> {
  const rows = await prisma.setting.findMany({
    where: {
      key: {
        in: [
          SETTING_KEYS.hourlyRateCustomer,
          SETTING_KEYS.hourlyRateNonCustomer,
        ],
      },
    },
  });
  const map = new Map(rows.map((r) => [r.key, r.value]));
  return {
    customer:
      parseFloat(map.get(SETTING_KEYS.hourlyRateCustomer) ?? "") ||
      DEFAULT_HOURLY_RATE_CUSTOMER,
    nonCustomer:
      parseFloat(map.get(SETTING_KEYS.hourlyRateNonCustomer) ?? "") ||
      DEFAULT_HOURLY_RATE_NON_CUSTOMER,
  };
}

export async function updateHourlyRates(rates: HourlyRates): Promise<void> {
  await prisma.$transaction([
    prisma.setting.upsert({
      where: { key: SETTING_KEYS.hourlyRateCustomer },
      update: { value: String(rates.customer) },
      create: {
        key: SETTING_KEYS.hourlyRateCustomer,
        value: String(rates.customer),
      },
    }),
    prisma.setting.upsert({
      where: { key: SETTING_KEYS.hourlyRateNonCustomer },
      update: { value: String(rates.nonCustomer) },
      create: {
        key: SETTING_KEYS.hourlyRateNonCustomer,
        value: String(rates.nonCustomer),
      },
    }),
  ]);
}
