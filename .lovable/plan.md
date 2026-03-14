

## Analysis

The main performance bottleneck is in `useEventConversations.ts`. It makes **N+1 queries** in a loop: for each event the user participates in, it fires 2 separate Supabase queries (last message + unread count). If a user is in 10 events, that's ~22 sequential HTTP requests.

Additionally, `AppHeader` instantiates `useEventConversations()` on every page load (not just the Messages tab), so this slow hook runs globally on every navigation.

## Plan

### 1. Optimize `useEventConversations` -- eliminate N+1 queries
Replace the per-event loop with batch queries:
- Fetch **all** last messages across all events in one query using a window function or simply fetching recent messages and deduplicating client-side
- Fetch **all** unread counts in one query using `.in('event_id', eventIds)` with grouping logic client-side
- This reduces ~22 sequential requests to ~4 parallel requests total

### 2. Split unread count from full conversation fetch in AppHeader
Instead of calling the full `useEventConversations()` in `AppHeader`, create a lightweight `useEventUnreadCount()` hook that only does a single count query (no message details, no event titles). This keeps the header fast.

Alternatively, use a shared state/context so the hook only runs once and both AppHeader and MessagesPage read from it.

### 3. Debounce realtime refetch
Currently, every `INSERT` on `event_messages` triggers a full `fetchConversations()`. Add a debounce (e.g., 2 seconds) so rapid messages don't cause repeated heavy fetches.

## Technical details

**Optimized fetch (step 1)** -- replace the for-loop with:
```typescript
// Single query: get latest message per event
const { data: allMessages } = await supabase
  .from('event_messages')
  .select('event_id, message, created_at, user_id, profiles:user_id(full_name)')
  .in('event_id', eventIds)
  .order('created_at', { ascending: false });

// Client-side: pick first message per event_id
const lastMsgMap = new Map();
for (const msg of allMessages || []) {
  if (!lastMsgMap.has(msg.event_id)) lastMsgMap.set(msg.event_id, msg);
}
```

Then compute unread counts client-side by comparing message timestamps against `readMap`.

**Lightweight header hook (step 2):**
- A simple hook that queries `event_messages` count where `created_at > last_read_at` across all participated events, in 2-3 queries max.

**Files to edit:**
- `src/hooks/useEventConversations.ts` -- rewrite fetch logic to batch queries
- `src/components/AppHeader.tsx` -- use lightweight unread count instead of full hook

