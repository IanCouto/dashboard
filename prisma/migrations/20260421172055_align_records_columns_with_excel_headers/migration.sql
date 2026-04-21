/*
  Warnings:

  - You are about to drop the column `cliente` on the `records` table. All the data in the column will be lost.
  - You are about to drop the column `colunas_extras` on the `records` table. All the data in the column will be lost.
  - Added the required column `codigo_cliente` to the `records` table without a default value. This is not possible if the table is not empty.
  - Added the required column `descricao_cliente` to the `records` table without a default value. This is not possible if the table is not empty.
  - Added the required column `regiao` to the `records` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tipo_contrato` to the `records` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "records_cliente_idx";

-- AlterTable
ALTER TABLE "records" DROP COLUMN "cliente",
DROP COLUMN "colunas_extras",
ADD COLUMN     "codigo_cliente" TEXT NOT NULL,
ADD COLUMN     "descricao_cliente" TEXT NOT NULL,
ADD COLUMN     "regiao" TEXT NOT NULL,
ADD COLUMN     "tipo_contrato" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "records_regiao_idx" ON "records"("regiao");

-- CreateIndex
CREATE INDEX "records_tipo_contrato_idx" ON "records"("tipo_contrato");

-- CreateIndex
CREATE INDEX "records_codigo_cliente_idx" ON "records"("codigo_cliente");

-- CreateIndex
CREATE INDEX "records_descricao_cliente_idx" ON "records"("descricao_cliente");
