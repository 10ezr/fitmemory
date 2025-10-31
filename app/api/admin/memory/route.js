import { NextResponse } from 'next/server';
import connectDatabase from '@/lib/database';
import MemoryService from '@/services/memoryService';

export async function POST(request) {
  await connectDatabase();
  const body = await request.json();
  const ms = new MemoryService();
  const created = await (ms.addMemory?.(body) || ms.processRememberCommand(`remember this: ${body.content}`));
  return NextResponse.json({ ok: true, created });
}

export async function PUT(request) {
  await connectDatabase();
  const body = await request.json(); // { _id, type, content }
  const ms = new MemoryService();
  const updated = await ms.updateMemory?.(body);
  if (!updated) return NextResponse.json({ ok: false }, { status: 400 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(request) {
  await connectDatabase();
  const id = new URL(request.url).searchParams.get('id');
  const ms = new MemoryService();
  const removed = await ms.deleteMemory?.(id);
  if (!removed) return NextResponse.json({ ok: false }, { status: 400 });
  return NextResponse.json({ ok: true });
}
