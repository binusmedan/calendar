import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Ambil origin yang dikirimkan oleh browser (bisa 'null' dari Office Scripts sandboxed iframe, atau URL domain)
  const origin = request.headers.get("origin") || "*";

  const corsHeaders = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-api-key, Authorization, X-Requested-With",
    "Access-Control-Max-Age": "86400",
  };

  // Tangani preflight OPTIONS request secara langsung di Edge Middleware dengan status 200
  if (request.method === "OPTIONS") {
    return NextResponse.json({}, {
      status: 200,
      headers: corsHeaders,
    });
  }

  // Untuk request lainnya (seperti POST), lanjutkan dan sematkan header CORS pada response
  const response = NextResponse.next();
  response.headers.set("Access-Control-Allow-Origin", origin);
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, x-api-key, Authorization, X-Requested-With");

  return response;
}

export const config = {
  matcher: "/api/:path*",
};
