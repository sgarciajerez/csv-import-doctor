import prisma from "../db.server";

export async function loader() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return new Response("ok", {
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  } catch {
    return new Response("unavailable", {
      status: 503,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }
}
