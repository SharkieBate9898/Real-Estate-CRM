PR Notes

Manual test checklist:
1. Login with "Stay logged in" unchecked. Refresh works, close and reopen the browser, user is logged out.
2. Login with "Stay logged in" checked. Close and reopen the browser, user remains logged in.
3. Logout clears the session in the current browser session.
4. Confirm no plaintext passwords are stored (only session cookie and hashed passwords).
5. Navbar at <1024px: hamburger only, menu opens/closes on click, outside click, and ESC.
6. Navbar at >=1024px: desktop links visible, no hamburger.
7. Mobile menu items navigate and close the menu.
8. Current user API returns id, email, name (null), role; unauthorized returns 401.
9. Role badge shows in header and mobile menu; default role is user.
