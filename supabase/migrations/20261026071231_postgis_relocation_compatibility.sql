-- Resolve PostGIS objects before and after schema relocation.
-- ALTER preserves bodies, OIDs, signatures, owner, ACLs and security modes.
-- Both paths are required while PostGIS is still in public.
ALTER FUNCTION public.sp_place_of(double precision, double precision)
  SET search_path = public, extensions;
ALTER FUNCTION public.rebuild_india_mask()
  SET search_path = public, extensions;
