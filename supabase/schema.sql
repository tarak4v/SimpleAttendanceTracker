-- Run this in Supabase SQL editor.

create table if not exists public.house_helps (
  id text primary key,
  name text not null,
  phone text,
  category text not null,
  working_days text[] not null,
  frequency text not null check (frequency in ('once', 'twice')),
  rate numeric,
  created_at timestamptz not null default now()
);

create table if not exists public.attendance_records (
  id text primary key,
  house_help_id text not null references public.house_helps(id) on delete cascade,
  date date not null,
  status text not null check (status in ('present', 'absent', 'leave', 'holiday', 'halfday')),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (house_help_id, date)
);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_attendance_records_updated_at on public.attendance_records;
create trigger set_attendance_records_updated_at
before update on public.attendance_records
for each row
execute function public.set_updated_at();
