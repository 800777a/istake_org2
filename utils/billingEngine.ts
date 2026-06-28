
import { BillingEngineConfig, TripType, RegistrationMemberInput, SpecialPromoRule, IdentityPricing, TripPricing } from '../types';

/**
 * V320: Composite Billing Engine Calculator
 */
export function calculateFeeV2(
  member: Partial<RegistrationMemberInput>,
  config: BillingEngineConfig | undefined,
  identityTypeLabel: string,
  tripType: string
): number {
  if (!config) return 0;

  // Layer 0/1/2: Find Base Fee
  const unit = member.unit || '';
  let baseFee = config.baseFees['GLOBAL'] || 0;
  
  // Check groups first
  let foundInGroup = false;
  if (config.unitGroups) {
      for (const [groupName, units] of Object.entries(config.unitGroups)) {
        if ((units as string[]).includes(unit)) {
          if (config.baseFees[groupName] !== undefined) {
            baseFee = config.baseFees[groupName];
            foundInGroup = true;
            break;
          }
        }
      }
  }

  if (!foundInGroup && config.baseFees[unit] !== undefined) {
    baseFee = config.baseFees[unit];
  }

  const applyPricing = (current: number, pricing: { method: 'fixed' | 'percent' | 'adjustment', value: number }) => {
    if (pricing.method === 'percent') {
      return current * (pricing.value / 100);
    }
    if (pricing.method === 'adjustment') {
      return current + pricing.value;
    }
    return pricing.value;
  };

  // Layer 3: Identity
  const identityPromo = config.identityPricings?.find((p: IdentityPricing) => p.identity === identityTypeLabel);
  // Layer 4: Trip
  const tripPromo = config.tripPricings?.find((p: TripPricing) => p.trip === tripType);
  // Layer 5: Specials
  const activeSpecialPromos = (config.specialPromos || []).filter((promo: SpecialPromoRule) => {
    if (!promo.enabled) return false;
    const unitMatch = !promo.units || promo.units.length === 0 || promo.units.includes(unit);
    const identityMatch = !promo.identities || promo.identities.length === 0 || promo.identities.includes(identityTypeLabel);
    const tripMatch = !promo.tripTypes || promo.tripTypes.length === 0 || promo.tripTypes.includes(tripType);
    return unitMatch && identityMatch && tripMatch;
  });

  let finalTotal = baseFee;

  if (config.calcStrategy === 'stack') {
    // Stacked: Multiply/Modify sequentially
    if (identityPromo) finalTotal = applyPricing(finalTotal, identityPromo.price);
    if (tripPromo) finalTotal = applyPricing(finalTotal, tripPromo.price);
    for (const sp of activeSpecialPromos) {
      finalTotal = applyPricing(finalTotal, sp.price);
    }
  } else {
    // Minimum: Take the lowest possible price among applicable rules
    const options = [baseFee];
    if (identityPromo) options.push(applyPricing(baseFee, identityPromo.price));
    if (tripPromo) options.push(applyPricing(baseFee, tripPromo.price));
    for (const sp of activeSpecialPromos) {
      options.push(applyPricing(baseFee, sp.price));
    }
    finalTotal = Math.min(...options);
  }

  // Layer 7: Rounding
  if (config.roundingToTen) {
    finalTotal = Math.round(finalTotal / 10) * 10;
  } else {
    finalTotal = Math.round(finalTotal);
  }

  return finalTotal;
}
