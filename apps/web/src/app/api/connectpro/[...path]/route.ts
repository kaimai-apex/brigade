import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const GATEWAY = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

async function proxy(request: NextRequest, pathSegments: string[]) {
  const cookieStore = await cookies();
  const token = cookieStore.get('connectpro_access_token')?.value;
  const target = `${GATEWAY}/${pathSegments.join('/')}${request.nextUrl.search}`;

  const headers: Record<string, string> = {};
  const contentType = request.headers.get('content-type');
  if (contentType) headers['content-type'] = contentType;
  if (token) headers.Authorization = `Bearer ${token}`;

  const body = ['GET', 'HEAD'].includes(request.method)
    ? undefined
    : await request.text();

  const upstream = await fetch(target, { method: request.method, headers, body });
  const text = await upstream.text();

  return new NextResponse(text, {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') ?? 'application/json',
    },
  });
}

type RouteCtx = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxy(request, path);
}

export async function POST(request: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxy(request, path);
}

export async function PUT(request: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxy(request, path);
}

export async function DELETE(request: NextRequest, ctx: RouteCtx) {
  const { path } = await ctx.params;
  return proxy(request, path);
}
