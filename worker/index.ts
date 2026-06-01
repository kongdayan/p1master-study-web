import { encodeAnswers, encodeBitset } from "../src/lib/progressCodec";
import type { CloudAuthProviders, CloudProgressSnapshot, CloudUser, ProgressChange, ProgressPatch, SelectedCode } from "../src/types/cloud";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  APPLE_CLIENT_ID?: string;
  APPLE_TEAM_ID?: string;
  APPLE_KEY_ID?: string;
  APPLE_PRIVATE_KEY?: string;
}

interface Fetcher {
  fetch(request: Request): Promise<Response>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(): Promise<T | null>;
  all<T = unknown>(): Promise<D1Result<T>>;
  run(): Promise<D1Result>;
}

interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
  meta?: unknown;
}

interface SessionRow {
  user_id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
}

interface OAuthStateRow {
  provider: "google" | "apple";
  code_verifier: string;
  redirect_path: string;
}

interface QuestionProgressRow {
  question_number: number;
  selected: SelectedCode;
  wrong: number;
  seen: number;
}

const sessionCookie = "study_session";
const sessionMaxAgeSeconds = 60 * 60 * 24 * 30;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) {
      const response = await handleApi(request, env, url);
      return withNoStore(response);
    }
    return env.ASSETS.fetch(request);
  }
};

async function handleApi(request: Request, env: Env, url: URL) {
  try {
    if (request.method === "GET" && url.pathname === "/api/me") return await handleMe(request, env);
    if (request.method === "POST" && url.pathname === "/api/auth/logout") return await handleLogout(request, env);
    if (request.method === "GET" && url.pathname === "/api/auth/google/url") return await getOAuthUrl(request, env, "google");
    if (request.method === "GET" && url.pathname === "/api/auth/apple/url") return await getOAuthUrl(request, env, "apple");
    if (request.method === "GET" && url.pathname === "/api/auth/google/start") return await startOAuth(request, env, "google");
    if (request.method === "GET" && (url.pathname === "/api/auth/google/callback" || url.pathname === "/api/auth/google/callback/v2")) return await finishOAuth(request, env, "google");
    if (request.method === "GET" && url.pathname === "/api/auth/apple/start") return await startOAuth(request, env, "apple");
    if (request.method === "POST" && url.pathname === "/api/auth/apple/callback") return await finishOAuth(request, env, "apple");

    const progressMatch = url.pathname.match(/^\/api\/progress\/([^/]+)(?:\/sync)?$/);
    if (progressMatch && request.method === "GET" && !url.pathname.endsWith("/sync")) {
      return await handleGetProgress(request, env, decodeURIComponent(progressMatch[1]));
    }
    if (progressMatch && request.method === "POST" && url.pathname.endsWith("/sync")) {
      return await handleSyncProgress(request, env, decodeURIComponent(progressMatch[1]));
    }
    return json({ error: "Not found" }, 404);
  } catch (cause) {
    return json({ error: cause instanceof Error ? cause.message : "Server error" }, cause instanceof HttpError ? cause.status : 500);
  }
}

async function handleMe(request: Request, env: Env) {
  const session = await readSession(request, env);
  return json<{ user: CloudUser | null; providers: CloudAuthProviders }>({
    user: session
      ? {
          id: session.user_id,
          email: session.email,
          name: session.name,
          avatarUrl: session.avatar_url
        }
      : null,
    providers: configuredProviders(env)
  });
}

async function handleLogout(request: Request, env: Env) {
  const token = readCookie(request, sessionCookie);
  if (token) {
    await env.DB.prepare("delete from sessions where token_hash = ?").bind(await sha256Hex(token)).run();
  }
  return json(
    { ok: true },
    200,
    { "set-cookie": `${sessionCookie}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0` }
  );
}

async function startOAuth(request: Request, env: Env, provider: "google" | "apple") {
  const authUrl = await createOAuthUrl(request, env, provider);
  return Response.redirect(authUrl, 302);
}

async function getOAuthUrl(request: Request, env: Env, provider: "google" | "apple") {
  const authUrl = await createOAuthUrl(request, env, provider);
  return json({ authUrl });
}

async function createOAuthUrl(request: Request, env: Env, provider: "google" | "apple") {
  assertProviderConfig(env, provider);
  const url = new URL(request.url);
  const state = randomToken();
  const codeVerifier = randomToken();
  const redirectPath = safeReturnPath(url.searchParams.get("returnTo"));
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
  await env.DB.prepare(
    "insert into oauth_states (state, provider, code_verifier, redirect_path, created_at, expires_at) values (?, ?, ?, ?, ?, ?)"
  )
    .bind(state, provider, codeVerifier, redirectPath, now.toISOString(), expiresAt)
    .run();

  const redirectUri = oauthRedirectUri(url, provider);
  return provider === "google" ? await googleAuthorizeUrl(env, redirectUri, state, codeVerifier) : await appleAuthorizeUrl(env, redirectUri, state, codeVerifier);
}

