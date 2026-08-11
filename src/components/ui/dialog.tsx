import { type ComponentProps } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

import { cn } from "@/lib/utils";

const DIALOG_LAYOUT = {
  CENTERED: "centered",
  FULLSCREEN: "fullscreen",
} as const;

type DialogLayout = (typeof DIALOG_LAYOUT)[keyof typeof DIALOG_LAYOUT];

const dialogContentLayoutClasses: Record<DialogLayout, string> = {
  [DIALOG_LAYOUT.CENTERED]:
    "fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] modal-shell-solid rounded-modal overflow-hidden duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
  [DIALOG_LAYOUT.FULLSCREEN]:
    "fixed inset-0 z-50 h-dvh w-screen max-w-none translate-x-0 translate-y-0",
};

interface DialogContentProps extends ComponentProps<typeof DialogPrimitive.Content> {
  layout?: DialogLayout;
}

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

function DialogOverlay({ className, ref, ...props }: ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      ref={ref}
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-scrim/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className,
      )}
      {...props}
    />
  );
}

function DialogContent({
  className,
  children,
  ref,
  layout = DIALOG_LAYOUT.CENTERED,
  ...props
}: DialogContentProps) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        data-slot="dialog-content"
        data-layout={layout}
        className={cn(dialogContentLayoutClasses[layout], className)}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

function DialogHeader({ className, ref, ...props }: ComponentProps<"div">) {
  return (
    <div
      ref={ref}
      data-slot="dialog-header"
      className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)}
      {...props}
    />
  );
}

function DialogFooter({ className, ref, ...props }: ComponentProps<"div">) {
  return (
    <div
      ref={ref}
      data-slot="dialog-footer"
      className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
      {...props}
    />
  );
}

function DialogTitle({ className, ref, ...props }: ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      ref={ref}
      data-slot="dialog-title"
      className={cn("text-lg font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  );
}

function DialogDescription({ className, ref, ...props }: ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      ref={ref}
      data-slot="dialog-description"
      className={cn("text-sm text-text-muted", className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
