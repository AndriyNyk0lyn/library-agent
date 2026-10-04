import {
  calculatePlanResultSchema,
  savePlanResultSchema,
  listPlansResultSchema,
  type PlanDisplay,
  planInputSchema,
  savePlanSchema,
} from "@/plans/schema";

// Per-run results are captured from validated HTTP responses, not the model's final answer.
export class PlanResults {
  displays: PlanDisplay[] = [];
  private validationFailed = false;
  private revisions = 0;
  private validatedSchedule: string | null = null;
  allowAttempt(name: string, input: unknown) {
    if (name !== "calculate_reading_plan" && name !== "save_reading_plan")
      return true;
    // Saving the identical successful preview is persistence, not another schedule revision.
    if (
      name === "save_reading_plan" &&
      this.validatedSchedule !== null &&
      this.signature(name, input) === this.validatedSchedule
    ) {
      this.validatedSchedule = null;
      return true;
    }
    if (!this.validationFailed) return true;
    if (this.revisions >= 2) return false;
    this.revisions += 1;
    return true;
  }
  observe(name: string, input: unknown, args?: unknown) {
    if (name === "list_reading_plans") {
      const result = listPlansResultSchema.parse(input);
      if (result.ok)
        for (const plan of result.plans) this.add({ kind: "saved", plan });
      else this.add({ kind: "rejected", error: result.error });
      return;
    }
    if (name !== "calculate_reading_plan" && name !== "save_reading_plan")
      return;
    const result =
      name === "calculate_reading_plan"
        ? calculatePlanResultSchema.parse(input)
        : savePlanResultSchema.parse(input);
    if (result.ok) {
      if ("plan" in result) this.add({ kind: "saved", plan: result.plan });
      else {
        this.validatedSchedule = this.signature(name, args);
        this.add({ kind: "suggestion", calculation: result.calculation });
      }
    } else {
      this.validatedSchedule = null;
      if (
        ["VALIDATION_ERROR", "PLAN_INFEASIBLE", "CONFLICT"].includes(
          result.error.code,
        )
      )
        this.validationFailed = true;
      this.add({
        kind: "rejected",
        error: result.error,
        ...(result.constraints ? { constraints: result.constraints } : {}),
      });
    }
  }
  private signature(name: string, input: unknown) {
    if (name === "save_reading_plan") {
      const parsed = savePlanSchema.safeParse(input);
      if (!parsed.success) return null;
      const { operation_id, ...schedule } = parsed.data;
      void operation_id;
      return JSON.stringify(schedule);
    }
    const parsed = planInputSchema.safeParse(input);
    return parsed.success ? JSON.stringify(parsed.data) : null;
  }
  private add(display: PlanDisplay) {
    if (display.kind === "saved")
      this.displays = this.displays.filter(
        (previous) =>
          previous.kind !== "saved" || previous.plan.id !== display.plan.id,
      );
    this.displays = [...this.displays, display].slice(-5);
  }
}
