"use client";
import { useCallback, useState } from "react";
import { useToast } from "@/components/ui/Toast";

// Wraps an async mutation: tracks pending state, maps API validation errors
// to `error`, and toasts on success. Returns the result, or undefined on failure.
export function useAction(fn, { success, toastErrors = false } = {}) {
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  const run = useCallback(async (...args) => {
    setPending(true);
    setError(null);
    try {
      const result = await fn(...args);
      if (success) toast.success(typeof success === "function" ? success(result, ...args) : success);
      return result;
    } catch (err) {
      setError(err);
      if (toastErrors) toast.error(err);
      return undefined;
    } finally {
      setPending(false);
    }
  }, [fn, success, toastErrors, toast]);

  return { run, pending, error, setError };
}
