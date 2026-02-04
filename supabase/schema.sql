create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

create table if not exists public.certificados_cfji (
  id uuid primary key default gen_random_uuid(),
  registro_hash text unique not null,
  cedula text not null,
  nombre text not null,
  cargo text,
  tratamiento text,
  especialidad text,
  curso_formacion text,
  convocatoria text,
  resolucion text,
  puntaje numeric,
  created_at timestamptz default now()
);

create index if not exists idx_certificados_cfji_cedula on public.certificados_cfji (cedula);
create index if not exists idx_certificados_cfji_nombre on public.certificados_cfji (nombre);
create index if not exists idx_certificados_cfji_nombre_trgm on public.certificados_cfji using gin (nombre gin_trgm_ops);

alter table public.certificados_cfji enable row level security;

drop policy if exists "certificados_cfji_read" on public.certificados_cfji;

create policy "certificados_cfji_read" on public.certificados_cfji
  for select
  using (true);
