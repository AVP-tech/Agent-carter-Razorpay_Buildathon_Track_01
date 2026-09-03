import { GuardrailCheckRequest, GuardrailCheckResponse } from "../types/guardrail";
import { CartCalculation, ResolvedCartItem } from "../types/commerce";

export class GuardrailEngine {
  // Hard policy limits
  public static readonly DEFAULT_MAX_AUTONOMOUS_LIMIT_PAISE = 2500000; // INR 25,000
  public static readonly DEFAULT_MIN_MARGIN_FLOOR_PERCENT = 15.0; // 15% Minimum Gross Profit
  public static readonly MAX_DISCOUNT_PERCENT = 25.0; // 25% Maximum single discount allowed

  /**
   * Evaluates Cart and checks all Money & Policy Guardrails
   */
  static evaluateCart(
    items: ResolvedCartItem[],
    requestedDiscountPaise: number = 0,
    buyerAgentId?: string,
    buyerMaxBudgetPaise?: number
  ): {
    calculation: CartCalculation;
    guardrail: GuardrailCheckResponse;
  } {
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const totalCost = items.reduce((sum, item) => sum + item.totalCost, 0);

    // Bounded discount capping
    const rawDiscount = Math.max(0, requestedDiscountPaise);
    const maxDiscountAllowed = Math.floor(subtotal * (this.MAX_DISCOUNT_PERCENT / 100));
    const effectiveDiscount = Math.min(rawDiscount, maxDiscountAllowed);

    const afterDiscount = Math.max(0, subtotal - effectiveDiscount);
    // 18% GST calculation (standard Indian e-commerce calculation)
    const taxAmount = Math.round(afterDiscount * 0.18);
    const finalAmount = afterDiscount + taxAmount;

    // Gross Profit Margin = (Revenue - Cost) / Revenue
    // Revenue before tax = afterDiscount
    const grossMarginPercent =
      afterDiscount > 0
        ? Number((((afterDiscount - totalCost) / afterDiscount) * 100).toFixed(2))
        : 0;

    const isMarginHealthy = grossMarginPercent >= this.DEFAULT_MIN_MARGIN_FLOOR_PERCENT;

    const calculation: CartCalculation = {
      items,
      subtotal,
      totalCost,
      discountAmount: effectiveDiscount,
      discountPercent: subtotal > 0 ? Number(((effectiveDiscount / subtotal) * 100).toFixed(2)) : 0,
      taxAmount,
      finalAmount,
      grossMarginPercent,
      isMarginGuarded: isMarginHealthy,
    };

    // Check 1: Autonomous Spending Cap
    if (finalAmount > this.DEFAULT_MAX_AUTONOMOUS_LIMIT_PAISE) {
      return {
        calculation,
        guardrail: {
          passed: false,
          code: "BUDGET_EXCEEDED",
          reason: `Total amount (₹${(finalAmount / 100).toFixed(2)}) exceeds autonomous purchase limit of ₹${(this.DEFAULT_MAX_AUTONOMOUS_LIMIT_PAISE / 100).toFixed(2)}. Human-in-the-loop escalation required.`,
          maxAllowedSpendPaise: this.DEFAULT_MAX_AUTONOMOUS_LIMIT_PAISE,
          currentMarginPercent: grossMarginPercent,
          minimumMarginRequiredPercent: this.DEFAULT_MIN_MARGIN_FLOOR_PERCENT,
          requiresHumanEscalation: true,
          recoveryActionSuggested: "GENERATE_PAYMENT_LINK",
        },
      };
    }

    // Check 2: Buyer Agent Mandate Budget
    if (buyerMaxBudgetPaise && finalAmount > buyerMaxBudgetPaise) {
      return {
        calculation,
        guardrail: {
          passed: false,
          code: "BUDGET_EXCEEDED",
          reason: `Order total (₹${(finalAmount / 100).toFixed(2)}) exceeds Buyer Agent pre-authorized budget of ₹${(buyerMaxBudgetPaise / 100).toFixed(2)}.`,
          maxAllowedSpendPaise: buyerMaxBudgetPaise,
          currentMarginPercent: grossMarginPercent,
          minimumMarginRequiredPercent: this.DEFAULT_MIN_MARGIN_FLOOR_PERCENT,
          requiresHumanEscalation: false,
          recoveryActionSuggested: "DOWNSIZE_CART",
        },
      };
    }

    // Check 3: Merchant Margin Floor Protection
    if (!isMarginHealthy) {
      // Calculate max discount that preserves margin floor
      // (subtotal - cappedDiscount - totalCost) / (subtotal - cappedDiscount) = minMarginFloor / 100
      const minMarginRatio = this.DEFAULT_MIN_MARGIN_FLOOR_PERCENT / 100;
      const allowableDiscount = Math.max(
        0,
        Math.floor((subtotal - totalCost / (1 - minMarginRatio)))
      );

      return {
        calculation,
        guardrail: {
          passed: false,
          code: "MARGIN_BREACH",
          reason: `Requested discount violates merchant minimum profit margin (${grossMarginPercent}% < ${this.DEFAULT_MIN_MARGIN_FLOOR_PERCENT}% required).`,
          maxAllowedSpendPaise: this.DEFAULT_MAX_AUTONOMOUS_LIMIT_PAISE,
          currentMarginPercent: grossMarginPercent,
          minimumMarginRequiredPercent: this.DEFAULT_MIN_MARGIN_FLOOR_PERCENT,
          requiresHumanEscalation: false,
          recoveryActionSuggested: "APPLY_CAPPED_DISCOUNT",
          cappedDiscountPaise: allowableDiscount,
        },
      };
    }

    // All Guardrails Passed
    return {
      calculation,
      guardrail: {
        passed: true,
        code: "APPROVED",
        reason: `Cart verified. Margin (${grossMarginPercent}%) exceeds policy floor (${this.DEFAULT_MIN_MARGIN_FLOOR_PERCENT}%). Within ₹${(this.DEFAULT_MAX_AUTONOMOUS_LIMIT_PAISE / 100).toFixed(2)} autonomous ceiling.`,
        maxAllowedSpendPaise: this.DEFAULT_MAX_AUTONOMOUS_LIMIT_PAISE,
        currentMarginPercent: grossMarginPercent,
        minimumMarginRequiredPercent: this.DEFAULT_MIN_MARGIN_FLOOR_PERCENT,
        requiresHumanEscalation: false,
      },
    };
  }
}
