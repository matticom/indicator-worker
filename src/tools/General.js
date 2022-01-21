export function sleep(ms) {
   return new Promise((resolve) => setTimeout(resolve, ms));
}

export function percent(percent, basis) {
   return (basis * percent) / 100;
}
