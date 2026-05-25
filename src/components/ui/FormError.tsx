interface FormErrorProps {
  message: string | null;
}

function FormError({ message }: FormErrorProps) {
  if (!message) return null;
  return (
    <p className="rounded-card border border-danger/40 bg-danger/10 px-3 py-2.5 text-[12px] text-danger">
      {message}
    </p>
  );
}

export { FormError };
