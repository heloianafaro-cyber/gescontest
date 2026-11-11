   import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

   const bucket = process.env.S3_BUCKET!;

   const s3 = new S3Client({
     region: process.env.S3_REGION ?? "auto",
     endpoint: process.env.S3_ENDPOINT,
     forcePathStyle: true,
     credentials: {
       accessKeyId: process.env.S3_ACCESS_KEY_ID!,
       secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
     },
     requestChecksumCalculation: "WHEN_REQUIRED",
     responseChecksumValidation: "WHEN_REQUIRED",
   });

   export async function salvarArquivo(chave: string, corpo: Buffer, tipo: string) {
     await s3.send(new PutObjectCommand({ Bucket: bucket, Key: chave, Body: corpo, ContentType: tipo }));
   }

   export async function apagarArquivo(chave: string) {
     await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: chave }));
   }