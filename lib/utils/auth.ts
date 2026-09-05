// Utilitaire pour convertir les cookies en headers pour Better-Auth
import { cookies } from "next/headers";

export async function getAuthHeaders() {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll();
  return Object.fromEntries(
    allCookies.map((cookie) => [cookie.name, cookie.value])
  );
}
