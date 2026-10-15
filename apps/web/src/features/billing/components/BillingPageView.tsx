import {
  Alert,
  AlertDescription,
  AlertTitle,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  PageHeader,
  Spinner,
} from '@app/ui';
import { CheckIcon } from 'lucide-react';

import type { BillingPageViewModel } from '../hooks/use-billing-page.js';

export type BillingPageViewProps = Omit<BillingPageViewModel, 'redirectTo'>;

export function BillingPageView({
  isLoading,
  isError,
  current,
  plans,
  checkoutEnabled,
  activation,
  manageLabel,
  manageDisabled,
  onManageSubscription,
  changeDialog,
  labels,
}: BillingPageViewProps) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner label={labels.loading} />
      </div>
    );
  }

  if (isError || current === null) {
    return <p className="text-destructive">{labels.loadError}</p>;
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <PageHeader title={labels.title} description={labels.description} />

      {activation ? (
        <Alert variant={activation.variant} role="status">
          <AlertDescription>{activation.message}</AlertDescription>
        </Alert>
      ) : null}

      {current.pastDue ? (
        <Alert variant="destructive">
          <AlertTitle>{labels.pastDueTitle}</AlertTitle>
          <AlertDescription>{labels.pastDueDescription}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardDescription>{labels.currentPlan}</CardDescription>
          <CardTitle className="flex flex-wrap items-center gap-2 text-xl">
            {current.planName}
            <Badge variant={current.statusVariant}>{current.statusLabel}</Badge>
          </CardTitle>
        </CardHeader>
        {current.detail !== null || current.branchQuantity !== null ? (
          <CardContent className="flex flex-col gap-1 text-sm text-muted-foreground">
            {current.detail !== null ? <p>{current.detail}</p> : null}
            {current.branchQuantity !== null ? <p>{current.branchQuantity}</p> : null}
          </CardContent>
        ) : null}
        {current.canManageSubscription ? (
          <CardFooter>
            <Button
              type="button"
              variant="outline"
              disabled={manageDisabled}
              onClick={onManageSubscription}
            >
              {manageLabel}
            </Button>
          </CardFooter>
        ) : null}
      </Card>

      <section className="flex flex-col gap-3" aria-labelledby="billing-plans-title">
        <h2 id="billing-plans-title" className="text-lg font-semibold">
          {labels.plansTitle}
        </h2>
        {checkoutEnabled ? null : (
          <Alert variant="info" role="status">
            <AlertDescription>{labels.checkoutDisabled}</AlertDescription>
          </Alert>
        )}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => (
            <Card
              key={plan.key}
              data-current={plan.isCurrent}
              className="data-[current=true]:border-primary"
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  {plan.name}
                  {plan.isCurrent ? <Badge variant="secondary">{labels.currentBadge}</Badge> : null}
                </CardTitle>
                <CardDescription>
                  <span className="text-2xl font-bold text-foreground">{plan.price}</span>
                  {plan.priceSuffix !== null ? <span> {plan.priceSuffix}</span> : null}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="flex flex-col gap-2 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <CheckIcon aria-hidden className="mt-0.5 size-4 shrink-0 text-success" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              {plan.actionLabel !== null ? (
                <CardFooter>
                  <Button
                    type="button"
                    className="w-full"
                    variant={plan.actionVariant}
                    disabled={plan.actionDisabled}
                    onClick={plan.onAction}
                  >
                    {plan.actionLabel}
                  </Button>
                </CardFooter>
              ) : null}
            </Card>
          ))}
        </div>
      </section>

      <ConfirmDialog {...changeDialog} />
    </div>
  );
}
