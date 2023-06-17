import { MAPSynthetic } from "../synthetics.ts";
import { RuleElementSource } from "./data.ts";
import { RuleElementOptions, RuleElementPF2e } from "./index.ts";

/**
 * @category RuleElement
 */
export class MultipleAttackPenaltyRuleElement extends RuleElementPF2e {
    private selector: string;

    constructor(data: MAPSource, options: RuleElementOptions) {
        super(data, options);

        if (typeof data.selector === "string") {
            this.selector = data.selector;
        } else {
            this.failValidation("Missing string selector property");
            this.selector = "";
        }
    }

    override beforePrepareData(): void {
        if (this.ignored) return;

        const selector = this.resolveInjectedProperties(this.selector);
        const label = this.resolveInjectedProperties(this.label);
        const value = Number(this.resolveValue(this.data.value)) || 0;
        if (selector && label && value) {
            const map: MAPSynthetic = { label, penalty: value, predicate: this.predicate };
            const penalties = (this.actor.synthetics.multipleAttackPenalties[selector] ??= []);
            penalties.push(map);
        } else {
            console.warn(
                "PF2E | Multiple attack penalty requires at least a selector field and a non-empty value field"
            );
        }
    }
}

interface MAPSource extends RuleElementSource {
    selector?: unknown;
}
