create schema if not exists voltpilot;

create table if not exists voltpilot.charging_stations (
  id text primary key,
  name text not null,
  city text not null,
  power_kw integer not null check (power_kw > 0),
  price_per_kwh numeric(6, 2) not null check (price_per_kwh > 0),
  available_chargers integer not null check (available_chargers >= 0),
  queue_minutes integer not null check (queue_minutes >= 0),
  fault_risk numeric(5, 4) not null check (fault_risk between 0 and 1),
  updated_at timestamptz not null default now()
);

create table if not exists voltpilot.agent_runs (
  id text primary key,
  prompt text not null,
  mode text not null,
  summary text not null,
  fallback boolean not null default true,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists agent_runs_created_at_idx on voltpilot.agent_runs (created_at desc);

insert into voltpilot.charging_stations
  (id, name, city, power_kw, price_per_kwh, available_chargers, queue_minutes, fault_risk)
values
  ('KS-SOUTH', '昆山南综合超充站', '昆山', 480, 1.18, 7, 6, 0.04),
  ('TAICANG-HUB', '太仓城际能源港', '太仓', 360, 0.96, 3, 18, 0.08),
  ('HONGQIAO-EAST', '虹桥东交通枢纽站', '上海', 600, 1.42, 5, 11, 0.03),
  ('G2-SERVICE', 'G2 阳澄湖服务区快充', '苏州', 240, 1.55, 1, 24, 0.12)
on conflict (id) do update set
  name = excluded.name,
  city = excluded.city,
  power_kw = excluded.power_kw,
  price_per_kwh = excluded.price_per_kwh,
  available_chargers = excluded.available_chargers,
  queue_minutes = excluded.queue_minutes,
  fault_risk = excluded.fault_risk,
  updated_at = now();

insert into voltpilot.agent_runs (id, prompt, mode, summary, fallback, payload)
values (
  'VP-DEMO-SEED',
  '今晚从苏州到上海虹桥，要求少排队、成本低',
  'demo-seed',
  '建议在昆山南综合超充站补能，兼顾排队时间、成本和电池安全。',
  true,
  '{"source":"supabase-demo-seed"}'::jsonb
)
on conflict (id) do nothing;
