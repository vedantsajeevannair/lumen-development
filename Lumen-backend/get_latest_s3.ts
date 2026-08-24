import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

async function main() {
  const bucketName = process.env.AWS_BUCKET_NAME || 'lumen-smartcity-storage';
  console.log(`Listing objects in bucket: ${bucketName}...`);

  const listCommand = new ListObjectsV2Command({
    Bucket: bucketName,
    Prefix: 'complaints/images/',
  });

  const response = await client.send(listCommand);
  if (!response.Contents || response.Contents.length === 0) {
    console.log('No uploaded images found.');
    return;
  }

  // Find the latest object
  const sorted = response.Contents.sort((a, b) => {
    return (b.LastModified?.getTime() || 0) - (a.LastModified?.getTime() || 0);
  });

  const latest = sorted[0];
  console.log(`Latest image found: ${latest.Key} (Modified: ${latest.LastModified})`);

  const getCommand = new GetObjectCommand({
    Bucket: bucketName,
    Key: latest.Key,
  });

  const getResponse = await client.send(getCommand);
  const body = getResponse.Body;
  if (!body) {
    throw new Error('S3 object body is empty.');
  }

  const outputPath = path.join(__dirname, 'server', 'ai', 'python', 'test_latest.jpg');
  const fileStream = fs.createWriteStream(outputPath);
  
  // @ts-ignore
  const nodeStream = body as any;
  nodeStream.pipe(fileStream);

  await new Promise<void>((resolve, reject) => {
    fileStream.on('finish', () => resolve());
    fileStream.on('error', (err) => reject(err));
  });

  console.log(`Successfully saved latest image to: ${outputPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
