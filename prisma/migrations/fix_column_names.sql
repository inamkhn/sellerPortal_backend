-- Fix column naming to match Prisma's @map directives
-- The issue is that SQL created snake_case columns but Prisma expects the mapped names

-- No changes needed - Prisma uses @map to handle the mapping
-- The schema already has @map("message_type") which tells Prisma to use snake_case in DB

-- This file is just a placeholder to document that no fix is needed
SELECT 'Column mapping is handled by Prisma @map directives' as status;
