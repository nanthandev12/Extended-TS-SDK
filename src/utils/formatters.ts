import Decimal from 'decimal.js';

export function formatPrice(price: number | string, minPriceChange: number): string {
  const priceDecimal = new Decimal(price.toString());
  const minChangeDecimal = new Decimal(minPriceChange);

  const rounded = priceDecimal
    .div(minChangeDecimal)
    .floor()
    .mul(minChangeDecimal);

  if (minChangeDecimal.gte(1)) {
    return rounded.toFixed(0);
  } else {
    const exponent = minChangeDecimal.toExponential().split('e')[1];
    const precision = Math.abs(parseInt(exponent || '0'));
    return rounded.toFixed(precision).replace(/\.?0+$/, '');
  }
}

export function formatSize(size: number | string, minOrderSizeChange: number): string {
  const sizeDecimal = new Decimal(size);
  const minChangeDecimal = new Decimal(minOrderSizeChange);

  const rounded = sizeDecimal
    .div(minChangeDecimal)
    .floor()
    .mul(minChangeDecimal);

  if (minChangeDecimal.gte(1)) {
    return rounded.toFixed(0);
  } else {
    const exponent = minChangeDecimal.toExponential().split('e')[1];
    const precision = Math.abs(parseInt(exponent || '0'));
    return rounded.toFixed(precision).replace(/\.?0+$/, '');
  }
}
