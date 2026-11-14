import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const PIN = z.string().regex(/^\d{4}$/, "El PIN debe tener exactamente 4 dígitos.");
const MAX_INTENTOS = 5;
const BLOQUEO_MIN = 30;

async function hashPin(userId: string, pin: string) {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`ineval-pin:${userId}:${pin}`),
  );
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function perfilPorCedula(cedula: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id, bloqueado")
    .eq("cedula", cedula.trim())
    .maybeSingle();
  return { supabaseAdmin, perfil: data };
}

/** Explica por qué falló un inicio de sesión (sin revelar la contraseña). */
export const diagnosticarLoginFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ cedula: z.string().min(1).max(20) }).parse(d))
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin, perfil } = await perfilPorCedula(data.cedula);
      if (!perfil) return { estado: "no_existe" as const };
      if (perfil.bloqueado) return { estado: "bloqueado" as const };
      const { data: pin } = await supabaseAdmin
        .from("user_pins")
        .select("user_id")
        .eq("user_id", perfil.id)
        .maybeSingle();
      return { estado: "password" as const, tienePin: !!pin };
    } catch {
      return { estado: "servicio" as const };
    }
  });

export const tienePinFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("user_pins")
      .select("user_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    return { tienePin: !!data };
  });

export const establecerPinFn = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ pin: PIN }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("user_pins").upsert({
      user_id: context.userId,
      pin_hash: await hashPin(context.userId, data.pin),
      intentos: 0,
      bloqueado_hasta: null,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// La recuperación pública con cédula + PIN fue retirada: un PIN de 4 dígitos no prueba
// el control de la cuenta. Las contraseñas las reinicia el personal (clave temporal única).
