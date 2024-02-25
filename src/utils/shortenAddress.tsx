export function shortenAddress(address, chars = 7) {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function shortenAddress2(address, chars = 10) {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

