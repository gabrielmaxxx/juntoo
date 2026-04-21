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

  await Promise.all([
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
    admin.from('user_data_requests').insert({
      user_id: user.id,
      request_type: 'deletion',
      status: 'completed',
      completed_at: new Date().toISOString(),
    }),
    admin.from('activity_logs').insert({
      user_id: user.id,
      action: 'account_deleted_anonymized',
      metadata: {
        email_removed: true,
        lgpd_notification_to: 'privacidade@juntoo.com.br',
        request_type: 'deletion',
        timestamp: new Date().toISOString(),
      },
    }),
  ]);

  // Log LGPD data subject request for human follow-up by DPO
  console.log(`[LGPD-NOTIFICATION] privacidade@juntoo.com.br - Solicitação de EXCLUSÃO recebida. Usuário: ${user.id} | E-mail original: ${user.email} | Data: ${new Date().toISOString()}`);

  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id, false);

  if (deleteError) {
    console.error('Auth deletion error:', deleteError);
    return errorResponse('Dados pessoais anonimizados, mas não foi possível remover a credencial de acesso automaticamente.', 500);
  }

  return jsonResponse({ message: 'Sua conta foi excluída. Seus dados pessoais foram removidos.' });
});
