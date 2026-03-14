

## Analysis

Currently, event chat messages (`event_messages` table) live entirely within the EventDetails page. When someone sends a message in an event chat, other participants get a notification via the `notify_new_message()` trigger, which creates a `new_message` notification in the bell panel (though these are now filtered out of the bell).

The user wants event chat conversations to appear in the **Messages tab** (alongside direct messages), so participants can see and respond to event chat activity from one unified inbox.

## Approach

This is a significant architectural change. There are two viable approaches:

### Option A: Unified display (show event chats as conversation items in Messages list)
- Add a section or mixed list in MessagesPage that shows event conversations alongside DMs
- Each event chat would appear as a "conversation" with the event name/image as the avatar
- Clicking opens the event chat (either inline or navigates to EventDetails)
- Requires tracking unread `event_messages` per user (currently no read tracking for event messages)

### Option B: Keep event chat separate but route notifications to Messages icon
- Event chat notifications already use type `new_message` and are filtered from the bell
- But the badge count on the Messages icon only counts `direct_messages` unreads
- This option would just add event message notification counts to the Messages icon badge

**Recommendation: Option A** -- it provides the best UX by giving a single place to see all conversations.

## Plan

### 1. Database: Add read tracking for event messages
- Create an `event_message_reads` table with columns: `user_id`, `event_id`, `last_read_at`
- Add RLS policies so users can manage their own read state
- Add table to `supabase_realtime` publication

### 2. Hook: Create `useEventConversations` 
- Fetch events the user participates in that have recent messages
- Compute unread count per event (messages after `last_read_at`)
- Return event conversations in a format compatible with the Messages list

### 3. Update `MessagesPage`
- Import and use `useEventConversations` alongside `useConversations`
- Merge both lists sorted by last message time
- Event conversations show event title + image as avatar, with a group icon indicator
- Clicking an event conversation opens the event chat (navigate to EventDetails chat tab)

### 4. Update `useConversations` / `AppHeader`
- Include event message unread counts in the `totalUnread` badge on the Messages icon
- Or expose a separate count and sum them in AppHeader

### 5. Update event chat notification trigger
- The existing `notify_new_message()` trigger on `event_messages` can be removed or converted to only handle push notifications, since the unread state will now be tracked via `event_message_reads`

### 6. Mark event messages as read
- When user opens the event chat tab, update `event_message_reads.last_read_at` to now

## Technical details

**New table:**
```sql
CREATE TABLE public.event_message_reads (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, event_id)
);
ALTER TABLE public.event_message_reads ENABLE ROW LEVEL SECURITY;
-- Users can upsert their own read state
```

**MessagesPage changes:**
- Show two types of items in the list: DM conversations (person avatar) and event chats (event image + group icon badge)
- Event items show event title, last message content, and unread count
- Clicking an event item navigates back to home with `?event=ID&tab=chat`

**Files to create/edit:**
- New migration for `event_message_reads` table
- New hook `src/hooks/useEventConversations.ts`
- Edit `src/components/MessagesPage.tsx` (merge lists)
- Edit `src/components/AppHeader.tsx` (combine unread counts)
- Edit `src/hooks/useEventDetails.tsx` (mark messages read on chat open)

