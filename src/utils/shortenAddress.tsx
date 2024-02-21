export function shortenAddress(address, chars = 7) {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}
