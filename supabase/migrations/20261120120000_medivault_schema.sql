-- MediVault schema for the existing Supabase project.
-- Safe to run against a database that may already contain the Phase 1 tables:
-- everything is additive and no destructive statements are used.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text not null default '',
  avatar_url text,
  phone text,
  dob date,
  blood_group text,
  address text,
  email_notifications boolean not null default true,
  share_alerts boolean not null default true,
  two_factor boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.medical_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  document_type text not null default 'Other Documents',
  doctor_name text not null default '',
  hospital_name text not null default '',
  record_date date,
  file_name text not null default '',
  file_path text,
  file_type text not null default '',
  file_size bigint not null default 0,
  file_hash text not null default '',
  notes text not null default '',
  is_sample boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.extracted_data (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null unique references public.medical_records (id) on delete cascade,
  extracted_text text not null default '',
  extracted_metadata jsonb not null default '{}'::jsonb,
  verification_status text not null default 'unverified',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint extracted_data_verification_status_check
    check (verification_status in ('unverified', 'verified'))
);

create table if not exists public.shared_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  share_token_hash text,
  expires_at timestamptz not null default (now() + interval '7 days'),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.shared_record_items (
  id uuid primary key default gen_random_uuid(),
  share_id uuid not null references public.shared_records (id) on delete cascade,
  record_id uuid not null references public.medical_records (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (share_id, record_id)
);

-- Additive columns for databases created by the earlier scaffold.
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists phone text;
alter table public.profiles add column if not exists dob date;
alter table public.profiles add column if not exists blood_group text;
alter table public.profiles add column if not exists address text;
alter table public.profiles add column if not exists email_notifications boolean not null default true;
alter table public.profiles add column if not exists share_alerts boolean not null default true;
alter table public.profiles add column if not exists two_factor boolean not null default false;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

alter table public.medical_records add column if not exists document_type text not null default 'Other Documents';
alter table public.medical_records add column if not exists doctor_name text not null default '';
alter table public.medical_records add column if not exists hospital_name text not null default '';
alter table public.medical_records add column if not exists record_date date;
alter table public.medical_records add column if not exists file_name text not null default '';
alter table public.medical_records add column if not exists file_path text;
alter table public.medical_records add column if not exists file_type text not null default '';
alter table public.medical_records add column if not exists file_size bigint not null default 0;
alter table public.medical_records add column if not exists file_hash text not null default '';
alter table public.medical_records add column if not exists notes text not null default '';
alter table public.medical_records add column if not exists is_sample boolean not null default false;
alter table public.medical_records add column if not exists created_at timestamptz not null default now();
alter table public.medical_records add column if not exists updated_at timestamptz not null default now();

alter table public.extracted_data add column if not exists extracted_text text not null default '';
alter table public.extracted_data add column if not exists extracted_metadata jsonb not null default '{}'::jsonb;
alter table public.extracted_data add column if not exists verification_status text not null default 'unverified';
alter table public.extracted_data add column if not exists created_at timestamptz not null default now();
alter table public.extracted_data add column if not exists updated_at timestamptz not null default now();

alter table public.shared_records add column if not exists share_token_hash text;
alter table public.shared_records add column if not exists revoked_at timestamptz;
alter table public.shared_records add column if not exists created_at timestamptz not null default now();

-- ---------------------------------------------------------------------------
-- Indexes and constraints
-- ---------------------------------------------------------------------------

create index if not exists medical_records_user_id_idx on public.medical_records (user_id);
create index if not exists medical_records_user_date_idx on public.medical_records (user_id, record_date desc);
create index if not exists medical_records_user_hash_idx on public.medical_records (user_id, file_hash);
create index if not exists extracted_data_record_id_idx on public.extracted_data (record_id);
create index if not exists shared_records_user_id_idx on public.shared_records (user_id);
create index if not exists shared_record_items_share_id_idx on public.shared_record_items (share_id);
create index if not exists shared_record_items_record_id_idx on public.shared_record_items (record_id);

create unique index if not exists shared_records_token_hash_key
  on public.shared_records (share_token_hash)
  where share_token_hash is not null;

-- ---------------------------------------------------------------------------
-- updated_at trigger
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists medical_records_set_updated_at on public.medical_records;
create trigger medical_records_set_updated_at
  before update on public.medical_records
  for each row execute function public.set_updated_at();

drop trigger if exists extracted_data_set_updated_at on public.extracted_data;
create trigger extracted_data_set_updated_at
  before update on public.extracted_data
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Profile creation on signup
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.email, '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.medical_records enable row level security;
alter table public.extracted_data enable row level security;
alter table public.shared_records enable row level security;
alter table public.shared_record_items enable row level security;

drop policy if exists "profiles select own" on public.profiles;
create policy "profiles select own" on public.profiles
  for select to authenticated using (auth.uid() = id);

drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists "records select own" on public.medical_records;
create policy "records select own" on public.medical_records
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "records insert own" on public.medical_records;
create policy "records insert own" on public.medical_records
  for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "records update own" on public.medical_records;
create policy "records update own" on public.medical_records
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "records delete own" on public.medical_records;
create policy "records delete own" on public.medical_records
  for delete to authenticated using (auth.uid() = user_id);

drop policy if exists "extracted select own" on public.extracted_data;
create policy "extracted select own" on public.extracted_data
  for select to authenticated
  using (exists (
    select 1 from public.medical_records r
    where r.id = extracted_data.record_id and r.user_id = auth.uid()
  ));

drop policy if exists "extracted insert own" on public.extracted_data;
create policy "extracted insert own" on public.extracted_data
  for insert to authenticated
  with check (exists (
    select 1 from public.medical_records r
    where r.id = extracted_data.record_id and r.user_id = auth.uid()
  ));

drop policy if exists "extracted update own" on public.extracted_data;
create policy "extracted update own" on public.extracted_data
  for update to authenticated
  using (exists (
    select 1 from public.medical_records r
    where r.id = extracted_data.record_id and r.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.medical_records r
    where r.id = extracted_data.record_id and r.user_id = auth.uid()
  ));

drop policy if exists "extracted delete own" on public.extracted_data;
create policy "extracted delete own" on public.extracted_data
  for delete to authenticated
  using (exists (
    select 1 from public.medical_records r
    where r.id = extracted_data.record_id and r.user_id = auth.uid()
  ));

drop policy if exists "shares select own" on public.shared_records;
create policy "shares select own" on public.shared_records
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists "shares update own" on public.shared_records;
create policy "shares update own" on public.shared_records
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "shares delete own" on public.shared_records;
create policy "shares delete own" on public.shared_records
  for delete to authenticated using (auth.uid() = user_id);

-- Inserts happen only in the create-share Edge Function with the service role.
-- No insert policy is intentionally granted to browser clients.

drop policy if exists "share items select own" on public.shared_record_items;
create policy "share items select own" on public.shared_record_items
  for select to authenticated
  using (exists (
    select 1 from public.shared_records s
    where s.id = shared_record_items.share_id and s.user_id = auth.uid()
  ));

-- ---------------------------------------------------------------------------
-- Private storage for medical documents
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('medical-documents', 'medical-documents', false)
on conflict (id) do update set public = false;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

drop policy if exists "medical documents read own" on storage.objects;
create policy "medical documents read own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'medical-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "medical documents insert own" on storage.objects;
create policy "medical documents insert own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'medical-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "medical documents update own" on storage.objects;
create policy "medical documents update own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'medical-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'medical-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "medical documents delete own" on storage.objects;
create policy "medical documents delete own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'medical-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars read public" on storage.objects;
create policy "avatars read public" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars write own" on storage.objects;
create policy "avatars write own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars update own" on storage.objects;
create policy "avatars update own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
