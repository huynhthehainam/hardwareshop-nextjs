import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { id } = await params;

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { name, phone, is_frequent_customer } = await request.json();
    const { data, error } = await supabase
      .from('customer')
      .update({ name, phone, is_frequent_customer })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ customer: data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}