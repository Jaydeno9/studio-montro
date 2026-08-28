import type { ChangeEventHandler } from "react";
import { FormField } from "@/src/components/form/FormField";
import { TextInput } from "@/src/components/form/TextInput";

type AuthFieldProps = {
  id: string;
  label: string;
  type?: "email" | "text";
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  autoComplete: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  readOnly?: boolean;
};

export function AuthField({
  id,
  label,
  type = "text",
  value,
  onChange,
  autoComplete,
  placeholder,
  error,
  disabled,
  readOnly,
}: AuthFieldProps) {
  return (
    <FormField id={id} label={label} error={error}>
      {(controlProps) => (
        <TextInput
          {...controlProps}
          type={type}
          required
          autoComplete={autoComplete}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
        />
      )}
    </FormField>
  );
}
