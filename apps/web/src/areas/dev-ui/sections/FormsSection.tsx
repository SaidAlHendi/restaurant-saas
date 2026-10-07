import {
  Button,
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Label,
  ImageUpload,
  MoneyInput,
  NumberInput,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from '@app/ui';

import type { DevUiCopy } from '../dev-ui.copy.js';
import type { ImageUploadDemo } from '../image-upload-demo.js';
import type { InputsDemo, ProductFormDemo } from '../product-form-demo.js';
import { ShowcaseRow, ShowcaseSection } from './ShowcaseSection.js';

export interface FormsSectionProps {
  copy: DevUiCopy;
  idPrefix: string;
  locale: string;
  productForm: ProductFormDemo;
  inputs: InputsDemo;
  imageUpload: ImageUploadDemo;
}

export function FormsSection({
  copy,
  idPrefix,
  locale,
  productForm,
  inputs,
  imageUpload,
}: FormsSectionProps) {
  const f = copy.forms;
  const id = (name: string) => `${idPrefix}-${name}`;
  const translate = (key: string) => f.errors[key] ?? key;
  const { form } = productForm;
  return (
    <ShowcaseSection title={copy.sections.forms}>
      <div className="grid gap-8 lg:grid-cols-2">
        <Form {...form}>
          <form onSubmit={productForm.onSubmit} noValidate className="flex flex-col gap-5">
            <p className="font-medium">{f.formTitle}</p>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{f.name}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={copy.fields.namePlaceholder} />
                  </FormControl>
                  <FormDescription>{f.nameDescription}</FormDescription>
                  <FormMessage formatMessage={translate} />
                </FormItem>
              )}
            />
            <div className="grid gap-5 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{f.price}</FormLabel>
                    <FormControl>
                      <MoneyInput
                        name={field.name}
                        value={field.value}
                        onValueChange={field.onChange}
                        onBlur={field.onBlur}
                        currency="SAR"
                        locale={locale}
                      />
                    </FormControl>
                    <FormDescription>{f.priceDescription}</FormDescription>
                    <FormMessage formatMessage={translate} />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{f.quantity}</FormLabel>
                    <FormControl>
                      <NumberInput
                        name={field.name}
                        value={field.value}
                        onValueChange={field.onChange}
                        min={1}
                        max={20}
                        decrementLabel={f.decrease}
                        incrementLabel={f.increase}
                      />
                    </FormControl>
                    <FormMessage formatMessage={translate} />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{f.category}</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={f.categoryPlaceholder} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {f.categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage formatMessage={translate} />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="available"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3">
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel>{f.available}</FormLabel>
                </FormItem>
              )}
            />
            <div className="flex gap-3">
              <Button type="submit">{f.submit}</Button>
              <Button type="button" variant="outline" onClick={productForm.onReset}>
                {f.reset}
              </Button>
            </div>
            {productForm.submittedJson ? (
              <div className="flex flex-col gap-1">
                <p className="text-xs font-medium text-muted-foreground">{f.submitted}</p>
                <pre dir="ltr" className="rounded-md bg-muted p-3 text-xs">
                  {productForm.submittedJson}
                </pre>
              </div>
            ) : null}
          </form>
        </Form>

        <div className="flex flex-col gap-6">
          <p className="font-medium">{f.moneyTitle}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor={id('money-sar')}>{f.sar}</Label>
              <MoneyInput id={id('money-sar')} currency="SAR" locale={locale} {...inputs.sar} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={id('money-kwd')}>{f.kwd}</Label>
              <MoneyInput id={id('money-kwd')} currency="KWD" locale={locale} {...inputs.kwd} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={id('money-touch')}>{f.touch}</Label>
              <MoneyInput
                id={id('money-touch')}
                currency="SAR"
                locale={locale}
                size="touch"
                placeholder="0.00"
                {...inputs.touch}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={id('money-disabled')}>{f.disabled}</Label>
              <MoneyInput
                id={id('money-disabled')}
                currency="SAR"
                locale={locale}
                disabled
                value={2500}
                onValueChange={inputs.sar.onValueChange}
              />
            </div>
          </div>

          <p className="font-medium">{f.numberTitle}</p>
          <ShowcaseRow>
            <NumberInput
              aria-label={f.quantity}
              min={1}
              max={20}
              decrementLabel={f.decrease}
              incrementLabel={f.increase}
              {...inputs.quantity}
            />
            <NumberInput
              aria-label={`${f.quantity} (${f.touch})`}
              min={1}
              max={20}
              size="touch"
              decrementLabel={f.decrease}
              incrementLabel={f.increase}
              {...inputs.touchQuantity}
            />
            <NumberInput
              aria-label={`${f.quantity} (${f.disabled})`}
              disabled
              value={3}
              onValueChange={inputs.quantity.onValueChange}
              decrementLabel={f.decrease}
              incrementLabel={f.increase}
            />
          </ShowcaseRow>

          <p className="font-medium">{f.imageUploadTitle}</p>
          <ImageUpload
            previewUrl={imageUpload.previewUrl}
            label={f.imageLabel}
            hint={f.imageHint}
            chooseLabel={f.imageChoose}
            uploadingLabel={f.imageUploading}
            removeLabel={f.imageRemove}
            previewAlt={f.imagePreviewAlt}
            progress={imageUpload.progress}
            isUploading={imageUpload.isUploading}
            onFileSelect={imageUpload.onFileSelect}
            onRemove={imageUpload.onRemove}
          />
        </div>
      </div>
    </ShowcaseSection>
  );
}
