import type { ActorPF2e } from "@actor";
import type { WeaponPF2e } from "@item";
import type { StrikeRuleElement } from "@module/rules/rule-element/strike.ts";
import type { DamageType } from "@system/damage/types.ts";
import { objectHasKey, tupleHasValue } from "@util";

/** A helper class to handle toggleable weapon traits */
class WeaponTraitToggles {
    parent: WeaponPF2e;

    constructor(weapon: WeaponPF2e) {
        this.parent = weapon;
        Object.defineProperty(this, "parent", { enumerable: false });
    }

    get weapon(): WeaponPF2e {
        return this.parent;
    }

    get actor(): ActorPF2e | null {
        return this.parent.actor;
    }

    get modular(): { options: DamageType[]; selection: DamageType | null } {
        const weapon = this.weapon;
        const options = this.#resolveOptions("modular");
        const sourceSelection = weapon._source.system.traits.toggles?.modular?.selection;
        const selection = tupleHasValue(options, sourceSelection)
            ? sourceSelection
            : // If the weapon's damage type is represented among the modular options, set the selection to it
              options.includes(weapon.system.damage.damageType)
              ? weapon.system.damage.damageType
              : null;

        return { options, selection };
    }

    get versatile(): { options: DamageType[]; selection: DamageType | null } {
        const options = this.#resolveOptions("versatile");
        const sourceSelection = this.weapon._source.system.traits.toggles?.versatile?.selection ?? null;
        const selection = tupleHasValue(options, sourceSelection) ? sourceSelection : null;

        return { options, selection };
    }

    /** Collect selectable damage types among a list of toggleable weapon traits */
    #resolveOptions(toggle: "modular" | "versatile"): DamageType[] {
        const weapon = this.weapon;
        const types = weapon.system.traits.value
            .filter((t) => t.startsWith(toggle))
            .flatMap((trait): DamageType | DamageType[] => {
                if (trait === "modular") return ["bludgeoning", "piercing", "slashing"];

                const damageType = /^versatile-(\w+)$/.exec(trait)?.at(1);
                switch (damageType) {
                    case "b":
                        return "bludgeoning";
                    case "p":
                        return "piercing";
                    case "s":
                        return "slashing";
                    default: {
                        return objectHasKey(CONFIG.PF2E.damageTypes, damageType) ? damageType : [];
                    }
                }
            });

        const allOptions = Array.from(new Set(types));
        return toggle === "modular"
            ? allOptions
            : // Filter out any versatile options that are the same as the weapon's base damage type
              allOptions.filter((t) => weapon.system.damage.damageType !== t);
    }

    /**
     * Update a modular or versatile weapon to change its damage type
     * @returns A promise indicating whether an update was made
     */
    async update({ trait, selection }: ToggleWeaponTraitParams): Promise<boolean> {
        const { weapon, actor } = this;
        if (!actor?.isOfType("character")) return false;

        const current = weapon.system.traits.toggles[trait].selection;
        if (current === selection) return false;

        const item = actor.items.get(weapon.id);
        if (item?.isOfType("weapon") && item === weapon) {
            await item.update({ [`system.traits.toggles.${trait}.selection`]: selection });
        } else if (item?.isOfType("weapon") && weapon.altUsageType === "melee") {
            item.update({ [`system.meleeUsage.traitToggles.${trait}`]: selection });
        } else if (trait === "versatile" && item?.isOfType("shield")) {
            item.update({ "system.traits.integrated.versatile.selection": selection });
        } else {
            const rule = item?.rules.find(
                (r): r is StrikeRuleElement => r.key === "Strike" && !r.ignored && r.slug === weapon.slug,
            );
            await rule?.toggleTrait({ trait, selection });
        }

        return true;
    }
}

interface ToggleWeaponTraitParams {
    trait: "modular" | "versatile";
    selection: DamageType | null;
}

export { WeaponTraitToggles };
