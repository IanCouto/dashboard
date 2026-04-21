-- CreateTable
CREATE TABLE "records" (
    "id" SERIAL NOT NULL,
    "promotor" TEXT NOT NULL,
    "coordenador" TEXT NOT NULL,
    "cliente" TEXT NOT NULL,
    "tipo_faturamento" TEXT NOT NULL,
    "ano" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "valor" DECIMAL(14,2) NOT NULL,

    CONSTRAINT "records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "records_ano_idx" ON "records"("ano");

-- CreateIndex
CREATE INDEX "records_promotor_idx" ON "records"("promotor");

-- CreateIndex
CREATE INDEX "records_coordenador_idx" ON "records"("coordenador");

-- CreateIndex
CREATE INDEX "records_cliente_idx" ON "records"("cliente");

-- CreateIndex
CREATE INDEX "records_tipo_faturamento_idx" ON "records"("tipo_faturamento");

-- CreateIndex
CREATE INDEX "records_mes_idx" ON "records"("mes");
