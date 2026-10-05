import { prisma } from '@/lib/prisma';
import { logAuditEvent } from '@/lib/audit';

export interface StatutoryRuleInput {
  ruleType: 'PF' | 'ESI' | 'TDS' | 'PT';
  country?: string;
  state?: string | null;
  effectiveFrom: string | Date;
  effectiveTo?: string | Date | null;
  employeeRate: number;
  employerRate?: number | null;
  threshold?: number | null;
  ceiling?: number | null;
  rateType?: 'PERCENTAGE' | 'FIXED' | 'SLAB';
  slabConfigJson?: string | null;
  applicableConditions?: string | null;
  clientId?: string | null;
}

/**
 * Initializes Indian statutory rule engine defaults (EPF, ESI, TDS, PT)
 */
export async function ensureDefaultStatutoryRules() {
  const defaultRules: StatutoryRuleInput[] = [
    // 1. Employees' Provident Fund (EPF Act 1952)
    {
      ruleType: 'PF',
      country: 'India',
      state: 'ALL',
      effectiveFrom: new Date('2020-01-01'),
      employeeRate: 12, // 12% of Basic
      employerRate: 12, // 12% Employer Match (3.67% EPF + 8.33% EPS)
      threshold: 0,
      ceiling: 15000, // EPFO Statutory Wage Ceiling ₹15,000 -> Max ₹1,800/month
      rateType: 'PERCENTAGE',
      applicableConditions: JSON.stringify({ basicComponent: 'BASIC', capAtCeiling: true }),
    },
    // 2. Employees' State Insurance (ESI Act 1948)
    {
      ruleType: 'ESI',
      country: 'India',
      state: 'ALL',
      effectiveFrom: new Date('2020-01-01'),
      employeeRate: 0.75, // 0.75% of Gross
      employerRate: 3.25, // 3.25% Employer Contribution
      threshold: 21000, // Applicable for gross wages up to ₹21,000 per month
      ceiling: 21000,
      rateType: 'PERCENTAGE',
      applicableConditions: JSON.stringify({ grossBase: 'TOTAL_GROSS', disabledExempt: false }),
    },
    // 3. Tax Deducted at Source (Income Tax Act 1961 - Provisional Withholding)
    {
      ruleType: 'TDS',
      country: 'India',
      state: 'ALL',
      effectiveFrom: new Date('2020-01-01'),
      employeeRate: 5, // 5% provisional monthly withholding for gross > 50,000
      employerRate: 0,
      threshold: 50000,
      ceiling: null,
      rateType: 'PERCENTAGE',
      applicableConditions: JSON.stringify({ regime: 'NEW_TAX_REGIME', standardDeduction: 75000 }),
    },
    // 4. Professional Tax - Maharashtra Schedule
    {
      ruleType: 'PT',
      country: 'India',
      state: 'Maharashtra',
      effectiveFrom: new Date('2020-01-01'),
      employeeRate: 200,
      employerRate: 0,
      threshold: 10000,
      ceiling: null,
      rateType: 'SLAB',
      slabConfigJson: JSON.stringify([
        { min: 0, max: 10000, pt: 0 },
        { min: 10001, max: 999999999, pt: 200, febPt: 300 },
      ]),
      applicableConditions: JSON.stringify({ genderSpecific: false }),
    },
    // 5. Professional Tax - Karnataka Schedule
    {
      ruleType: 'PT',
      country: 'India',
      state: 'Karnataka',
      effectiveFrom: new Date('2020-01-01'),
      employeeRate: 200,
      employerRate: 0,
      threshold: 15000,
      ceiling: null,
      rateType: 'SLAB',
      slabConfigJson: JSON.stringify([
        { min: 0, max: 15000, pt: 0 },
        { min: 15001, max: 999999999, pt: 200 },
      ]),
    },
    // 6. Professional Tax - General / National Fallback
    {
      ruleType: 'PT',
      country: 'India',
      state: 'ALL',
      effectiveFrom: new Date('2020-01-01'),
      employeeRate: 200,
      employerRate: 0,
      threshold: 15000,
      ceiling: null,
      rateType: 'PERCENTAGE',
    },
  ];

  for (const r of defaultRules) {
    const existing = await prisma.statutoryRule.findFirst({
      where: { ruleType: r.ruleType, state: r.state || 'ALL' },
    });
    if (!existing) {
      await prisma.statutoryRule.create({
        data: {
          ruleType: r.ruleType,
          country: r.country || 'India',
          state: r.state || 'ALL',
          effectiveFrom: new Date(r.effectiveFrom),
          effectiveTo: r.effectiveTo ? new Date(r.effectiveTo) : null,
          employeeRate: r.employeeRate,
          employerRate: r.employerRate ?? null,
          threshold: r.threshold ?? null,
          ceiling: r.ceiling ?? null,
          rateType: r.rateType || 'PERCENTAGE',
          slabConfigJson: r.slabConfigJson || null,
          applicableConditions: r.applicableConditions || null,
          version: 1,
          isActive: true,
          clientId: null,
        },
      });
    }
  }
}

