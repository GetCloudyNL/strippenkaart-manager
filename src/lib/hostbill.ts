// HostBill admin API-client.
//
// De HostBill admin-API zit doorgaans op https://<billing>/admin/api.php en
// verwacht `api_id`, `api_key` en `call=<method>` als form-parameters, en geeft
// JSON terug. De exacte method-namen/velden kunnen per HostBill-versie
// verschillen; controleer ze tegen jullie eigen instance. Alles is defensief
// opgezet zodat afwijkende response-vormen niet meteen crashen.

export interface HostbillConfig {
  url: string;
  apiId: string;
  apiKey: string;
}

export function getHostbillConfig(): HostbillConfig | null {
  const url = process.env.HOSTBILL_API_URL;
  const apiId = process.env.HOSTBILL_API_ID;
  const apiKey = process.env.HOSTBILL_API_KEY;
  if (!url || !apiId || !apiKey) return null;
  return { url, apiId, apiKey };
}

export function isHostbillConfigured(): boolean {
  return getHostbillConfig() !== null;
}

export class HostbillError extends Error {}

/** Voert een ruwe API-call uit en geeft de geparste JSON terug. */
export async function hostbillCall<T = unknown>(
  method: string,
  params: Record<string, string | number> = {},
): Promise<T> {
  const config = getHostbillConfig();
  if (!config) {
    throw new HostbillError("HostBill API is niet geconfigureerd.");
  }

  const body = new URLSearchParams();
  body.set("api_id", config.apiId);
  body.set("api_key", config.apiKey);
  body.set("call", method);
  for (const [k, v] of Object.entries(params)) {
    body.set(k, String(v));
  }

  const res = await fetch(config.url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    // HostBill kan traag zijn; laat de fetch niet eindeloos hangen.
    signal: AbortSignal.timeout(20000),
  });

  if (!res.ok) {
    throw new HostbillError(`HostBill HTTP ${res.status}`);
  }

  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new HostbillError(`Onverwachte HostBill-respons: ${text.slice(0, 200)}`);
  }

  if (
    json &&
    typeof json === "object" &&
    "success" in json &&
    (json as { success: unknown }).success === false
  ) {
    const err = (json as { error?: unknown }).error;
    throw new HostbillError(
      `HostBill-fout: ${typeof err === "string" ? err : JSON.stringify(err)}`,
    );
  }

  return json as T;
}

export interface NormalizedOrder {
  orderId: number;
  clientId: number;
  productId: number;
  status: string;
}

interface RawOrder {
  id?: number | string;
  order_id?: number | string;
  client_id?: number | string;
  clientId?: number | string;
  product_id?: number | string;
  productId?: number | string;
  status?: string;
}

function toInt(v: unknown): number | null {
  if (v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

/** Normaliseert een ruwe order naar een vaste vorm, of null bij onbruikbaar. */
export function normalizeOrder(raw: RawOrder): NormalizedOrder | null {
  const orderId = toInt(raw.id ?? raw.order_id);
  const clientId = toInt(raw.client_id ?? raw.clientId);
  const productId = toInt(raw.product_id ?? raw.productId);
  if (orderId == null || clientId == null || productId == null) return null;
  return {
    orderId,
    clientId,
    productId,
    status: String(raw.status ?? ""),
  };
}

/**
 * Haalt orders op uit HostBill. De method-naam is instelbaar via
 * HOSTBILL_ORDERS_CALL (standaard "getOrders"). Retourneert genormaliseerde
 * orders; onbekende response-vormen leveren een lege lijst op.
 */
export async function getOrders(
  params: Record<string, string | number> = {},
): Promise<NormalizedOrder[]> {
  const method = process.env.HOSTBILL_ORDERS_CALL || "getOrders";
  const json = await hostbillCall<Record<string, unknown>>(method, params);

  // Zoek een array in de respons (bijv. json.orders of json.data).
  const candidates: unknown[] = [];
  for (const key of ["orders", "data", "result"]) {
    const val = (json as Record<string, unknown>)[key];
    if (Array.isArray(val)) candidates.push(...val);
    else if (val && typeof val === "object")
      candidates.push(...Object.values(val));
  }

  return candidates
    .filter((o): o is RawOrder => !!o && typeof o === "object")
    .map(normalizeOrder)
    .filter((o): o is NormalizedOrder => o !== null);
}

export interface NormalizedClient {
  clientId: number;
  firstName: string;
  lastName: string;
  companyName: string;
  email: string;
}

/** Haalt klantgegevens op uit HostBill. */
export async function getClientDetails(
  clientId: number,
): Promise<NormalizedClient | null> {
  const json = await hostbillCall<Record<string, unknown>>("getClientDetails", {
    id: clientId,
  });
  const client = (json.client ?? json.data ?? json) as Record<string, unknown>;
  if (!client || typeof client !== "object") return null;
  return {
    clientId,
    firstName: String(client.firstname ?? client.firstName ?? ""),
    lastName: String(client.lastname ?? client.lastName ?? ""),
    companyName: String(client.companyname ?? client.companyName ?? ""),
    email: String(client.email ?? ""),
  };
}

/**
 * Maakt een upsell-order/factuur aan in HostBill voor een klant/product.
 * De concrete call/velden kunnen per instance verschillen; instelbaar via
 * HOSTBILL_UPSELL_CALL (standaard "addOrder").
 */
export async function createUpsellOrder(
  clientId: number,
  productId: number,
): Promise<void> {
  const method = process.env.HOSTBILL_UPSELL_CALL || "addOrder";
  await hostbillCall(method, { client_id: clientId, product_id: productId });
}
