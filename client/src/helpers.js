export const feltToString = felt => felt
  // To hex
  .toString(16)
  // Split into 2 chars
  .match(/.{2}/g)
  // Get char from code
  .map( c => String.fromCharCode(parseInt( c, 16 ) ) )
  // Join to a string
  .join('');