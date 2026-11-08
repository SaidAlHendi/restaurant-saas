import {
  Badge,
  Button,
  EmptyState,
  PageHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@app/ui';

import { usePlansPage } from './use-plans-page.js';

export default function PlansPage() {
  const vm = usePlansPage();
  const { t } = vm;

  let body;
  if (vm.isError) {
    body = (
      <div className="flex flex-col items-center gap-3 p-6 text-center">
        <p>{t('plans.loadError')}</p>
        <Button variant="outline" onClick={vm.retry}>
          {t('common.retry')}
        </Button>
      </div>
    );
  } else if (vm.isLoading) {
    body = <p className="p-6 text-center text-muted-foreground">{t('common.loading')}</p>;
  } else if (vm.plans.length === 0) {
    body = <EmptyState title={t('plans.emptyTitle')} description={t('plans.emptyBody')} />;
  } else {
    body = (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('plans.columns.plan')}</TableHead>
            <TableHead>{t('plans.columns.price')}</TableHead>
            {vm.featureKeys.map((key) => (
              <TableHead key={key} className="whitespace-nowrap">
                <span dir="ltr">{key}</span>
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {vm.plans.map((plan) => {
            const limits = new Map(plan.features.map((f) => [f.key, f.limit]));
            return (
              <TableRow key={plan.id}>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="flex items-center gap-2 font-medium">
                      {plan.name}
                      {plan.isPublic ? null : (
                        <Badge variant="completed">{t('plans.private')}</Badge>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground" dir="ltr">
                      {plan.key}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {vm.formatPrice(plan.priceMinor, plan.currency)}{' '}
                  <span className="text-xs text-muted-foreground">
                    {plan.perBranch ? t('plans.perBranchMonth') : t('plans.perMonth')}
                  </span>
                </TableCell>
                {vm.featureKeys.map((key) => (
                  <TableCell key={key}>
                    {vm.featureLabel(limits, key) ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <PageHeader title={t('plans.title')} description={t('plans.description')} />
      {body}
    </div>
  );
}
