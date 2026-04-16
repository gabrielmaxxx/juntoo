import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

// ─── Schema Unit Tests (imported directly) ───

const { createEventSchema, createReviewSchema, createUserReviewSchema, updateProfileSchema, chatMessageSchema, reportSchema, formatZodErrors } = await import("../_shared/schemas.ts");

Deno.test("createEventSchema - rejects empty title", () => {
  const result = createEventSchema.safeParse({
    title: "",
    category: "Esportes",
    state: "SP",
    city: "São Paulo",
    location: "Parque",
    date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
    time: "14:00",
  });
  assertEquals(result.success, false);
});

Deno.test("createEventSchema - rejects invalid category", () => {
  const result = createEventSchema.safeParse({
    title: "Evento teste",
    category: "invalida",
    state: "SP",
    city: "São Paulo",
    location: "Parque do Ibirapuera",
    date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
    time: "14:00",
  });
  assertEquals(result.success, false);
});

Deno.test("createEventSchema - accepts valid event", () => {
  const result = createEventSchema.safeParse({
    title: "Futebol no parque",
    category: "Esportes",
    state: "SP",
    city: "São Paulo",
    location: "Parque do Ibirapuera",
    date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
    time: "14:00",
    isPrivate: false,
  });
  assertEquals(result.success, true);
});

Deno.test("createEventSchema - sanitizes HTML from title", () => {
  const result = createEventSchema.safeParse({
    title: "<script>alert('xss')</script>Evento",
    category: "Música",
    state: "RJ",
    city: "Rio",
    location: "Lapa",
    date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
    time: "20:00",
  });
  assertEquals(result.success, true);
  if (result.success) {
    assertEquals(result.data.title.includes("<script>"), false);
  }
});

Deno.test("createEventSchema - rejects invalid time format", () => {
  const result = createEventSchema.safeParse({
    title: "Evento teste",
    category: "Jogos",
    state: "MG",
    city: "BH",
    location: "Casa",
    date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
    time: "25:99",
  });
  assertEquals(result.success, false);
});

Deno.test("createReviewSchema - rejects rating out of range", () => {
  const r1 = createReviewSchema.safeParse({ eventId: crypto.randomUUID(), rating: 0 });
  assertEquals(r1.success, false);
  const r2 = createReviewSchema.safeParse({ eventId: crypto.randomUUID(), rating: 6 });
  assertEquals(r2.success, false);
});

Deno.test("createReviewSchema - accepts valid review", () => {
  const result = createReviewSchema.safeParse({
    eventId: crypto.randomUUID(),
    rating: 4,
    comment: "Ótimo evento!",
  });
  assertEquals(result.success, true);
});

Deno.test("createUserReviewSchema - rejects missing criteria", () => {
  const result = createUserReviewSchema.safeParse({
    eventId: crypto.randomUUID(),
    reviewedUserId: crypto.randomUUID(),
    respectRating: 5,
    // missing others
  });
  assertEquals(result.success, false);
});

Deno.test("updateProfileSchema - rejects name too short", () => {
  const result = updateProfileSchema.safeParse({ fullName: "A" });
  assertEquals(result.success, false);
});

Deno.test("updateProfileSchema - accepts valid profile", () => {
  const result = updateProfileSchema.safeParse({
    fullName: "João Silva",
    bio: "Olá mundo",
    interests: ["Esportes", "Música"],
  });
  assertEquals(result.success, true);
});

Deno.test("chatMessageSchema - rejects empty message", () => {
  const result = chatMessageSchema.safeParse({ eventId: crypto.randomUUID(), message: "" });
  assertEquals(result.success, false);
});

Deno.test("reportSchema - requires at least one target", () => {
  const result = reportSchema.safeParse({ category: "spam" });
  assertEquals(result.success, false);
});

Deno.test("formatZodErrors - returns structured errors", () => {
  const result = createEventSchema.safeParse({ title: "" });
  assertEquals(result.success, false);
  if (!result.success) {
    const formatted = formatZodErrors(result.error);
    assertExists(formatted.errors);
    assertEquals(Array.isArray(formatted.errors), true);
    assertExists(formatted.errors[0].field);
    assertExists(formatted.errors[0].message);
  }
});

// ─── Integration: create-event function ───

Deno.test("create-event - rejects unauthenticated request", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/create-event`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY },
    body: JSON.stringify({ title: "Test" }),
  });
  assertEquals(res.status, 401);
  await res.text();
});

Deno.test("create-event - rejects invalid body without auth", async () => {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/create-event`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
      "Authorization": "Bearer invalid-token",
    },
    body: JSON.stringify({}),
  });
  assertEquals(res.status, 401);
  await res.text();
});
