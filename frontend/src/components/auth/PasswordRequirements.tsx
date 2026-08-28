import { getPasswordChecks } from "@/src/lib/passwordValidation";

export function PasswordRequirements({ password }: { password: string }) {
  const checks = getPasswordChecks(password);
  const items = [
    ["8+ characters", checks.minLength],
    ["Uppercase letter", checks.uppercase],
    ["Lowercase letter", checks.lowercase],
    ["Number", checks.number],
  ] as const;

  return (
    <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] leading-5 text-[#968d84]">
      {items.map(([label, passed]) => (
        <li key={label} className={`flex items-center gap-2 transition-colors ${passed ? "text-[#5f6757]" : ""}`}>
          <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full border transition-colors ${passed ? "border-[#5f6757] bg-[#5f6757]" : "border-[#b8afa6]"}`} />
          {label}
        </li>
      ))}
    </ul>
  );
}
