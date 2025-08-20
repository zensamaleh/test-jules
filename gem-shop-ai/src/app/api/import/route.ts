import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import path from 'path';
import fs from 'fs';

export async function POST(request: NextRequest) {
  try {
    const data = await request.formData();
    const file: File | null = data.get('file') as unknown as File;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided.' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // In a real app, this would be S3 or another object store.
    // For this MVP, we save it locally.
    const uploadDir = path.join(process.cwd(), 'uploads');

    // Ensure the upload directory exists.
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, file.name);
    await writeFile(filePath, buffer);

    console.log(`File uploaded to ${filePath}`);

    return NextResponse.json({
      success: true,
      filename: file.name,
      message: 'File uploaded successfully. Ingestion will start soon.'
    });

  } catch (error) {
    console.error('Upload Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ success: false, error: `Something went wrong during the upload: ${errorMessage}` }, { status: 500 });
  }
}