async function finishOAuth(request: Request, env: Env, provider: "google" | "apple") {
  assertProviderConfig(env, provider);
  const url = new URL(request.url);
  let code = url.searchParams.get("code");
  let state = url.searchParams.get("state");
  if (provider === "apple" && request.method === "POST") {
    const form = await request.formData();
    code = String(form.get("code") || "");
    state = String(form.get("state") || "");
  }
  if (!code || !state) return json({ error: "OAuth callback is missing code or state" }, 400);

  const stateRow = await env.DB.prepare(
    "select provider, code_verifier, redirect_path from oauth_states where state = ? and expires_at > ?"
  )
    .bind(state, new Date().toISOString())
    .first<OAuthStateRow>();
  if (!stateRow || stateRow.provider !== provider) return json({ error: "OAuth state expired" }, 400);
  await env.DB.prepare("delete from oauth_states where state = ?").bind(state).run();

  const redirectUri = `${url.origin}${url.pathname}`;
  const profile = provider === "google" ? await exchangeGoogleCode(env, code, redirectUri, stateRow.code_verifier) : await exchangeAppleCode(env, code, redirectUri, stateRow.code_verifier);
  const userId = await upsertUser(env, provider, profile);
  const token = randomToken();
  const tokenHash = await sha256Hex(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + sessionMaxAgeSeconds * 1000).toISOString();
  await env.DB.prepare("insert into sessions (id, user_id, token_hash, created_at, last_seen_at, expires_at) values (?, ?, ?, ?, ?, ?)")
    .bind(crypto.randomUUID(), userId, tokenHash, now.toISOString(), now.toISOString(), expiresAt)
    .run();

  return new Response(null, {
    status: 302,
    headers: {
      location: stateRow.redirect_path || "/",
      "set-cookie": `${sessionCookie}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${sessionMaxAgeSeconds}`
    }
  });
}

async function handleGetProgress(request: Request, env: Env, examId: string) {
  const session = await requireSession(request, env);
  return json(await buildSnapshot(env, session.user_id, examId));
}

async function handleSyncProgress(request: Request, env: Env, examId: string) {
  const session = await requireSession(request, env);
  const patch = (await request.json()) as ProgressPatch;
  const now = new Date().toISOString();
  const changes = Array.isArray(patch.changes) ? patch.changes.filter(validProgressChange) : [];

  await env.DB.prepare(
    "insert into exam_progress_meta (user_id, exam_id, revision, cursor_question, updated_at) values (?, ?, 0, ?, ?) on conflict(user_id, exam_id) do nothing"
  )
    .bind(session.user_id, examId, patch.cursorQuestion || 1, now)
    .run();

  const statements = changes.map((change) =>
    env.DB.prepare(
      `insert into question_progress
        (user_id, exam_id, question_number, selected, wrong, seen, client_updated_at, updated_at)
       values (?, ?, ?, ?, ?, ?, ?, ?)
       on conflict(user_id, exam_id, question_number) do update set
        selected = case when excluded.client_updated_at >= question_progress.client_updated_at and excluded.selected is not null then excluded.selected else question_progress.selected end,
        wrong = case when excluded.client_updated_at >= question_progress.client_updated_at and excluded.wrong is not null then excluded.wrong else question_progress.wrong end,
        seen = case when excluded.client_updated_at >= question_progress.client_updated_at and excluded.seen is not null then excluded.seen else question_progress.seen end,
        client_updated_at = max(question_progress.client_updated_at, excluded.client_updated_at),
        updated_at = excluded.updated_at`
    ).bind(
      session.user_id,
      examId,
      change.question,
      change.selected ?? null,
      change.wrong === undefined ? null : change.wrong ? 1 : 0,
      change.seen === undefined ? null : change.seen ? 1 : 0,
      change.clientUpdatedAt,
      now
    )
  );
  if (statements.length) await env.DB.batch(statements);

  await env.DB.prepare(
    `insert into exam_progress_meta (user_id, exam_id, revision, cursor_question, updated_at)
     values (?, ?, 1, ?, ?)
     on conflict(user_id, exam_id) do update set
      revision = revision + 1,
      cursor_question = coalesce(?, cursor_question),
      updated_at = ?`
  )
    .bind(session.user_id, examId, patch.cursorQuestion || 1, now, patch.cursorQuestion || null, now)
    .run();

  return json(await buildSnapshot(env, session.user_id, examId));
}

