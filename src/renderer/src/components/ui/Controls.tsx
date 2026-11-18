import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes
} from "react";
import "./controls.css";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement>;
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(props, ref) {
  return <button ref={ref} {...props} />;
});

export type IconButtonProps = ButtonProps & { readonly "aria-label": string };
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(props, ref) {
  return <button ref={ref} {...props} />;
});

type NativeInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type">;

export const Slider = forwardRef<HTMLInputElement, NativeInputProps>(function Slider(props, ref) {
  return <input ref={ref} type="range" {...props} />;
});

export const NumberInput = forwardRef<HTMLInputElement, NativeInputProps>(function NumberInput(props, ref) {
  return <input ref={ref} type="number" {...props} />;
});

export const TextInput = forwardRef<HTMLInputElement, NativeInputProps>(function TextInput(props, ref) {
  return <input ref={ref} type="text" {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(props, ref) {
  return <textarea ref={ref} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(props, ref) {
  const { className, ...rest } = props;
  return <select ref={ref} className={`shared-select${className ? ` ${className}` : ""}`} {...rest} />;
});

export const Checkbox = forwardRef<HTMLInputElement, NativeInputProps>(function Checkbox(props, ref) {
  return <input ref={ref} type="checkbox" {...props} />;
});

export const Radio = forwardRef<HTMLInputElement, NativeInputProps>(function Radio(props, ref) {
  return <input ref={ref} type="radio" {...props} />;
});

export const ColorInput = forwardRef<HTMLInputElement, NativeInputProps>(function ColorInput(props, ref) {
  return <input ref={ref} type="color" {...props} />;
});
