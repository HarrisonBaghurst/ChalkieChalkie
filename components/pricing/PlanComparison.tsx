import { PLAN_LABELS } from "@/lib/plans/labels";
import { PLAN_ORDER } from "@/lib/plans/pricingCopy";
import { PlanComparisonRow } from "@/types/planTypes";

type PlanComparisonProps = {
    rows: PlanComparisonRow[];
};

const PlanComparison = ({ rows }: PlanComparisonProps) => (
    <div className="flex w-full flex-col gap-6">
        <div className="flex flex-col gap-1">
            <h2 className="text-heading">How plans compare</h2>
            <p className="text-body text-foreground-third">
                Every plan gives you all workspace functionality. The difference
                is how much of it you get.
            </p>
        </div>

        <div className="w-full overflow-x-auto radius-surface border border-foreground-third/15 bg-card-background">
            <table className="w-full min-w-150 border-collapse text-left">
                <thead>
                    <tr className="border-b border-foreground-third/25">
                        <th className="p-5 text-caption font-inter-regular text-foreground-third">
                            Feature
                        </th>
                        {PLAN_ORDER.map((plan) => (
                            <th
                                key={plan}
                                className="p-5 text-body text-foreground"
                            >
                                {PLAN_LABELS[plan]}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row) => (
                        <tr
                            key={row.label}
                            className="border-b border-foreground-third/15 last:border-b-0"
                        >
                            <td className="p-5 text-small text-foreground-third">
                                {row.label}
                            </td>
                            {row.values.map((value, index) => (
                                <td
                                    key={PLAN_ORDER[index]}
                                    className="p-5 text-small text-foreground-second"
                                >
                                    {value}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

export default PlanComparison;
