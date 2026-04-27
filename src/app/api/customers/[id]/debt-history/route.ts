import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(
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

    const { data, error } = await supabase
      .from('customer_debt_history')
      .select('*')
      .eq('customer_id', id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ history: data ?? [] });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
