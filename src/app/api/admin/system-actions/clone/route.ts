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

class ZipBuilder {
  private files: { name: string; content: Uint8Array; crc: number; size: number; offset: number }[] = [];
  private currentOffset = 0;

  addFile(name: string, content: string | Uint8Array) {
    const encoder = new TextEncoder();
    const data = typeof content === 'string' ? encoder.encode(content) : content;
    const crc = crc32(data);
    const size = data.length;
    const offset = this.currentOffset;

    this.files.push({ name, content: data, crc, size, offset });
    
    // local header (30 + name) + content
    const nameBytes = encoder.encode(name);
    this.currentOffset += 30 + nameBytes.length + size;
  }

  build(): Uint8Array {
    const encoder = new TextEncoder();
    let centralDirSize = 0;
    for (const file of this.files) {
      const nameBytes = encoder.encode(file.name);
      centralDirSize += 46 + nameBytes.length;
    }

    const totalSize = this.currentOffset + centralDirSize + 22;
    const buffer = new Uint8Array(totalSize);
    const view = new DataView(buffer.buffer);
    let pos = 0;

    // Write Local File Headers and Data
    for (const file of this.files) {
      const nameBytes = encoder.encode(file.name);
      
      // signature
      view.setUint32(pos, 0x04034b50, true); pos += 4;
      view.setUint16(pos, 20, true); pos += 2; // version
      view.setUint16(pos, 0, true); pos += 2; // flags
      view.setUint16(pos, 0, true); pos += 2; // compression (none)
      view.setUint16(pos, 0, true); pos += 2; // time
      view.setUint16(pos, 0, true); pos += 2; // date
      view.setUint32(pos, file.crc, true); pos += 4;
      view.setUint32(pos, file.size, true); pos += 4; // compressed size
      view.setUint32(pos, file.size, true); pos += 4; // uncompressed size
      view.setUint16(pos, nameBytes.length, true); pos += 2;
      view.setUint16(pos, 0, true); pos += 2; // extra field length
      
      buffer.set(nameBytes, pos); pos += nameBytes.length;
      buffer.set(file.content, pos); pos += file.content.length;
    }

    const centralDirOffset = pos;

    // Write Central Directory Headers
    for (const file of this.files) {
      const nameBytes = encoder.encode(file.name);
      
      // signature
      view.setUint32(pos, 0x02014b50, true); pos += 4;
      view.setUint16(pos, 20, true); pos += 2; // version made by
      view.setUint16(pos, 20, true); pos += 2; // version needed
      view.setUint16(pos, 0, true); pos += 2; // flags
      view.setUint16(pos, 0, true); pos += 2; // compression
      view.setUint16(pos, 0, true); pos += 2; // time
      view.setUint16(pos, 0, true); pos += 2; // date
      view.setUint32(pos, file.crc, true); pos += 4;
      view.setUint32(pos, file.size, true); pos += 4;
      view.setUint32(pos, file.size, true); pos += 4;
      view.setUint16(pos, nameBytes.length, true); pos += 2;
      view.setUint16(pos, 0, true); pos += 2; // extra field
      view.setUint16(pos, 0, true); pos += 2; // comment
      view.setUint16(pos, 0, true); pos += 2; // disk start
      view.setUint16(pos, 0, true); pos += 2; // internal attr
      view.setUint32(pos, 0, true); pos += 4; // external attr
      view.setUint32(pos, file.offset, true); pos += 4; // local header offset
      
      buffer.set(nameBytes, pos); pos += nameBytes.length;
    }

    // End of central directory record
    view.setUint32(pos, 0x06054b50, true); pos += 4;
    view.setUint16(pos, 0, true); pos += 2; // disk number
    view.setUint16(pos, 0, true); pos += 2; // central dir disk
    view.setUint16(pos, this.files.length, true); pos += 2; // entries on disk
    view.setUint16(pos, this.files.length, true); pos += 2; // total entries
    view.setUint32(pos, centralDirSize, true); pos += 4;
    view.setUint32(pos, centralDirOffset, true); pos += 4;
    view.setUint16(pos, 0, true); pos += 2; // comment length

    return buffer;
  }
}

async function listAllFiles(supabase: any, bucket: string, path: string = ''): Promise<string[]> {
  const { data, error } = await supabase.storage.from(bucket).list(path);
  if (error) return [];

  let files: string[] = [];
  for (const item of data) {
    const itemPath = path ? `${path}/${item.name}` : item.name;
    if (item.id === null) {
      // It's a directory
      const subFiles = await listAllFiles(supabase, bucket, itemPath);
      files = files.concat(subFiles);
    } else {
      files.push(itemPath);
    }
  }
  return files;
}

export async function GET() {
  const { systemRole } = await requireAuth();

  if (systemRole !== 'system_admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = await createAdminClient();
  const zip = new ZipBuilder();

  // 1. Export Database Tables
  const { data: tables, error: tableListError } = await supabase.rpc('get_table_names');
  if (tableListError || !tables) {
    return NextResponse.json({ error: tableListError?.message ?? 'Unable to enumerate tables' }, { status: 500 });
  }

  const exportTables = [];
  for (const table of tables as { table_schema: string; table_name: string }[]) {
    const { data: rows, error: rowsError } = await supabase.from(table.table_name).select('*');
    if (rowsError) return NextResponse.json({ error: rowsError.message }, { status: 500 });
    exportTables.push({ schema: table.table_schema, name: table.table_name, rows });
  }

  zip.addFile('database-export.json', JSON.stringify({
    exported_at: new Date().toISOString(),
    tables: exportTables,
  }, null, 2));

  // 2. Export Storage Buckets
  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
  if (bucketError) return NextResponse.json({ error: bucketError.message }, { status: 500 });

  for (const bucket of buckets) {
    const files = await listAllFiles(supabase, bucket.name);
    for (const filePath of files) {
      const { data: fileData, error: downloadError } = await supabase.storage.from(bucket.name).download(filePath);
      if (downloadError) continue; // Skip failed downloads

      const arrayBuffer = await fileData.arrayBuffer();
      zip.addFile(`storage/${bucket.name}/${filePath}`, new Uint8Array(arrayBuffer));
    }
  }

  const zipBuffer = zip.build();

  return new Response(zipBuffer as unknown as BodyInit, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': 'attachment; filename="hardware-shop-complete-clone.zip"',
      'Cache-Control': 'no-store',
    },
  });
}
