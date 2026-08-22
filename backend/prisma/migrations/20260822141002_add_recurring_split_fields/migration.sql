-- AlterTable
ALTER TABLE "recurring_expenses" ADD COLUMN     "split_member_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "split_with" TEXT NOT NULL DEFAULT 'all';
