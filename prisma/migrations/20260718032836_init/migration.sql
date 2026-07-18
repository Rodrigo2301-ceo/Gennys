-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3),
    "plan" TEXT NOT NULL DEFAULT 'free',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IaUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dia" TEXT NOT NULL,
    "chamadas" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IaUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "dados" JSONB NOT NULL,
    "valor" DECIMAL(65,30),
    "categoria" TEXT,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "origemRecorrenteId" TEXT,
    "mesReferencia" TEXT,

    CONSTRAINT "Entry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Memory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fato" TEXT NOT NULL,
    "categoria" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Memory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BibleTranslation" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "year" INTEGER,
    "license" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BibleTranslation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BibleBook" (
    "id" TEXT NOT NULL,
    "translationId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "abbrev" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "testamento" TEXT NOT NULL,

    CONSTRAINT "BibleBook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BibleVerse" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "chapter" INTEGER NOT NULL,
    "number" INTEGER NOT NULL,
    "text" TEXT NOT NULL,

    CONSTRAINT "BibleVerse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerseMark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "translationCode" TEXT NOT NULL,
    "bookCode" TEXT NOT NULL,
    "bookName" TEXT NOT NULL,
    "chapter" INTEGER NOT NULL,
    "verse" INTEGER NOT NULL,
    "texto" TEXT NOT NULL,
    "cor" TEXT NOT NULL DEFAULT '#93c5fd',
    "observacao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VerseMark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "IaUsage_userId_idx" ON "IaUsage"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "IaUsage_userId_dia_key" ON "IaUsage"("userId", "dia");

-- CreateIndex
CREATE INDEX "Entry_userId_tipo_idx" ON "Entry"("userId", "tipo");

-- CreateIndex
CREATE INDEX "Entry_userId_createdAt_idx" ON "Entry"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Entry_origemRecorrenteId_idx" ON "Entry"("origemRecorrenteId");

-- CreateIndex
CREATE INDEX "Memory_userId_idx" ON "Memory"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BibleTranslation_code_key" ON "BibleTranslation"("code");

-- CreateIndex
CREATE INDEX "BibleBook_translationId_position_idx" ON "BibleBook"("translationId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "BibleBook_translationId_code_key" ON "BibleBook"("translationId", "code");

-- CreateIndex
CREATE INDEX "BibleVerse_bookId_chapter_idx" ON "BibleVerse"("bookId", "chapter");

-- CreateIndex
CREATE UNIQUE INDEX "BibleVerse_bookId_chapter_number_key" ON "BibleVerse"("bookId", "chapter", "number");

-- CreateIndex
CREATE INDEX "VerseMark_userId_createdAt_idx" ON "VerseMark"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "VerseMark_userId_translationCode_bookCode_chapter_verse_key" ON "VerseMark"("userId", "translationCode", "bookCode", "chapter", "verse");

-- AddForeignKey
ALTER TABLE "IaUsage" ADD CONSTRAINT "IaUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entry" ADD CONSTRAINT "Entry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entry" ADD CONSTRAINT "Entry_origemRecorrenteId_fkey" FOREIGN KEY ("origemRecorrenteId") REFERENCES "Entry"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Memory" ADD CONSTRAINT "Memory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BibleBook" ADD CONSTRAINT "BibleBook_translationId_fkey" FOREIGN KEY ("translationId") REFERENCES "BibleTranslation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BibleVerse" ADD CONSTRAINT "BibleVerse_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "BibleBook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerseMark" ADD CONSTRAINT "VerseMark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
