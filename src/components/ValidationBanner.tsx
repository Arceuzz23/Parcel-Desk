import { AnimatePresence, motion } from "motion/react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { ValidationError } from "@/lib/types";
import { fadeInUp } from "@/lib/motion";

export interface ValidationBannerProps {
  errors: ValidationError[];
}

/**
 * Renders the full list of structural validation errors from the most
 * recent failed Run Handover attempt. Per the spec, each line must be
 * specific — "E06 · Event ID · Duplicate event ID: E05" — never a generic
 * "Something went wrong," so this simply lists every `ValidationError.
 * message` produced by src/lib/validation.ts verbatim; no summarizing or
 * truncation.
 */
export function ValidationBanner({ errors }: ValidationBannerProps) {
  return (
    <AnimatePresence>
      {errors.length > 0 && (
        <motion.div
          key="validation-banner"
          variants={fadeInUp}
          initial="initial"
          animate="animate"
          exit="exit"
          data-testid="validation-banner"
        >
          <Alert variant="destructive" role="alert" className="rounded-none">
            <AlertTitle className="font-mono text-xs tracking-widest uppercase">
              {errors.length === 1 ? "1 validation error" : `${errors.length} validation errors`} — run blocked
            </AlertTitle>
            <AlertDescription>
              <p className="mb-2">
                Fix the issues below and run again. No events were processed — the event log is validated as a
                whole before anything runs.
              </p>
              <ul className="list-inside list-disc space-y-0.5">
                {errors.map((error, index) => (
                  // Errors don't carry a globally unique id of their own;
                  // (rowIndex, field, code) together are stable and unique
                  // per validation run, which is enough for a React key
                  // here since the whole list is replaced on every Run.
                  <li key={`${error.rowIndex}-${error.field}-${error.code}-${index}`}>{error.message}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
