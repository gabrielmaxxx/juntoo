import { useState } from 'react';
import { CommunityList } from './components/CommunityList';
import { CommunityPage } from './components/CommunityPage';
import { CreateCommunityForm } from './components/CreateCommunityForm';
import { RecurringEventSetup } from './components/RecurringEventSetup';
import { Community } from './hooks/useCommunities';

type View = 
  | { type: 'list' }
  | { type: 'detail'; communityId: string }
  | { type: 'create' }
  | { type: 'recurring-setup'; communityId: string };

interface CommunitiesTabProps {
  initialCommunityId?: string;
}

export const CommunitiesTab = ({ initialCommunityId }: CommunitiesTabProps) => {
  const [view, setView] = useState<View>(
    initialCommunityId ? { type: 'detail', communityId: initialCommunityId } : { type: 'list' }
  );

  if (view.type === 'create') {
    return (
      <CreateCommunityForm
        onBack={() => setView({ type: 'list' })}
        onCreated={(id) => setView({ type: 'detail', communityId: id })}
      />
    );
  }

  if (view.type === 'detail') {
    return (
      <CommunityPage
        communityId={view.communityId}
        onBack={() => setView({ type: 'list' })}
      />
    );
  }

  if (view.type === 'recurring-setup') {
    return (
      <RecurringEventSetup
        communityId={view.communityId}
        onBack={() => setView({ type: 'detail', communityId: view.communityId })}
      />
    );
  }

  return (
    <CommunityList
      onCommunityClick={(c) => setView({ type: 'detail', communityId: c.id })}
      onCreateClick={() => setView({ type: 'create' })}
    />
  );
};

export { CommunityCard } from './components/CommunityCard';
export { CommunityPage } from './components/CommunityPage';
export { CommunityList } from './components/CommunityList';
export { CreateCommunityForm } from './components/CreateCommunityForm';
export { RecurringEventSetup } from './components/RecurringEventSetup';
export { useCommunities, useMyCommunities, useCommunityDetails, useCommunityChat, useCreateCommunity } from './hooks/useCommunities';
export type { Community, CommunityMember, RecurringCommunityEvent } from './hooks/useCommunities';
