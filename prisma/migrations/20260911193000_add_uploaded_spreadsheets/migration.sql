-- CreateTable
CREATE TABLE "uploaded_spreadsheets" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "fileName" TEXT NOT NULL,
    "content" BYTEA NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "uploaded_spreadsheets_pkey" PRIMARY KEY ("id")
);
