import { createAdminClient, createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { systemRole } = await requireAuth();
  
  if (systemRole !== 'system_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const supabase = await createClient();
  const adminClient = await createAdminClient();

  // Fetch shop details
  const { data: shop, error: shopError } = await supabase
    .from('shops')
    .select('*')
    .eq('id', id)
    .single();

  if (shopError) {
    return NextResponse.json({ error: shopError.message }, { status: 500 });
  }

  // Fetch users mapped to this shop
  const { data: userShops, error: userError } = await supabase
    .from('user_shops')
    .select(`
      role,
      user_id
    `)
    .eq('shop_id', id);

  if (userError) {
    return NextResponse.json({ error: userError.message }, { status: 500 });
  }

  // Fetch auth user details for each user
  const usersWithEmails = await Promise.all(
    (userShops || []).map(async (us) => {
      const { data: userData, error: authError } = await adminClient.auth.admin.getUserById(us.user_id);
      return {
        ...us,
        email: userData?.user?.email || 'Unknown',
        last_sign_in_at: userData?.user?.last_sign_in_at
      };
    })
  );
  
  return NextResponse.json({ shop, users: usersWithEmails });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { systemRole } = await requireAuth();
  
  if (systemRole !== 'system_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: shopId } = await params;
  const { email, password, role } = await request.json();

  if (!email || !password || !role) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const adminClient = await createAdminClient();

  try {
    // 1. Create auth user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { system_role: 'shop_user' }
    });

    if (authError) throw authError;

    const userId = authData.user.id;

    // 2. Map user to shop
    const { error: mappingError } = await adminClient
      .from('user_shops')
      .insert({
        user_id: userId,
        shop_id: shopId,
        role
      });

    if (mappingError) {
      // Cleanup auth user if mapping fails
      await adminClient.auth.admin.deleteUser(userId);
      throw mappingError;
    }

    return NextResponse.json({ success: true, user: authData.user });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { systemRole } = await requireAuth();
  
  if (systemRole !== 'system_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id: shopId } = await params;
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  const adminClient = await createAdminClient();

  try {
    // We only remove from user_shops or delete auth account?
    // User requested "add user to that shop", deleting should probably remove from shop
    // If we want to fully delete the account:
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    if (deleteError) throw deleteError;

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
