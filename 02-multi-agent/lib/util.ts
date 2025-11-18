/* etsy fees calculator */
/*Listing Fee: A one-time fee of $0.20 for each listing.
Transaction Fee: 6.5% of the total order amount (item price + shipping).
Payment Processing Fee: 3% + $0.25 of the total order amount.
Offsite Ads Fee: If your sale comes from an Offsite Ad, there may be an additional fee (e.g., 12% or 15%).  */

export type EtsyFees = {
  listingFee: number;
  transactionFee: number;
  paymentProcessingFee: number;
  offsiteAdsFee: number;
};

export function etsyFeesCalculator({
  itemPrice,
  offsiteAds = false,
}: {
  itemPrice: number;
  offsiteAds?: boolean;
}): EtsyFees {
  const listingFee = 0.2;
  const transactionFeeRate = 0.065;
  const paymentProcessingFeeRate = 0.03;
  const paymentProcessingFixedFee = 0.25;
  const offsiteAdsFeeRate = offsiteAds ? 0.12 : 0; // assuming 12% for Offsite Ads

  const transactionFee = itemPrice * transactionFeeRate;
  const paymentProcessingFee =
    itemPrice * paymentProcessingFeeRate + paymentProcessingFixedFee;
  const offsiteAdsFee = itemPrice * offsiteAdsFeeRate;

  return {
    listingFee,
    transactionFee,
    paymentProcessingFee,
    offsiteAdsFee,
  };
}
