import { adjustCustomerDebt } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { shopId } = await requireAuth();
  const { id } = await params;
  const body = await request.json();
  const { amount, reasonKey, reasonParams } = body;

  if (typeof amount !== 'number') {
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
  }

  try {
    const result = await adjustCustomerDebt(id, amount, reasonKey || 'manual_adjustment', reasonParams);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
