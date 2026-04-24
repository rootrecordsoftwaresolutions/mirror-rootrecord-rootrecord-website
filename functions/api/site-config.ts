type Env = {
  ROOTRECORD_API_BASE?: string;
};

export const onRequestGet = async (context: { env: Env }) => {
  const apiBase = (context.env.ROOTRECORD_API_BASE ?? "").trim().replace(/\/+$/, "");
  return new Response(JSON.stringify({ apiBase }), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
};
