const error = require('debug')('coinman:utils:error');

function cropArray(array, length) {
  if (!length) return array;
  if (length > array.length) {
    error(`Provided length (${length}) is greater than array length (${array.length})`);
    return array;
  }
  return length < array.length ? array.slice(0, length) : array;
}

module.exports = { cropArray };
