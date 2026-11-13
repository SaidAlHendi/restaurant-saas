import {
  Button,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from '@app/ui';

import { GuestOnly } from '../session/GuestOnly.js';
import { useLoginPage } from './use-login-page.js';

export default function LoginPage() {
  const { form, onSubmit, isLoading, errorMessage, t } = useLoginPage();

  return (
    <GuestOnly>
      <div className="mx-auto w-full">
        <h2 className="auth-display mb-1 text-4xl leading-tight">{t('auth.login.title')}</h2>
        <p className="mb-5 text-sm text-muted-foreground">{t('auth.login.subtitle')}</p>
        <Form {...form}>
          <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-3">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.fields.email')}</FormLabel>
                  <FormControl>
                    <Input className="h-11" type="email" autoComplete="username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.fields.password')}</FormLabel>
                  <FormControl>
                    <Input className="h-11" type="password" autoComplete="current-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {errorMessage ? (
              <p className="text-sm text-destructive" role="alert">
                {errorMessage}
              </p>
            ) : null}
            <Button type="submit" size="touch" className="mt-1 w-full" disabled={isLoading}>
              {t('auth.login.submit')}
            </Button>
          </form>
        </Form>
      </div>
    </GuestOnly>
  );
}
