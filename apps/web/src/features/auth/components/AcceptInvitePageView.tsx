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
  Spinner,
} from '@app/ui';

import type { AcceptInvitePageViewModel } from '../hooks/use-accept-invite-page.js';

export function AcceptInvitePageView(props: AcceptInvitePageViewModel) {
  const {
    previewLoading,
    previewError,
    orgName,
    email,
    roleLabel,
    passwordRequired,
    form,
    onSubmit,
    submitting,
    errorMessage,
    labels,
  } = props;

  if (previewLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner label={labels.loading} />
      </div>
    );
  }

  if (previewError) {
    return (
      <Card className="mx-auto max-w-md p-6">
        <p className="text-destructive">{labels.expired}</p>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-md p-6">
      <h1 className="mb-2 text-xl font-semibold">{labels.title}</h1>
      <p className="text-muted-foreground mb-4 text-sm">{labels.description}</p>
      <dl className="mb-6 space-y-2 text-sm">
        <div>
          <dt className="text-muted-foreground">{labels.org}</dt>
          <dd className="font-medium">{orgName}</dd>
        </div>
        {email.length > 0 ? (
          <div>
            <dt className="text-muted-foreground">{labels.email}</dt>
            <dd>{email}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-muted-foreground">{labels.role}</dt>
          <dd>{roleLabel}</dd>
        </div>
      </dl>
      <Form {...form}>
        <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-4">
          {passwordRequired ? (
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{labels.name}</FormLabel>
                  <FormControl>
                    <Input autoComplete="name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{labels.password}</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete={passwordRequired ? 'new-password' : 'current-password'}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {errorMessage ? <p className="text-destructive text-sm">{errorMessage}</p> : null}
          <Button type="submit" disabled={submitting}>
            {labels.submit}
          </Button>
        </form>
      </Form>
    </Card>
  );
}
