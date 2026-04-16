import { createEventSchema, formatZodErrors } from "../_shared/schemas.ts";
import { getAuthUser, getServiceClient, corsHeaders, jsonResponse, errorResponse } from "../_shared/auth.ts";

const DAILY_EVENT_LIMIT = 10;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // 1. Authenticate
  const userOrError = await getAuthUser(req);
  if (userOrError instanceof Response) return userOrError;
  const user = userOrError;

  // 2. Parse body
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorResponse('Body JSON inválido', 400);
  }

  // 3. Validate with Zod
  const parsed = createEventSchema.safeParse(body);
  if (!parsed.success) {
    return jsonResponse(formatZodErrors(parsed.error), 422);
  }
  const data = parsed.data;

  const admin = getServiceClient();

  // 4. Rate limiting: max events per day
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { count, error: countError } = await admin
    .from('events')
    .select('id', { count: 'exact', head: true })
    .eq('created_by', user.id)
    .gte('created_at', todayStart.toISOString());

  if (countError) {
    return errorResponse('Erro interno ao verificar limite', 500);
  }

  if ((count ?? 0) >= DAILY_EVENT_LIMIT) {
    return errorResponse(
      `Limite diário de ${DAILY_EVENT_LIMIT} eventos atingido. Tente novamente amanhã.`,
      429
    );
  }

  // 5. Check user restrictions
  const { data: restrictions } = await admin.rpc('get_user_restrictions', {
    p_user_id: user.id,
  });

  const blocked = Array.isArray(restrictions) && restrictions.some(
    (r: { restriction_type: string }) =>
      r.restriction_type === 'restricted' ||
      r.restriction_type === 'feature_block_create_events'
  );

  if (blocked) {
    return errorResponse('Sua conta está restrita de criar eventos.', 403);
  }

  // 6. Insert event
  const eventData = {
    title: data.title,
    description: data.description || null,
    category: data.category,
    state: data.state,
    city: data.city,
    location: data.location,
    date: data.date,
    time: data.time,
    price: data.price,
    max_participants: data.maxParticipants,
    is_private: data.isPrivate,
    is_recurring: data.isRecurring,
    recurrence_type: data.isRecurring ? data.recurrenceType : 'none',
    recurrence_end_date: data.isRecurring && data.recurrenceEndDate ? data.recurrenceEndDate : null,
    image_url: data.imageUrl || null,
    created_by: user.id,
  };

  const { data: event, error: insertError } = await admin
    .from('events')
    .insert(eventData)
    .select()
    .single();

  if (insertError) {
    console.error('Insert error:', insertError);
    return errorResponse('Erro ao criar evento: ' + insertError.message, 500);
  }

  // 7. Auto-join creator
  await admin
    .from('event_participants')
    .insert({ event_id: event.id, user_id: user.id });

  // 8. Generate recurring events
  if (data.isRecurring && data.recurrenceType !== 'none') {
    const recurringEvents = generateRecurringEvents(event, data);
    if (recurringEvents.length > 0) {
      await admin.from('events').insert(recurringEvents);
    }
  }

  return jsonResponse({ event }, 201);
});

function generateRecurringEvents(parentEvent: Record<string, unknown>, formData: { recurrenceType: string; recurrenceEndDate?: string; date: string }) {
  const events: Record<string, unknown>[] = [];
  const startDate = new Date(formData.date);
  const endDate = formData.recurrenceEndDate ? new Date(formData.recurrenceEndDate) : null;
  const maxOccurrences = 52;
  const currentDate = new Date(startDate);

  for (let i = 0; i < maxOccurrences; i++) {
    switch (formData.recurrenceType) {
      case 'weekly': currentDate.setDate(currentDate.getDate() + 7); break;
      case 'biweekly': currentDate.setDate(currentDate.getDate() + 14); break;
      case 'monthly': currentDate.setMonth(currentDate.getMonth() + 1); break;
      default: return events;
    }
    if (endDate && currentDate > endDate) break;

    events.push({
      title: parentEvent.title,
      description: parentEvent.description,
      category: parentEvent.category,
      state: parentEvent.state,
      city: parentEvent.city,
      location: parentEvent.location,
      date: currentDate.toISOString().split('T')[0],
      time: parentEvent.time,
      price: parentEvent.price,
      max_participants: parentEvent.max_participants,
      is_private: parentEvent.is_private,
      is_recurring: false,
      recurrence_type: 'none',
      parent_event_id: parentEvent.id,
      image_url: parentEvent.image_url,
      created_by: parentEvent.created_by,
    });
  }
  return events;
}
