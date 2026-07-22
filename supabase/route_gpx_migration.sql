-- Store compact GeoJSON in Postgres; no paid map or storage service is needed.
alter table public.routes add column if not exists track_geojson jsonb;

alter table public.routes
  add constraint routes_track_geojson_linestring_check check (
    track_geojson is null or (
      track_geojson->>'type' = 'Feature'
      and track_geojson->'geometry'->>'type' = 'LineString'
      and jsonb_array_length(track_geojson->'geometry'->'coordinates') >= 2
    )
  );