async function buildSnapshot(env: Env, userId: string, examId: string): Promise<CloudProgressSnapshot> {
  const meta = await env.DB.prepare("select revision, cursor_question, updated_at from exam_progress_meta where user_id = ? and exam_id = ?")
    .bind(userId, examId)
    .first<{ revision: number; cursor_question: number; updated_at: string }>();
  const rows = await env.DB.prepare(
    "select question_number, selected, wrong, seen from question_progress where user_id = ? and exam_id = ? order by question_number"
  )
    .bind(userId, examId)
    .all<QuestionProgressRow>();
  const results = rows.results || [];
  const maxQuestion = Math.max(0, ...results.map((row) => row.question_number));
  return {
    v: 1,
    examId,
    revision: meta?.revision || 0,
    cursorQuestion: meta?.cursor_question || 1,
    answers: encodeAnswers(
      results.map((row) => ({ question: row.question_number, selected: row.selected })),
      maxQuestion
    ),
    wrong: encodeBitset(results.filter((row) => row.wrong).map((row) => row.question_number), maxQuestion),
    seen: encodeBitset(results.filter((row) => row.seen).map((row) => row.question_number), maxQuestion),
    updatedAt: meta?.updated_at || new Date(0).toISOString()
  };
}

async function readSession(request: Request, env: Env) {
  const token = readCookie(request, sessionCookie);
  if (!token) return null;
  const tokenHash = await sha256Hex(token);
  const row = await env.DB.prepare(
    `select sessions.user_id, users.email, users.name, users.avatar_url
     from sessions join users on users.id = sessions.user_id
     where sessions.token_hash = ? and sessions.expires_at > ?`
  )
    .bind(tokenHash, new Date().toISOString())
    .first<SessionRow>();
  if (row) {
    await env.DB.prepare("update sessions set last_seen_at = ? where token_hash = ?").bind(new Date().toISOString(), tokenHash).run();
  }
  return row;
}

async function requireSession(request: Request, env: Env) {
  const session = await readSession(request, env);
  if (!session) throw new HttpError("Unauthorized", 401);
  return session;
}

async function googleAuthorizeUrl(env: Env, redirectUri: string, state: string, codeVerifier: string) {
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.set("client_id", env.GOOGLE_CLIENT_ID || "");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", await codeChallenge(codeVerifier));
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("prompt", "select_account");
  return authUrl.toString();
}

function oauthRedirectUri(url: URL, provider: "google" | "apple") {
  if (provider === "google") return `${url.origin}/api/auth/google/callback/v2`;
  return `${url.origin}/api/auth/apple/callback`;
}

async function appleAuthorizeUrl(env: Env, redirectUri: string, state: string, codeVerifier: string) {
  const authUrl = new URL("https://appleid.apple.com/auth/authorize");
  authUrl.searchParams.set("client_id", env.APPLE_CLIENT_ID || "");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("response_mode", "form_post");
  authUrl.searchParams.set("scope", "name email");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", await codeChallenge(codeVerifier));
  authUrl.searchParams.set("code_challenge_method", "S256");
  return authUrl.toString();
}

async function exchangeGoogleCode(env: Env, code: string, redirectUri: string, codeVerifier: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.GOOGLE_CLIENT_ID || "",
      client_secret: env.GOOGLE_CLIENT_SECRET || "",
      code,
      code_verifier: codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: redirectUri
    })
  });
  const token = await response.json<{ id_token?: string; error?: string }>();
  if (!response.ok || !token.id_token) throw new HttpError(token.error || "Google token exchange failed", 400);
  return parseIdToken(token.id_token, env.GOOGLE_CLIENT_ID || "", "https://accounts.google.com");
}

async function exchangeAppleCode(env: Env, code: string, redirectUri: string, codeVerifier: string) {
  const clientSecret = await buildAppleClientSecret(env);
  const response = await fetch("https://appleid.apple.com/auth/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.APPLE_CLIENT_ID || "",
      client_secret: clientSecret,
      code,
      code_verifier: codeVerifier,
      grant_type: "authorization_code",
      redirect_uri: redirectUri
    })
  });
  const token = await response.json<{ id_token?: string; error?: string }>();
  if (!response.ok || !token.id_token) throw new HttpError(token.error || "Apple token exchange failed", 400);
  return parseIdToken(token.id_token, env.APPLE_CLIENT_ID || "", "https://appleid.apple.com");
}

