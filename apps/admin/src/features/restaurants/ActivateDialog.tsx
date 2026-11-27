import { ADMIN_GRANT_PLAN_KEYS } from '@app/shared';
import {
  Button,
  DatePicker,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  MoneyInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
  Textarea,
} from '@app/ui';

import type { RestaurantDetailVm } from './use-restaurant-detail-page.js';

/** Manual activation form for restaurants that paid outside Paddle. */
export function ActivateDialog({ vm, name }: { vm: RestaurantDetailVm; name: string }) {
  const { t } = vm;
  return (
    <Dialog open={vm.activateOpen} onOpenChange={vm.setActivateOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('restaurants.activateTitle', { name: name })}</DialogTitle>
          <DialogDescription>{t('restaurants.activateBody')}</DialogDescription>
        </DialogHeader>
        <DialogBody className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>{t('restaurants.activatePlan')}</Label>
            <Select
              value={vm.activatePlan}
              onValueChange={(value) => {
                vm.setActivatePlan(value as (typeof ADMIN_GRANT_PLAN_KEYS)[number]);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {vm.planOptions.map((option) => (
                  <SelectItem key={option.key} value={option.key}>
                    {option.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="activate-until">{t('restaurants.activateUntil')}</Label>
            <DatePicker
              id="activate-until"
              value={vm.activateUntil}
              onChange={vm.setActivateUntil}
              placeholder={t('restaurants.activateUntil')}
              locale={vm.dateLocale}
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="activate-paid"
              checked={vm.activatePaid}
              onCheckedChange={vm.setActivatePaid}
            />
            <Label htmlFor="activate-paid">{t('restaurants.activatePaid')}</Label>
          </div>
          {vm.activatePaid ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="activate-amount">{t('restaurants.activateAmount')}</Label>
              <MoneyInput
                id="activate-amount"
                currency={vm.activateCurrency}
                locale={vm.dateLocale}
                value={vm.activateAmount}
                onValueChange={vm.setActivateAmount}
              />
            </div>
          ) : null}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="activate-note">{t('restaurants.activateNote')}</Label>
            <Textarea
              id="activate-note"
              rows={2}
              maxLength={200}
              value={vm.activateNote}
              onChange={(event) => {
                vm.setActivateNote(event.target.value);
              }}
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              vm.setActivateOpen(false);
            }}
          >
            {t('common.cancel')}
          </Button>
          <Button disabled={vm.isActivating || !vm.canConfirmActivate} onClick={vm.confirmActivate}>
            {t('restaurants.activate')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
