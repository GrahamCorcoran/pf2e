import { CreaturePF2e } from "@actor";
import { ActorType } from "@actor/data/index.ts";
import { MovementType } from "@actor/types.ts";
import { MOVEMENT_TYPES } from "@actor/values.ts";
import { tupleHasValue } from "@util";
import { BaseSpeedSynthetic, DeferredMovementType } from "../synthetics.ts";
import { BracketedValue, RuleElementOptions, RuleElementPF2e, RuleElementSource } from "./index.ts";

/**
 * @category RuleElement
 */
class BaseSpeedRuleElement extends RuleElementPF2e {
    protected static override validActorTypes: ActorType[] = ["character", "familiar", "npc"];

    private selector: string;

    private value: number | string | BracketedValue = 0;

    constructor(data: BaseSpeedSource, options: RuleElementOptions) {
        super(data, options);

        this.selector = String(data.selector)
            .trim()
            .replace(/-speed$/, "");

        if (typeof data.value === "string" || typeof data.value === "number" || this.isBracketedValue(data.value)) {
            this.value = data.value;
        } else {
            this.failValidation("A value must be a number, string, or bracketed value");
        }
    }

    override beforePrepareData(): void {
        if (this.ignored) return;
        const speedType = this.resolveInjectedProperties(this.selector);
        if (!tupleHasValue(MOVEMENT_TYPES, speedType)) {
            return this.failValidation("Unrecognized or missing selector");
        }

        const speed = this.#createMovementType(speedType);
        const synthetics = (this.actor.synthetics.movementTypes[speedType] ??= []);
        synthetics.push(speed);
    }

    #createMovementType(type: MovementType): DeferredMovementType {
        return (): BaseSpeedSynthetic | null => {
            if (!this.test()) return null;

            const value = Math.trunc(Number(this.resolveValue(this.value)));
            if (!Number.isInteger(value)) {
                this.failValidation("Failed to resolve value");
                return null;
            }
            // Whether this speed is derived from the creature's land speed
            const derivedFromLand =
                type !== "land" &&
                typeof this.value === "string" &&
                /attributes\.speed\.(?:value|total)/.test(this.value);

            return value > 0 ? { type: type, value, source: this.item.name, derivedFromLand } : null;
        };
    }
}

interface BaseSpeedSource extends RuleElementSource {
    selector?: unknown;
}

interface BaseSpeedRuleElement extends RuleElementPF2e {
    get actor(): CreaturePF2e;
}

export { BaseSpeedRuleElement };
