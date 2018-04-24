/* WMA
 * The wma function returns weighted moving average of x for y bars back.
 * In wma weighting factors decrease in arithmetical progression.
*/

// PINE CALCULATION
// pine_wma(x, y) =>
//     norm = 0.0
//     sum = 0.0
//     for i = 0 to y - 1
//         weight = (y - i) * y
//         norm := norm + weight
//         sum := sum + x[i] * weight
//     sum / norm

// Values should be [newest...oldest]
module.exports = (values, length) => {
  const calc = { norm: 0, sum: 0 };
  values.every((value, index) => {
    if (index === length) return false; // break
    const weight = length - index;
    calc.norm += weight;
    calc.sum += value * weight;
    return true;
  });

  return calc.sum / calc.norm;
};
