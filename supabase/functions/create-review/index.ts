import { createReviewSchema, createUserReviewSchema, formatZodErrors } from "../_shared/schemas.ts";
import { getAuthUser, getServiceClient, corsHeaders, jsonResponse, errorResponse } from "../_shared/auth.ts";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const userOrError = await getAuthUser(req);
  if (userOrError instanceof Response) return userOrError;
  const user = userOrError;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse('Body JSON inválido', 400);
  }

  const url = new URL(req.url);
  const reviewType = url.searchParams.get('type') || 'event';

  if (reviewType === 'user') {
    return handleUserReview(user.id, body);
  }
  return handleEventReview(user.id, body);
});

async function handleEventReview(userId: string, body: unknown) {
  const parsed = createReviewSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse(formatZodErrors(parsed.error), 422);
  }

  const { eventId, rating, comment } = parsed.data;
  const admin = getServiceClient();

  // Verify participation
  const { data: participant } = await admin
    .from('event_participants')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .maybeSingle();

  if (!participant) {
    return errorResponse('Você precisa ser participante do evento para avaliar', 403);
  }

  // Check duplicate
  const { data: existing } = await admin
    .from('event_reviews')
    .select('id')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    return errorResponse('Você já avaliou este evento', 409);
  }

  const { data: review, error } = await admin
    .from('event_reviews')
    .insert({ event_id: eventId, user_id: userId, rating, comment: comment || null })
    .select()
    .single();

  if (error) {
    return errorResponse('Erro ao criar avaliação: ' + error.message, 500);
  }

  return jsonResponse({ review }, 201);
}

async function handleUserReview(userId: string, body: unknown) {
  const parsed = createUserReviewSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse(formatZodErrors(parsed.error), 422);
  }

  const data = parsed.data;
  const admin = getServiceClient();

  // Cannot review yourself
  if (data.reviewedUserId === userId) {
    return errorResponse('Você não pode avaliar a si mesmo', 400);
  }

  // Verify both are participants
  const { count } = await admin
    .from('event_participants')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', data.eventId)
    .in('user_id', [userId, data.reviewedUserId]);

  if ((count ?? 0) < 2) {
    return errorResponse('Ambos devem ser participantes do evento', 403);
  }

  const overall = Math.round(
    (data.respectRating + data.punctualityRating + data.reliabilityRating +
      data.communicationRating + data.safetyRating) / 5
  );

  const { data: review, error } = await admin
    .from('user_reviews')
    .insert({
      event_id: data.eventId,
      reviewer_user_id: userId,
      reviewed_user_id: data.reviewedUserId,
      respect_rating: data.respectRating,
      punctuality_rating: data.punctualityRating,
      reliability_rating: data.reliabilityRating,
      communication_rating: data.communicationRating,
      safety_rating: data.safetyRating,
      overall_rating: overall,
      comment: data.comment || null,
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return errorResponse('Você já avaliou este participante neste evento', 409);
    }
    return errorResponse('Erro ao criar avaliação: ' + error.message, 500);
  }

  // Grant achievements
  await admin.rpc('check_and_grant_achievements', { p_user_id: userId });

  return jsonResponse({ review }, 201);
}
