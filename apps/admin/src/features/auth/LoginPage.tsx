import {
  Button,
  Card,
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
      <Card className="mx-auto max-w-md p-6">
        <h2 className="mb-1 text-xl font-semibold">{t('auth.login.title')}</h2>
        <p className="mb-4 text-sm text-muted-foreground">{t('auth.login.subtitle')}</p>
        <Form {...form}>
          <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.fields.email')}</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="username" {...field} />
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
                    <Input type="password" autoComplete="current-password" {...field} />
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
            <Button type="submit" disabled={isLoading}>
              {t('auth.login.submit')}
            </Button>
          </form>
        </Form>
      </Card>
    </GuestOnly>
  );
}
