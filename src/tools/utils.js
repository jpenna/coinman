function prettySatoshiPercent(num, base) {
  return (Math.round(((num / base) - 1) * 10000) / 100).toFixed(2);
}

module.exports = {
  prettySatoshiPercent,
};
