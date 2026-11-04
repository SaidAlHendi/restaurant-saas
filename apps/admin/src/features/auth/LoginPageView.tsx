'use client';

import { Button, Card, Input, Label } from '@app/ui';

import { useLoginPage } from './use-login-page';

export function LoginPageView() {
  const { t, email, password, onEmailChange, onPasswordChange, onSubmit, isLoading, errorMessage } =
    useLoginPage();

  return (
    <Card className="mx-auto max-w-md p-6">
      <h2 className="text-xl font-semibold">{t('auth.login.title')}</h2>
      <p className="mb-4 text-sm text-muted-foreground">{t('auth.login.description')}</p>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="admin-email">{t('auth.fields.email')}</Label>
          <Input
            id="admin-email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => {
              onEmailChange(e.target.value);
            }}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="admin-password">{t('auth.fields.password')}</Label>
          <Input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => {
              onPasswordChange(e.target.value);
            }}
          />
        </div>
        {errorMessage ? (
          <p className="text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <Button type="submit" disabled={isLoading}>
          {isLoading ? t('auth.login.submitting') : t('auth.login.submit')}
        </Button>
      </form>
    </Card>
  );
}
