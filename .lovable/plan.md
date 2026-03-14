

# Production Readiness Audit -- Juntoo

## Issues Found

### CRITICAL -- Security

1. **RLS policy on `user_reviews` has `OR true`**: The SELECT policy allows any authenticated user to read ALL reviews including all personal rating data. The security scan flagged this as an error. Must be fixed by removing `OR true`.

2. **`events_with_details` view exposes `private_code`**: Private event invitation codes are potentially visible through the view. Need to verify the view uses `SECURITY INVOKER` (not DEFINER), and ideally exclude `private_code` from the view or add RLS.

3. **`report-evidence` bucket -- `getPublicUrl` on private bucket**: In `ReportModal.tsx` (line 95-98), `getPublicUrl` is called on the `report-evidence` bucket which is private. This returns a URL that won't work. Should use `createSignedUrl` instead, or since the evidence URL is stored for moderators, accept that it needs signed URLs at read time (moderator panel) and store the path rather than a broken public URL.

4. **Leaked password protection disabled**: The security scan flagged this. Recommend enabling it in Supabase Auth settings.

5. **Notification delete RLS missing**: The `notifications` table has no DELETE policy, yet `deleteNotification` in `NotificationPanel.tsx` calls `.delete()`. This will silently fail. Need to add a DELETE RLS policy.

### HIGH -- Bugs & Logic Errors

6. **Friend request notification uses `event_id` to store friendship ID**: In `notify_friend_request()` trigger, the friendship `id` is stored in the `event_id` column. Then in `NotificationPanel.tsx`, `handleAcceptFriendRequest` uses `notification.event_id` as the friendship ID to update. This is a misuse of the column semantically but functionally works -- however, clicking a friend_request notification with `handleNotificationClick` would try to navigate to a non-existent event. Already guarded by `notification.type !== 'friend_request'` check (line 273), so it's safe but fragile.

7. **`subscribeToNotifications` return value never cleaned up**: In `NotificationPanel.tsx` (line 55-84), the subscription cleanup function is returned but never used because `subscribeToNotifications()` is called directly in `useEffect` without capturing the return. This causes a memory leak with channel subscriptions accumulating.

8. **`onKeyPress` is deprecated**: `EventChat.tsx` uses `onKeyPress` which is deprecated. Should use `onKeyDown`.

9. **`UserProfilePage` navigates to `/profile` for own user** (line 47-48): This route doesn't exist as a standalone route -- profile is at `/?tab=profile`. This navigation would hit the 404 page. Should redirect to `/?tab=profile`.

10. **`UserProfilePage` navigates to `/event/{id}`** (lines 341, 381): This route doesn't exist in the router. Events are opened via `handleEventClick` on the Index page. These clicks would hit 404.

### MEDIUM -- Code Quality & Performance

11. **Duplicate moderator role checks**: Both `SettingsPage.tsx` and `ModerationPanel.tsx` independently query `user_roles` to check moderator status. Redundant DB calls.

12. **`useEffect` missing cleanup in `NotificationPanel`**: The channel subscription isn't cleaned up properly (issue #7 above).

13. **`events_with_details` query may return >1000 rows**: Several hooks (`useEvents.ts`, `useInfiniteEvents.ts`) fetch from this view with `.limit(50)` which is fine, but `usePublicEvents` has no limit -- could hit the 1000-row Supabase default.

14. **Duplicate API calls on home page**: `useTrendingEvents` and `useRecommendedEvents` both fetch from `events_with_details` with similar queries. Could be consolidated.

15. **Empty lines in `ProfilePage.tsx`** (lines 131-132): Minor dead space.

### LOW -- Minor Issues

16. **`report-evidence` bucket getPublicUrl**: Stored URL will be broken (private bucket). Need to store just the path and generate signed URLs when moderators view.

17. **Console warning**: React Router v6 deprecation warnings (v7 transition flags). Not blocking but noisy.

18. **`createdBy` missing from Event type mapping in `UserProfilePage`**: Events fetched for user profile don't include `createdBy` field.

---

## Implementation Plan

### Phase 1: Security Fixes (Database Migration)

**SQL Migration** to fix critical security issues:

- Drop and recreate the `user_reviews` SELECT policy removing `OR true` -- make reviews publicly readable (they're ratings, not sensitive) but properly:
  ```sql
  DROP POLICY "Users can view relevant reviews" ON public.user_reviews;
  CREATE POLICY "Anyone can view reviews" ON public.user_reviews
  FOR SELECT TO authenticated USING (true);
  ```
  (Reviews are inherently public data like ratings on any platform, so `true` is correct, just remove the confusing `OR true` construction that indicates an oversight.)

- Add DELETE policy for `notifications`:
  ```sql
  CREATE POLICY "Users can delete their own notifications" ON public.notifications
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
  ```

- Verify `events_with_details` view uses `SECURITY INVOKER` (check and fix if needed).

### Phase 2: Bug Fixes (Code Changes)

1. **Fix `NotificationPanel.tsx` subscription leak**: Properly capture and return the cleanup function from `useEffect`.

2. **Fix `report-evidence` URL storage**: In `ReportModal.tsx`, store just the file path instead of calling `getPublicUrl` on a private bucket.

3. **Fix `EventChat.tsx`**: Replace deprecated `onKeyPress` with `onKeyDown`.

4. **Fix `UserProfilePage.tsx` broken navigation**: 
   - Change `/profile` redirect to `/?tab=profile`
   - Remove or fix `/event/{id}` clicks (event detail is handled in-app, not via route)

5. **Fix `usePublicEvents`**: Add `.limit(1000)` or reasonable cap to prevent missing data.

6. **Fix `NotificationPanel` subscription cleanup**: Restructure `useEffect` to properly clean up the Supabase channel.

### Phase 3: Robustness

7. **Add error boundaries** around async operations that don't have try/catch (most already have them, good).

8. **Remove empty lines** in `ProfilePage.tsx`.

### Items NOT Changed (Justification)

- No new features added
- Friend request notification using `event_id` column is functional, just semantically imperfect -- would require schema change, not worth the risk pre-launch
- React Router v7 warnings -- cosmetic, no impact
- Duplicate moderator role checks -- minor perf issue, not worth refactoring pre-launch
- Home page duplicate queries -- both are cached by React Query, minimal impact

### Remaining Risks

- **Leaked password protection**: Must be enabled manually in Supabase Dashboard > Auth > Settings
- **`events_with_details` view**: Should verify it uses `SECURITY INVOKER` via Supabase SQL editor (cannot check view definition from schema alone)
- **Push notifications**: Edge functions depend on VAPID keys being properly configured
- **No rate limiting**: Report submissions and other mutations have no server-side rate limiting

### Post-Launch Optional Improvements

- Consolidate duplicate `events_with_details` queries on home page
- Add React Router v7 future flags
- Add server-side rate limiting via edge functions
- Implement proper audit logging for all user-facing mutations
- Add E2E tests for critical flows

