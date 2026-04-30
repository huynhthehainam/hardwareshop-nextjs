import { createAdminClient } from '@/lib/supabase/server';
import { requireAuth } from '@/lib/auth';
import { NextResponse } from 'next/server';

const CRC32_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i += 1) {
  let c = i;
  for (let j = 0; j < 8; j += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  CRC32_TABLE[i] = c >>> 0;
}

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i += 1) {
    crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ data[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function buildZipFile(fileName: string, fileContents: string) {
  const encoder = new TextEncoder();
  const nameBytes = encoder.encode(fileName);
  const fileBytes = encoder.encode(fileContents);
  const crc = crc32(fileBytes);
  const size = fileBytes.length;
  const localHeaderSize = 30 + nameBytes.length;
  const centralHeaderSize = 46 + nameBytes.length;
  const localHeaderOffset = 0;
  const centralDirOffset = localHeaderSize + size;
  const centralDirSize = centralHeaderSize;
  const totalSize = centralDirOffset + centralDirSize + 22;
  const buffer = new Uint8Array(totalSize);
  const view = new DataView(buffer.buffer);
  let offset = 0;

  const writeUint32 = (value: number) => {
    view.setUint32(offset, value, true);
    offset += 4;
  };

  const writeUint16 = (value: number) => {
    view.setUint16(offset, value, true);
    offset += 2;
  };

  const writeBytes = (bytes: Uint8Array) => {
    buffer.set(bytes, offset);
    offset += bytes.length;
  };

  // Local file header
  writeUint32(0x04034b50);
  writeUint16(20);
  writeUint16(0);
  writeUint16(0);
  writeUint16(0);
  writeUint16(0);
  writeUint32(crc);
  writeUint32(size);
  writeUint32(size);
  writeUint16(nameBytes.length);
  writeUint16(0);
  writeBytes(nameBytes);
  writeBytes(fileBytes);

  // Central directory header
  writeUint32(0x02014b50);
  writeUint16(20);
  writeUint16(20);
  writeUint16(0);
  writeUint16(0);
  writeUint16(0);
  writeUint16(0);
  writeUint32(crc);
  writeUint32(size);
  writeUint32(size);
  writeUint16(nameBytes.length);
  writeUint16(0);
  writeUint16(0);
  writeUint16(0);
  writeUint16(0);
  writeUint32(0);
  writeUint32(localHeaderOffset);
  writeBytes(nameBytes);

  // End of central directory record
  writeUint32(0x06054b50);
  writeUint16(0);
  writeUint16(0);
  writeUint16(1);
  writeUint16(1);
  writeUint32(centralDirSize);
  writeUint32(centralDirOffset);
  writeUint16(0);

  return buffer;
}

export async function GET() {
  const { systemRole } = await requireAuth();

  if (systemRole !== 'system_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = await createAdminClient();
  const { data: tables, error } = await supabase
    .from('information_schema.tables')
    .select('table_schema,table_name')
    .eq('table_type', 'BASE TABLE')
    .not('table_schema', 'in', '(pg_catalog,information_schema,pg_toast)')
    .order('table_schema', { ascending: true })
    .order('table_name', { ascending: true });

  if (error || !tables) {
    return NextResponse.json({ error: error?.message ?? 'Unable to enumerate tables' }, { status: 500 });
  }

  const exportTables = [];

  for (const table of tables as { table_schema: string; table_name: string }[]) {
    const tableRef = `${table.table_schema}.${table.table_name}`;
    const { data: rows, error: rowsError } = await supabase.from(tableRef).select('*');

    if (rowsError) {
      return NextResponse.json({ error: rowsError.message }, { status: 500 });
    }

    exportTables.push({
      schema: table.table_schema,
      name: table.table_name,
      rows,
    });
  }

  const payload = JSON.stringify(
    {
      exported_at: new Date().toISOString(),
      tables: exportTables,
    },
    null,
    2
  );

  const zip = buildZipFile('database-export.json', payload);

  return new Response(zip, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="hardware-shop-database-export.zip"',
      'Cache-Control': 'no-store',
    },
  });
}
