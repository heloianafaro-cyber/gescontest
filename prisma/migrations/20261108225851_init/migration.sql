-- CreateEnum
CREATE TYPE "TipoUsuario" AS ENUM ('PROF', 'ATLETA', 'STAFF', 'TECNICO', 'ADM');

-- CreateEnum
CREATE TYPE "FichaStatus" AS ENUM ('PENDENTE', 'APROVADA', 'RECUSADA');

-- CreateEnum
CREATE TYPE "Naipe" AS ENUM ('MASCULINO', 'FEMININO', 'MISTO');

-- CreateEnum
CREATE TYPE "TipoModalidade" AS ENUM ('INDIVIDUAL', 'COLETIVA');

-- CreateEnum
CREATE TYPE "FormatoPlacar" AS ENUM ('CORRIDO', 'SETS');

-- CreateEnum
CREATE TYPE "StatusDisputa" AS ENUM ('AGENDADA', 'EM_ANDAMENTO', 'ENCERRADA', 'WO');

-- CreateEnum
CREATE TYPE "StatusOcorrencia" AS ENUM ('ABERTA', 'EM_ANALISE', 'RESOLVIDA');

-- CreateEnum
CREATE TYPE "StatusBoletim" AS ENUM ('RASCUNHO', 'PUBLICADO');

-- CreateEnum
CREATE TYPE "TipoBoletim" AS ENUM ('PARCIAL', 'FINAL');

-- CreateTable
CREATE TABLE "usuario" (
    "id" SERIAL NOT NULL,
    "tipo" "TipoUsuario" NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "celular" TEXT,
    "senha_hash" TEXT NOT NULL,
    "ultimo_acesso" TIMESTAMP(3),
    "cpf" TEXT,
    "matricula" TEXT,
    "data_nascimento" DATE,
    "ficha_status" "FichaStatus",
    "ficha_arquivo" TEXT,
    "ficha_motivo_recusa" TEXT,
    "delegacao_id" INTEGER,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delegacao" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "prof_id" INTEGER NOT NULL,

    CONSTRAINT "delegacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auxiliar" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "celular" TEXT,
    "delegacao_id" INTEGER NOT NULL,

    CONSTRAINT "auxiliar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificacao" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "mensagem" TEXT NOT NULL,
    "data_hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status_lida" BOOLEAN NOT NULL DEFAULT false,
    "email_enviado" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "notificacao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evento" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "idade_limite" INTEGER,
    "max_mod_total" INTEGER,
    "max_mod_ind" INTEGER,
    "max_mod_col" INTEGER,
    "data_inicio" TIMESTAMP(3) NOT NULL,
    "data_fim" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "evento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "local" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "evento_id" INTEGER NOT NULL,

    CONSTRAINT "local_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "modalidade" (
    "id" SERIAL NOT NULL,
    "evento_id" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "min_atletas" INTEGER NOT NULL DEFAULT 1,
    "max_atletas" INTEGER NOT NULL DEFAULT 1,
    "tipo" "TipoModalidade" NOT NULL,
    "formato_placar" "FormatoPlacar",

    CONSTRAINT "modalidade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "criterio_desempate" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "formato" TEXT NOT NULL,

    CONSTRAINT "criterio_desempate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "torneio" (
    "id" SERIAL NOT NULL,
    "nome" TEXT NOT NULL,
    "modalidade_id" INTEGER NOT NULL,
    "sistema_disputa" TEXT NOT NULL,
    "chaves" INTEGER,
    "pontos_vit" INTEGER NOT NULL DEFAULT 3,
    "pontos_emp" INTEGER NOT NULL DEFAULT 1,
    "pontos_der" INTEGER NOT NULL DEFAULT 0,
    "sets_para_vencer" INTEGER,
    "pontos_por_set" INTEGER,
    "pontos_set_decisivo" INTEGER,
    "diferenca_minima" INTEGER,
    "wo_placar_vencedor" INTEGER,
    "wo_placar_perdedor" INTEGER,
    "wo_pontos_set_vencedor" INTEGER,

    CONSTRAINT "torneio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "torneio_criterio" (
    "torneio_id" INTEGER NOT NULL,
    "criterio_id" INTEGER NOT NULL,
    "ordem" INTEGER NOT NULL,

    CONSTRAINT "torneio_criterio_pkey" PRIMARY KEY ("torneio_id","criterio_id")
);

