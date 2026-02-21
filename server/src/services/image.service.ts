import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import OpenAI from 'openai';

const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';

function getUploadRoot(): string {
  return path.resolve(UPLOAD_DIR);
}

export async function ensureUploadDir(): Promise<void> {
  const dir = getUploadRoot();
  await fs.promises.mkdir(dir, { recursive: true });
}

export async function processAndSave(
  buffer: Buffer,
  storeId: string,
  _mimeType?: string,
): Promise<string> {
  const storeDir = path.join(getUploadRoot(), storeId);
  await fs.promises.mkdir(storeDir, { recursive: true });

  const timestamp = Date.now();
  const random = crypto.randomBytes(4).toString('hex');
  const filename = `${timestamp}-${random}.webp`;
  const filePath = path.join(storeDir, filename);

  await sharp(buffer)
    .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(filePath);

  return `/uploads/${storeId}/${filename}`;
}

export async function generateWithAI(
  prompt: string,
  storeId: string,
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured');
  }

  const openai = new OpenAI({ apiKey });

  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt,
    n: 1,
    size: '1024x1024',
    response_format: 'b64_json',
  });

  const b64 = response.data?.[0]?.b64_json;
  if (!b64) {
    throw new Error('No image data returned from AI');
  }

  const buffer = Buffer.from(b64, 'base64');
  return processAndSave(buffer, storeId);
}

export async function deleteLocalImage(urlPath: string): Promise<void> {
  if (!urlPath.startsWith('/uploads/')) return;
  const filePath = path.join(getUploadRoot(), urlPath.replace('/uploads/', ''));
  try {
    await fs.promises.unlink(filePath);
  } catch {
    // File may not exist, ignore
  }
}
