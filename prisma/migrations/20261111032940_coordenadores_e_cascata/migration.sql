-- DropForeignKey
ALTER TABLE "boletim" DROP CONSTRAINT "boletim_evento_id_fkey";

-- DropForeignKey
ALTER TABLE "disputa" DROP CONSTRAINT "disputa_torneio_id_fkey";

-- DropForeignKey
ALTER TABLE "equipe" DROP CONSTRAINT "equipe_modalidade_id_fkey";

-- DropForeignKey
ALTER TABLE "ocorrencia" DROP CONSTRAINT "ocorrencia_disputa_id_fkey";

-- DropForeignKey
ALTER TABLE "partida" DROP CONSTRAINT "partida_equipe_a_id_fkey";

-- DropForeignKey
ALTER TABLE "partida" DROP CONSTRAINT "partida_equipe_b_id_fkey";

-- DropForeignKey
ALTER TABLE "resultado" DROP CONSTRAINT "resultado_equipe_id_fkey";

-- DropForeignKey
ALTER TABLE "torneio" DROP CONSTRAINT "torneio_modalidade_id_fkey";

-- CreateTable
CREATE TABLE "evento_coordenador" (
    "evento_id" INTEGER NOT NULL,
    "usuario_id" INTEGER NOT NULL,

    CONSTRAINT "evento_coordenador_pkey" PRIMARY KEY ("evento_id","usuario_id")
);

-- AddForeignKey
ALTER TABLE "evento_coordenador" ADD CONSTRAINT "evento_coordenador_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evento_coordenador" ADD CONSTRAINT "evento_coordenador_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "torneio" ADD CONSTRAINT "torneio_modalidade_id_fkey" FOREIGN KEY ("modalidade_id") REFERENCES "modalidade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputa" ADD CONSTRAINT "disputa_torneio_id_fkey" FOREIGN KEY ("torneio_id") REFERENCES "torneio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partida" ADD CONSTRAINT "partida_equipe_a_id_fkey" FOREIGN KEY ("equipe_a_id") REFERENCES "equipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partida" ADD CONSTRAINT "partida_equipe_b_id_fkey" FOREIGN KEY ("equipe_b_id") REFERENCES "equipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resultado" ADD CONSTRAINT "resultado_equipe_id_fkey" FOREIGN KEY ("equipe_id") REFERENCES "equipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipe" ADD CONSTRAINT "equipe_modalidade_id_fkey" FOREIGN KEY ("modalidade_id") REFERENCES "modalidade"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ocorrencia" ADD CONSTRAINT "ocorrencia_disputa_id_fkey" FOREIGN KEY ("disputa_id") REFERENCES "disputa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boletim" ADD CONSTRAINT "boletim_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE CASCADE ON UPDATE CASCADE;
