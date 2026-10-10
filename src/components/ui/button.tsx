"use client";
import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// shadcn's Base UI button, using the application's existing colour/spacing tokens.
const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center rounded px-4 py-2 font-medium disabled:opacity-60 disabled:cursor-wait",
  {
    variants: {
      variant: {
        default: "bg-accent text-white hover:bg-green-800",
        outline:
          "border border-line bg-surface text-foreground hover:bg-stone-100",
        link: "text-link min-h-0 rounded-none p-0 font-medium",
      },
    },
    defaultVariants: { variant: "default" },
  },
);
export function Button({
  className,
  variant,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, className }))}
      {...props}
    />
  );
}
