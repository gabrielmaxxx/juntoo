import { describe, it, expect } from "vitest";
import { z } from "zod";

// Inline schema mirrors for testing (avoids Deno import issues)
const CATEGORIES = [
  "esportes", "cultura", "gastronomia", "estudos",
  "aventura", "musica", "jogos", "viagem",
] as const;

const sanitize = (v: string) => v.replace(/<[^>]*>/g, "").trim();

const createEventSchema = z.object({
  title: z.string().min(3).max(100).transform(sanitize),
  category: z.enum(CATEGORIES),
  date: z.string().refine((d) => new Date(d) > new Date(), "Data no passado"),
  location: z.string().min(3),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  maxParticipants: z.number().int().min(2).max(500).optional(),
});

const createReviewSchema = z.object({
  eventId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(200).optional(),
});

describe("createEventSchema", () => {
  const futureDate = new Date(Date.now() + 86400000 * 7).toISOString();

  it("aceita evento válido", () => {
    const result = createEventSchema.safeParse({
      title: "Futebol no parque",
      category: "esportes",
      date: futureDate,
      location: "Parque Ibirapuera",
      time: "14:00",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita título curto", () => {
    const result = createEventSchema.safeParse({
      title: "Ab",
      category: "esportes",
      date: futureDate,
      location: "Local",
      time: "14:00",
    });
    expect(result.success).toBe(false);
  });

  it("sanitiza HTML do título", () => {
    const result = createEventSchema.safeParse({
      title: "<script>alert('xss')</script>Evento Legal",
      category: "cultura",
      date: futureDate,
      location: "Teatro",
      time: "20:00",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe("alert('xss')Evento Legal");
    }
  });

  it("rejeita categoria inválida", () => {
    const result = createEventSchema.safeParse({
      title: "Evento teste",
      category: "invalida",
      date: futureDate,
      location: "Local",
      time: "14:00",
    });
    expect(result.success).toBe(false);
  });

  it("rejeita data no passado", () => {
    const result = createEventSchema.safeParse({
      title: "Evento teste",
      category: "esportes",
      date: "2020-01-01T00:00:00Z",
      location: "Local",
      time: "14:00",
    });
    expect(result.success).toBe(false);
  });
});

describe("createReviewSchema", () => {
  it("aceita review válido", () => {
    const result = createReviewSchema.safeParse({
      eventId: "550e8400-e29b-41d4-a716-446655440000",
      rating: 4,
      comment: "Ótimo evento!",
    });
    expect(result.success).toBe(true);
  });

  it("rejeita rating fora do range", () => {
    expect(
      createReviewSchema.safeParse({
        eventId: "550e8400-e29b-41d4-a716-446655440000",
        rating: 6,
      }).success
    ).toBe(false);

    expect(
      createReviewSchema.safeParse({
        eventId: "550e8400-e29b-41d4-a716-446655440000",
        rating: 0,
      }).success
    ).toBe(false);
  });

  it("rejeita eventId inválido", () => {
    const result = createReviewSchema.safeParse({
      eventId: "not-a-uuid",
      rating: 3,
    });
    expect(result.success).toBe(false);
  });
});
