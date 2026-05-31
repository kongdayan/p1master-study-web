create table if not exists users (
  id text primary key,
  email text not null unique,
  name text,
  avatar_url text,
  created_at text not null,
  updated_at text not null
);

create table if not exists oauth_accounts (
  provider text not null,
  provider_user_id text not null,
  user_id text not null references users(id) on delete cascade,
  email text not null,
  created_at text not null,
  updated_at text not null,
  primary key (provider, provider_user_id)
);

create table if not exists sessions (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  token_hash text not null unique,
  created_at text not null,
  last_seen_at text not null,
  expires_at text not null
);

create table if not exists oauth_states (
  state text primary key,
  provider text not null,
  code_verifier text not null,
  redirect_path text not null,
  created_at text not null,
  expires_at text not null
);

create table if not exists question_progress (
  user_id text not null references users(id) on delete cascade,
  exam_id text not null,
  question_number integer not null,
  selected integer,
  wrong integer,
  seen integer,
  client_updated_at text not null,
  updated_at text not null,
  primary key (user_id, exam_id, question_number)
);

create table if not exists exam_progress_meta (
  user_id text not null references users(id) on delete cascade,
  exam_id text not null,
  revision integer not null default 0,
  cursor_question integer not null default 1,
  updated_at text not null,
  primary key (user_id, exam_id)
);

create index if not exists idx_sessions_token_hash on sessions(token_hash);
create index if not exists idx_sessions_expires_at on sessions(expires_at);
create index if not exists idx_oauth_states_expires_at on oauth_states(expires_at);
