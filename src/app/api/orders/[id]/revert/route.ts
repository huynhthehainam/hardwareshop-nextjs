import { revertOrder } from '@/lib/db';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(
  _request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await ctx.params;
    const order = await revertOrder(id, user.id);

    return NextResponse.json(order);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = message === 'ORDER_ALREADY_REVERTED' ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
