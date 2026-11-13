create table if not exists intentos_login (
    email           text        primary key,
    intentos        integer     not null default 0,
    bloqueado_hasta timestamptz,
    actualizado_en  timestamptz not null default now()
);

alter table intentos_login disable row level security;
