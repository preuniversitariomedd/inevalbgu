import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/fisica")({
  head: () => ({
    meta: [
      { title: "Física — Cinemática, Dinámica y Energía | INEVAL_UEDE" },
      { name: "description", content: "Practica Física de 1ro BGU por bloques, consulta el glosario de fórmulas y estudia con el agente IA personalizado." },
      { property: "og:title", content: "Física para 1ro BGU — INEVAL_UEDE" },
      { property: "og:description", content: "Cinemática, dinámica y energía con ejercicios, imágenes, cinco opciones y tutor IA." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => <Outlet />,
});
