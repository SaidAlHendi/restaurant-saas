import { Link } from 'react-router-dom';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@app/ui';

import { GuestOnly } from '../../features/session/GuestOnly.js';
import { useSignupPage } from './use-signup-page.js';

export default function SignupPage() {
  const { form, onSubmit, isLoading, errorMessage, t } = useSignupPage();

  return (
    <GuestOnly>
      <Card className="mx-auto max-w-lg p-6">
        <h2 className="mb-4 text-xl font-semibold">{t('auth.signup.title')}</h2>
        <Form {...form}>
          <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.fields.name')}</FormLabel>
                  <FormControl>
                    <Input autoComplete="name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.fields.email')}</FormLabel>
                  <FormControl>
                    <Input type="email" autoComplete="email" {...field} />
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
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="restaurantName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.fields.restaurantName')}</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="defaultLocale"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('auth.fields.defaultLocale')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="en">{t('auth.locales.en')}</SelectItem>
                      <SelectItem value="ar">{t('auth.locales.ar')}</SelectItem>
                    </SelectContent>
                  </Select>
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
              {t('auth.signup.submit')}
            </Button>
          </form>
        </Form>
        <p className="mt-4 text-sm text-muted-foreground">
          {t('auth.signup.hasAccount')}{' '}
          <Link to="/login" className="text-primary underline-offset-4 hover:underline">
            {t('auth.signup.loginLink')}
          </Link>
        </p>
      </Card>
    </GuestOnly>
  );
}
