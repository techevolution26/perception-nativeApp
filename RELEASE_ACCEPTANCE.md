# Perception Mobile — Stage 3 Release Acceptance

This checklist is the mobile half of the Stage 3 release gate. Complete it against the Stage 2 hardened backend and a dedicated acceptance environment.

## Android cold start and auth

- [ ] Fresh install opens unauthenticated state.
- [ ] Register/login succeeds.
- [ ] Force-close and reopen restores the authenticated session.
- [ ] `/api/user` is used to hydrate the persisted token into current user state.
- [ ] Logout clears SecureStore even if the backend is unavailable.
- [ ] After logout, reopening the app stays unauthenticated.
- [ ] An expired/revoked token clears the local session.

## Navigation

- [ ] Home/feed navigation works.
- [ ] Discover/search navigation works.
- [ ] Notifications navigation works.
- [ ] Messages list/detail navigation works.
- [ ] Profile navigation works.
- [ ] SUPER_ADMIN Control Room navigation is visible only to the correct account.

## Keyboard and modal behavior

- [ ] Login/register inputs remain visible above the keyboard.
- [ ] Message composer remains usable above the keyboard.
- [ ] Edit-message modal/input remains usable with keyboard open.
- [ ] Archive/delete/recall action menus open and dismiss correctly.
- [ ] Android back closes the active modal/menu before leaving the screen where expected.

## Messaging and notifications

- [ ] Mutual-follow users can start a conversation.
- [ ] New messages arrive without a manual refresh.
- [ ] Message edits arrive without a manual refresh.
- [ ] Message recall state arrives without a manual refresh.
- [ ] Follow/message notifications arrive without a manual refresh.
- [ ] Unread notification badge matches the API unread count.

## Sign-off

Do not mark the mobile release PASS until every applicable item above is checked on the target Android device.