-- CreateTable
CREATE TABLE "disputa" (
    "id" SERIAL NOT NULL,
    "torneio_id" INTEGER NOT NULL,
    "local_id" INTEGER,
    "data_hora" TIMESTAMP(3) NOT NULL,
    "duracao_min" INTEGER,
    "fase" TEXT,
    "status" "StatusDisputa" NOT NULL DEFAULT 'AGENDADA',

    CONSTRAINT "disputa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "partida" (
    "disputa_id" INTEGER NOT NULL,
    "equipe_a_id" INTEGER NOT NULL,
    "equipe_b_id" INTEGER NOT NULL,
    "placar_a" INTEGER NOT NULL DEFAULT 0,
    "placar_b" INTEGER NOT NULL DEFAULT 0,
    "cartao_ama_a" INTEGER NOT NULL DEFAULT 0,
    "cartao_ama_b" INTEGER NOT NULL DEFAULT 0,
    "cartao_ver_a" INTEGER NOT NULL DEFAULT 0,
    "cartao_ver_b" INTEGER NOT NULL DEFAULT 0,
    "wo_equipe_id" INTEGER,

    CONSTRAINT "partida_pkey" PRIMARY KEY ("disputa_id")
);

-- CreateTable
CREATE TABLE "set_partida" (
    "partida_id" INTEGER NOT NULL,
    "numero" INTEGER NOT NULL,
    "pontos_a" INTEGER NOT NULL DEFAULT 0,
    "pontos_b" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "set_partida_pkey" PRIMARY KEY ("partida_id","numero")
);

-- CreateTable
CREATE TABLE "prova" (
    "disputa_id" INTEGER NOT NULL,
    "bateria" INTEGER,

    CONSTRAINT "prova_pkey" PRIMARY KEY ("disputa_id")
);

-- CreateTable
CREATE TABLE "inscricao_prova" (
    "atleta_id" INTEGER NOT NULL,
    "prova_id" INTEGER NOT NULL,

    CONSTRAINT "inscricao_prova_pkey" PRIMARY KEY ("atleta_id","prova_id")
);

