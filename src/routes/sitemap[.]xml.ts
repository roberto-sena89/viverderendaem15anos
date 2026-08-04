import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = "https://viverderendaem15anos.lovable.app";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        // Only public, indexable routes belong here.
        //
        // Deliberately excluded (each returns robots "noindex, follow" in its
        // own head() and is disallowed in public/robots.txt):
        //   /verificar-email, /recuperar-senha, /redefinir-senha
        //     -> transient account states tied to one-time e-mail links.
        //   /mcp, /.mcp/list-tools, /.well-known/*, /api/*
        //     -> machine endpoints (JSON/OAuth), not human-readable content.
        //   /_authenticated/* (dashboard, carteira, aportes, dividendos,
        //     planejador, rankings, rebalanceamento, metas, estatisticas,
        //     mercado, chat) -> private, redirect to /auth for crawlers.

        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/calculadora-juros-compostos", changefreq: "monthly", priority: "0.9" },
          { path: "/quanto-rende-1-milhao-por-mes", changefreq: "monthly", priority: "0.9" },
          { path: "/o-que-e-renda-passiva", changefreq: "monthly", priority: "0.9" },

          { path: "/guia-liberdade-financeira", changefreq: "monthly", priority: "0.8" },
          { path: "/blog/melhores-livros-financas", changefreq: "monthly", priority: "0.8" },
          { path: "/auth", changefreq: "monthly", priority: "0.5" },
        ];

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