/**
 * Returns all configured statutory rules with optional type and tenant filtering
 */
export async function getStatutoryRules(filters?: { ruleType?: string; clientId?: string | null }) {
  await ensureDefaultStatutoryRules();

  const where: any = { isActive: true };
  if (filters?.ruleType && filters.ruleType !== 'ALL') {
    where.ruleType = filters.ruleType;
  }
  if (filters?.clientId) {
    where.OR = [
      { clientId: filters.clientId },
      { clientId: null },
    ];
  }

  return prisma.statutoryRule.findMany({
    where,
    orderBy: [{ ruleType: 'asc' }, { state: 'asc' }, { version: 'desc' }],
  });
}

/**
 * Versioned Rule Selector:
 * Resolves the precise statutory rule active for a given payroll calculation date and employee state.
 * Preserves historical reproducibility: If rules changed in 2026, a 2025 payroll run uses the rule effective in 2025.
 */
export async function getEffectiveStatutoryRule(
  ruleType: 'PF' | 'ESI' | 'TDS' | 'PT',
  calculationDate: Date,
  state: string = 'Maharashtra',
  clientId?: string | null
) {
  await ensureDefaultStatutoryRules();

  // 1. Check for client-specific rule override
  if (clientId) {
    const clientRule = await prisma.statutoryRule.findFirst({
      where: {
        ruleType,
        clientId,
        isActive: true,
        effectiveFrom: { lte: calculationDate },
        AND: [
          {
            OR: [
              { effectiveTo: null },
              { effectiveTo: { gte: calculationDate } },
            ],
          },
          ...(state ? [{ OR: [{ state }, { state: 'ALL' }, { state: null }] }] : []),
        ],
      },
      orderBy: { version: 'desc' },
    });
    if (clientRule) return clientRule;
  }

  // 2. Check for State-specific match
  if (state && state !== 'ALL') {
    const stateRule = await prisma.statutoryRule.findFirst({
      where: {
        ruleType,
        state,
        clientId: null,
        isActive: true,
        effectiveFrom: { lte: calculationDate },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: calculationDate } },
        ],
      },
      orderBy: { version: 'desc' },
    });
    if (stateRule) return stateRule;
  }

  // 3. Fallback to national default ('ALL' or null)
  const defaultRule = await prisma.statutoryRule.findFirst({
    where: {
      ruleType,
      clientId: null,
      isActive: true,
      effectiveFrom: { lte: calculationDate },
      OR: [
        { state: 'ALL' },
        { state: null },
      ],
      AND: [
        {
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gte: calculationDate } },
          ],
        },
      ],
    },
    orderBy: { version: 'desc' },
  });

  return defaultRule;
}

/**
 * Creates or versions a statutory rule
 */
export async function upsertStatutoryRule(
  input: StatutoryRuleInput,
  user: { id: string; fullName: string }
) {
  const effectiveDate = new Date(input.effectiveFrom);

  // If existing rule with same type, state, and client exists, close it out to maintain version history
  const existing = await prisma.statutoryRule.findFirst({
    where: {
      ruleType: input.ruleType,
      state: input.state || 'ALL',
      clientId: input.clientId || null,
      isActive: true,
      effectiveTo: null,
    },
    orderBy: { version: 'desc' },
  });

  let nextVersion = 1;
  if (existing) {
    nextVersion = existing.version + 1;
    // Set effectiveTo of previous rule to day before new rule start
    const priorEnd = new Date(effectiveDate);
    priorEnd.setDate(priorEnd.getDate() - 1);

    await prisma.statutoryRule.update({
      where: { id: existing.id },
      data: {
        effectiveTo: priorEnd,
      },
    });
  }

  const created = await prisma.statutoryRule.create({
    data: {
      ruleType: input.ruleType,
      country: input.country || 'India',
      state: input.state || 'ALL',
      effectiveFrom: effectiveDate,
      effectiveTo: input.effectiveTo ? new Date(input.effectiveTo) : null,
      employeeRate: input.employeeRate,
      employerRate: input.employerRate ?? null,
      threshold: input.threshold ?? null,
      ceiling: input.ceiling ?? null,
      rateType: input.rateType || 'PERCENTAGE',
      slabConfigJson: input.slabConfigJson || null,
      applicableConditions: input.applicableConditions || null,
      version: nextVersion,
      isActive: true,
      clientId: input.clientId || null,
    },
  });

  await logAuditEvent({
    actorUserId: user.id,
    action: 'CREATE',
    entityType: 'COMPLIANCE',
    entityId: created.id,
    reason: `Configured version ${nextVersion} statutory rule for ${input.ruleType} (${input.state || 'ALL'})`,
  });

  return created;
}