-- CreateTable
CREATE TABLE "resultado" (
    "id" SERIAL NOT NULL,
    "prova_id" INTEGER NOT NULL,
    "atleta_id" INTEGER,
    "equipe_id" INTEGER,
    "unidade" TEXT,
    "colocacao" INTEGER,
    "marca" DOUBLE PRECISION,

    CONSTRAINT "resultado_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipe" (
    "id" SERIAL NOT NULL,
    "delegacao_id" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "naipe" "Naipe" NOT NULL,
    "modalidade_id" INTEGER NOT NULL,
    "prof_id" INTEGER NOT NULL,
    "tecnico_id" INTEGER,

    CONSTRAINT "equipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipe_atleta" (
    "atleta_id" INTEGER NOT NULL,
    "equipe_id" INTEGER NOT NULL,
    "modalidade_id" INTEGER NOT NULL,

    CONSTRAINT "equipe_atleta_pkey" PRIMARY KEY ("atleta_id","equipe_id")
);

-- CreateTable
CREATE TABLE "equipe_auxiliar" (
    "auxiliar_id" INTEGER NOT NULL,
    "equipe_id" INTEGER NOT NULL,

    CONSTRAINT "equipe_auxiliar_pkey" PRIMARY KEY ("auxiliar_id","equipe_id")
);

-- CreateTable
CREATE TABLE "ocorrencia" (
    "id" SERIAL NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "disputa_id" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "data_hora" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "StatusOcorrencia" NOT NULL DEFAULT 'ABERTA',

    CONSTRAINT "ocorrencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boletim" (
    "id" SERIAL NOT NULL,
    "evento_id" INTEGER NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "nome" TEXT NOT NULL,
    "data_geracao" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data_publicacao" DATE,
    "tipo" "TipoBoletim" NOT NULL,
    "caminho_arquivo" TEXT,
    "criterios_aplicados" TEXT,
    "status" "StatusBoletim" NOT NULL DEFAULT 'RASCUNHO',
    "publicado_por_id" INTEGER,

    CONSTRAINT "boletim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boletim_visualizacao" (
    "boletim_id" INTEGER NOT NULL,
    "usuario_id" INTEGER NOT NULL,

    CONSTRAINT "boletim_visualizacao_pkey" PRIMARY KEY ("boletim_id","usuario_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_cpf_key" ON "usuario"("cpf");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_matricula_key" ON "usuario"("matricula");

-- CreateIndex
CREATE UNIQUE INDEX "criterio_desempate_codigo_key" ON "criterio_desempate"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "torneio_criterio_torneio_id_ordem_key" ON "torneio_criterio"("torneio_id", "ordem");

-- CreateIndex
CREATE UNIQUE INDEX "equipe_id_modalidade_id_key" ON "equipe"("id", "modalidade_id");

-- CreateIndex
CREATE UNIQUE INDEX "equipe_atleta_atleta_id_modalidade_id_key" ON "equipe_atleta"("atleta_id", "modalidade_id");

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_delegacao_id_fkey" FOREIGN KEY ("delegacao_id") REFERENCES "delegacao"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delegacao" ADD CONSTRAINT "delegacao_prof_id_fkey" FOREIGN KEY ("prof_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auxiliar" ADD CONSTRAINT "auxiliar_delegacao_id_fkey" FOREIGN KEY ("delegacao_id") REFERENCES "delegacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificacao" ADD CONSTRAINT "notificacao_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "local" ADD CONSTRAINT "local_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "modalidade" ADD CONSTRAINT "modalidade_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "torneio" ADD CONSTRAINT "torneio_modalidade_id_fkey" FOREIGN KEY ("modalidade_id") REFERENCES "modalidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "torneio_criterio" ADD CONSTRAINT "torneio_criterio_torneio_id_fkey" FOREIGN KEY ("torneio_id") REFERENCES "torneio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "torneio_criterio" ADD CONSTRAINT "torneio_criterio_criterio_id_fkey" FOREIGN KEY ("criterio_id") REFERENCES "criterio_desempate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputa" ADD CONSTRAINT "disputa_torneio_id_fkey" FOREIGN KEY ("torneio_id") REFERENCES "torneio"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputa" ADD CONSTRAINT "disputa_local_id_fkey" FOREIGN KEY ("local_id") REFERENCES "local"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partida" ADD CONSTRAINT "partida_disputa_id_fkey" FOREIGN KEY ("disputa_id") REFERENCES "disputa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partida" ADD CONSTRAINT "partida_equipe_a_id_fkey" FOREIGN KEY ("equipe_a_id") REFERENCES "equipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partida" ADD CONSTRAINT "partida_equipe_b_id_fkey" FOREIGN KEY ("equipe_b_id") REFERENCES "equipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "partida" ADD CONSTRAINT "partida_wo_equipe_id_fkey" FOREIGN KEY ("wo_equipe_id") REFERENCES "equipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "set_partida" ADD CONSTRAINT "set_partida_partida_id_fkey" FOREIGN KEY ("partida_id") REFERENCES "partida"("disputa_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prova" ADD CONSTRAINT "prova_disputa_id_fkey" FOREIGN KEY ("disputa_id") REFERENCES "disputa"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscricao_prova" ADD CONSTRAINT "inscricao_prova_atleta_id_fkey" FOREIGN KEY ("atleta_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscricao_prova" ADD CONSTRAINT "inscricao_prova_prova_id_fkey" FOREIGN KEY ("prova_id") REFERENCES "prova"("disputa_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resultado" ADD CONSTRAINT "resultado_prova_id_fkey" FOREIGN KEY ("prova_id") REFERENCES "prova"("disputa_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resultado" ADD CONSTRAINT "resultado_atleta_id_fkey" FOREIGN KEY ("atleta_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resultado" ADD CONSTRAINT "resultado_equipe_id_fkey" FOREIGN KEY ("equipe_id") REFERENCES "equipe"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipe" ADD CONSTRAINT "equipe_delegacao_id_fkey" FOREIGN KEY ("delegacao_id") REFERENCES "delegacao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipe" ADD CONSTRAINT "equipe_modalidade_id_fkey" FOREIGN KEY ("modalidade_id") REFERENCES "modalidade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipe" ADD CONSTRAINT "equipe_prof_id_fkey" FOREIGN KEY ("prof_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipe" ADD CONSTRAINT "equipe_tecnico_id_fkey" FOREIGN KEY ("tecnico_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipe_atleta" ADD CONSTRAINT "equipe_atleta_atleta_id_fkey" FOREIGN KEY ("atleta_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipe_atleta" ADD CONSTRAINT "equipe_atleta_equipe_id_modalidade_id_fkey" FOREIGN KEY ("equipe_id", "modalidade_id") REFERENCES "equipe"("id", "modalidade_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipe_auxiliar" ADD CONSTRAINT "equipe_auxiliar_auxiliar_id_fkey" FOREIGN KEY ("auxiliar_id") REFERENCES "auxiliar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipe_auxiliar" ADD CONSTRAINT "equipe_auxiliar_equipe_id_fkey" FOREIGN KEY ("equipe_id") REFERENCES "equipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ocorrencia" ADD CONSTRAINT "ocorrencia_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ocorrencia" ADD CONSTRAINT "ocorrencia_disputa_id_fkey" FOREIGN KEY ("disputa_id") REFERENCES "disputa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boletim" ADD CONSTRAINT "boletim_evento_id_fkey" FOREIGN KEY ("evento_id") REFERENCES "evento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boletim" ADD CONSTRAINT "boletim_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boletim" ADD CONSTRAINT "boletim_publicado_por_id_fkey" FOREIGN KEY ("publicado_por_id") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boletim_visualizacao" ADD CONSTRAINT "boletim_visualizacao_boletim_id_fkey" FOREIGN KEY ("boletim_id") REFERENCES "boletim"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boletim_visualizacao" ADD CONSTRAINT "boletim_visualizacao_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "resultado" ADD CONSTRAINT resultado_atleta_xor_equipe CHECK (("atleta_id" IS NULL) <> ("equipe_id" IS NULL));