async function upsertUser(env: Env, provider: "google" | "apple", profile: { sub: string; email: string; name: string | null; avatarUrl: string | null }) {
  const account = await env.DB.prepare("select user_id from oauth_accounts where provider = ? and provider_user_id = ?")
    .bind(provider, profile.sub)
    .first<{ user_id: string }>();
  if (account) {
    await env.DB.prepare("update users set email = ?, name = coalesce(?, name), avatar_url = coalesce(?, avatar_url), updated_at = ? where id = ?")
      .bind(profile.email, profile.name, profile.avatarUrl, new Date().toISOString(), account.user_id)
      .run();
    return account.user_id;
  }

  const existing = await env.DB.prepare("select id from users where email = ?").bind(profile.email).first<{ id: string }>();
  const userId = existing?.id || crypto.randomUUID();
  const now = new Date().toISOString();
  if (!existing) {
    await env.DB.prepare("insert into users (id, email, name, avatar_url, created_at, updated_at) values (?, ?, ?, ?, ?, ?)")
      .bind(userId, profile.email, profile.name, profile.avatarUrl, now, now)
      .run();
  }
  await env.DB.prepare("insert into oauth_accounts (provider, provider_user_id, user_id, email, created_at, updated_at) values (?, ?, ?, ?, ?, ?)")
    .bind(provider, profile.sub, userId, profile.email, now, now)
    .run();
  return userId;
}

function parseIdToken(idToken: string, audience: string, issuer: string) {
  const payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(idToken.split(".")[1] || ""))) as {
    sub?: string;
    email?: string;
    name?: string;
    picture?: string;
    aud?: string;
    iss?: string;
    exp?: number;
  };
  if (!payload.sub || !payload.email || payload.aud !== audience || payload.iss !== issuer || (payload.exp || 0) * 1000 < Date.now()) {
    throw new HttpError("Invalid identity token", 400);
  }
  return {
    sub: payload.sub,
    email: payload.email,
    name: payload.name || null,
    avatarUrl: payload.picture || null
  };
}

async function buildAppleClientSecret(env: Env) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlJson({ alg: "ES256", kid: env.APPLE_KEY_ID });
  const payload = base64UrlJson({
    iss: env.APPLE_TEAM_ID,
    iat: now,
    exp: now + 60 * 60 * 24 * 30,
    aud: "https://appleid.apple.com",
    sub: env.APPLE_CLIENT_ID
  });
  const signingInput = `${header}.${payload}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToBytes(env.APPLE_PRIVATE_KEY || ""),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(signingInput));
  return `${signingInput}.${bytesToBase64Url(new Uint8Array(signature))}`;
}

function assertProviderConfig(env: Env, provider: "google" | "apple") {
  const missing =
    provider === "google"
      ? !env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET
      : !env.APPLE_CLIENT_ID || !env.APPLE_TEAM_ID || !env.APPLE_KEY_ID || !env.APPLE_PRIVATE_KEY;
  if (missing) throw new HttpError(`${provider} OAuth is not configured`, 503);
}

function configuredProviders(env: Env): CloudAuthProviders {
  return {
    google: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET),
    apple: Boolean(env.APPLE_CLIENT_ID && env.APPLE_TEAM_ID && env.APPLE_KEY_ID && env.APPLE_PRIVATE_KEY)
  };
}

function validProgressChange(change: ProgressChange) {
  return (
    Number.isInteger(change.question) &&
    change.question > 0 &&
    (!("selected" in change) || change.selected === undefined || (Number.isInteger(change.selected) && change.selected >= 0 && change.selected <= 5)) &&
    typeof change.clientUpdatedAt === "string"
  );
}

async function codeChallenge(verifier: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return bytesToBase64Url(new Uint8Array(digest));
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToBase64Url(bytes);
}

function readCookie(request: Request, name: string) {
  const cookie = request.headers.get("cookie") || "";
  return cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);
}

function safeReturnPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/api/")) return "/";
  return value;
}

function json<T>(value: T, status = 200, headers?: HeadersInit) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...headers
    }
  });
}

function withNoStore(response: Response) {
  const headers = new Headers(response.headers);
  headers.set("cache-control", "no-store, no-cache, must-revalidate, max-age=0");
  headers.set("pragma", "no-cache");
  headers.set("expires", "0");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function base64UrlJson(value: unknown) {
  return bytesToBase64Url(new TextEncoder().encode(JSON.stringify(value)));
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function pemToBytes(pem: string) {
  const clean = pem.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "");
  return base64UrlToBytes(clean.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, ""));
}

class HttpError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}
