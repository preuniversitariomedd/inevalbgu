import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { cedulaToEmail } from "@/lib/cedula";

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

/** Restablece la contraseña con cédula + PIN (público, con bloqueo por intentos). */
export const resetConPinFn = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        cedula: z.string().min(1).max(20),
        pin: PIN,
        nueva: z.string().min(8, "La nueva contraseña debe tener mínimo 8 caracteres."),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin, perfil } = await perfilPorCedula(data.cedula);
    if (!perfil) return { ok: false, error: "La cédula no está registrada." };
    if (perfil.bloqueado) return { ok: false, error: "Esta cuenta está desactivada. Contacta al administrador." };
    const { data: reg } = await supabaseAdmin
      .from("user_pins")
      .select("pin_hash, intentos, bloqueado_hasta")
      .eq("user_id", perfil.id)
      .maybeSingle();
    if (!reg) return { ok: false, error: "Esta cuenta no tiene PIN creado. Pide al administrador que reinicie tu contraseña." };
    if (reg.bloqueado_hasta && new Date(reg.bloqueado_hasta) > new Date()) {
      return { ok: false, error: `Demasiados intentos. Intenta de nuevo después de las ${new Date(reg.bloqueado_hasta).toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" })}.` };
    }
    if ((await hashPin(perfil.id, data.pin)) !== reg.pin_hash) {
      const intentos = reg.intentos + 1;
      const bloquear = intentos >= MAX_INTENTOS;
      await supabaseAdmin
        .from("user_pins")
        .update({
          intentos: bloquear ? 0 : intentos,
          bloqueado_hasta: bloquear ? new Date(Date.now() + BLOQUEO_MIN * 60000).toISOString() : null,
        })
        .eq("user_id", perfil.id);
      return {
        ok: false,
        error: bloquear
          ? `PIN incorrecto. Se bloqueó la recuperación por ${BLOQUEO_MIN} minutos.`
          : `PIN incorrecto. Te quedan ${MAX_INTENTOS - intentos} intentos.`,
      };
    }
    const { error } = await supabaseAdmin.auth.admin.updateUserById(perfil.id, { password: data.nueva });
    if (error) return { ok: false, error: error.message };
    await supabaseAdmin.from("user_pins").update({ intentos: 0, bloqueado_hasta: null }).eq("user_id", perfil.id);
    await supabaseAdmin.from("profiles").update({ primera_vez: false }).eq("id", perfil.id);
    return { ok: true, email: cedulaToEmail(data.cedula) };
  });
