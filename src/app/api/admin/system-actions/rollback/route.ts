import { createAdminClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth';
import { NextResponse } from 'next/server';
import AdmZip from 'adm-zip';

export async function POST(request: Request) {
  const { systemRole } = await requireAuth();

  if (systemRole !== 'system_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const zip = new AdmZip(buffer);
    const zipEntries = zip.getEntries();

    // 1. Parse Database Export
    const dbExportEntry = zipEntries.find(e => e.entryName === 'database-export.json');
    if (!dbExportEntry) {
      return NextResponse.json({ error: 'Invalid backup: database-export.json not found' }, { status: 400 });
    }

    const dbData = JSON.parse(dbExportEntry.getData().toString('utf8'));
    const supabase = await createAdminClient();

    // 1.5 Get valid user IDs to prevent FK violations on auth.users
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    const validUserIds = new Set((users || []).map(u => u.id));

    // 2. Clean Existing Data (In reverse dependency order)
    const tablesToClean = [
      'order_detail',
      'order',
      'customer_debt_history',
      'product_tag_assignment',
      'product',
      'customer',
      'user_shops',
      'product_tag',
      'shops',
      'unit'
    ];

    for (const table of tablesToClean) {
      // Use different column for composite key tables
      const deleteCol = (table === 'user_shops') ? 'user_id' : 
                        (table === 'product_tag_assignment') ? 'product_id' : 'id';
      
      const { error } = await supabase.from(table).delete().neq(deleteCol, '00000000-0000-0000-0000-000000000000');
      if (error) {
        console.error(`Error cleaning table ${table}:`, error);
        throw new Error(`Failed to clean table ${table}: ${error.message}`);
      }
    }

    // 3. Clean Storage
    const { data: allBuckets } = await supabase.storage.listBuckets();
    if (allBuckets) {
      for (const bucket of allBuckets) {
        // Recursive delete to ensure all subfolders are cleaned
        const listAllFiles = async (path = ''): Promise<string[]> => {
          const { data, error } = await supabase.storage.from(bucket.id).list(path);
          if (error || !data) return [];
          
          let files: string[] = [];
          for (const item of data) {
            const itemPath = path ? `${path}/${item.name}` : item.name;
            if (item.id === null) { // Directory
              const subFiles = await listAllFiles(itemPath);
              files = files.concat(subFiles);
            } else {
              files.push(itemPath);
            }
          }
          return files;
        };

        const filesToDelete = await listAllFiles();
        if (filesToDelete.length > 0) {
          const { error } = await supabase.storage.from(bucket.id).remove(filesToDelete);
          if (error) console.warn(`Error cleaning bucket ${bucket.id}:`, error);
        }
      }
    }

    // 4. Restore Database (In correct dependency order)
    const tablesToRestore = [
      'unit',
      'shops',
      'product_tag',
      'user_shops',
      'customer',
      'product',
      'product_tag_assignment',
      'customer_debt_history',
      'order',
      'order_detail'
    ];

    for (const tableName of tablesToRestore) {
      const tableData = dbData.tables.find((t: any) => t.name === tableName);
      if (tableData && tableData.rows && tableData.rows.length > 0) {
        // Sanitize rows for auth.users FKs
        const sanitizedRows = tableData.rows.map((row: any) => {
          const newRow = { ...row };
          
          // Handle user_shops (skip if user doesn't exist)
          if (tableName === 'user_shops' && !validUserIds.has(row.user_id)) {
            return null;
          }

          // Handle order audit fields
          if (tableName === 'order') {
            if (row.created_by && !validUserIds.has(row.created_by)) newRow.created_by = null;
            if (row.deleted_by && !validUserIds.has(row.deleted_by)) newRow.deleted_by = null;
          }

          return newRow;
        }).filter(Boolean);

        if (sanitizedRows.length === 0) continue;

        // Insert in batches of 100
        const BATCH_SIZE = 100;
        for (let i = 0; i < sanitizedRows.length; i += BATCH_SIZE) {
          const batch = sanitizedRows.slice(i, i + BATCH_SIZE);
          const { error } = await supabase.from(tableName).insert(batch);
          if (error) {
            console.error(`Error restoring table ${tableName}:`, error);
            throw new Error(`Failed to restore table ${tableName}: ${error.message}`);
          }
        }
      }
    }

    // 5. Restore Storage
    for (const entry of zipEntries) {
      if (entry.entryName.startsWith('storage/') && !entry.isDirectory) {
        const parts = entry.entryName.split('/');
        // storage/bucket_name/path/to/file
        const bucketName = parts[1];
        const filePath = parts.slice(2).join('/');
        
        const fileContent = entry.getData();
        const { error } = await supabase.storage.from(bucketName).upload(filePath, fileContent, {
          upsert: true
        });
        
        if (error) {
          console.warn(`Failed to restore file ${entry.entryName}:`, error);
          // Non-critical, but log it
        }
      }
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[ROLLBACK_ERROR]', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'An unknown error occurred' 
    }, { status: 500 });
  }
}
