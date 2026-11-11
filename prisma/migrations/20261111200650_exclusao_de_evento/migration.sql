-- CreateTable
CREATE TABLE "evento_exclusao_aprovacao" (
    "evento_id" INTEGER NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evento_exclusao_aprovacao_pkey" PRIMARY KEY ("evento_id","usuario_id")
);

-- AddForeignKey
ALTER TABLE "evento_exclusao_aprovacao" ADD CONSTRAINT "evento_exclusao_aprovacao_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_exclusao_aprovacao" ADD CONSTRAINT "evento_exclusao_aprovacao_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
