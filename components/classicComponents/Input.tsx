import { useState } from "react";
import { EyeButton } from "../EyeButton";
import { cn } from "@/utils/cn";

type Props = {
    placeholder: string;
    className?: string;
    type: string;
    value?: string;
    onChange?: (value: string) => void;
    name?: string;
    required?: boolean;
};

export function Input({ placeholder, className, type, value, onChange, name, required }: Props) {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword && showPassword ? 'text' : type;

    return (
        <div className="relative w-full">
            <input
                className={cn(
                    "w-full px-4 py-3.5 md:px-5 md:py-4 lg:px-6 lg:py-4.5",
                    "text-base md:text-lg border-2 border-gray-200",
                    "rounded-lg md:rounded-xl",
                    "outline-none transition-all duration-300",
                    "bg-white font-sans text-gray-800",
                    "focus:border-blue-500 focus:ring-2 focus:ring-blue-200",
                    "placeholder:text-gray-400",
                    isPassword && "pr-12",
                    className
                )}
                placeholder={placeholder}
                type={inputType}
                name={name}
                required={required}
                {...(value !== undefined && { value })}
                {...(onChange && { onChange: (e) => onChange(e.target.value) })}
            />
            <EyeButton
                isPassword={isPassword}
                showPassword={showPassword}
                ShowPassword={setShowPassword}
            />
        </div>
    );
}