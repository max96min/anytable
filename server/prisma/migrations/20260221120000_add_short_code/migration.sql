-- AlterTable: Add short_code column with a temporary default
ALTER TABLE "Table" ADD COLUMN "short_code" TEXT;

-- Populate existing rows with unique random codes
-- Using a PL/pgSQL block to generate unique codes for existing rows
DO $$
DECLARE
  rec RECORD;
  charset TEXT := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  code TEXT;
  i INT;
BEGIN
  FOR rec IN SELECT id FROM "Table" WHERE short_code IS NULL LOOP
    code := '';
    FOR i IN 1..6 LOOP
      code := code || substr(charset, floor(random() * 30 + 1)::int, 1);
    END LOOP;
    UPDATE "Table" SET short_code = code WHERE id = rec.id;
  END LOOP;
END $$;

-- Make column required and unique
ALTER TABLE "Table" ALTER COLUMN "short_code" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Table_short_code_key" ON "Table"("short_code");
