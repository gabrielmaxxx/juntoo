import { getAuthUser, getServiceClient, corsHeaders, jsonResponse, errorResponse } from '../_shared/auth.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return errorResponse('Método não permitido', 405);
  }

  const userOrError = await getAuthUser(req);
  if (userOrError instanceof Response) return userOrError;
  const user = userOrError;
  const admin = getServiceClient();

  const anonymizedProfile = {
    full_name: 'Usuário removido',
    avatar_url: null,
    bio: '',
    username: null,
    city: null,
    interests: [],
    onboarding_completed: false,
    updated_at: new Date().toISOString(),
  };

  const { error: profileError } = await admin
    .from('profiles')
    .update(anonymizedProfile)
    .eq('user_id', user.id);

  if (profileError) {
    console.error('Profile anonymization error:', profileError);
    return errorResponse('Não foi possível anonimizar seus dados pessoais.', 500);
  }

  // Registra o pedido como "em processamento" — só é concluído após todas as etapas
  const { data: request } = await admin.from('user_data_requests').insert({
    user_id: user.id,
    request_type: 'deletion',
    status: 'processing',
  }).select('id').single();

  const results = await Promise.all([
    admin.from('privacy_preferences').update({
      show_profile_public: false,
      show_location: false,
      allow_friend_requests: false,
      allow_direct_messages: false,
      show_events_participated: false,
      show_online_status: false,
      updated_at: new Date().toISOString(),
    }).eq('user_id', user.id),
    admin.from('push_subscriptions').delete().eq('user_id', user.id),
    admin.from('availability').delete().eq('user_id', user.id),
    admin.from('direct_messages').delete().eq('sender_id', user.id),
    admin.from('event_messages').delete().eq('user_id', user.id),
    admin.from('community_messages').delete().eq('user_id', user.id),
    admin.from('event_participants').delete().eq('user_id', user.id),
    admin.from('pinned_events').delete().eq('user_id', user.id),
    admin.from('friendships').delete().or(`user_id.eq.${user.id},friend_id.eq.${user.id}`),
  ]);

  // Remove arquivos pessoais do armazenamento (pasta {user_id}/)
  const { data: files } = await admin.storage.from('avatars').list(user.id, { limit: 1000 });
  if (files && files.length > 0) {
    await admin.storage.from('avatars').remove(files.map((f) => `${user.id}/${f.name}`));
  }

  const failedStep = results.find((r) => r.error);
  if (failedStep?.error) {
    console.error('Deletion step error:', failedStep.error);
    if (request?.id) await admin.from('user_data_requests').update({ status: 'failed' }).eq('id', request.id);
    return errorResponse('Não foi possível concluir a exclusão. Tente novamente ou contate privacidade@juntoo.com.br.', 500);
  }

  console.log(`[LGPD-NOTIFICATION] privacidade@juntoo.com.br - Solicitação de EXCLUSÃO recebida. Usuário: ${user.id} | Data: ${new Date().toISOString()}`);

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id, false);

  if (deleteError) {
    console.error('Auth deletion error:', deleteError);
    if (request?.id) await admin.from('user_data_requests').update({ status: 'failed' }).eq('id', request.id);
    return errorResponse('Dados pessoais anonimizados, mas não foi possível remover a credencial de acesso automaticamente.', 500);
  }

  // Registro de auditoria sem dados pessoais (sobrevive à exclusão do usuário)
  await admin.from('moderation_logs').insert({
    admin_id: user.id,
    action: 'account_deleted',
    target_type: 'user',
    target_id: user.id,
    reason: 'Solicitação do titular (LGPD)',
  });

  return jsonResponse({ message: 'Sua conta foi excluída. Seus dados pessoais foram removidos.' });
});
