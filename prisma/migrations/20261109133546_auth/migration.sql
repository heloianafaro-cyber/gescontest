/*
  Warnings:

  - You are about to drop the column `senha_hash` on the `usuario` table. All the data in the column will be lost.
  - Added the required column `atualizado_em` to the `usuario` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "usuario" DROP COLUMN "senha_hash",
ADD COLUMN     "atualizado_em" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "email_verificado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "image" TEXT;

-- CreateTable
CREATE TABLE "sessao" (
    "id" SERIAL NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "sessao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conta" (
    "id" SERIAL NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verificacao" (
    "id" SERIAL NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verificacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sessao_token_key" ON "sessao"("token");

-- CreateIndex
CREATE INDEX "sessao_userId_idx" ON "sessao"("userId");

-- CreateIndex
CREATE INDEX "conta_userId_idx" ON "conta"("userId");

-- CreateIndex
CREATE INDEX "verificacao_identifier_idx" ON "verificacao"("identifier");

-- AddForeignKey
ALTER TABLE "sessao" ADD CONSTRAINT "sessao_userId_fkey" FOREIGN KEY ("userId") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conta" ADD CONSTRAINT "conta_userId_fkey" FOREIGN KEY ("userId") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
