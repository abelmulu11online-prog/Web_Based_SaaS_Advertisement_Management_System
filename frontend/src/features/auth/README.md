# features/auth/

Everything related to authentication and authorisation.

## Planned structure (Phase 4)

```
auth/
├── components/       # LoginForm, RegisterForm, ForgotPasswordForm
├── hooks/            # useLogin.js, useRegister.js, useCurrentUser.js
├── services/         # authService.js  (API calls)
├── context/          # AuthContext.jsx
└── pages/            # LoginPage.jsx, RegisterPage.jsx
```
